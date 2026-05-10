import TelegramBot from 'node-telegram-bot-api'
import cron from 'node-cron'
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
