import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import cron from 'node-cron'
import pg from 'pg'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

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

function createProxyAgent() {
  const proxyUrl = process.env.TELEGRAM_PROXY_URL
  if (!proxyUrl) return null
  try {
    if (/^socks/i.test(proxyUrl)) {
      const { SocksProxyAgent } = require('socks-proxy-agent')
      return new SocksProxyAgent(proxyUrl)
    }
    const { HttpsProxyAgent } = require('https-proxy-agent')
    return new HttpsProxyAgent(proxyUrl)
  } catch (err) {
    console.warn('[bot] Proxy agent not created (install package):', err.message)
    return null
  }
}

const proxyAgent = createProxyAgent()
const botOpts = proxyAgent
  ? { polling: true, request: { agent: proxyAgent } }
  : { polling: true }

const bot = new TelegramBot(token, botOpts)

function generateTip(scores) {
  if (scores.length === 0) return null

  const n = scores.length
  const avgPutts = scores.reduce((s, h) => s + (h.putts || 0), 0) / n
  const threePuttRate = scores.filter(h => h.putts >= 3).length / n
  const bunkerRate = scores.reduce((s, h) => s + (h.bunker || 0), 0) / n
  const girPct = scores.filter(h => h.gir).length / n

  // Pick tip for the weakest stat
  const candidates = [
    { score: avgPutts - 1.8,      tip: `Сосредоточься на паттинге — в среднем ${avgPutts.toFixed(1)} патта за лунку, это можно улучшить! 🎯` },
    { score: threePuttRate - 0.1,  tip: 'Читай грин тщательнее — трёхпатты сильно бьют по счёту. 📍' },
    { score: bunkerRate - 0.3,     tip: 'Поработай над выходом из бункера — это сэкономит удары. ⛱️' },
    { score: 0.5 - girPct,         tip: 'Точность подходов к грину — ключ к меньшему числу ударов. 📐' },
  ]

  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a))
  return best.score > 0 ? best.tip : 'Доверяй своей игре и получай удовольствие! ⛳'
}

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
        let message = notif.message

        // For round-start: generate personalized tip via Claude (runs on GH Actions, Anthropic is accessible)
        if (notif.context === 'round-start' && notif.user_id) {
          try {
            const { rows: scores } = await db.query(
              `SELECT hs.putts, hs.bunker, hs.gir
               FROM hole_scores hs
               JOIN rounds r ON r.id = hs.round_id
               WHERE r.user_id = $1 AND hs.player_id = 'me' AND r.completed = true
               ORDER BY r.date DESC LIMIT 54`,
              [notif.user_id]
            )
            const tip = generateTip(scores)
            if (tip) message = tip
          } catch (e) {
            console.error('[bot] tip error for notif', notif.id, ':', e.message)
          }
        }

        await bot.sendMessage(notif.telegram_id, message, webAppBtn())
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
