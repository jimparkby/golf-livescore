import { db } from './db.js'
import { parseScorecardPhoto } from './services/scoreParser.js'

// Admin user IDs (configure via environment variable)
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').filter(Boolean).map(Number)

// Check if user is admin
function isAdmin(userId) {
  return ADMIN_IDS.includes(userId)
}

// In-memory state for multi-step commands
const adminState = new Map()

export function setupAdminCommands(bot, downloadTelegramPhoto) {
  // /admin - Show admin menu
  bot.onText(/\/admin/, async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) {
      await bot.sendMessage(msg.chat.id, '❌ У вас нет прав администратора.')
      return
    }

    const menu = [
      '🎯 Админ-панель турниров',
      '',
      '/create_tournament - Создать турнир',
      '/list_tournaments - Список турниров',
      '/activate_tournament - Активировать турнир',
      '/complete_tournament - Завершить турнир',
      '/upload_flight - Загрузить результаты флайта',
      '/import_history - Импорт исторических данных',
      '/stats - Статистика системы',
    ].join('\n')

    await bot.sendMessage(msg.chat.id, menu)
  })

  // /create_tournament - Create a new tournament
  bot.onText(/\/create_tournament/, async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    adminState.set(userId, { step: 'create_tournament_name' })
    await bot.sendMessage(msg.chat.id, 'Введите название турнира:')
  })

  // /list_tournaments - List all tournaments
  bot.onText(/\/list_tournaments/, async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    try {
      const { rows } = await db.query(`
        SELECT id, name, start_date, status, tier
        FROM tournaments
        ORDER BY start_date DESC
        LIMIT 20
      `)

      if (rows.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Турниры не найдены.')
        return
      }

      const list = rows.map((t, i) => {
        const date = new Date(t.start_date).toLocaleDateString('ru-RU')
        const statusEmoji = {
          upcoming: '🔜',
          active: '🔴',
          completed: '✅',
          cancelled: '❌'
        }[t.status] || '❓'

        return `${i + 1}. ${statusEmoji} ${t.name}\n   ID: <code>${t.id}</code>\n   Дата: ${date} | Статус: ${t.status}`
      }).join('\n\n')

      await bot.sendMessage(msg.chat.id, `📋 Турниры:\n\n${list}`, { parse_mode: 'HTML' })
    } catch (err) {
      console.error('[bot-admin] list_tournaments error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения списка турниров.')
    }
  })

  // /activate_tournament - Activate a tournament
  bot.onText(/\/activate_tournament (.+)/, async (msg, match) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    const tournamentId = match[1].trim()

    try {
      const { rows } = await db.query(
        `UPDATE tournaments SET status = 'active', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [tournamentId]
      )

      if (rows.length === 0) {
        await bot.sendMessage(msg.chat.id, '❌ Турнир не найден.')
        return
      }

      await bot.sendMessage(msg.chat.id, `✅ Турнир "${rows[0].name}" активирован!`)
    } catch (err) {
      console.error('[bot-admin] activate_tournament error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Ошибка активации турнира.')
    }
  })

  // /complete_tournament - Complete a tournament
  bot.onText(/\/complete_tournament (.+)/, async (msg, match) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    const tournamentId = match[1].trim()

    try {
      const { rows } = await db.query(
        `UPDATE tournaments SET status = 'completed', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [tournamentId]
      )

      if (rows.length === 0) {
        await bot.sendMessage(msg.chat.id, '❌ Турнир не найден.')
        return
      }

      await bot.sendMessage(msg.chat.id, `✅ Турнир "${rows[0].name}" завершён!`)
    } catch (err) {
      console.error('[bot-admin] complete_tournament error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Ошибка завершения турнира.')
    }
  })

  // /upload_flight - Upload flight results
  bot.onText(/\/upload_flight (.+)/, async (msg, match) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    const args = match[1].trim().split(' ')
    if (args.length < 2) {
      await bot.sendMessage(msg.chat.id, 'Использование: /upload_flight <tournament_id> <flight_number>')
      return
    }

    const [tournamentId, flightNumber] = args

    adminState.set(userId, {
      step: 'upload_flight_photo',
      tournamentId,
      flightNumber: parseInt(flightNumber)
    })

    await bot.sendMessage(msg.chat.id, `📸 Отправьте фото скор-карты для флайта ${flightNumber}`)
  })

  // /import_history - Import historical tournament data
  bot.onText(/\/import_history/, async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    await bot.sendMessage(msg.chat.id, '📊 Отправьте JSON файл с историческими данными турниров.')
    adminState.set(userId, { step: 'import_history_file' })
  })

  // /stats - System statistics
  bot.onText(/\/stats/, async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return

    try {
      const { rows: [tournamentsCount] } = await db.query('SELECT COUNT(*) FROM tournaments')
      const { rows: [usersCount] } = await db.query('SELECT COUNT(*) FROM users')
      const { rows: [participantsCount] } = await db.query('SELECT COUNT(*) FROM tournament_participants')
      const { rows: [historyCount] } = await db.query('SELECT COUNT(*) FROM player_tournament_history')

      const stats = [
        '📊 Статистика системы',
        '',
        `👥 Пользователей: ${usersCount.count}`,
        `🏆 Турниров: ${tournamentsCount.count}`,
        `🎯 Участников: ${participantsCount.count}`,
        `📜 Исторических записей: ${historyCount.count}`,
      ].join('\n')

      await bot.sendMessage(msg.chat.id, stats)
    } catch (err) {
      console.error('[bot-admin] stats error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Ошибка получения статистики.')
    }
  })

  // Handle multi-step commands
  bot.on('message', async (msg) => {
    const userId = msg.from?.id
    if (!isAdmin(userId)) return
    if (!adminState.has(userId)) return

    const state = adminState.get(userId)

    try {
      // Create tournament flow
      if (state.step === 'create_tournament_name') {
        state.name = msg.text
        state.step = 'create_tournament_date'
        adminState.set(userId, state)
        await bot.sendMessage(msg.chat.id, 'Введите дату начала (YYYY-MM-DD):')
        return
      }

      if (state.step === 'create_tournament_date') {
        state.start_date = msg.text
        state.step = 'create_tournament_course'
        adminState.set(userId, state)
        await bot.sendMessage(msg.chat.id, 'Введите название поля:')
        return
      }

      if (state.step === 'create_tournament_course') {
        state.course_name = msg.text

        // Create tournament
        const { rows } = await db.query(`
          INSERT INTO tournaments (name, start_date, course_name, status)
          VALUES ($1, $2, $3, 'upcoming')
          RETURNING *
        `, [state.name, state.start_date, state.course_name])

        adminState.delete(userId)
        await bot.sendMessage(
          msg.chat.id,
          `✅ Турнир создан!\n\nНазвание: ${rows[0].name}\nID: <code>${rows[0].id}</code>\n\nИспользуйте /activate_tournament ${rows[0].id} для активации.`,
          { parse_mode: 'HTML' }
        )
        return
      }

      // Upload flight photo flow
      if (state.step === 'upload_flight_photo' && msg.photo) {
        const photo = msg.photo[msg.photo.length - 1]
        const buffer = await downloadTelegramPhoto(bot, photo.file_id)

        if (!buffer) {
          await bot.sendMessage(msg.chat.id, '❌ Не удалось загрузить фото.')
          adminState.delete(userId)
          return
        }

        const result = await parseScorecardPhoto(buffer)

        if (!result.players.length) {
          await bot.sendMessage(msg.chat.id, '❌ Не удалось распознать скор-карту.')
          adminState.delete(userId)
          return
        }

        // Save flight photo
        const { rows } = await db.query(`
          INSERT INTO tournament_flight_photos
            (tournament_id, flight_number, telegram_file_id, scores, processed)
          VALUES ($1, $2, $3, $4, false)
          RETURNING id
        `, [state.tournamentId, state.flightNumber, photo.file_id, JSON.stringify({ players: result.players })])

        // Update participant scores
        let updated = 0
        for (const player of result.players) {
          const totalScore = player.holes?.reduce((sum, h) => sum + (h.score || 0), 0) || 0

          // Try to find participant
          const { rows: participants } = await db.query(`
            SELECT tp.id
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.tournament_id = $1
              AND tp.flight_number = $2
              AND LOWER(u.name) LIKE $3
          `, [state.tournamentId, state.flightNumber, `%${player.name.toLowerCase()}%`])

          if (participants.length > 0) {
            await db.query(`
              UPDATE tournament_participants
              SET total_score = $1, status = 'started'
              WHERE id = $2
            `, [totalScore, participants[0].id])
            updated++
          }
        }

        adminState.delete(userId)
        await bot.sendMessage(
          msg.chat.id,
          `✅ Результаты флайта ${state.flightNumber} загружены!\n\n` +
          `Распознано игроков: ${result.players.length}\n` +
          `Обновлено участников: ${updated}`
        )
        return
      }

      // Import history flow
      if (state.step === 'import_history_file' && msg.document) {
        await bot.sendMessage(msg.chat.id, '⏳ Обработка файла...')

        // Download document
        const file = await bot.getFile(msg.document.file_id)
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

        const response = await fetch(fileUrl)
        const data = await response.json()

        if (!Array.isArray(data)) {
          await bot.sendMessage(msg.chat.id, '❌ Неверный формат файла. Ожидается JSON массив.')
          adminState.delete(userId)
          return
        }

        let imported = 0
        for (const record of data) {
          try {
            const normalizedName = record.player_name.toLowerCase().trim().replace(/\s+/g, ' ')

            await db.query(`
              INSERT INTO player_tournament_history
                (player_name, player_normalized_name, tournament_name, tournament_date,
                 position, total_score, handicap_index, scores)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              record.player_name,
              normalizedName,
              record.tournament_name,
              record.tournament_date,
              record.position,
              record.total_score,
              record.handicap_index,
              record.scores
            ])
            imported++
          } catch (err) {
            console.error('[bot-admin] import record error:', err.message)
          }
        }

        adminState.delete(userId)
        await bot.sendMessage(msg.chat.id, `✅ Импорт завершён! Загружено записей: ${imported}/${data.length}`)
        return
      }
    } catch (err) {
      console.error('[bot-admin] message handler error:', err)
      await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${err.message}`)
      adminState.delete(userId)
    }
  })
}

export { isAdmin, adminState }
