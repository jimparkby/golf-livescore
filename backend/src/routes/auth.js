import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

function verifyTelegramAuth(data) {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest()

  const hmac = crypto.createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  return hmac === hash
}

router.post('/telegram', async (req, res) => {
  const data = req.body

  if (!verifyTelegramAuth(data)) {
    return res.status(401).json({ error: 'Invalid Telegram auth data' })
  }

  if (Date.now() / 1000 - Number(data.auth_date) > 86400) {
    return res.status(401).json({ error: 'Auth data expired' })
  }

  const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ')

  const { rows: [user] } = await db.query(
    `INSERT INTO users (telegram_id, telegram_username, telegram_first_name, telegram_last_name, display_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id) DO UPDATE SET
       telegram_username   = EXCLUDED.telegram_username,
       telegram_first_name = EXCLUDED.telegram_first_name,
       telegram_last_name  = EXCLUDED.telegram_last_name,
       updated_at          = NOW()
     RETURNING *`,
    [String(data.id), data.username ?? null, data.first_name, data.last_name ?? null, displayName]
  )

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  res.json({ jwt: token })
})

export default router
