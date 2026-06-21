import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    let query = 'SELECT * FROM tournaments'
    const params = []

    if (status) {
      query += ' WHERE status = $1'
      params.push(status)
    }

    query += ' ORDER BY start_date ASC'

    const { rows } = await db.query(query, params)
    res.json(rows)
  } catch (err) {
    console.error('[tournaments] GET error:', err)
    res.status(500).json({ error: 'Failed to fetch tournaments' })
  }
})

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [req.params.id]
    )

    if (!rows[0]) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('[tournaments] GET by ID error:', err)
    res.status(500).json({ error: 'Failed to fetch tournament' })
  }
})

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        tp.id,
        tp.position,
        tp.total_score,
        tp.handicap_index,
        tp.status,
        tp.flight_number,
        tp.tee_time,
        u.id as user_id,
        u.name as player_name,
        u.photo_url as avatar_url
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
      ORDER BY
        CASE WHEN tp.position IS NULL THEN 1 ELSE 0 END,
        tp.position ASC,
        tp.total_score ASC
    `, [req.params.id])

    res.json(rows)
  } catch (err) {
    console.error('[tournaments] leaderboard error:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Create tournament (admin only for now)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      course_name,
      start_date,
      end_date,
      tier,
      format,
      holes_count,
      entry_fee,
      max_participants,
      registration_deadline,
      settings
    } = req.body

    const { rows } = await db.query(`
      INSERT INTO tournaments (
        name, description, course_name, start_date, end_date,
        tier, format, holes_count, entry_fee, max_participants,
        registration_deadline, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name, description, course_name, start_date, end_date,
      tier, format, holes_count || 18, entry_fee, max_participants,
      registration_deadline, settings || {}
    ])

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[tournaments] POST error:', err)
    res.status(500).json({ error: 'Failed to create tournament' })
  }
})

// Update tournament
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      course_name,
      start_date,
      end_date,
      status,
      tier,
      format,
      holes_count,
      entry_fee,
      max_participants,
      registration_deadline,
      settings
    } = req.body

    const { rows } = await db.query(`
      UPDATE tournaments
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        course_name = COALESCE($3, course_name),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        status = COALESCE($6, status),
        tier = COALESCE($7, tier),
        format = COALESCE($8, format),
        holes_count = COALESCE($9, holes_count),
        entry_fee = COALESCE($10, entry_fee),
        max_participants = COALESCE($11, max_participants),
        registration_deadline = COALESCE($12, registration_deadline),
        settings = COALESCE($13, settings),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      name, description, course_name, start_date, end_date,
      status, tier, format, holes_count, entry_fee, max_participants,
      registration_deadline, settings, req.params.id
    ])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('[tournaments] PUT error:', err)
    res.status(500).json({ error: 'Failed to update tournament' })
  }
})

// Register for tournament
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const tournamentId = req.params.id
    const { flight_number, handicap_index } = req.body

    // Check if tournament exists and is accepting registrations
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ error: 'Tournament is not accepting registrations' })
    }

    // Check if already registered
    const { rows: existing } = await db.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, userId]
    )

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already registered for this tournament' })
    }

    // Register
    const { rows } = await db.query(`
      INSERT INTO tournament_participants (tournament_id, user_id, flight_number, handicap_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [tournamentId, userId, flight_number, handicap_index])

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[tournaments] register error:', err)
    res.status(500).json({ error: 'Failed to register for tournament' })
  }
})

// Withdraw from tournament
router.delete('/:id/register', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const tournamentId = req.params.id

    const { rows } = await db.query(`
      DELETE FROM tournament_participants
      WHERE tournament_id = $1 AND user_id = $2
      RETURNING *
    `, [tournamentId, userId])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Registration not found' })
    }

    res.json({ message: 'Successfully withdrawn from tournament' })
  } catch (err) {
    console.error('[tournaments] withdraw error:', err)
    res.status(500).json({ error: 'Failed to withdraw from tournament' })
  }
})

// Get tournament photo (placeholder endpoint)
// In production, photos should be served from a CDN or storage service
router.get('/:id/photo/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params

    // Verify tournament exists
    const { rows } = await db.query(
      'SELECT settings FROM tournaments WHERE id = $1',
      [id]
    )

    if (!rows[0]) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const settings = rows[0].settings || {}
    const photos = settings.photos || []

    if (!photos.includes(filename)) {
      return res.status(404).json({ error: 'Photo not found' })
    }

    // For now, return a placeholder response
    // In production, implement actual file serving from storage
    res.json({
      message: 'Photo endpoint - implement file serving from storage',
      filename,
      tournamentId: id,
      note: 'Store photos in S3/CloudFlare R2 and serve via CDN'
    })
  } catch (err) {
    console.error('[tournaments] photo error:', err)
    res.status(500).json({ error: 'Failed to fetch photo' })
  }
})

export default router
