import https from 'https'

function detectMediaType(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

const PROMPT = `This is a golf scorecard photo. Extract the scores for each hole that has been played.

Return ONLY a JSON object with no markdown or extra text:
{"holes":[{"hole":1,"score":4},{"hole":2,"score":5}],"courseName":"course name or null","totalScore":85}

Rules:
- hole: hole number (integer 1-18)
- score: number of strokes on that hole (integer 1-15)
- Only include holes that have actual scores filled in (skip empty/blank holes)
- If there are multiple players on the scorecard, extract the scores for the FIRST player
- courseName: the name of the golf course if visible on the card, otherwise null
- totalScore: sum of all hole scores
- If you cannot read any scores, return {"holes":[],"courseName":null,"totalScore":null}`

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
