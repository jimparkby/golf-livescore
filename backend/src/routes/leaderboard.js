import { Router } from 'express'
import fetch from 'node-fetch'

const router = Router()

// Google Sheets CSV export URL
const SHEETS_BASE = 'https://docs.google.com/spreadsheets/d/1EhE7zCe32OvXx4J1zaGy4oJuJpzEnXkwjvCR1x_VddE'

// Sheet IDs (gid)
const SHEETS = {
  overall: '423773857',  // Рейтинг Общий
  // TODO: Add other sheets when gid is provided
  // male: 'XXXXXX',
  // female: 'XXXXXX',
  // tournaments: 'XXXXXX',
}

// Cache for 1 hour
let cache = {
  data: null,
  timestamp: 0,
  ttl: 60 * 60 * 1000, // 1 hour
}

/**
 * Parse CSV data from Google Sheets
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const players = []

  // Skip header row, parse data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // CSV parsing with quoted fields support
    const fields = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())

    // Parse player data
    // Format: Rank, Name, Tournaments, HCP, Rating, Rating (dup), ...
    if (fields.length >= 5) {
      const rank = parseInt(fields[0]) || i
      const name = fields[1] || ''
      const tournaments = parseInt(fields[2]) || 0
      const hcp = parseFloat(fields[3]?.replace(',', '.')) || 0
      const rating = parseFloat(fields[4]?.replace(',', '.').replace(/\s/g, '')) || 0

      if (name) {
        players.push({
          rank,
          name,
          tournaments,
          hcp: parseFloat(hcp.toFixed(1)),
          rating: Math.round(rating),
        })
      }
    }

    // Also parse female players from same row (columns 6-10)
    if (fields.length >= 10) {
      const femaleName = fields[6] || ''
      if (femaleName) {
        const femaleRank = parseInt(fields[0]) || i
        const femaleTournaments = parseInt(fields[7]) || 0
        const femaleHcp = parseFloat(fields[8]?.replace(',', '.')) || 0
        const femaleRating = parseFloat(fields[9]?.replace(',', '.').replace(/\s/g, '')) || 0

        players.push({
          rank: femaleRank,
          name: femaleName,
          tournaments: femaleTournaments,
          hcp: parseFloat(femaleHcp.toFixed(1)),
          rating: Math.round(femaleRating),
          gender: 'female',
        })
      }
    }
  }

  return players
}

/**
 * Fetch leaderboard data from Google Sheets
 */
async function fetchLeaderboard() {
  try {
    const url = `${SHEETS_BASE}/gviz/tq?tqx=out:csv&gid=${SHEETS.overall}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const csvText = await response.text()
    const players = parseCSV(csvText)

    // Split into male and female
    const male = players.filter(p => !p.gender).sort((a, b) => b.rating - a.rating)
    const female = players.filter(p => p.gender === 'female').sort((a, b) => b.rating - a.rating)

    // Re-rank after splitting
    male.forEach((p, i) => p.rank = i + 1)
    female.forEach((p, i) => p.rank = i + 1)

    return {
      overall: [...male, ...female].sort((a, b) => b.rating - a.rating).slice(0, 100),
      male: male.slice(0, 50),
      female: female.slice(0, 50),
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[leaderboard] Fetch error:', error)
    throw error
  }
}

/**
 * GET /api/leaderboard
 * Returns leaderboard data with caching
 */
router.get('/', async (req, res, next) => {
  try {
    const now = Date.now()

    // Return cached data if fresh
    if (cache.data && (now - cache.timestamp) < cache.ttl) {
      return res.json(cache.data)
    }

    // Fetch fresh data
    const data = await fetchLeaderboard()

    // Update cache
    cache.data = data
    cache.timestamp = now

    res.json(data)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/leaderboard/refresh
 * Force refresh cache (no auth required for now)
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const data = await fetchLeaderboard()
    cache.data = data
    cache.timestamp = Date.now()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
