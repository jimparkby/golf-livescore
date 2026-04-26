import { Router } from 'express'
import { createHmac } from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

function verifyInitData(initData) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest()

  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  return expectedHash === hash
}

router.post('/telegram', async (req, res, next) => {
  const { initData } = req.body
  if (!initData) return res.status(400).json({ error: 'initData required' })

  if (!verifyInitData(initData)) {
    return res.status(401).json({ error: 'Неверная подпись Telegram' })
  }

  const params = new URLSearchParams(initData)
  let tgUser
  try {
    tgUser = JSON.parse(params.get('user'))
  } catch {
    return res.status(400).json({ error: 'Не удалось прочитать данные пользователя' })
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
        tgUser.id,
        tgUser.username ?? null,
        tgUser.first_name ?? '',
        tgUser.last_name ?? '',
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
