import { Router } from 'express'
import https from 'https'
import { requireAuth } from '../middleware/auth.js'

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
router.post('/pregame', requireAuth, async (req, res, next) => {
  try {
    const { rounds = [], profile = {} } = req.body
    const name = profile.firstName || 'Golfer'
    const hcp = profile.hcp ?? null

    if (rounds.length === 0) {
      return res.json({ comment: `Good luck on your first round, ${name}! Every great golfer starts somewhere.` })
    }

    // Build concise stats for the prompt
    const recent = rounds.slice(0, 10)

    const roundStats = recent.map((r, i) => {
      const playerScores = Object.values(r.scores || {})[0] ?? []
      const total = playerScores.reduce((s, h) => s + (h.score || 0), 0)
      const holes = playerScores.filter(h => h.score > 0).length
      const pars = playerScores.filter(h => {
        const courseHoles = [
          {n:1,p:4},{n:2,p:5},{n:3,p:3},{n:4,p:4},{n:5,p:4},{n:6,p:4},
          {n:7,p:3},{n:8,p:4},{n:9,p:5},{n:10,p:4},{n:11,p:3},{n:12,p:4},
          {n:13,p:5},{n:14,p:4},{n:15,p:4},{n:16,p:3},{n:17,p:5},{n:18,p:4},
        ]
        const par = courseHoles.find(c => c.n === h.hole)?.p ?? 4
        return h.score <= par
      }).length

      const girs = playerScores.filter(h => h.gir).length
      const putts = playerScores.reduce((s, h) => s + (h.putts || 0), 0)
      const date = r.date ? new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''

      return `Round ${i + 1} (${date}): ${holes} holes, score ${total}, pars/birdies ${pars}/${holes}${girs > 0 ? `, GIR ${girs}/${holes}` : ''}${putts > 0 ? `, putts ${putts}` : ''}`
    }).join('\n')

    // Hole-level pattern analysis: find weakest holes
    const holeAverages = {}
    const holePar = {1:4,2:5,3:3,4:4,5:4,6:4,7:3,8:4,9:5,10:4,11:3,12:4,13:5,14:4,15:4,16:3,17:5,18:4}
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
      .map(h => `hole ${h.hole} (+${h.avg.toFixed(1)} avg vs par)`)

    const prompt = `You are a sharp, experienced golf coach giving a pre-round briefing to a club member.

Player: ${name}
Handicap Index: ${hcp !== null ? hcp : 'not yet calculated'}
Recent rounds (newest first):
${roundStats}
${weakHoles.length > 0 ? `\nWeakest holes based on history: ${weakHoles.join(', ')}` : ''}

Write a short pre-game message (2-3 sentences max). Be specific — reference actual numbers from their stats (scores, trends, specific holes). Sound like a real coach who has watched them play, not a generic motivational bot. Be direct, a bit casual. Can mention something to focus on today based on the patterns. Language: match the player name — if it looks Russian/Slavic use Russian, otherwise English.`

    const comment = await callOpenRouter(prompt)
    res.json({ comment })
  } catch (err) {
    console.error('[ai/pregame]', err.message)
    // Graceful fallback — don't fail the whole page
    res.json({ comment: null })
  }
})

export default router
