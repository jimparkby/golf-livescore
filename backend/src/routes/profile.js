import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', async (req, res, next) => {
  const { device_id } = req.query
  if (!device_id) return res.status(400).json({ error: 'device_id required' })
  try {
    const { rows: [user] } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [device_id]
    )
    if (!user) return res.status(404).json({ error: 'not found' })
    res.json(user)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  const { device_id, first_name, last_name, hcp, home_club, city } = req.body
  if (!device_id) return res.status(400).json({ error: 'device_id required' })
  try {
    const { rows: [user] } = await db.query(
      `INSERT INTO users (id, first_name, last_name, hcp, home_club, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name  = EXCLUDED.last_name,
         hcp        = EXCLUDED.hcp,
         home_club  = EXCLUDED.home_club,
         city       = EXCLUDED.city,
         updated_at = NOW()
       RETURNING *`,
      [
        device_id,
        first_name?.trim() ?? '',
        last_name?.trim() ?? '',
        hcp !== undefined ? Number(hcp) : 0,
        home_club?.trim() ?? 'Golf Club Minsk',
        city?.trim() ?? 'Минск, Беларусь',
      ]
    )
    res.json(user)
  } catch (err) { next(err) }
})

export default router
