import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import cron from 'node-cron'
import pg from 'pg'

const { Pool } = pg
const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.FRONTEND_URL || 'https://your-app-url.com'

if (!token) {
  console.error('[bot] TELEGRAM_BOT_TOKEN not set')
  process.exit(1)
}

const bot = new TelegramBot(token, { polling: true })

const webAppBtn = (label = '⛳ Открыть приложение') => ({
  reply_markup: {
    inline_keyboard: [[{ text: label, web_app: { url: webAppUrl } }]],
  },
})

bot.onText(/\/start/, async (msg) => {
  console.log('[bot] /start from', msg.from?.id)
  const text = [
    'GolfMinsk Live — живой скоринг прямо в Telegram',
    '',
    '⛳ Веди счёт в реальном времени',
    '📊 Следи за статистикой и прогрессом',
    '🏆 Участвуй в турнирах Golf Club Minsk',
    '',
    'GolfMinsk Live. Твой гольф-ассистент.',
  ].join('\n')
  try {
    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⛳ Открыть GolfMinsk Live', web_app: { url: webAppUrl } }]],
      },
    })
  } catch (err) {
    console.error('[bot] /start error:', err.message)
  }
})

bot.on('polling_error', (err) => console.error('[bot] Polling error:', err.message))

// Process queued notifications every minute
cron.schedule('* * * * *', async () => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM scheduled_notifications WHERE send_at <= NOW() AND sent = FALSE ORDER BY send_at ASC LIMIT 50'
    )
    for (const notif of rows) {
      try {
        await bot.sendMessage(notif.telegram_id, notif.message, webAppBtn())
        await db.query('UPDATE scheduled_notifications SET sent = TRUE WHERE id = $1', [notif.id])
        console.log('[bot] sent', notif.context, 'to', notif.telegram_id)
      } catch (e) {
        console.error('[bot] send error for', notif.id, ':', e.message)
      }
    }
  } catch (err) {
    console.error('[bot] queue processing error:', err.message)
  }
})

// Daily good morning at 8:00 UTC
cron.schedule('0 8 * * *', async () => {
  try {
    const { rows: users } = await db.query(`
      SELECT u.telegram_id, u.first_name
      FROM users u
      WHERE u.notifications_enabled = true
        AND u.telegram_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM rounds r
          WHERE r.user_id = u.id AND r.completed = true AND r.date > NOW() - INTERVAL '60 days'
        )
    `)
    for (const user of users) {
      try {
        await bot.sendMessage(
          user.telegram_id,
          `☀️ Доброе утро, ${user.first_name}!\n\nХорошей игры! ⛳`,
          webAppBtn()
        )
      } catch (e) {
        console.error('[bot] daily error for', user.telegram_id, ':', e.message)
      }
    }
    console.log('[bot] daily notifications sent to', users.length, 'users')
  } catch (err) {
    console.error('[bot] daily notification error:', err.message)
  }
})

// Exit after 4h 55min — next cron fires at 5h, so no overlap/conflict
setTimeout(async () => {
  console.log('[bot] Scheduled shutdown for restart')
  await bot.stopPolling()
  await db.end()
  process.exit(0)
}, (4 * 60 + 55) * 60 * 1000)

console.log('[bot] Standalone bot started (will restart every 5h via cron)')
