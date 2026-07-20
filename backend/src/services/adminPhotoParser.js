import https from 'https'

function detectMediaType(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg'
}

const PARTICIPANTS_PROMPT = `This is a photo of a golf tournament participants list (flight list).
Extract ALL participant information from this image.

Common formats:
- Table with columns: Name, Handicap, Phone, Email
- Simple list with names and handicaps
- Flight list with player groups
- Registration sheet

YOUR TASK: Extract each participant's information:
1. name — full name of the player (required)
2. handicap — handicap value (if visible, or null)
3. phone — phone number (if visible, or null)
4. email — email address (if visible, or null)

Reading rules:
- Names can be in Cyrillic (Russian) or Latin
- Handicap is usually a number like 12.5, 18.0, 24.0
- Skip headers, titles, and empty rows
- If multiple flights/groups, extract all participants
- Phone format: +375291234567 or similar
- Email format: user@example.com

Return ONLY valid JSON with no markdown fences:
{
  "participants": [
    {
      "name": "Иванов Иван",
      "handicap": 12.5,
      "phone": "+375291234567",
      "email": "ivan@example.com"
    },
    {
      "name": "Петров Петр",
      "handicap": 18.0,
      "phone": null,
      "email": null
    }
  ]
}

If you cannot find any participants, return: {"participants":[]}`

const RESULTS_PROMPT = `This is a photo of golf tournament results.
Extract ALL results from this image.

Common formats:
- Results table with: Place, Name, Score
- Leaderboard with rankings
- Multiple groups/divisions
- Stroke play or Stableford format

YOUR TASK: Extract each result:
1. place — position/rank (1, 2, 3, etc.)
2. name — player's full name
3. score — final score (number)
4. group — group/division name (if visible, or null)

Reading rules:
- Place is usually 1, 2, 3, or can be "1st", "2nd", etc.
- Names can be in Cyrillic (Russian) or Latin
- Score is the final number (can be gross, net, or Stableford points)
- If multiple groups (Men/Women, different handicap ranges), extract all
- Skip headers and empty rows
- Handle ties (same place number)

Return ONLY valid JSON with no markdown fences:
{
  "results": [
    {
      "place": 1,
      "name": "Иванов Иван",
      "score": 72,
      "group": "Группа Man HCP по 13,5"
    },
    {
      "place": 2,
      "name": "Петров Петр",
      "score": 74,
      "group": "Группа Man HCP по 13,5"
    }
  ]
}

If you cannot find any results, return: {"results":[]}`

async function callVisionAPI(imageBuffer, prompt) {
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
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 4096,
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
    req.setTimeout(60000, () => req.destroy(new Error('OpenRouter timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter: empty response')

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OpenRouter: no JSON in response')

  return JSON.parse(match[0])
}

/**
 * Parse participants photo (flight list)
 */
export async function parseParticipantsPhoto(imageBuffer) {
  const parsed = await callVisionAPI(imageBuffer, PARTICIPANTS_PROMPT)

  const participants = Array.isArray(parsed.participants)
    ? parsed.participants
        .filter(p => p.name && p.name.trim().length > 0)
        .map(p => ({
          name: String(p.name).trim(),
          handicap: typeof p.handicap === 'number' ? p.handicap : (parseFloat(p.handicap) || 0),
          phone: p.phone && String(p.phone).trim() || null,
          email: p.email && String(p.email).trim() || null,
        }))
    : []

  return { participants }
}

/**
 * Parse tournament results photo
 */
export async function parseTournamentResultsPhoto(imageBuffer) {
  const parsed = await callVisionAPI(imageBuffer, RESULTS_PROMPT)

  const results = Array.isArray(parsed.results)
    ? parsed.results
        .filter(r => r.name && r.place && r.score !== undefined)
        .map(r => ({
          place: parseInt(r.place, 10) || 0,
          name: String(r.name).trim(),
          score: parseInt(r.score, 10) || 0,
          group: r.group && String(r.group).trim() || null,
        }))
        .filter(r => r.place > 0 && r.score > 0)
    : []

  return { results }
}
