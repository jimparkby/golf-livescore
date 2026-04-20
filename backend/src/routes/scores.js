import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()

router.put('/', requireAuth, async (req, res) => {
  const { tournament_id, hole_id, hole_number, strokes, stableford_points } = req.body

  if (strokes === null || strokes === undefined) {
    await db.query(
      `DELETE FROM scores WHERE tournament_id = $1 AND user_id = $2 AND hole_id = $3`,
      [tournament_id, req.user.userId, hole_id]
    )
    return res.json({ ok: true })
  }

  const { rows: [score] } = await db.query(
    `INSERT INTO scores (tournament_id, user_id, hole_id, hole_number, strokes, stableford_points)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tournament_id, user_id, hole_id) DO UPDATE SET
       strokes = EXCLUDED.strokes,
       stableford_points = EXCLUDED.stableford_points
     RETURNING *`,
    [tournament_id, req.user.userId, hole_id, hole_number, strokes, stableford_points ?? null]
  )
  res.json(score)
})

export default router
