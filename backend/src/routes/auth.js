import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../supabase.js'

const router = Router()

// Generate Telegram deep link
router.get('/tg-link', async (req, res) => {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  const { error } = await supabase.from('tg_auth_tokens').insert({
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    console.error('Insert token error:', error)
    return res.status(500).json({ error: 'Failed to create auth token' })
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME
  res.json({ url: `https://t.me/${botUsername}?start=${token}`, token })
})

// Poll for auth status
router.get('/tg-status', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const { data, error } = await supabase
    .from('tg_auth_tokens')
    .select()
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return res.status(404).json({ error: 'Token not found' })

  if (new Date(data.expires_at) < new Date()) {
    return res.json({ verified: false, expired: true })
  }

  if (!data.verified) {
    return res.json({ verified: false })
  }

  res.json({
    verified: true,
    hashed_token: data.hashed_token,
    email: data.email,
  })
})

export default router
