import { Router } from 'express'
import https from 'https'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'
import { bot } from '../bot.js'

const router = Router()

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const body = JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.85,
  })

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`OpenRouter ${res.statusCode}: ${raw.slice(0, 200)}`))
        try {
          const data = JSON.parse(raw)
          resolve(data?.choices?.[0]?.message?.content?.trim() ?? '')
        } catch {
          reject(new Error('OpenRouter: invalid JSON'))
        }
      })
      res.on('error', reject)
    })
    req.setTimeout(20000, () => req.destroy(new Error('OpenRouter timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// POST /api/ai/pregame
// Body: { rounds: Round[], profile: { hcp, firstName } }
// Sends AI analysis as a Telegram message to the user
router.post('/pregame', requireAuth, async (req, res, next) => {
  try {
    const { rounds = [], profile = {} } = req.body
    const name = profile.firstName || 'Игрок'
    const hcp = profile.hcp ?? null

    // Get user's telegram_id to send the message
    const { rows } = await db.query('SELECT telegram_id FROM users WHERE id = $1', [req.user.userId])
    const telegramId = rows[0]?.telegram_id
    if (!telegramId || !bot) return res.json({ ok: true })

    let comment
    if (rounds.length === 0) {
      comment = `⛳ Удачи в первом раунде, ${name}! С чего-то нужно начинать.`
    } else {
      const recent = rounds.slice(0, 10)

      const roundStats = recent.map((r, i) => {
        const playerScores = Object.values(r.scores || {})[0] ?? []
        const total = playerScores.reduce((s, h) => s + (h.score || 0), 0)
        const holes = playerScores.filter(h => h.score > 0).length
        const holePar = {1:4,2:5,3:3,4:4,5:4,6:4,7:3,8:4,9:5,10:4,11:3,12:4,13:5,14:4,15:4,16:3,17:5,18:4}
        const pars = playerScores.filter(h => h.score <= (holePar[h.hole] ?? 4)).length
        const girs = playerScores.filter(h => h.gir).length
        const putts = playerScores.reduce((s, h) => s + (h.putts || 0), 0)
        const date = r.date ? new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
        return `Раунд ${i + 1} (${date}): ${holes} лунок, счёт ${total}, паров ${pars}${girs > 0 ? `, GIR ${girs}/${holes}` : ''}${putts > 0 ? `, патты ${putts}` : ''}`
      }).join('\n')

      const holePar = {1:4,2:5,3:3,4:4,5:4,6:4,7:3,8:4,9:5,10:4,11:3,12:4,13:5,14:4,15:4,16:3,17:5,18:4}
      const holeAverages = {}
      for (const r of recent) {
        for (const scores of Object.values(r.scores || {})) {
          for (const s of scores) {
            if (s.score > 0) {
              if (!holeAverages[s.hole]) holeAverages[s.hole] = []
              holeAverages[s.hole].push(s.score - (holePar[s.hole] ?? 4))
            }
          }
        }
      }
      const weakHoles = Object.entries(holeAverages)
        .map(([hole, diffs]) => ({ hole: Number(hole), avg: diffs.reduce((a, b) => a + b, 0) / diffs.length }))
        .filter(h => h.avg > 0.5)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map(h => `лунка ${h.hole} (+${h.avg.toFixed(1)} к пару)`)

      const prompt = `Ты опытный гольф-тренер. Игрок ${name} сейчас собирается на поле, напиши ему короткое сообщение в Telegram.

Гандикап: ${hcp !== null ? hcp : 'ещё не рассчитан'}
Последние раунды (от нового к старому):
${roundStats}
${weakHoles.length > 0 ? `\nПроблемные лунки по истории: ${weakHoles.join(', ')}` : ''}

Напиши 2-3 предложения максимум. Используй конкретные числа из статистики — тренд счётов, слабые лунки, прогресс. Говори как реальный тренер который следит за игрой, не как бот по скрипту. Можно добавить один конкретный совет на сегодня. Отвечай на русском. Без приветствия типа "Привет!" — сразу к делу.`

      comment = await callOpenRouter(prompt)
    }

    if (comment) {
      await bot.sendMessage(telegramId, `🏌️ ${comment}`)
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[ai/pregame]', err.message)
    res.json({ ok: true }) // never fail the client
  }
})

export default router
