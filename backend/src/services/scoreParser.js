import Anthropic from '@anthropic-ai/sdk'

function detectMediaType(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

export async function parseScorecardPhoto(imageBuffer) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30000 })
  const base64 = imageBuffer.toString('base64')
  const mediaType = detectMediaType(imageBuffer)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        {
          type: 'text',
          text: `This is a golf scorecard photo. Extract the scores for each hole that has been played.

Return ONLY a JSON object with no markdown or extra text:
{"holes":[{"hole":1,"score":4},{"hole":2,"score":5}],"courseName":"course name or null","totalScore":85}

Rules:
- hole: hole number (integer 1-18)
- score: number of strokes on that hole (integer 1-15)
- Only include holes that have actual scores filled in (skip empty/blank holes)
- If there are multiple players on the scorecard, extract the scores for the FIRST player
- courseName: the name of the golf course if visible on the card, otherwise null
- totalScore: sum of all hole scores
- If you cannot read any scores, return {"holes":[],"courseName":null,"totalScore":null}`,
        },
      ],
    }],
  })

  const raw = response.content[0].text.trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Claude response')

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
