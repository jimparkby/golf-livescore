import https from 'https'

function detectMediaType(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

const PROMPT = `This is a golf scorecard photo. Extract hole-by-hole scores for ALL players.

A golf scorecard structure:
- HOLE row: numbers 1–18
- PAR row: values 3, 4, or 5 — these are course pars, NOT player scores — SKIP this row
- STROKE INDEX / HCP row: values 1–18 — NOT scores — SKIP this row
- PLAYER rows: labeled A, B, C, D (sometimes with player names in the header)
  Each player row has handwritten scores per hole
- OUT column: printed sum of holes 1–9 for each player
- IN column: printed sum of holes 10–18 for each player
- TOTAL column: overall total

YOUR TASK: For EACH player row that has scores filled in, extract:
1. label — player letter (A, B, C, D)
2. name — player name if visible in header section (or null)
3. holes — array of {hole, score} for each hole that has a score
4. outTotal — the OUT subtotal written for that player (sum of holes 1–9)
5. inTotal — the IN subtotal written for that player (sum of holes 10–18)

CRITICAL reading rules:
- PAR values (3,4,5) printed on the card are NOT player scores — never include them
- Player scores are handwritten; each hole score is typically 3–10 strokes
- handwritten 1 and 7 can look similar — check context (a score of 1 is impossible, 17 is very high)
- handwritten 4 and 9, 6 and 0 can look similar — verify against OUT/IN totals
- If a player row appears empty or blank, skip it
- Read the OUT and IN totals from the card to cross-check your extracted scores
  (sum of holes 1–9 should roughly match the OUT total; holes 10–18 should match IN)

Return ONLY valid JSON with no markdown fences:
{
  "players": [
    {
      "label": "A",
      "name": "John Smith",
      "holes": [{"hole": 1, "score": 5}, {"hole": 2, "score": 4}],
      "outTotal": 42,
      "inTotal": 43
    }
  ],
  "courseName": "course name or null"
}

If you cannot find any player scores at all, return: {"players":[],"courseName":null}`

export async function parseScorecardPhoto(imageBuffer) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const mimeType = detectMediaType(imageBuffer)
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const body = JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        { type: 'text', text: PROMPT },
      ],
    }],
    max_tokens: 2048,
  })

  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`OpenRouter ${res.statusCode}: ${raw.slice(0, 300)}`))
        try { resolve(JSON.parse(raw)) } catch { reject(new Error('OpenRouter: invalid JSON')) }
      })
      res.on('error', reject)
    })
    req.setTimeout(45000, () => req.destroy(new Error('OpenRouter timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter: empty response')

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OpenRouter: no JSON in response')

  const parsed = JSON.parse(match[0])

  const players = Array.isArray(parsed.players)
    ? parsed.players
        .filter(p => Array.isArray(p.holes) && p.holes.length > 0)
        .map(p => ({
          label: String(p.label ?? '?').toUpperCase(),
          name: p.name || null,
          holes: p.holes.filter(h =>
            Number.isInteger(h.hole) && h.hole >= 1 && h.hole <= 18 &&
            Number.isInteger(h.score) && h.score >= 1 && h.score <= 15
          ),
          outTotal: p.outTotal ?? null,
          inTotal: p.inTotal ?? null,
        }))
        .filter(p => p.holes.length > 0)
    : []

  return {
    players,
    courseName: parsed.courseName || null,
  }
}
