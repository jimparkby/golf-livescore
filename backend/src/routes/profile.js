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
  const { first_name, last_name, username, hcp, home_club, city, default_tee } = req.body
  try {
    const { rows: [user] } = await db.query(
      `UPDATE users SET
         first_name  = COALESCE($2, first_name),
         last_name   = COALESCE($3, last_name),
         username    = COALESCE($4, username),
         hcp         = COALESCE($5, hcp),
         home_club   = COALESCE($6, home_club),
         city        = COALESCE($7, city),
         default_tee = COALESCE($8, default_tee),
         updated_at  = NOW()
       WHERE id = $1 RETURNING *`,
      [
        req.user.userId,
        first_name?.trim() || null,
        last_name?.trim() || null,
        username?.trim() || null,
        hcp !== undefined ? Number(hcp) : null,
        home_club?.trim() || null,
        city?.trim() || null,
        default_tee?.trim() || null,
      ]
    )
    res.json(user)
  } catch (err) { next(err) }
})

// Sync HCP from HDID
router.post('/sync-hdid', requireAuth, async (req, res, next) => {
  try {
    console.log('[sync-hdid] Request from user:', req.user.userId)

    // Get current user
    const { rows: [user] } = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.user.userId]
    )

    console.log('[sync-hdid] User from DB:', user)

    if (!user || !user.first_name || !user.last_name) {
      console.log('[sync-hdid] Missing name:', { first: user?.first_name, last: user?.last_name })
      return res.status(400).json({
        error: 'First name and last name required for HDID sync',
        errorRu: 'Для синхронизации с HDID необходимо указать имя и фамилию в профиле'
      })
    }

    // Find in HDID whitelist (exact match first)
    const normFirst = user.first_name.trim().toUpperCase()
    const normLast = user.last_name.trim().toUpperCase()

    console.log('[sync-hdid] Searching for:', normFirst, normLast)

    let hdidMember = null

    // Try exact match
    const { rows: exactMatch } = await db.query(
      `SELECT * FROM hdid_members
       WHERE UPPER(first_name) = $1 AND UPPER(last_name) = $2`,
      [normFirst, normLast]
    )
    console.log('[sync-hdid] Exact match results:', exactMatch.length)
    if (exactMatch.length > 0) {
      hdidMember = exactMatch[0]
      console.log('[sync-hdid] Found exact match:', hdidMember)
    } else {
      // Try fuzzy match
      try {
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
        console.log('[sync-hdid] Fuzzy match results:', fuzzyMatch.length)
        if (fuzzyMatch.length > 0) {
          hdidMember = fuzzyMatch[0]
          console.log('[sync-hdid] Found fuzzy match:', hdidMember)
        }
      } catch (err) {
        console.log('[sync-hdid] Fuzzy match error (pg_trgm not available):', err.message)
      }
    }

    if (!hdidMember) {
      console.log('[sync-hdid] No match found for:', normFirst, normLast)
      return res.status(404).json({
        error: 'Not found in HDID members list',
        errorRu: 'Игрок не найден в списке HDID. Проверьте правильность имени и фамилии на английском.'
      })
    }

    console.log('[sync-hdid] Updating user HCP to:', hdidMember.hcp)

    // Update user HCP and sync timestamp
    const { rows: [updated] } = await db.query(
      `UPDATE users SET
         hcp = $2,
         last_hdid_sync = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.user.userId, hdidMember.hcp]
    )

    res.json({
      hcp: updated.hcp,
      last_hdid_sync: updated.last_hdid_sync,
      hdid_name: `${hdidMember.first_name} ${hdidMember.last_name}`
    })
  } catch (err) { next(err) }
})

export default router
