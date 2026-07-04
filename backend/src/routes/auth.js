import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

// Normalize name for fuzzy matching (uppercase, trim)
function normalizeName(name) {
  return (name || '').trim().toUpperCase()
}

// Find member in HDID whitelist with fuzzy matching
async function findHDIDMember(firstName, lastName) {
  const normFirst = normalizeName(firstName)
  const normLast = normalizeName(lastName)

  if (!normFirst || !normLast) return null

  try {
    // Try exact match first
    const { rows: exactMatch } = await db.query(
      `SELECT * FROM hdid_members
       WHERE UPPER(first_name) = $1 AND UPPER(last_name) = $2`,
      [normFirst, normLast]
    )
    if (exactMatch.length > 0) return exactMatch[0]

    // Try fuzzy match (similar names, e.g., ANDREI vs ANDREY)
    const { rows: fuzzyMatch } = await db.query(
      `SELECT *,
              similarity(UPPER(first_name), $1) + similarity(UPPER(last_name), $2) as score
       FROM hdid_members
       WHERE similarity(UPPER(first_name), $1) > 0.6
         AND similarity(UPPER(last_name), $2) > 0.6
       ORDER BY score DESC
       LIMIT 1`,
      [normFirst, normLast]
    )

    return fuzzyMatch.length > 0 ? fuzzyMatch[0] : null
  } catch (err) {
    // If pg_trgm extension is not installed, fall back to exact match only
    console.warn('[auth] Fuzzy matching not available, using exact match only:', err.message)
    return null
  }
}

// Auth via Telegram Mini App initDataUnsafe — no HMAC needed for this use case
router.post('/telegram', async (req, res, next) => {
  const { telegram_id, username, first_name, last_name, photo_url } = req.body

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id required' })
  }

  try {
    // Check if user already exists
    const { rows: existing } = await db.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [Number(telegram_id)]
    )

    // If existing user, just update and return token
    if (existing.length > 0) {
      const { rows: [user] } = await db.query(
        `UPDATE users SET
           username   = COALESCE($2, username),
           photo_url  = COALESCE($3, photo_url),
           updated_at = NOW()
         WHERE telegram_id = $1
         RETURNING *`,
        [Number(telegram_id), username ?? null, photo_url ?? null]
      )

      const token = jwt.sign(
        { userId: user.id, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
      )
      return res.json({ jwt: token })
    }

    // New user: check whitelist
    if (!first_name || !last_name) {
      return res.status(400).json({
        error: 'first_name and last_name required for new users',
        requiresNameInput: true
      })
    }

    const hdidMember = await findHDIDMember(first_name, last_name)

    if (!hdidMember) {
      return res.status(403).json({
        error: 'Access denied. You are not in the Golf Club Minsk members list.',
        errorRu: 'Доступ запрещен. Вы не являетесь членом Golf Club Minsk.',
        requiresNameInput: true
      })
    }

    // Create new user with HDID handicap
    const { rows: [user] } = await db.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, hcp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        Number(telegram_id),
        username ?? null,
        first_name ?? '',
        last_name ?? '',
        photo_url ?? null,
        hdidMember.hcp ?? 36.0,
      ]
    )

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    )
    res.json({ jwt: token, hdidHcp: hdidMember.hcp })
  } catch (err) { next(err) }
})

export default router
