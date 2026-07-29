import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { bot } from '../bot.js'

const router = Router()

/**
 * POST /api/tournament-registrations
 * Register current user for a tournament
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { tournamentId } = req.body
    const userId = req.userId

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' })
    }

    // Check if already registered
    const existing = await db.query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, userId]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this tournament' })
    }

    // Create registration
    const result = await db.query(
      `INSERT INTO tournament_registrations (tournament_id, user_id, status)
       VALUES ($1, $2, 'pending_review')
       RETURNING *`,
      [tournamentId, userId]
    )

    if (bot) {
      const { rows: [info] } = await db.query(
        `SELECT t.name AS tournament_name, t.date AS tournament_date, u.telegram_id
         FROM users u
         LEFT JOIN tournaments t ON t.slug = $1 OR t.id::text = $1
         WHERE u.id = $2`,
        [tournamentId, userId]
      )
      if (info?.telegram_id) {
        const dateLine = info.tournament_date
          ? `\n📅 ${new Date(info.tournament_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
          : ''
        bot.sendMessage(
          info.telegram_id,
          `✅ <b>Заявка на турнир отправлена</b>\n\n🏆 ${info.tournament_name || 'Турнир'}${dateLine}\n\nМы свяжемся с вами для подтверждения оплаты.`,
          { parse_mode: 'HTML' }
        ).catch((err) => console.error('[tournament-registrations] confirmation sendMessage failed:', err.message))
      }
    }

    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/tournament-registrations/my
 * Get all registrations for current user
 */
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId

    const result = await db.query(
      'SELECT * FROM tournament_registrations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/tournament-registrations/:tournamentId
 * Get all registrations for a specific tournament (with user details)
 */
router.get('/:tournamentId', async (req, res, next) => {
  try {
    const { tournamentId } = req.params

    const result = await db.query(
      `SELECT
        tr.*,
        u.first_name,
        u.last_name,
        u.hcp,
        u.photo_url
       FROM tournament_registrations tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.tournament_id = $1
       ORDER BY tr.created_at ASC`,
      [tournamentId]
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/tournament-registrations/:id/status
 * Update registration status (admin only)
 */
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['pending_review', 'awaiting_payment', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const result = await db.query(
      `UPDATE tournament_registrations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/tournament-registrations/:id
 * Cancel registration
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.userId

    const result = await db.query(
      'DELETE FROM tournament_registrations WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
