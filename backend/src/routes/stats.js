import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { rows: scores } = await db.query(
    `SELECT s.tournament_id, s.hole_id, s.strokes, h.par
     FROM scores s
     JOIN holes h ON h.id = s.hole_id
     WHERE s.user_id = $1 AND s.strokes IS NOT NULL`,
    [req.user.userId]
  )

  if (scores.length === 0) {
    return res.json({ rounds: 0, holes: 0, avgStrokes: 0, bestToPar: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doublesPlus: 0, stableford: 0 })
  }

  const perTournToPar = new Map()
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doublesPlus = 0, stbf = 0, totalStrokes = 0

  for (const r of scores) {
    const diff = r.strokes - r.par
    totalStrokes += r.strokes
    if (diff <= -2) eagles++
    else if (diff === -1) birdies++
    else if (diff === 0) pars++
    else if (diff === 1) bogeys++
    else doublesPlus++

    const pts = Math.max(0, 2 - diff)
    stbf += pts
    perTournToPar.set(r.tournament_id, (perTournToPar.get(r.tournament_id) ?? 0) + diff)
  }

  const bestToPar = Math.min(...Array.from(perTournToPar.values()))

  res.json({
    rounds: perTournToPar.size,
    holes: scores.length,
    avgStrokes: +(totalStrokes / scores.length).toFixed(2),
    bestToPar,
    eagles, birdies, pars, bogeys, doublesPlus,
    stableford: stbf,
  })
})

export default router
