import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import pg from 'pg'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
  console.error('[cron] TELEGRAM_BOT_TOKEN not set')
  process.exit(1)
}

const bot = new TelegramBot(token)

const webAppBtn = () => ({
  reply_markup: {
    inline_keyboard: [[{ text: '⛳ Открыть приложение', web_app: { url: webAppUrl } }]],
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
      console.error('[cron] Gemini error:', e.message)
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

async function run() {
  try {
    const { rows } = await db.query(
      'SELECT * FROM scheduled_notifications WHERE send_at <= NOW() AND sent = FALSE ORDER BY send_at ASC LIMIT 50'
    )
    console.log(`[cron] Found ${rows.length} pending notifications`)

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
            console.error('[cron] tip error:', e.message)
          }
        }

        await bot.sendMessage(notif.telegram_id, message, webAppBtn())
        await db.query('UPDATE scheduled_notifications SET sent = TRUE WHERE id = $1', [notif.id])
        console.log('[cron] sent', notif.context, 'to', notif.telegram_id)
      } catch (e) {
        console.error('[cron] send error for notif', notif.id, ':', e.message)
      }
    }
  } catch (err) {
    console.error('[cron] DB error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

run()
