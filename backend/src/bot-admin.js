import { db } from './db.js'

// Load admin IDs from environment variable
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !isNaN(id))

console.log('[bot-admin] Loaded admin IDs:', ADMIN_IDS.length > 0 ? ADMIN_IDS : 'none')

/**
 * Check if user is admin
 */
function isAdmin(telegramId) {
  return ADMIN_IDS.includes(telegramId)
}

/**
 * Admin session storage for multi-step commands
 */
const adminSessions = new Map()

function getSession(telegramId) {
  return adminSessions.get(telegramId) || null
}

function setSession(telegramId, data) {
  adminSessions.set(telegramId, data)
}

function clearSession(telegramId) {
  adminSessions.delete(telegramId)
}

/**
 * Setup admin commands
 */
export function setupAdminCommands(bot) {
  if (!bot) return

  // ── /admin ────────────────────────────────────────────────────────────────
  bot.onText(/\/admin$/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    console.log('[bot-admin] /admin from', telegramId)

    if (!isAdmin(telegramId)) {
      await bot.sendMessage(msg.chat.id, '🚫 У вас нет доступа к административной панели.')
      return
    }

    const text = [
      '🔐 <b>Административная панель</b>',
      '',
      'Выберите действие:',
    ].join('\n')

    try {
      await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Ввести результаты турнира', callback_data: 'admin_tournament_results' }],
            [{ text: '👥 Ввести участников', callback_data: 'admin_participants' }],
            [{ text: '❌ Закрыть', callback_data: 'admin_close' }],
          ],
        },
      })
    } catch (err) {
      console.error('[bot-admin] /admin sendMessage error:', err.message)
    }
  })

  // ── Callback query handlers ────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const telegramId = query.from?.id
    if (!telegramId) return

    const data = query.data

    // Check admin access
    if (data?.startsWith('admin_') && !isAdmin(telegramId)) {
      await bot.answerCallbackQuery(query.id, { text: '🚫 Нет доступа', show_alert: true })
      return
    }

    try {
      // ── Close admin panel ──────────────────────────────────────────────────
      if (data === 'admin_close') {
        clearSession(telegramId)
        await bot.answerCallbackQuery(query.id)
        await bot.deleteMessage(query.message.chat.id, query.message.message_id)
        return
      }

      // ── Enter tournament results ───────────────────────────────────────────
      if (data === 'admin_tournament_results') {
        await bot.answerCallbackQuery(query.id)

        // Get list of tournaments
        const { rows: tournaments } = await db.query(`
          SELECT id, name, date
          FROM tournaments
          ORDER BY date DESC
          LIMIT 20
        `)

        if (tournaments.length === 0) {
          await bot.editMessageText('❌ Нет доступных турниров в базе данных.', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]],
            },
          })
          return
        }

        // Build tournament selection keyboard
        const keyboard = tournaments.map(t => [{
          text: `${t.name} (${new Date(t.date).toLocaleDateString('ru-RU')})`,
          callback_data: `admin_tournament_${t.id}`,
        }])
        keyboard.push([{ text: '◀️ Назад', callback_data: 'admin_back' }])

        await bot.editMessageText('📊 <b>Выберите турнир:</b>', {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        })
        return
      }

      // ── Select specific tournament ─────────────────────────────────────────
      if (data?.startsWith('admin_tournament_') && data !== 'admin_tournament_results') {
        const tournamentId = parseInt(data.replace('admin_tournament_', ''), 10)
        await bot.answerCallbackQuery(query.id)

        const { rows: [tournament] } = await db.query(
          'SELECT id, name, date FROM tournaments WHERE id = $1',
          [tournamentId]
        )

        if (!tournament) {
          await bot.answerCallbackQuery(query.id, { text: '❌ Турнир не найден', show_alert: true })
          return
        }

        setSession(telegramId, { action: 'tournament_results', tournamentId })

        const text = [
          `📊 <b>Ввод результатов</b>`,
          `<b>Турнир:</b> ${tournament.name}`,
          `<b>Дата:</b> ${new Date(tournament.date).toLocaleDateString('ru-RU')}`,
          ``,
          `Отправьте результаты в формате:`,
          `<code>Место,Имя игрока,Счет</code>`,
          ``,
          `Пример:`,
          `<code>1,Иванов Иван,72</code>`,
          `<code>2,Петров Петр,74</code>`,
          `<code>3,Сидоров Сидор,75</code>`,
          ``,
          `Или отправьте несколько строк за раз.`,
        ].join('\n')

        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'admin_back' }]],
          },
        })
        return
      }

      // ── Enter participants ─────────────────────────────────────────────────
      if (data === 'admin_participants') {
        await bot.answerCallbackQuery(query.id)

        setSession(telegramId, { action: 'participants' })

        const text = [
          '👥 <b>Ввод участников</b>',
          '',
          'Отправьте список участников в формате:',
          '<code>Имя,Email,Телефон,Handicap</code>',
          '',
          'Пример:',
          '<code>Иванов Иван,ivan@example.com,+375291234567,12.5</code>',
          '<code>Петров Петр,petr@example.com,+375297654321,18.0</code>',
          '',
          'Email и телефон необязательны (можно оставить пустым).',
        ].join('\n')

        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'admin_back' }]],
          },
        })
        return
      }

      // ── Back to main menu ──────────────────────────────────────────────────
      if (data === 'admin_back') {
        await bot.answerCallbackQuery(query.id)
        clearSession(telegramId)

        const text = [
          '🔐 <b>Административная панель</b>',
          '',
          'Выберите действие:',
        ].join('\n')

        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Ввести результаты турнира', callback_data: 'admin_tournament_results' }],
              [{ text: '👥 Ввести участников', callback_data: 'admin_participants' }],
              [{ text: '❌ Закрыть', callback_data: 'admin_close' }],
            ],
          },
        })
        return
      }

    } catch (err) {
      console.error('[bot-admin] callback_query error:', err.message)
      await bot.answerCallbackQuery(query.id, { text: '❌ Произошла ошибка', show_alert: true })
    }
  })

  // ── Text message handlers for admin sessions ──────────────────────────────
  bot.on('message', async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId || !isAdmin(telegramId)) return
    if (!msg.text || msg.text.startsWith('/')) return

    const session = getSession(telegramId)
    if (!session) return

    try {
      // ── Handle tournament results input ────────────────────────────────────
      if (session.action === 'tournament_results') {
        const lines = msg.text.trim().split('\n').filter(line => line.trim())
        const results = []
        const errors = []

        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim())
          if (parts.length < 3) {
            errors.push(`Неверный формат: ${line}`)
            continue
          }

          const [place, name, score] = parts
          const placeNum = parseInt(place, 10)
          const scoreNum = parseInt(score, 10)

          if (isNaN(placeNum) || isNaN(scoreNum)) {
            errors.push(`Неверные числа: ${line}`)
            continue
          }

          results.push({ place: placeNum, name, score: scoreNum })
        }

        if (results.length === 0) {
          await bot.sendMessage(msg.chat.id, '❌ Не удалось обработать результаты. Проверьте формат.')
          return
        }

        // Save to database
        for (const result of results) {
          await db.query(
            `INSERT INTO tournament_results (tournament_id, place, player_name, score)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tournament_id, place)
             DO UPDATE SET player_name = $3, score = $4`,
            [session.tournamentId, result.place, result.name, result.score]
          )
        }

        const responseText = [
          '✅ <b>Результаты добавлены!</b>',
          '',
          `Обработано: ${results.length} записей`,
          errors.length > 0 ? `\n❌ Ошибки: ${errors.length}` : '',
          errors.length > 0 ? errors.join('\n') : '',
        ].filter(Boolean).join('\n')

        await bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'HTML' })
        clearSession(telegramId)
        return
      }

      // ── Handle participants input ──────────────────────────────────────────
      if (session.action === 'participants') {
        const lines = msg.text.trim().split('\n').filter(line => line.trim())
        const participants = []
        const errors = []

        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim())
          if (parts.length < 1) {
            errors.push(`Неверный формат: ${line}`)
            continue
          }

          const [name, email = '', phone = '', handicap = '0'] = parts
          const handicapNum = parseFloat(handicap) || 0

          participants.push({ name, email, phone, handicap: handicapNum })
        }

        if (participants.length === 0) {
          await bot.sendMessage(msg.chat.id, '❌ Не удалось обработать участников. Проверьте формат.')
          return
        }

        // Save to database
        for (const p of participants) {
          await db.query(
            `INSERT INTO participants (name, email, phone, handicap)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email)
             DO UPDATE SET name = $1, phone = $3, handicap = $4
             WHERE participants.email != ''`,
            [p.name, p.email || null, p.phone || null, p.handicap]
          )
        }

        const responseText = [
          '✅ <b>Участники добавлены!</b>',
          '',
          `Обработано: ${participants.length} записей`,
          errors.length > 0 ? `\n❌ Ошибки: ${errors.length}` : '',
          errors.length > 0 ? errors.join('\n') : '',
        ].filter(Boolean).join('\n')

        await bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'HTML' })
        clearSession(telegramId)
        return
      }

    } catch (err) {
      console.error('[bot-admin] message handler error:', err.message)
      await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${err.message}`)
    }
  })
}

export { isAdmin }
