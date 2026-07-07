import { Router } from 'express'

const router = Router()

// Google Sheets CSV export URL
const SHEETS_BASE = 'https://docs.google.com/spreadsheets/d/1EhE7zCe32OvXx4J1zaGy4oJuJpzEnXkwjvCR1x_VddE'

// Sheet IDs (gid)
const SHEETS = {
  overall: '423773857',      // Рейтинг Общий
  male: '1502832667',        // Рейтинг Мужской (181 игрок)
  female: '1982481909',      // Рейтинг Женский (87 игроков)
  tournaments: '919363557',  // Результаты Турниров
}

// Cache for 1 hour
let cache = {
  data: null,
  timestamp: 0,
  ttl: 60 * 60 * 1000, // 1 hour
}

/**
 * Parse ranking CSV (Рейтинг Общий/Мужской/Женский)
 */
function parseRankingCSV(csvText) {
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
    // Format: Rank, ФИО, Турниров, Средний HCP, Лучшие 10* турниров
    if (fields.length >= 5) {
      const rank = parseInt(fields[0]) || i
      const name = fields[1] || ''
      const tournaments = parseInt(fields[2]) || 0
      const hcp = parseFloat(fields[3]?.replace(',', '.')) || 0
      const rating = parseFloat(fields[4]?.replace(',', '.').replace(/\s/g, '')) || 0

      if (name && rating > 0) {
        players.push({
          rank,
          name,
          tournaments,
          hcp: parseFloat(hcp.toFixed(1)),
          rating: Math.round(rating),
        })
      }
    }
  }

  return players
}

/**
 * Parse tournaments CSV (Результаты Турниров)
 */
function parseTournamentsCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const results = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

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

    // Format: Дата, ФИО, Группа, Дней, Турнир, Gender, TeeBox, eHCP, GrossRank, GrossScore, NetRank, NetScore, ...
    if (fields.length >= 12) {
      const date = fields[0] || ''
      const name = fields[1] || ''
      const group = fields[2] || ''
      const tournament = fields[4] || ''
      const gender = fields[5] || ''
      const hcp = parseFloat(fields[7]?.replace(',', '.')) || 0
      const grossScore = parseInt(fields[9]) || 0
      const netScore = parseInt(fields[11]) || 0

      if (name && tournament) {
        results.push({
          date,
          name,
          group,
          tournament,
          gender,
          hcp: parseFloat(hcp.toFixed(1)),
          grossScore,
          netScore,
        })
      }
    }
  }

  return results
}

/**
 * Fetch all leaderboard data from Google Sheets
 */
async function fetchLeaderboard() {
  try {
    // Fetch all sheets in parallel
    const [overallCSV, maleCSV, femaleCSV, tournamentsCSV] = await Promise.all([
      fetch(`${SHEETS_BASE}/gviz/tq?tqx=out:csv&gid=${SHEETS.overall}`).then(r => r.text()),
      fetch(`${SHEETS_BASE}/gviz/tq?tqx=out:csv&gid=${SHEETS.male}`).then(r => r.text()),
      fetch(`${SHEETS_BASE}/gviz/tq?tqx=out:csv&gid=${SHEETS.female}`).then(r => r.text()),
      fetch(`${SHEETS_BASE}/gviz/tq?tqx=out:csv&gid=${SHEETS.tournaments}`).then(r => r.text()),
    ])

    // Parse rankings
    const male = parseRankingCSV(maleCSV)
    const female = parseRankingCSV(femaleCSV)
    const tournaments = parseTournamentsCSV(tournamentsCSV)

    // Create overall ranking from male + female, sorted by rating
    const overall = [...male, ...female].sort((a, b) => b.rating - a.rating)
    overall.forEach((p, i) => p.rank = i + 1)

    // Get unique tournament names
    const tournamentNames = [...new Set(tournaments.map(t => t.tournament))].filter(Boolean)

    // Calculate stats
    const stats = {
      totalPlayers: overall.length,
      malePlayers: male.length,
      femalePlayers: female.length,
      totalTournaments: tournamentNames.length,
      tournamentNames,
    }

    return {
      overall,
      male,
      female,
      tournaments,
      stats,
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
 * Force refresh cache
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
