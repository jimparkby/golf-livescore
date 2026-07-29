import express from 'express'
import https from 'https'
import { db } from '../db.js'
import { buildRound } from './rounds.js'

const router = express.Router()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * GET /api/tournaments/list/with-results
 * Get list of tournament IDs/slugs that have results
 */
router.get('/list/with-results', async (req, res) => {
  try {
    const { rows: tournaments } = await db.query(`
      SELECT DISTINCT t.id, t.slug
      FROM tournaments t
      INNER JOIN tournament_results tr ON t.id = tr.tournament_id
    `)

    const tournamentIds = tournaments.map(t => t.slug || t.id.toString())

    res.json({ tournaments: tournamentIds })
  } catch (error) {
    console.error('Error getting tournaments with results:', error)
    res.status(500).json({ error: 'Failed to get tournaments with results' })
  }
})

/**
 * GET /api/tournaments/:id
 * Get tournament details (accepts both numeric ID and slug)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Try to get by slug first, then by numeric ID
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE slug = $1 OR id::text = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json(tournament)
  } catch (error) {
    console.error('Error getting tournament:', error)
    res.status(500).json({ error: 'Failed to get tournament' })
  }
})

/**
 * GET /api/tournaments/:id/results
 * Get tournament results (accepts both numeric ID and slug)
 */
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params

    // Get tournament first
    const { rows: [tournament] } = await db.query(
      'SELECT id, name, date FROM tournaments WHERE slug = $1 OR id::text = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    // Get results grouped by group_name
    const { rows: results } = await db.query(
      `SELECT * FROM tournament_results
       WHERE tournament_id = $1
       ORDER BY COALESCE(group_name, ''), place ASC`,
      [tournament.id]
    )

    // Group results by group_name
    const groupedResults = {}
    results.forEach(result => {
      const groupName = result.group_name || 'Общий зачет'
      if (!groupedResults[groupName]) {
        groupedResults[groupName] = []
      }
      groupedResults[groupName].push({
        place: result.place,
        player_name: result.player_name,
        score: result.score,
      })
    })

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
      },
      groups: Object.entries(groupedResults).map(([groupName, results]) => ({
        name: groupName,
        results,
      })),
      hasResults: results.length > 0,
    })
  } catch (error) {
    console.error('Error getting tournament results:', error)
    res.status(500).json({ error: 'Failed to get tournament results' })
  }
})

/**
 * GET /api/tournaments/:id/rounds
 * Public, no-auth: every round (playing group) tagged with this tournament id
 * (the static tournament slug, e.g. "pets-day"), for the live flighted
 * leaderboard. Mirrors the /api/live/:code public-read pattern.
 */
router.get('/:id/rounds', async (req, res, next) => {
  try {
    const { id } = req.params

    const { rows } = await db.query(
      'SELECT * FROM rounds WHERE tournament_id = $1 ORDER BY date ASC',
      [id]
    )

    const roundsWithData = await Promise.all(rows.map((r) => buildRound(r, null)))
    res.json(roundsWithData)
  } catch (error) {
    console.error('Error getting tournament rounds:', error)
    res.status(500).json({ error: 'Failed to get tournament rounds' })
  }
})

/**
 * GET /api/tournaments/:id/flights-photos
 * Get flights photos for a tournament (accepts both numeric ID and slug)
 */
router.get('/:id/flights-photos', async (req, res) => {
  try {
    const { id } = req.params

    // Try to get by slug first, then by numeric ID
    const { rows: [tournament] } = await db.query(
      'SELECT flights_photos FROM tournaments WHERE slug = $1 OR id::text = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json({
      photos: tournament.flights_photos || []
    })
  } catch (error) {
    console.error('Error getting flights photos:', error)
    res.status(500).json({ error: 'Failed to get flights photos' })
  }
})

/**
 * DELETE /api/tournaments/:id/flights-photos/:fileId
 * Delete a specific flight photo from tournament (accepts both numeric ID and slug)
 */
router.delete('/:id/flights-photos/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params

    // Remove the file_id from the JSON array
    await db.query(
      `UPDATE tournaments
       SET flights_photos = (
         SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(flights_photos) elem
         WHERE elem::text != $1::text
       )
       WHERE slug = $2 OR id::text = $2`,
      [JSON.stringify(fileId), id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting flight photo:', error)
    res.status(500).json({ error: 'Failed to delete flight photo' })
  }
})

/**
 * GET /api/tournaments/telegram-photo/:fileId
 * Proxy Telegram photo to frontend
 */
router.get('/telegram-photo/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: 'Telegram bot token not configured' })
    }

    // Get file path from Telegram
    const fileInfoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`

    const fileInfo = await new Promise((resolve, reject) => {
      https.get(fileInfoUrl, (response) => {
        let data = ''
        response.on('data', chunk => { data += chunk })
        response.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
        response.on('error', reject)
      })
    })

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Download and stream the file
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`

    https.get(fileUrl, (photoResponse) => {
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day
      photoResponse.pipe(res)
    }).on('error', (error) => {
      console.error('Error downloading photo:', error)
      res.status(500).json({ error: 'Failed to download photo' })
    })
  } catch (error) {
    console.error('Error proxying telegram photo:', error)
    res.status(500).json({ error: 'Failed to proxy photo' })
  }
})

export default router
