import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/all', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, username, hcp, photo_url
       FROM users
       WHERE id != $1
       ORDER BY first_name, last_name`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/search', requireAuth, async (req, res, next) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 2) return res.json([])
  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, username, hcp, photo_url
       FROM users
       WHERE id != $1
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR username ILIKE $2)
       ORDER BY first_name, last_name
       LIMIT 20`,
      [req.user.userId, `%${q}%`]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

export default router
