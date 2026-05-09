import TelegramBot from 'node-telegram-bot-api'
import cron from 'node-cron'
import Anthropic from '@anthropic-ai/sdk'
import { createRequire } from 'module'
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

// Generate personalized tip via Claude based on recent hole scores
export async function generateTip(user, scores) {
  if (!process.env.ANTHROPIC_API_KEY || scores.length === 0) return null

  const totalPutts = scores.reduce((s, h) => s + (h.putts || 0), 0)
  const threePutt = scores.filter(h => h.putts >= 3).length
  const bunkers = scores.reduce((s, h) => s + (h.bunker || 0), 0)
  const girCount = scores.filter(h => h.gir).length
  const n = scores.length
  const avgPutts = (totalPutts / n).toFixed(1)
  const girPct = Math.round((girCount / n) * 100)

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [{
      role: 'user',
      content: `Гольфист ${user.first_name}, HCP ${user.hcp}. Последние ${n} лунок: среднее патт/лунка ${avgPutts}, 3-паттов ${threePutt}, бункеров ${bunkers}, GIR ${girPct}%. Напиши ОДНУ конкретную дружескую подсказку на русском (до 15 слов), основываясь на главной слабости. Только текст, без вводных слов.`,
    }],
  })
  return msg.content[0]?.text?.trim() ?? null
}

async function runDailyNotifications() {
  try {
    const { rows: users } = await db.query(`
      SELECT u.telegram_id, u.first_name, u.hcp,
        (
          SELECT json_agg(hs.* ORDER BY r.date DESC)
          FROM hole_scores hs
          JOIN rounds r ON r.id = hs.round_id
          WHERE r.user_id = u.id
            AND hs.player_id = 'me'
            AND r.completed = true
            AND r.date > NOW() - INTERVAL '30 days'
          LIMIT 54
        ) AS recent_scores
      FROM users u
      WHERE u.notifications_enabled = true
        AND u.telegram_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM rounds r
          WHERE r.user_id = u.id
            AND r.completed = true
            AND r.date > NOW() - INTERVAL '60 days'
        )
    `)

    for (const user of users) {
      try {
        const scores = user.recent_scores || []
        const tip = await generateTip(user, scores)
        const text = `☀️ Доброе утро, ${user.first_name}!\n${tip ? `\n💬 ${tip}\n` : ''}\nХорошей игры! ⛳`
        await bot.sendMessage(user.telegram_id, text, webAppBtn())
      } catch (e) {
        console.error(`[bot] Failed to notify ${user.telegram_id}:`, e.message)
      }
    }
    console.log(`[bot] Daily notifications sent to ${users.length} users`)
  } catch (err) {
    console.error('[bot] Daily notification error:', err)
  }
}

async function runScheduledNotifications() {
  try {
    const { rows } = await db.query(`
      SELECT * FROM scheduled_notifications
      WHERE send_at <= NOW() AND sent = FALSE
    `)
    for (const notif of rows) {
      try {
        await bot.sendMessage(notif.telegram_id, notif.message, webAppBtn())
        await db.query('UPDATE scheduled_notifications SET sent = TRUE WHERE id = $1', [notif.id])
      } catch (e) {
        console.error(`[bot] Failed to send scheduled notif ${notif.id}:`, e.message)
      }
    }
  } catch (err) {
    console.error('[bot] Scheduled notification error:', err)
  }
}

// BOT_POLLING=true enables polling in this process.
// When the standalone bot (bot-standalone.js) runs separately, keep this false
// to avoid two polling instances conflicting over the same token.
const enablePolling = process.env.BOT_POLLING === 'true'

if (!token) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN not set — bot disabled')
} else if (enablePolling) {
  bot = new TelegramBot(token, botOptions({ polling: true }))

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

  cron.schedule('* * * * *', runScheduledNotifications)

  console.log('[bot] Bot initialized (polling mode)')
} else if (token) {
  console.log('[bot] Token set but BOT_POLLING!=true — polling disabled (standalone bot handles it)')
}

export function processUpdate(update) {
  if (bot) bot.processUpdate(update)
}

export { bot }
export default null
