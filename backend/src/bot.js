import TelegramBot from 'node-telegram-bot-api'
import { createRequire } from 'module'

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

let bot = null

const enablePolling = process.env.BOT_POLLING === 'true'

if (!token) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN not set — bot disabled')
} else {
  bot = new TelegramBot(token, botOptions(enablePolling ? { polling: true } : {}))

  if (enablePolling) {
    bot.onText(/\/start/, async (msg) => {
      console.log('[bot] /start from', msg.from?.id)
      const text = [
        `GolfMinsk Live — live scoring right in Telegram`,
        ``,
        `⛳ Track your score in real time`,
        `📊 Follow your stats and progress`,
        `🏆 Join Golf Club Minsk tournaments`,
        ``,
        `GolfMinsk Live. Your golf assistant.`,
      ].join('\n')
      try {
        await bot.sendMessage(msg.chat.id, text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⛳ Open GolfMinsk Live', web_app: { url: webAppUrl } }],
            ],
          },
        })
      } catch (err) {
        console.error('[bot] /start sendMessage error:', err.message)
      }
    })

    bot.on('polling_error', (err) => console.error('[bot] Polling error:', err.message))
    console.log('[bot] Bot initialized (polling)')
  } else {
    console.log('[bot] Bot initialized (webhook mode)')
  }
}

export function processUpdate(update) {
  if (bot) bot.processUpdate(update)
}

export { bot }
export default null
