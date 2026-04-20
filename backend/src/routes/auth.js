import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../db.js'

const router = Router()

router.get('/tg-link', async (req, res) => {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.query(
    `INSERT INTO tg_auth_tokens (token, expires_at) VALUES ($1, $2)`,
    [token, expiresAt]
  )

  res.json({ url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`, token })
})

router.get('/tg-status', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const { rows: [record] } = await db.query(
    `SELECT * FROM tg_auth_tokens WHERE token = $1`,
    [token]
  )

  if (!record) return res.status(404).json({ error: 'Token not found' })
  if (new Date(record.expires_at) < new Date()) return res.json({ verified: false, expired: true })
  if (!record.verified) return res.json({ verified: false })

  res.json({ verified: true, jwt: record.jwt })
})

export default router
