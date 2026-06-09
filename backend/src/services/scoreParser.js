import https from 'https'

function detectMediaType(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

const PROMPT = `This is a golf scorecard photo. Extract the individual hole-by-hole scores for ONE player.

A golf scorecard has:
- A HOLE row (numbers 1-9 for front 9, 10-18 for back 9)
- A PAR row (values like 3, 4, or 5 — these are NOT player scores, ignore them)
- A STROKE INDEX / HCP row (values 1-18 — these are NOT player scores, ignore them)
- Player rows (Player A, Player B, etc.) with handwritten scores per hole
- An OUT total column (sum of holes 1-9) and IN total column (sum of holes 10-18)
- A TOTAL column at the end

IMPORTANT: Extract ONLY the individual hole scores from the player rows — NOT the PAR row, NOT the HCP row, NOT the OUT/IN totals, NOT the TOTAL. Each individual hole score for a single player should be a small integer (typically 3-10, rarely more than 12).

If there are multiple player rows, extract the scores for Player A (the first filled-in player row).

Return ONLY a JSON object with no markdown:
{"holes":[{"hole":1,"score":4},{"hole":2,"score":5}],"courseName":"course name or null","totalScore":85}

Rules:
- hole: integer 1-18
- score: strokes on that hole (integer 2-12). If a cell is empty or illegible, skip that hole.
- totalScore: sum of the extracted hole scores
- If you cannot find any player scores, return {"holes":[],"courseName":null,"totalScore":null}`

export async function parseScorecardPhoto(imageBuffer) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const mimeType = detectMediaType(imageBuffer)
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const body = JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl } },
        { type: 'text', text: PROMPT },
      ],
    }],
    max_tokens: 1024,
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
    req.setTimeout(30000, () => req.destroy(new Error('OpenRouter timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter: empty response')

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OpenRouter: no JSON in response')

  const parsed = JSON.parse(match[0])
  const holes = Array.isArray(parsed.holes)
    ? parsed.holes.filter(h =>
        Number.isInteger(h.hole) && h.hole >= 1 && h.hole <= 18 &&
        Number.isInteger(h.score) && h.score >= 1 && h.score <= 15
      )
    : []

  return {
    holes,
    courseName: parsed.courseName || null,
    totalScore: parsed.totalScore || null,
  }
}
