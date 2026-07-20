import { Router } from 'express'
import https from 'https'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'
import { bot } from '../bot.js'

const router = Router()

async function callOpenRouter(prompt, model = 'openai/gpt-4o-mini', max_tokens = 300, temperature = 0.85) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens,
    temperature,
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
// Body: { rounds: Round[], profile: { hcp, firstName }, currentCourse?: { id, name } }
// Sends AI analysis as a Telegram message to the user
router.post('/pregame', requireAuth, async (req, res, next) => {
  try {
    const { rounds = [], profile = {}, currentCourse } = req.body
    const name = profile.firstName || 'Игрок'
    const hcp = profile.hcp ?? null

    // Get user's telegram_id to send the message
    const { rows } = await db.query('SELECT telegram_id FROM users WHERE id = $1', [req.user.userId])
    const telegramId = rows[0]?.telegram_id
    if (!telegramId || !bot) return res.json({ ok: true })

    let comment
    if (rounds.length === 0) {
      const clubName = currentCourse?.name?.split(' · ')[1] || currentCourse?.name || ''
      comment = currentCourse
        ? `⛳ Удачи в первом раунде на ${clubName}, ${name}! С чего-то нужно начинать.`
        : `⛳ Удачи в первом раунде, ${name}! С чего-то нужно начинать.`
    } else {
      const recent = rounds.slice(0, 10)
      const currentCourseId = currentCourse?.id

      // Фильтруем раунды на текущем поле если оно указано
      const relevantRounds = currentCourseId
        ? recent.filter(r => r.courseId === currentCourseId)
        : recent

      // Если на текущем поле нет истории, используем общую статистику но упоминаем поле
      const roundsForStats = relevantRounds.length > 0 ? relevantRounds : recent

      const roundStats = roundsForStats.map((r, i) => {
        const playerScores = Object.values(r.scores || {})[0] ?? []
        const total = playerScores.reduce((s, h) => s + (h.score || 0), 0)
        const holes = playerScores.filter(h => h.score > 0).length
        const holePar = {1:4,2:5,3:3,4:4,5:4,6:4,7:3,8:4,9:5,10:4,11:3,12:4,13:5,14:4,15:4,16:3,17:5,18:4}
        const pars = playerScores.filter(h => h.score <= (holePar[h.hole] ?? 4)).length
        const girs = playerScores.filter(h => h.gir).length
        const putts = playerScores.reduce((s, h) => s + (h.putts || 0), 0)
        const date = r.date ? new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
        const courseName = r.courseName ? ` на ${r.courseName}` : ''
        return `Раунд ${i + 1} (${date}${courseName}): ${holes} лунок, счёт ${total}, паров ${pars}${girs > 0 ? `, GIR ${girs}/${holes}` : ''}${putts > 0 ? `, патты ${putts}` : ''}`
      }).join('\n')

      const holePar = {1:4,2:5,3:3,4:4,5:4,6:4,7:3,8:4,9:5,10:4,11:3,12:4,13:5,14:4,15:4,16:3,17:5,18:4}
      const holeAverages = {}
      for (const r of roundsForStats) {
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

      // Извлечь название клуба без поля (например "Golf Club Minsk" вместо "Championship · Golf Club Minsk")
      const clubName = currentCourse?.name?.split(' · ')[1] || currentCourse?.name || ''
      const courseContext = currentCourse
        ? (relevantRounds.length > 0
            ? `\nСегодня на поле: ${clubName} (статистика на этом поле)`
            : `\nСегодня на поле: ${clubName} (новое поле для тебя)`)
        : ''

      const prompt = `Ты опытный гольф-тренер. Игрок ${name} сейчас собирается на поле, напиши ему короткое сообщение в Telegram.

Гандикап: ${hcp !== null ? hcp : 'ещё не рассчитан'}${courseContext}
Последние раунды (от нового к старому):
${roundStats}
${weakHoles.length > 0 ? `\nПроблемные лунки по истории: ${weakHoles.join(', ')}` : ''}

Напиши 2-3 предложения максимум. Используй конкретные числа из статистики — тренд счётов, слабые лунки, прогресс. ${currentCourse ? `Учти что игрок сегодня на ${clubName}.` : ''} Говори как реальный тренер который следит за игрой, не как бот по скрипту. Можно добавить один конкретный совет на сегодня. Отвечай на русском. Без приветствия типа "Привет!" — сразу к делу.`

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

// POST /api/ai/course
// Body: { query: string }
// Returns: { course: Course }
router.post('/course', requireAuth, async (req, res, next) => {
  try {
    const { query } = req.body
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Course name is required' })
    }

    const courseName = query.trim().slice(0, 120)
    const timestamp = Date.now()

    const prompt = `You are a professional golf data expert. Generate accurate golf course data for: "${courseName}"

Return ONLY a valid JSON object (no markdown, no comments, no explanation) with this exact structure:
{
  "id": "custom-${timestamp}",
  "name": "Official Course Name",
  "club": "Club / Resort Name",
  "address": "Full address, Country",
  "website": "https://...",
  "phone": "+1234567890",
  "designer": "Designer Name or empty string",
  "totalPar": 72,
  "tees": [
    { "color": "black",  "label": "Black",  "cssColor": "#1f2937", "rating": 74.5, "slope": 135, "totalMeters": 6500 },
    { "color": "white",  "label": "White",  "cssColor": "#f8fafc", "rating": 72.1, "slope": 130, "totalMeters": 6100 },
    { "color": "yellow", "label": "Yellow", "cssColor": "#f59e0b", "rating": 70.0, "slope": 125, "totalMeters": 5700 },
    { "color": "blue",   "label": "Blue",   "cssColor": "#3b82f6", "rating": 69.5, "slope": 123, "totalMeters": 5400 },
    { "color": "red",    "label": "Red",    "cssColor": "#ef4444", "rating": 67.5, "slope": 118, "totalMeters": 5000 }
  ],
  "holes": [
    { "number": 1, "par": 4, "hcp": 5, "meters": { "black": 400, "white": 380, "yellow": 355, "blue": 340, "red": 315 } },
    ... all 18 holes
  ]
}

Important rules:
- "hcp" (stroke index) values MUST be unique integers 1 through 18
- totalPar MUST equal the exact sum of all 18 hole par values
- Par distribution: typically 4 par-3s + 10 par-4s + 4 par-5s = 72
- All distances in METERS (multiply yards by 0.9144)
- If the course doesn't have a black or blue tee, use the same values as white or yellow
- If this is a real course you know, use real data; otherwise generate plausible data
- tees totalMeters must match the sum of all holes meters for that color`

    const raw = await callOpenRouter(prompt, 'openai/gpt-4o', 2200, 0.3)

    // Extract JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI did not return valid JSON')

    let course
    try {
      course = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('AI returned malformed JSON')
    }

    // Validate structure
    if (!course.name || !Array.isArray(course.holes) || course.holes.length < 9 || !Array.isArray(course.tees) || course.tees.length === 0) {
      throw new Error('AI returned incomplete course data')
    }

    // Force unique id
    course.id = `custom-${timestamp}`

    // Ensure totalPar is correct
    course.totalPar = course.holes.reduce((sum, h) => sum + (h.par || 4), 0)

    res.json({ course })
  } catch (err) {
    console.error('[ai/course]', err.message)
    next(err)
  }
})

export default router
