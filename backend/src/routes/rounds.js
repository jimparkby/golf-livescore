import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { bot } from '../bot.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (id) => UUID_RE.test(id)

const webAppUrl = process.env.FRONTEND_URL || 'https://your-app-url.com'

// ── helpers ──────────────────────────────────────────────────────────────────

async function buildRound(round, requesterId) {
  const { rows: players } = await db.query(
    `SELECT player_id, name, initials, hcp, is_me, user_id
     FROM round_players WHERE round_id = $1`,
    [round.id]
  )

  const { rows: scoreRows } = await db.query(
    `SELECT player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot, made_by
     FROM hole_scores WHERE round_id = $1`,
    [round.id]
  )

  const scoresByPlayer = {}
  scoreRows.forEach((s) => {
    if (!scoresByPlayer[s.player_id]) scoresByPlayer[s.player_id] = []
    scoresByPlayer[s.player_id].push({
      hole: s.hole, score: s.score, putts: s.putts,
      driving: s.driving, gir: s.gir, bunker: s.bunker,
      penalties: s.penalties, teeShot: s.tee_shot, madeBy: s.made_by,
    })
  })

  return {
    id: round.id,
    date: round.date,
    updatedAt: round.updated_at,
    courseId: round.course_id,
    courseName: round.course_name,
    tee: round.tee,
    rating: parseFloat(round.rating),
    slope: round.slope,
    completed: round.completed,
    tournamentId: round.tournament_id,
    format: round.format,
    holesMode: round.holes_mode ?? '18',
    photoUrl: round.photo_url,
    currentHoleIndex: round.current_hole ?? null,
    teams: round.teams ?? null,
    players: players.map((p) => ({
      id: p.player_id,
      name: p.name,
      initials: p.initials,
      hcp: parseFloat(p.hcp),
      isMe: (p.is_me && round.user_id === requesterId) || (p.user_id === requesterId),
    })),
    scores: scoresByPlayer,
  }
}

// ── GET /api/rounds/active ────────────────────────────────────────────────────

router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { rows } = await db.query(
      `SELECT DISTINCT ON (r.user_id) r.*
       FROM rounds r
       WHERE r.date > $1
         AND r.user_id != $2
       ORDER BY r.user_id, r.date DESC`,
      [cutoff, req.user.userId]
    )
    const roundsWithData = await Promise.all(rows.map(r => buildRound(r, req.user.userId)))
    res.json(roundsWithData)
  } catch (err) { next(err) }
})

// ── GET /api/rounds ───────────────────────────────────────────────────────────

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

// ── GET /api/rounds/:id ───────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT r.*
       FROM rounds r
       LEFT JOIN round_players rp ON rp.round_id = r.id AND rp.user_id = $2
       WHERE r.id = $1 AND (r.user_id = $2 OR rp.user_id = $2)`,
      [req.params.id, req.user.userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    const round = await buildRound(rows[0], req.user.userId)
    res.json(round)
  } catch (err) { next(err) }
})

// ── POST /api/rounds/:id/notify ───────────────────────────────────────────────

router.post('/:id/notify', requireAuth, async (req, res, next) => {
  try {
    const { rows: participants } = await db.query(
      `SELECT u.telegram_id, u.first_name
       FROM round_players rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.round_id = $1 AND rp.user_id != $2 AND u.telegram_id IS NOT NULL`,
      [req.params.id, req.user.userId]
    )

    if (!participants.length || !bot) return res.json({ notified: 0 })

    const { rows: [round] } = await db.query('SELECT course_name FROM rounds WHERE id = $1', [req.params.id])
    const { rows: [sender] } = await db.query('SELECT first_name FROM users WHERE id = $1', [req.user.userId])

    const courseName = round?.course_name?.split(' · ')[0] ?? ''
    const senderName = sender?.first_name ?? 'Игрок'

    let notified = 0
    for (const p of participants) {
      try {
        await bot.sendMessage(p.telegram_id,
          `⛳ <b>${senderName}</b> начал раунд!\n\n📍 ${courseName}\n\nОткрой приложение чтобы ввести свой счёт 👇`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '⛳ Открыть Golf Live', web_app: { url: webAppUrl } },
              ]],
            },
          }
        )
        notified++
      } catch (err) {
        console.error('[notify] sendMessage failed for', p.telegram_id, err.message)
      }
    }

    res.json({ notified })
  } catch (err) { next(err) }
})

// ── POST /api/rounds ──────────────────────────────────────────────────────────

router.post('/', requireAuth, async (req, res, next) => {
  const { round } = req.body

  try {
    await db.query('BEGIN')

    await db.query(
      `INSERT INTO rounds (
         id, user_id, date, course_id, course_name, tee, rating, slope,
         completed, tournament_id, format, holes_mode, photo_url, current_hole, teams, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       ON CONFLICT (id) DO UPDATE SET
         completed     = EXCLUDED.completed,
         holes_mode    = EXCLUDED.holes_mode,
         photo_url     = EXCLUDED.photo_url,
         current_hole  = EXCLUDED.current_hole,
         teams         = COALESCE(EXCLUDED.teams, rounds.teams),
         updated_at    = NOW()`,
      [
        round.id, req.user.userId, round.date,
        round.courseId, round.courseName, round.tee,
        round.rating, round.slope, round.completed,
        round.tournamentId || null, round.format || null,
        round.holesMode || '18', round.photoUrl || null,
        round.currentHoleIndex ?? null,
        round.teams ? JSON.stringify(round.teams) : null,
      ]
    )

    // Upsert players (don't overwrite user_id/is_me set by others)
    for (const p of round.players) {
      const linkedUserId = p.isMe ? req.user.userId : (isUUID(p.id) ? p.id : null)
      await db.query(
        `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (round_id, player_id) DO UPDATE SET
           name = EXCLUDED.name, hcp = EXCLUDED.hcp`,
        [round.id, p.id, p.name, p.initials, p.hcp, p.isMe || false, linkedUserId]
      )
    }

    // Upsert hole scores — no DELETE so concurrent edits from participants don't erase each other
    for (const [playerId, scores] of Object.entries(round.scores)) {
      for (const s of scores) {
        await db.query(
          `INSERT INTO hole_scores
             (round_id, player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot, made_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (round_id, player_id, hole) DO UPDATE SET
             score=EXCLUDED.score, putts=EXCLUDED.putts, driving=EXCLUDED.driving,
             gir=EXCLUDED.gir, bunker=EXCLUDED.bunker, penalties=EXCLUDED.penalties,
             tee_shot=EXCLUDED.tee_shot, made_by=EXCLUDED.made_by`,
          [round.id, playerId, s.hole, s.score,
           s.putts||0, s.driving||false, s.gir||false,
           s.bunker||0, s.penalties||0, s.teeShot||null, s.madeBy||null]
        )
      }
    }

    // Mirror completed round for each registered participant
    if (round.completed) {
      const registeredParticipants = round.players.filter(
        (p) => !p.isMe && isUUID(p.id)
      )

      for (const participant of registeredParticipants) {
        const mirrorId = `${round.id}-${participant.id.substring(0, 8)}`

        await db.query(
          `INSERT INTO rounds (
             id, user_id, date, course_id, course_name, tee, rating, slope,
             completed, tournament_id, format, teams, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            mirrorId, participant.id, round.date,
            round.courseId, round.courseName, round.tee,
            round.rating, round.slope, true,
            round.tournamentId || null, round.format || null,
            round.teams ? JSON.stringify(round.teams) : null,
          ]
        )

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

        for (const [playerId, scores] of Object.entries(round.scores)) {
          const mirrorPlayerId = playerId === participant.id ? 'me' : playerId
          for (const s of scores) {
            await db.query(
              `INSERT INTO hole_scores
                 (round_id, player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot, made_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT DO NOTHING`,
              [mirrorId, mirrorPlayerId, s.hole, s.score,
               s.putts||0, s.driving||false, s.gir||false,
               s.bunker||0, s.penalties||0, s.teeShot||null, s.madeBy||null]
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
