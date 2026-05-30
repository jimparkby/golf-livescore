import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/scorecards/:id — fetch a pending scorecard (must belong to the requester)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows: [sc] } = await db.query(
      `SELECT * FROM pending_scorecards
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
         AND expires_at > NOW()`,
      [req.params.id, req.user.userId]
    )
    if (!sc) return res.status(404).json({ error: 'Scorecard not found or expired' })
    res.json({
      id: sc.id,
      scores: sc.scores,
      courseName: sc.course_name,
      holesCount: sc.holes_count,
      createdAt: sc.created_at,
    })
  } catch (err) { next(err) }
})

// DELETE /api/scorecards/:id — discard a pending scorecard
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM pending_scorecards WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    )
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
