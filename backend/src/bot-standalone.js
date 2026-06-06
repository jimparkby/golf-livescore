import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import https from 'https'
import pg from 'pg'
import { createRequire } from 'module'
import { parseScorecardPhoto } from './services/scoreParser.js'

const require = createRequire(import.meta.url)

const { Pool } = pg
const db = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    })

// Create pending_scorecards table if it doesn't exist
db.query(`CREATE TABLE IF NOT EXISTS pending_scorecards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scores      JSONB NOT NULL,
  course_name TEXT,
  holes_count INTEGER DEFAULT 18,
  status      TEXT DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
)`).catch(err => console.error('[bot] pending_scorecards migration error:', err.message))

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
    console.warn('[bot] Proxy agent not created:', err.message)
    return null
  }
}

async function downloadPhoto(fileId) {
  const agent = createProxyAgent()
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const fileLink = await bot.getFileLink(fileId)
      const buffer = await new Promise((resolve, reject) => {
        const url = new URL(fileLink)
        const options = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method: 'GET' }
        if (agent) options.agent = agent
        const req = https.request(options, (res) => {
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
        })
        req.setTimeout(30000, () => req.destroy(new Error('timeout')))
        req.on('error', reject)
        req.end()
      })
      return buffer
    } catch (err) {
      console.warn(`[bot] download attempt ${attempt}:`, err.message)
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  return null
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

bot.on('photo', async (msg) => {
  const telegramId = msg.from?.id
  if (!telegramId) return

  let user
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId])
    user = rows[0]
  } catch (err) {
    console.error('[bot] db lookup error:', err.message)
    await bot.sendMessage(msg.chat.id, '❌ Ошибка подключения к базе данных. Попробуйте позже.')
    return
  }

  if (!user) {
    await bot.sendMessage(msg.chat.id, 'Сначала откройте GolfMinsk Live, чтобы зарегистрироваться.')
    return
  }

  const statusMsg = await bot.sendMessage(msg.chat.id, '⏳ Обработка...')

  try {
    const photo = msg.photo[msg.photo.length - 1]
    const buffer = await downloadPhoto(photo.file_id)

    if (!buffer) {
      await bot.editMessageText('❌ Не удалось загрузить фото. Попробуйте ещё раз.', {
        chat_id: msg.chat.id, message_id: statusMsg.message_id,
      })
      return
    }

    const result = await parseScorecardPhoto(buffer)

    if (!result.holes.length) {
      await bot.editMessageText('❌ Не удалось распознать скор-карту. Убедитесь, что фото чёткое.', {
        chat_id: msg.chat.id, message_id: statusMsg.message_id,
      })
      return
    }

    const { rows: [sc] } = await db.query(
      `INSERT INTO pending_scorecards (user_id, scores, course_name, holes_count)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, JSON.stringify(result.holes), result.courseName, result.holes.length]
    )

    await bot.editMessageText('✅ Карта добавлена. Подтвердите счёт в приложении.', {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Подтвердить счёт', web_app: { url: `${webAppUrl}?confirm=${sc.id}` } },
        ]],
      },
    })
  } catch (err) {
    console.error('[bot] photo error:', err.message)
    await bot.editMessageText('❌ Ошибка обработки. Попробуйте ещё раз.', {
      chat_id: msg.chat.id, message_id: statusMsg.message_id,
    })
  }
})

let consecutiveErrors = 0
bot.on('polling_error', (err) => {
  consecutiveErrors++
  console.error(`[bot] Polling error (${consecutiveErrors}):`, err.message)
  if (consecutiveErrors >= 10) {
    console.warn('[bot] Too many polling errors — pausing 60s before retry')
    bot.stopPolling().catch(() => {})
    consecutiveErrors = 0
    setTimeout(() => {
      console.log('[bot] Restarting polling...')
      bot.startPolling().catch((e) => console.error('[bot] Restart failed:', e.message))
    }, 60000)
  }
})
bot.on('message', () => { consecutiveErrors = 0 })

console.log('[bot] Standalone bot started (polling)')
