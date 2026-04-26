import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows: [user] } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (!user) return res.status(404).json({ error: 'not found' })
    res.json(user)
  } catch (err) { next(err) }
})

router.put('/', requireAuth, async (req, res, next) => {
  const { first_name, last_name, hcp, home_club, city } = req.body
  try {
    const { rows: [user] } = await db.query(
      `UPDATE users SET
         first_name = COALESCE($2, first_name),
         last_name  = COALESCE($3, last_name),
         hcp        = COALESCE($4, hcp),
         home_club  = COALESCE($5, home_club),
         city       = COALESCE($6, city),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        req.user.userId,
        first_name?.trim() || null,
        last_name?.trim() || null,
        hcp !== undefined ? Number(hcp) : null,
        home_club?.trim() || null,
        city?.trim() || null,
      ]
    )
    res.json(user)
  } catch (err) { next(err) }
})

export default router
