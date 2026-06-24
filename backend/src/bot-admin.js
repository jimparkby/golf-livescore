import { db } from './db.js'
import { parseParticipantsPhoto, parseTournamentResultsPhoto } from './services/adminPhotoParser.js'
import { getLeaderboards } from './services/winProbabilityAI.js'
import { calculateAndSavePredictions } from './services/predictionsCalculator.js'

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
            [{ text: '🗑️ Удалить фото флайтов', callback_data: 'admin_manage_flights' }],
            [{ text: '🏆 Таблицы лидеров', callback_data: 'admin_leaderboards' }],
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

      // ── Manage flights photos ──────────────────────────────────────────────
      if (data === 'admin_manage_flights') {
        await bot.answerCallbackQuery(query.id)

        // Get tournaments with flights photos
        const { rows: tournaments } = await db.query(`
          SELECT id, name, date, flights_photos
          FROM tournaments
          WHERE flights_photos IS NOT NULL
            AND jsonb_array_length(flights_photos) > 0
          ORDER BY date DESC
          LIMIT 20
        `)

        if (tournaments.length === 0) {
          await bot.editMessageText('ℹ️ Нет турниров с фото флайтов.', {
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
          text: `${t.name} (${t.flights_photos.length} фото)`,
          callback_data: `admin_flights_tournament_${t.id}`,
        }])
        keyboard.push([{ text: '◀️ Назад', callback_data: 'admin_back' }])

        await bot.editMessageText('🗑️ <b>Выберите турнир для удаления фото флайтов:</b>', {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        })
        return
      }

      // ── Select tournament for flights management ──────────────────────────
      if (data?.startsWith('admin_flights_tournament_')) {
        const tournamentId = parseInt(data.replace('admin_flights_tournament_', ''), 10)
        await bot.answerCallbackQuery(query.id)

        const { rows: [tournament] } = await db.query(
          'SELECT id, name, date, flights_photos FROM tournaments WHERE id = $1',
          [tournamentId]
        )

        if (!tournament || !tournament.flights_photos || tournament.flights_photos.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: '❌ Фото не найдены', show_alert: true })
          return
        }

        // Build keyboard with delete buttons for each photo
        const keyboard = tournament.flights_photos.map((fileId, idx) => [{
          text: `🗑️ Удалить фото ${idx + 1}`,
          callback_data: `admin_delete_flight_${tournamentId}_${idx}`,
        }])
        keyboard.push([{ text: '◀️ Назад', callback_data: 'admin_manage_flights' }])

        await bot.editMessageText(
          `📸 <b>${tournament.name}</b>\n\nФото флайтов: ${tournament.flights_photos.length}\n\nВыберите фото для удаления:`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard },
          }
        )

        // Send all photos so admin can see which one to delete
        for (let i = 0; i < tournament.flights_photos.length; i++) {
          try {
            await bot.sendPhoto(query.message.chat.id, tournament.flights_photos[i], {
              caption: `Фото ${i + 1}`,
            })
          } catch (err) {
            console.error('[bot-admin] Error sending photo:', err.message)
          }
        }
        return
      }

      // ── Delete specific flight photo ──────────────────────────────────────
      if (data?.startsWith('admin_delete_flight_')) {
        const parts = data.replace('admin_delete_flight_', '').split('_')
        const tournamentId = parseInt(parts[0], 10)
        const photoIndex = parseInt(parts[1], 10)

        await bot.answerCallbackQuery(query.id)

        try {
          // Get current photos
          const { rows: [tournament] } = await db.query(
            'SELECT flights_photos FROM tournaments WHERE id = $1',
            [tournamentId]
          )

          if (!tournament || !tournament.flights_photos || photoIndex >= tournament.flights_photos.length) {
            await bot.answerCallbackQuery(query.id, { text: '❌ Фото не найдено', show_alert: true })
            return
          }

          // Remove photo at index
          const updatedPhotos = tournament.flights_photos.filter((_, idx) => idx !== photoIndex)

          // Update database
          await db.query(
            'UPDATE tournaments SET flights_photos = $1 WHERE id = $2',
            [JSON.stringify(updatedPhotos), tournamentId]
          )

          await bot.editMessageText(
            `✅ Фото ${photoIndex + 1} успешно удалено!\n\nОсталось фото: ${updatedPhotos.length}`,
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад к списку турниров', callback_data: 'admin_manage_flights' }],
                  [{ text: '◀️ Главное меню', callback_data: 'admin_back' }],
                ],
              },
            }
          )
        } catch (err) {
          console.error('[bot-admin] Error deleting photo:', err.message)
          await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка удаления', show_alert: true })
        }
        return
      }

      // ── Enter tournament results ───────────────────────────────────────────
      if (data === 'admin_tournament_results') {
        await bot.answerCallbackQuery(query.id)

        // Get list of tournaments (upcoming first, then past)
        const { rows: tournaments } = await db.query(`
          SELECT id, name, date
          FROM tournaments
          ORDER BY
            CASE WHEN date >= CURRENT_DATE THEN 0 ELSE 1 END,
            CASE WHEN date >= CURRENT_DATE THEN date END ASC,
            CASE WHEN date < CURRENT_DATE THEN date END DESC
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

        setSession(telegramId, {
          action: 'tournament_results',
          tournamentId,
          totalProcessed: 0,
          totalSaved: 0,
          photoCount: 0,
        })

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
          ``,
          `💡 <i>Можно отправить несколько фото подряд</i>`,
        ].join('\n')

        await bot.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👥 Ввести участников турнира', callback_data: 'admin_participants' }],
              [{ text: '❌ Отмена', callback_data: 'admin_back' }],
            ],
          },
        })
        return
      }

      // ── Enter participants ─────────────────────────────────────────────────
      if (data === 'admin_participants') {
        await bot.answerCallbackQuery(query.id)

        const currentSession = getSession(telegramId)
        const tournamentId = currentSession?.tournamentId

        if (!tournamentId) {
          await bot.answerCallbackQuery(query.id, {
            text: '❌ Сначала выберите турнир через "Ввести результаты турнира"',
            show_alert: true
          })
          return
        }

        const { rows: [tournament] } = await db.query(
          'SELECT id, name, date FROM tournaments WHERE id = $1',
          [tournamentId]
        )

        setSession(telegramId, {
          action: 'participants',
          tournamentId,
          totalProcessed: 0,
          totalSaved: 0,
          photoCount: 0,
        })

        const text = [
          '👥 <b>Ввод участников</b>',
          `<b>Турнир:</b> ${tournament.name}`,
          `<b>Дата:</b> ${new Date(tournament.date).toLocaleDateString('ru-RU')}`,
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
          '',
          '💡 <i>Можно отправить несколько фото подряд</i>',
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

      // ── Continue adding photos ────────────────────────────────────────────
      if (data === 'admin_continue') {
        await bot.answerCallbackQuery(query.id, {
          text: '📸 Отправьте следующее фото',
          show_alert: false,
        })
        return
      }

      // ── Finish adding photos ──────────────────────────────────────────────
      if (data === 'admin_finish') {
        await bot.answerCallbackQuery(query.id)
        const session = getSession(telegramId)

        if (session) {
          const summary = [
            '✅ <b>Ввод завершен!</b>',
            '',
            `📸 Обработано фото: ${session.photoCount || 0}`,
            `📊 Всего записей: ${session.totalProcessed || 0}`,
            `💾 Сохранено: ${session.totalSaved || 0}`,
          ].join('\n')

          await bot.editMessageText(summary, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ В главное меню', callback_data: 'admin_back' }]],
            },
          })
        }

        clearSession(telegramId)
        return
      }

      // ── Continue adding photos ─────────────────────────────────────────────
      if (data === 'admin_continue') {
        await bot.answerCallbackQuery(query.id, { text: '📸 Отправьте следующее фото', show_alert: false })
        return
      }

      // ── Finish input ───────────────────────────────────────────────────────
      if (data === 'admin_finish') {
        await bot.answerCallbackQuery(query.id)
        const session = getSession(telegramId)

        let finishText = '✅ <b>Ввод завершён!</b>\n\n'
        if (session?.totalSaved > 0) {
          finishText += `Всего обработано: ${session.totalProcessed}\n`
          finishText += `Сохранено записей: ${session.totalSaved}\n\n`
        } else {
          finishText += 'Данные сохранены.\n\n'
        }

        // If this was participants input, start AI predictions calculation
        if (session?.action === 'participants' && session?.tournamentId) {
          finishText += '🤖 <i>Запускаю AI-анализ шансов на победу...</i>'

          // Start background calculation (don't wait)
          calculateAndSavePredictions(session.tournamentId).catch(err =>
            console.error('[bot-admin] Predictions calculation failed:', err)
          )
        }

        clearSession(telegramId)

        await bot.editMessageText(finishText, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '◀️ В главное меню', callback_data: 'admin_back' }],
            ],
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
              [{ text: '🗑️ Удалить фото флайтов', callback_data: 'admin_manage_flights' }],
              [{ text: '🏆 Таблицы лидеров', callback_data: 'admin_leaderboards' }],
              [{ text: '❌ Закрыть', callback_data: 'admin_close' }],
            ],
          },
        })
        return
      }

      // ── Leaderboards ───────────────────────────────────────────────────────
      if (data === 'admin_leaderboards') {
        await bot.answerCallbackQuery(query.id)

        try {
          const { topByWins, topByHcp } = await getLeaderboards()

          let text = '🏆 <b>Таблицы лидеров</b>\n\n'

          // Top by wins
          text += '<b>🥇 Топ-10 по победам:</b>\n'
          topByWins.slice(0, 10).forEach((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
            text += `${medal} <b>${p.player_name}</b>\n`
            text += `   Побед: ${p.first_places} | Турниров: ${p.total_tournaments} | Win rate: ${p.win_rate}%\n`
          })

          text += '\n<b>🎯 Топ-10 по HCP:</b>\n'
          topByHcp.slice(0, 10).forEach((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
            text += `${medal} <b>${p.player_name}</b>\n`
            text += `   HCP: ${p.estimated_hcp} | Top-3: ${p.top3_finishes}\n`
          })

          await bot.editMessageText(text, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]],
            },
          })
        } catch (err) {
          console.error('[bot-admin] Leaderboards error:', err)
          await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка загрузки статистики', show_alert: true })
        }
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

        // Update session counters
        session.photoCount = (session.photoCount || 0) + 1
        session.totalProcessed = (session.totalProcessed || 0) + results.length
        session.totalSaved = (session.totalSaved || 0) + saved
        setSession(telegramId, session)

        const responseText = [
          '✅ <b>Фото обработано!</b>',
          '',
          `📸 Фото: ${session.photoCount}`,
          `📊 Распознано в этом фото: ${results.length}`,
          `💾 Сохранено в этом фото: ${saved}`,
          '',
          '<b>Итого за сессию:</b>',
          `Всего распознано: ${session.totalProcessed}`,
          `Всего сохранено: ${session.totalSaved}`,
          '',
          '<i>Последние результаты:</i>',
          results.slice(0, 5).map(r => `${r.place}. ${r.name} — ${r.score}${r.group ? ` (${r.group})` : ''}`).join('\n'),
          results.length > 5 ? `...и ещё ${results.length - 5}` : '',
        ].filter(Boolean).join('\n')

        await bot.editMessageText(responseText, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📸 Добавить ещё фото', callback_data: 'admin_continue' }],
              [{ text: '✅ Завершить ввод', callback_data: 'admin_finish' }],
              [{ text: '❌ Отмена', callback_data: 'admin_back' }],
            ],
          },
        })
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

        // Save photo file_id to tournament
        try {
          await db.query(
            `UPDATE tournaments
             SET flights_photos = COALESCE(flights_photos, '[]'::jsonb) || $1::jsonb
             WHERE id = $2`,
            [JSON.stringify([photo.file_id]), session.tournamentId]
          )
        } catch (err) {
          console.error('[bot-admin] Save photo file_id error:', err.message)
        }

        // Save to database
        let saved = 0
        for (const p of participants) {
          try {
            if (p.email && p.email.trim().length > 0) {
              // If email exists, use ON CONFLICT
              await db.query(
                `INSERT INTO participants (name, email, phone, handicap)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email)
                 DO UPDATE SET name = $1, phone = $3, handicap = $4`,
                [p.name, p.email, p.phone, p.handicap]
              )
            } else {
              // If no email, just insert (multiple NULL emails are allowed)
              await db.query(
                `INSERT INTO participants (name, email, phone, handicap) VALUES ($1, $2, $3, $4)`,
                [p.name, null, p.phone, p.handicap]
              )
            }
            saved++
          } catch (err) {
            console.error('[bot-admin] Save participant error:', err.message)
          }
        }

        // Update session counters
        session.photoCount = (session.photoCount || 0) + 1
        session.totalProcessed = (session.totalProcessed || 0) + participants.length
        session.totalSaved = (session.totalSaved || 0) + saved
        setSession(telegramId, session)

        const responseText = [
          '✅ <b>Фото обработано!</b>',
          '',
          `📸 Фото: ${session.photoCount}`,
          `👥 Распознано в этом фото: ${participants.length}`,
          `💾 Сохранено в этом фото: ${saved}`,
          '',
          '<b>Итого за сессию:</b>',
          `Всего распознано: ${session.totalProcessed} участников`,
          `Всего сохранено: ${session.totalSaved}`,
          '',
          '<i>Последние участники:</i>',
          participants.slice(0, 5).map(p => {
            const parts = [p.name]
            if (p.handicap > 0) parts.push(`HCP ${p.handicap}`)
            if (p.phone) parts.push(p.phone)
            return `• ${parts.join(' — ')}`
          }).join('\n'),
          participants.length > 5 ? `...и ещё ${participants.length - 5}` : '',
        ].filter(Boolean).join('\n')

        await bot.editMessageText(responseText, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📸 Добавить ещё фото', callback_data: 'admin_continue' }],
              [{ text: '✅ Завершить ввод', callback_data: 'admin_finish' }],
              [{ text: '❌ Отмена', callback_data: 'admin_back' }],
            ],
          },
        })
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
