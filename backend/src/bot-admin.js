import { db } from './db.js'
import { parseParticipantsPhoto, parseTournamentResultsPhoto } from './services/adminPhotoParser.js'

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
          `📸 <b>Отправьте фото с результатами турнира</b>`,
          ``,
          `Фото может содержать:`,
          `• Таблицу с местами и счетами`,
          `• Результаты по группам`,
          `• Общий зачет`,
          ``,
          `Бот автоматически распознает всех игроков и их результаты.`,
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
          '📸 <b>Отправьте фото списка участников (флайта)</b>',
          '',
          'Фото может содержать:',
          '• Список участников с именами',
          '• Таблицу с гандикапами',
          '• Контактную информацию',
          '• Разбивку по флайтам/группам',
          '',
          'Бот автоматически распознает всех участников и их данные.',
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

  // ── Photo handlers for admin sessions ─────────────────────────────────────
  // This handler is defined inside setupAdminCommands and has access to bot
  // Export it so bot.js can pass downloadTelegramPhoto function
  const adminPhotoHandler = async (msg, downloadPhoto) => {
    const telegramId = msg.from?.id
    if (!telegramId || !isAdmin(telegramId)) return false
    if (!msg.photo) return false

    const session = getSession(telegramId)
    if (!session) return false

    const statusMsg = await bot.sendMessage(msg.chat.id, '⏳ Распознаю фото...')

    try {
      // Download photo
      const photo = msg.photo[msg.photo.length - 1]
      const buffer = await downloadPhoto(photo.file_id)

      if (!buffer) {
        await bot.editMessageText('❌ Не удалось загрузить фото. Попробуйте ещё раз.', {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
        })
        return true
      }

      // ── Handle tournament results photo ────────────────────────────────────
      if (session.action === 'tournament_results') {
        const { results } = await parseTournamentResultsPhoto(buffer)

        if (results.length === 0) {
          await bot.editMessageText('❌ Не удалось распознать результаты. Убедитесь, что фото чёткое и содержит таблицу результатов.', {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id,
          })
          return true
        }

        // Save to database
        let saved = 0
        for (const result of results) {
          try {
            await db.query(
              `INSERT INTO tournament_results (tournament_id, place, player_name, score, group_name)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (tournament_id, place, group_name)
               DO UPDATE SET player_name = $3, score = $4`,
              [session.tournamentId, result.place, result.name, result.score, result.group]
            )
            saved++
          } catch (err) {
            console.error('[bot-admin] Save result error:', err.message)
          }
        }

        const responseText = [
          '✅ <b>Результаты сохранены!</b>',
          '',
          `📊 Распознано: ${results.length} записей`,
          `💾 Сохранено: ${saved} записей`,
          '',
          results.slice(0, 10).map(r => `${r.place}. ${r.name} — ${r.score}${r.group ? ` (${r.group})` : ''}`).join('\n'),
          results.length > 10 ? `\n...и ещё ${results.length - 10}` : '',
        ].filter(Boolean).join('\n')

        await bot.editMessageText(responseText, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML',
        })
        clearSession(telegramId)
        return true
      }

      // ── Handle participants photo ──────────────────────────────────────────
      if (session.action === 'participants') {
        const { participants } = await parseParticipantsPhoto(buffer)

        if (participants.length === 0) {
          await bot.editMessageText('❌ Не удалось распознать участников. Убедитесь, что фото чёткое и содержит список участников.', {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id,
          })
          return true
        }

        // Save to database
        let saved = 0
        for (const p of participants) {
          try {
            await db.query(
              `INSERT INTO participants (name, email, phone, handicap)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (email)
               DO UPDATE SET name = $1, phone = $3, handicap = $4
               WHERE participants.email IS NOT NULL AND participants.email != ''`,
              [p.name, p.email, p.phone, p.handicap]
            )
            saved++
          } catch (err) {
            // If no email, try insert without conflict handling
            try {
              await db.query(
                `INSERT INTO participants (name, email, phone, handicap) VALUES ($1, $2, $3, $4)`,
                [p.name, p.email, p.phone, p.handicap]
              )
              saved++
            } catch (err2) {
              console.error('[bot-admin] Save participant error:', err2.message)
            }
          }
        }

        const responseText = [
          '✅ <b>Участники сохранены!</b>',
          '',
          `👥 Распознано: ${participants.length} участников`,
          `💾 Сохранено: ${saved} записей`,
          '',
          participants.slice(0, 10).map(p => {
            const parts = [p.name]
            if (p.handicap > 0) parts.push(`HCP ${p.handicap}`)
            if (p.phone) parts.push(p.phone)
            return `• ${parts.join(' — ')}`
          }).join('\n'),
          participants.length > 10 ? `\n...и ещё ${participants.length - 10}` : '',
        ].filter(Boolean).join('\n')

        await bot.editMessageText(responseText, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML',
        })
        clearSession(telegramId)
        return true
      }

    } catch (err) {
      console.error('[bot-admin] photo handler error:', err.message)
      await bot.editMessageText(`❌ Ошибка обработки: ${err.message}`, {
        chat_id: msg.chat.id,
        message_id: statusMsg.message_id,
      })
      return true // Still handled, just with error
    }
  }

  // Export the handler so bot.js can call it
  bot._adminPhotoHandler = adminPhotoHandler
}

export { isAdmin }
