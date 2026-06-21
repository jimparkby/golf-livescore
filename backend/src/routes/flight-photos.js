import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Upload flight photo (called from Telegram bot)
router.post('/tournament/:id/flight-photo', requireAuth, async (req, res) => {
  try {
    const { id: tournamentId } = req.params
    const { flight_number, telegram_file_id, scores } = req.body

    // Check if tournament exists
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    // Save flight photo
    const { rows } = await db.query(`
      INSERT INTO tournament_flight_photos
        (tournament_id, flight_number, telegram_file_id, scores, uploaded_by, processed)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tournamentId, flight_number, telegram_file_id, scores, req.userId, scores ? true : false])

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[flight-photos] POST error:', err)
    res.status(500).json({ error: 'Failed to save flight photo' })
  }
})

// Process flight photo scores and update participant scores
router.post('/tournament/:id/process-flight/:photoId', requireAuth, async (req, res) => {
  try {
    const { id: tournamentId, photoId } = req.params

    // Get flight photo
    const { rows: [photo] } = await db.query(
      'SELECT * FROM tournament_flight_photos WHERE id = $1 AND tournament_id = $2',
      [photoId, tournamentId]
    )

    if (!photo) {
      return res.status(404).json({ error: 'Flight photo not found' })
    }

    if (!photo.scores) {
      return res.status(400).json({ error: 'No scores data available' })
    }

    const scores = typeof photo.scores === 'string' ? JSON.parse(photo.scores) : photo.scores

    // Update participant scores
    const updates = []
    for (const player of scores.players || []) {
      // Try to find participant by name matching
      const { rows: participants } = await db.query(`
        SELECT tp.*, u.name
        FROM tournament_participants tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.tournament_id = $1
          AND tp.flight_number = $2
          AND LOWER(u.name) LIKE $3
      `, [tournamentId, photo.flight_number, `%${player.name.toLowerCase()}%`])

      if (participants.length > 0) {
        const participant = participants[0]
        const totalScore = player.holes?.reduce((sum, h) => sum + (h.score || 0), 0) || 0

        await db.query(`
          UPDATE tournament_participants
          SET
            total_score = $1,
            status = 'started',
            updated_at = NOW()
          WHERE id = $2
        `, [totalScore, participant.id])

        updates.push({
          participant_id: participant.id,
          player_name: participant.name,
          total_score: totalScore
        })
      }
    }

    // Mark photo as processed
    await db.query(
      'UPDATE tournament_flight_photos SET processed = true WHERE id = $1',
      [photoId]
    )

    // Recalculate positions
    await recalculatePositions(tournamentId)

    res.json({
      message: 'Flight scores processed successfully',
      updates
    })
  } catch (err) {
    console.error('[flight-photos] process error:', err)
    res.status(500).json({ error: 'Failed to process flight scores' })
  }
})

// Get flight photos for a tournament
router.get('/tournament/:id/flight-photos', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        fp.*,
        u.name as uploaded_by_name
      FROM tournament_flight_photos fp
      LEFT JOIN users u ON fp.uploaded_by = u.id
      WHERE fp.tournament_id = $1
      ORDER BY fp.uploaded_at DESC
    `, [req.params.id])

    res.json(rows)
  } catch (err) {
    console.error('[flight-photos] GET error:', err)
    res.status(500).json({ error: 'Failed to fetch flight photos' })
  }
})

// Helper: Recalculate tournament positions
async function recalculatePositions(tournamentId) {
  const { rows: participants } = await db.query(`
    SELECT id, total_score
    FROM tournament_participants
    WHERE tournament_id = $1
      AND total_score IS NOT NULL
    ORDER BY total_score ASC
  `, [tournamentId])

  let position = 1
  let prevScore = null

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i]

    // If score is same as previous, keep same position
    if (prevScore !== null && p.total_score === prevScore) {
      // Same position
    } else {
      position = i + 1
    }

    await db.query(
      'UPDATE tournament_participants SET position = $1 WHERE id = $2',
      [position, p.id]
    )

    prevScore = p.total_score
  }
}

export default router
