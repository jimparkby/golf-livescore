import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { rows: [user] } = await db.query(
    `SELECT id, email, first_name, last_name, hcp, home_club, city, is_admin, created_at
     FROM users WHERE id = $1`,
    [req.user.userId]
  )
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json(user)
})

router.put('/', requireAuth, async (req, res) => {
  const { first_name, last_name, hcp, home_club, city } = req.body

  const { rows: [user] } = await db.query(
    `UPDATE users SET
       first_name = COALESCE(NULLIF($1, ''), first_name),
       last_name  = COALESCE(NULLIF($2, ''), last_name),
       hcp        = COALESCE($3, hcp),
       home_club  = COALESCE(NULLIF($4, ''), home_club),
       city       = COALESCE(NULLIF($5, ''), city),
       updated_at = NOW()
     WHERE id = $6
     RETURNING id, email, first_name, last_name, hcp, home_club, city, is_admin, created_at`,
    [
      first_name?.trim() ?? '',
      last_name?.trim() ?? '',
      hcp !== undefined ? Number(hcp) : null,
      home_club?.trim() ?? '',
      city?.trim() ?? '',
      req.user.userId,
    ]
  )
  res.json(user)
})

export default router
