import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (id) => UUID_RE.test(id)

// ── helpers ──────────────────────────────────────────────────────────────────

async function buildRound(round, requesterId) {
  const { rows: players } = await db.query(
    `SELECT player_id, name, initials, hcp, is_me, user_id
     FROM round_players WHERE round_id = $1`,
    [round.id]
  )

  const { rows: scoreRows } = await db.query(
    `SELECT player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot
     FROM hole_scores WHERE round_id = $1`,
    [round.id]
  )

  const scoresByPlayer = {}
  scoreRows.forEach((s) => {
    if (!scoresByPlayer[s.player_id]) scoresByPlayer[s.player_id] = []
    scoresByPlayer[s.player_id].push({
      hole: s.hole, score: s.score, putts: s.putts,
      driving: s.driving, gir: s.gir, bunker: s.bunker,
      penalties: s.penalties, teeShot: s.tee_shot,
    })
  })

  return {
    id: round.id,
    date: round.date,
    courseId: round.course_id,
    courseName: round.course_name,
    tee: round.tee,
    rating: parseFloat(round.rating),
    slope: round.slope,
    completed: round.completed,
    tournamentId: round.tournament_id,
    format: round.format,
    photoUrl: round.photo_url,
    players: players.map((p) => ({
      id: p.player_id,
      name: p.name,
      initials: p.initials,
      hcp: parseFloat(p.hcp),
      // isMe: creator's "me" entry if requester is creator,
      //        OR this player's user_id matches the requester
      isMe: (p.is_me && round.user_id === requesterId) || (p.user_id === requesterId),
    })),
    scores: scoresByPlayer,
  }
}

// ── GET /api/rounds ───────────────────────────────────────────────────────────
// Returns own rounds + rounds where user is a registered participant

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows: rounds } = await db.query(
      `SELECT DISTINCT r.*
       FROM rounds r
       LEFT JOIN round_players rp
         ON rp.round_id = r.id AND rp.user_id = $1
       WHERE r.user_id = $1 OR rp.user_id = $1
       ORDER BY r.date DESC`,
      [req.user.userId]
    )

    const roundsWithData = await Promise.all(
      rounds.map((r) => buildRound(r, req.user.userId))
    )
    res.json(roundsWithData)
  } catch (err) { next(err) }
})

// ── POST /api/rounds ──────────────────────────────────────────────────────────
// Save (upsert) a round. On completion, mirror the round for each registered participant.

router.post('/', requireAuth, async (req, res, next) => {
  const { round } = req.body

  try {
    await db.query('BEGIN')

    await db.query(
      `INSERT INTO rounds (
         id, user_id, date, course_id, course_name, tee, rating, slope,
         completed, tournament_id, format, photo_url, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET
         completed     = EXCLUDED.completed,
         photo_url     = EXCLUDED.photo_url,
         updated_at    = NOW()`,
      [
        round.id, req.user.userId, round.date,
        round.courseId, round.courseName, round.tee,
        round.rating, round.slope, round.completed,
        round.tournamentId || null, round.format || null, round.photoUrl || null,
      ]
    )

    await db.query('DELETE FROM round_players WHERE round_id = $1', [round.id])
    await db.query('DELETE FROM hole_scores WHERE round_id = $1', [round.id])

    for (const p of round.players) {
      // store user_id for the creator AND for registered participants (UUID ids)
      const linkedUserId = p.isMe ? req.user.userId : (isUUID(p.id) ? p.id : null)
      await db.query(
        `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [round.id, p.id, p.name, p.initials, p.hcp, p.isMe || false, linkedUserId]
      )
    }

    for (const [playerId, scores] of Object.entries(round.scores)) {
      for (const s of scores) {
        await db.query(
          `INSERT INTO hole_scores
             (round_id, player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [round.id, playerId, s.hole, s.score,
           s.putts||0, s.driving||false, s.gir||false,
           s.bunker||0, s.penalties||0, s.teeShot||null]
        )
      }
    }

    // When round is completed, create a mirrored round for each registered participant
    // so they see it in their own history (with isMe=true for their perspective)
    if (round.completed) {
      const registeredParticipants = round.players.filter(
        (p) => !p.isMe && isUUID(p.id)
      )

      for (const participant of registeredParticipants) {
        const mirrorId = `${round.id}-${participant.id.substring(0, 8)}`

        await db.query(
          `INSERT INTO rounds (
             id, user_id, date, course_id, course_name, tee, rating, slope,
             completed, tournament_id, format, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            mirrorId, participant.id, round.date,
            round.courseId, round.courseName, round.tee,
            round.rating, round.slope, true,
            round.tournamentId || null, round.format || null,
          ]
        )

        // Players from participant's perspective: their entry becomes "me"
        for (const p of round.players) {
          const mirrorPlayerId = p.id === participant.id ? 'me' : p.id
          const mirrorIsMe    = p.id === participant.id
          const mirrorUserId  = p.isMe ? req.user.userId : (isUUID(p.id) ? p.id : null)
          await db.query(
            `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me, user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
            [mirrorId, mirrorPlayerId, p.name, p.initials, p.hcp, mirrorIsMe, mirrorUserId]
          )
        }

        // Scores: participant's scores stored under 'me'
        for (const [playerId, scores] of Object.entries(round.scores)) {
          const mirrorPlayerId = playerId === participant.id ? 'me' : playerId
          for (const s of scores) {
            await db.query(
              `INSERT INTO hole_scores
                 (round_id, player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
               ON CONFLICT DO NOTHING`,
              [mirrorId, mirrorPlayerId, s.hole, s.score,
               s.putts||0, s.driving||false, s.gir||false,
               s.bunker||0, s.penalties||0, s.teeShot||null]
            )
          }
        }
      }
    }

    await db.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await db.query('ROLLBACK')
    next(err)
  }
})

// ── DELETE /api/rounds/:id ────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM rounds WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── PUT /api/rounds/:id/photo ─────────────────────────────────────────────────

router.put('/:id/photo', requireAuth, async (req, res, next) => {
  const { photoUrl } = req.body
  try {
    await db.query(
      'UPDATE rounds SET photo_url = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [photoUrl, req.params.id, req.user.userId]
    )
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
