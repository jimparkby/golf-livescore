import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../db.js'
import { buildRound } from './rounds.js'

const router = Router()

// Public live-scoring routes — reachable via QR code on a scorecard, no login
// required. Access is gated only by knowing the round's share_code.

async function findRoundByCode(code) {
  const { rows: [round] } = await db.query('SELECT * FROM rounds WHERE share_code = $1', [code])
  return round ?? null
}

// ── GET /api/live/:code ─────────────────────────────────────────────────────

router.get('/:code', async (req, res, next) => {
  try {
    const round = await findRoundByCode(req.params.code)
    if (!round) return res.status(404).json({ error: 'Not found' })
    const data = await buildRound(round, null)
    res.json(data)
  } catch (err) { next(err) }
})

// ── POST /api/live/:code/players ────────────────────────────────────────────

router.post('/:code/players', async (req, res, next) => {
  try {
    const round = await findRoundByCode(req.params.code)
    if (!round) return res.status(404).json({ error: 'Not found' })
    if (round.completed) return res.status(400).json({ error: 'Round already finished' })

    const name = String(req.body.name || '').trim().slice(0, 60)
    if (!name) return res.status(400).json({ error: 'Name required' })
    const hcp = Number.isFinite(req.body.hcp) ? Number(req.body.hcp) : 0
    const initials = name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    const playerId = `guest-${crypto.randomBytes(4).toString('hex')}`

    await db.query(
      `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me, user_id)
       VALUES ($1,$2,$3,$4,$5,false,NULL)`,
      [round.id, playerId, name, initials, hcp]
    )
    await db.query('UPDATE rounds SET updated_at = NOW() WHERE id = $1', [round.id])

    const data = await buildRound({ ...round }, null)
    res.json(data)
  } catch (err) { next(err) }
})

// ── POST /api/live/:code/score ──────────────────────────────────────────────

router.post('/:code/score', async (req, res, next) => {
  try {
    const round = await findRoundByCode(req.params.code)
    if (!round) return res.status(404).json({ error: 'Not found' })
    if (round.completed) return res.status(400).json({ error: 'Round already finished' })

    const { playerId, hole, score, putts, madeBy } = req.body
    if (!playerId || !Number.isInteger(hole) || hole < 1 || hole > 18) {
      return res.status(400).json({ error: 'Invalid hole' })
    }
    if (!Number.isInteger(score) || score < 1 || score > 20) {
      return res.status(400).json({ error: 'Invalid score' })
    }

    const { rows: [player] } = await db.query(
      'SELECT player_id FROM round_players WHERE round_id = $1 AND player_id = $2',
      [round.id, playerId]
    )
    if (!player) return res.status(404).json({ error: 'Player not in this round' })

    await db.query(
      `INSERT INTO hole_scores (round_id, player_id, hole, score, putts, made_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (round_id, player_id, hole) DO UPDATE SET
         score = EXCLUDED.score, putts = EXCLUDED.putts, made_by = EXCLUDED.made_by`,
      [round.id, playerId, hole, score, putts || 0, madeBy || null]
    )
    await db.query('UPDATE rounds SET updated_at = NOW() WHERE id = $1', [round.id])

    const data = await buildRound({ ...round }, null)
    res.json(data)
  } catch (err) { next(err) }
})

export default router
