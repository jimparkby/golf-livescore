import jwt from 'jsonwebtoken'
import { db } from '../db.js'
import { isAdmin } from '../utils/adminAccess.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    req.userId = req.user.userId // JWT token contains userId field, not id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Must run after requireAuth. Gates access to whoever is whitelisted in
// ADMIN_TELEGRAM_IDS (see utils/adminAccess.js).
export async function requireAdmin(req, res, next) {
  try {
    const { rows: [user] } = await db.query('SELECT telegram_id FROM users WHERE id = $1', [req.user.userId])
    if (!user?.telegram_id || !isAdmin(Number(user.telegram_id))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    req.adminTelegramId = Number(user.telegram_id)
    next()
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify admin access' })
  }
}
