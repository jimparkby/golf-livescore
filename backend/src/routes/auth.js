import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

// Auth via Telegram Mini App initDataUnsafe — no HMAC needed for this use case
router.post('/telegram', async (req, res, next) => {
  const { telegram_id, username, first_name, last_name } = req.body

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id required' })
  }

  try {
    const { rows: [user] } = await db.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username   = EXCLUDED.username,
         first_name = CASE WHEN users.first_name = '' THEN EXCLUDED.first_name ELSE users.first_name END,
         last_name  = CASE WHEN users.last_name  = '' THEN EXCLUDED.last_name  ELSE users.last_name  END,
         updated_at = NOW()
       RETURNING *`,
      [
        Number(telegram_id),
        username ?? null,
        first_name ?? '',
        last_name ?? '',
      ]
    )

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    )
    res.json({ jwt: token })
  } catch (err) { next(err) }
})

export default router
