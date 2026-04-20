import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { rows: [user] } = await db.query(
    `SELECT id, telegram_id, telegram_username, telegram_first_name, telegram_last_name,
            display_name, country, handicap, is_admin, created_at
     FROM users WHERE id = $1`,
    [req.user.userId]
  )
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.put('/', requireAuth, async (req, res) => {
  const { display_name, country, handicap, telegram_username, telegram_first_name, telegram_last_name } = req.body

  const { rows: [user] } = await db.query(
    `UPDATE users SET
       display_name        = COALESCE(NULLIF($1, ''), display_name),
       country             = NULLIF($2, ''),
       handicap            = COALESCE($3, handicap),
       telegram_username   = COALESCE(NULLIF($4, ''), telegram_username),
       telegram_first_name = COALESCE(NULLIF($5, ''), telegram_first_name),
       telegram_last_name  = NULLIF($6, ''),
       updated_at          = NOW()
     WHERE id = $7
     RETURNING id, telegram_id, telegram_username, telegram_first_name, telegram_last_name,
               display_name, country, handicap, is_admin, created_at`,
    [
      display_name?.trim() ?? '',
      country?.trim() ?? '',
      handicap !== undefined ? Number(handicap) : null,
      telegram_username?.trim() ?? '',
      telegram_first_name?.trim() ?? '',
      telegram_last_name?.trim() ?? '',
      req.user.userId,
    ]
  )
  res.json(user)
})

export default router
