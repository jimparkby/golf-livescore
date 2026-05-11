import TelegramBot from 'node-telegram-bot-api'
import cron from 'node-cron'
import { createRequire } from 'module'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from './db.js'

const require = createRequire(import.meta.url)

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

function botOptions(extra = {}) {
  const agent = createProxyAgent()
  return agent ? { ...extra, request: { agent } } : extra
}

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.FRONTEND_URL || 'https://your-app-url.com'
const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || ''

let bot = null

const webAppBtn = (label = '⛳ Открыть приложение') => ({
  reply_markup: {
    inline_keyboard: [[{ text: label, web_app: { url: webAppUrl } }]],
  },
})

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
    avgPutts:       (totalPutts / n).toFixed(1),
    threePuttPct:   Math.round((threePutts / n) * 100),
    bunkerPerRound: (totalBunkers / n).toFixed(1),
    girPct:         Math.round((girCount / n) * 100),
    drivingPct:     Math.round((drivingHits / n) * 100),
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

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      const tip = result.response.text().trim()
      if (tip) return tip
    } catch (e) {
      console.error('[bot] Gemini tip error:', e.message)
    }
  }

  // Fallback: rule-based
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

async function runScheduledNotifications() {
  if (!bot) return
  try {
    const { rows } = await db.query(
      'SELECT * FROM scheduled_notifications WHERE send_at <= NOW() AND sent = FALSE ORDER BY send_at ASC LIMIT 50'
    )
    for (const notif of rows) {
      try {
        let message = notif.message

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
        console.error(`[bot] Failed to send scheduled notif ${notif.id}:`, e.message)
      }
    }
  } catch (err) {
    console.error('[bot] Scheduled notification error:', err)
  }
}

// BOT_POLLING=true enables polling (receiving messages from users, e.g. /start).
// Notification cron always runs when the token is present.
const enablePolling = process.env.BOT_POLLING === 'true'

if (!token) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN not set — bot disabled')
} else {
  bot = new TelegramBot(token, botOptions(enablePolling ? { polling: true } : {}))

  if (enablePolling) {
    bot.onText(/\/start/, async (msg) => {
      console.log('[bot] /start from', msg.from?.id)
      const text = [
        `GolfMinsk Live — живой скоринг прямо в Telegram`,
        ``,
        `⛳ Веди счёт в реальном времени`,
        `📊 Следи за статистикой и прогрессом`,
        `🏆 Участвуй в турнирах Golf Club Minsk`,
        ``,
        `GolfMinsk Live. Твой гольф-ассистент.`,
      ].join('\n')
      try {
        await bot.sendMessage(msg.chat.id, text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⛳ Открыть GolfMinsk Live', web_app: { url: webAppUrl } }],
            ],
          },
        })
      } catch (err) {
        console.error('[bot] /start sendMessage error:', err.message)
      }
    })

    bot.on('polling_error', (err) => console.error('[bot] Polling error:', err.message))
    console.log('[bot] Bot initialized (polling + notifications)')
  } else {
    console.log('[bot] Bot initialized (notifications only, no polling)')
  }

  // Always run notification cron when token is present
  cron.schedule('* * * * *', runScheduledNotifications)
}

export function processUpdate(update) {
  if (bot) bot.processUpdate(update)
}

export { bot }
export default null
