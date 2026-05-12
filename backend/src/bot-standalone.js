import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
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

bot.onText(/\/start/, async (msg) => {
  console.log('[bot] /start from', msg.from?.id)
  const text = [
    'GolfMinsk Live — live scoring right in Telegram',
    '',
    '⛳ Track your score in real time',
    '📊 Follow your stats and progress',
    '🏆 Join Golf Club Minsk tournaments',
    '',
    'GolfMinsk Live. Your golf assistant.',
  ].join('\n')
  try {
    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⛳ Open GolfMinsk Live', web_app: { url: webAppUrl } }]],
      },
    })
  } catch (err) {
    console.error('[bot] /start error:', err.message)
  }
})

bot.on('polling_error', (err) => console.error('[bot] Polling error:', err.message))

// Exit after 4h 55min — next cron fires at 5h, so no overlap/conflict
setTimeout(async () => {
  console.log('[bot] Scheduled shutdown for restart')
  await bot.stopPolling()
  await db.end()
  process.exit(0)
}, (4 * 60 + 55) * 60 * 1000)

console.log('[bot] Standalone bot started (will restart every 5h via cron)')
