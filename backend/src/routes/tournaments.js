import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { db } from '../db.js'
import { DEFAULT_PARS_18 } from '../constants.js'

const router = Router()

router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM tournaments ORDER BY start_date DESC`)
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const [
    { rows: [tournament] },
    { rows: holes },
    { rows: players },
    { rows: scores },
  ] = await Promise.all([
    db.query(`SELECT * FROM tournaments WHERE id = $1`, [id]),
    db.query(`SELECT * FROM holes WHERE tournament_id = $1 ORDER BY hole_number`, [id]),
    db.query(
      `SELECT tp.tournament_id, tp.user_id, tp.team_name, u.display_name, u.handicap
       FROM tournament_players tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.tournament_id = $1`,
      [id]
    ),
    db.query(`SELECT * FROM scores WHERE tournament_id = $1`, [id]),
  ])

  if (!tournament) return res.status(404).json({ error: 'Not found' })
  res.json({ tournament, holes, players, scores })
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, course_name, format, start_date } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  const totalPar = DEFAULT_PARS_18.reduce((a, b) => a + b, 0)

  const { rows: [t] } = await db.query(
    `INSERT INTO tournaments (name, course_name, format, start_date, status, total_holes, total_par, created_by)
     VALUES ($1, $2, $3, $4, 'live', 18, $5, $6) RETURNING *`,
    [name.trim(), course_name?.trim() || 'Минский гольф-клуб', format || 'stroke_play', start_date, totalPar, req.user.userId]
  )

  for (let i = 0; i < DEFAULT_PARS_18.length; i++) {
    await db.query(
      `INSERT INTO holes (tournament_id, hole_number, par, handicap_index) VALUES ($1, $2, $3, $4)`,
      [t.id, i + 1, DEFAULT_PARS_18[i], i + 1]
    )
  }

  res.json(t)
})

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body
  if (!['upcoming', 'live', 'finished'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const { rows: [t] } = await db.query(
    `UPDATE tournaments SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  )
  res.json(t)
})

router.post('/:id/join', requireAuth, async (req, res) => {
  await db.query(
    `INSERT INTO tournament_players (tournament_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.params.id, req.user.userId]
  )
  res.json({ ok: true })
})

export default router
