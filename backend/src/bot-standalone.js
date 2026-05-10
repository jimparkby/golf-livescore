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

function calcStats(scores) {
  const n = scores.length
  if (n === 0) return null
  const totalPutts   = scores.reduce((s, h) => s + (h.putts  || 0), 0)
  const threePutts   = scores.filter(h => (h.putts || 0) >= 3).length
  const totalBunkers = scores.reduce((s, h) => s + (h.bunker || 0), 0)
  const girCount     = scores.filter(h => h.gir).length
  const drivingHits  = scores.filter(h => h.driving).length
  return {
    n,
    avgPutts:     (totalPutts / n).toFixed(1),
    threePuttPct: Math.round((threePutts / n) * 100),
    bunkerPerRound: (totalBunkers / n).toFixed(1),
    girPct:       Math.round((girCount / n) * 100),
    drivingPct:   Math.round((drivingHits / n) * 100),
  }
}

async function generateTip(user, scores) {
  const stats = calcStats(scores)
  if (!stats) return null

  if (process.env.GOOGLE_AI_KEY) {
    try {
      const prompt = `Ты опытный гольф-тренер. Дай ОДНУ конкретную практическую подсказку (макс. 2 предложения, до 35 слов). Конкретная техника или упражнение — не общие фразы. Мотивирующий тон, только русский язык, 1 emoji в конце.

Игрок: ${user.first_name}, HCP ${user.hcp ?? '?'}
Статистика последних ${stats.n} лунок:
- Среднее патт/лунка: ${stats.avgPutts}
- Трёхпатты: ${stats.threePuttPct}% лунок
- GIR: ${stats.girPct}%
- Бункеры в среднем за лунку: ${stats.bunkerPerRound}
- Фэрвей: ${stats.drivingPct}% лунок

Определи главную слабость и дай конкретный совет для сегодняшнего раунда.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
          }),
        }
      )
      const data = await res.json()
      const tip = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (tip) return tip
    } catch (e) {
      console.error('[bot] Gemini tip error:', e.message)
    }
  }

  // Fallback: rule-based if Claude unavailable
  const avg = parseFloat(stats.avgPutts)
  if (avg > 2.1)
    return `${stats.avgPutts} патта/лунка — перед раундом 10 минут на патты с 2–3 м 🎯`
  if (stats.threePuttPct > 15)
    return `${stats.threePuttPct}% трёхпаттов — на длинных паттах целься в метровый круг, не в лунку 📍`
  if (parseFloat(stats.bunkerPerRound) > 0.4)
    return `Много бункеров — открывай фейс на 30°, бей на 3 см за мячом и ускоряй клюшку ⛱️`
  if (stats.girPct < 30)
    return `GIR ${stats.girPct}% — выбирай клюшку на шаг короче расчётной, цель центр грина 📐`
  return `GIR ${stats.girPct}%, фэрвей ${stats.drivingPct}% — отличная база, играй в своём ритме ⛳`
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

        // For round-start: generate personalized AI tip
        if (notif.context === 'round-start' && notif.user_id) {
          try {
            const { rows: [user] } = await db.query(
              'SELECT first_name, hcp FROM users WHERE id = $1',
              [notif.user_id]
            )
            const { rows: scores } = await db.query(
              `SELECT hs.putts, hs.bunker, hs.gir, hs.driving
               FROM hole_scores hs
               JOIN rounds r ON r.id = hs.round_id
               WHERE r.user_id = $1 AND hs.player_id = 'me' AND r.completed = true
               ORDER BY r.date DESC LIMIT 54`,
              [notif.user_id]
            )
            const tip = await generateTip(user ?? {}, scores)
            if (tip) message = `💬 ${tip}`
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

// Exit after 4h 55min — next cron fires at 5h, so no overlap/conflict
setTimeout(async () => {
  console.log('[bot] Scheduled shutdown for restart')
  await bot.stopPolling()
  await db.end()
  process.exit(0)
}, (4 * 60 + 55) * 60 * 1000)

console.log('[bot] Standalone bot started (will restart every 5h via cron)')
