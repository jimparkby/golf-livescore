import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// ── helpers ──────────────────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L — avoids look-alikes
function genCode(len = 7) {
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return out
}

function displayName(row) {
  return row.guest_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username || 'Player'
}

async function loadTournament(id) {
  const { rows: [t] } = await db.query('SELECT * FROM official_tournaments WHERE id = $1', [id])
  return t
}

async function loadRegistration(tournamentId, userId) {
  const { rows: [r] } = await db.query(
    'SELECT * FROM official_registrations WHERE tournament_id = $1 AND user_id = $2',
    [tournamentId, userId]
  )
  return r
}

// ── GET /api/official-tournaments ─────────────────────────────────────────────
// List tournaments (admins see drafts too), each annotated with the caller's own registration

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows: tournaments } = await db.query(
      req.user.isAdmin
        ? `SELECT * FROM official_tournaments ORDER BY start_time DESC`
        : `SELECT * FROM official_tournaments WHERE status != 'draft' ORDER BY start_time DESC`
    )
    const { rows: myRegs } = await db.query(
      `SELECT * FROM official_registrations WHERE user_id = $1`,
      [req.user.userId]
    )
    const regByTournament = Object.fromEntries(myRegs.map((r) => [r.tournament_id, r]))

    res.json(tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      courseId: t.course_id,
      date: t.date,
      startTime: t.start_time,
      status: t.status,
      holesMode: t.holes_mode,
      myRegistration: regByTournament[t.id] ? {
        id: regByTournament[t.id].id,
        paid: regByTournament[t.id].paid,
        checkedIn: regByTournament[t.id].checked_in,
        groupId: regByTournament[t.id].group_id,
        flightLabel: regByTournament[t.id].flight_label,
      } : null,
    })))
  } catch (err) { next(err) }
})

// ── GET /api/official-tournaments/:id ─────────────────────────────────────────

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const t = await loadTournament(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const reg = await loadRegistration(t.id, req.user.userId)

    let group = null
    if (reg?.group_id) {
      const { rows: [g] } = await db.query('SELECT * FROM official_tournament_groups WHERE id = $1', [reg.group_id])
      if (g) {
        const { rows: players } = await db.query(
          `SELECT tr.id, tr.hcp, tr.guest_name, u.first_name, u.last_name, u.username
           FROM official_registrations tr LEFT JOIN users u ON u.id = tr.user_id
           WHERE tr.group_id = $1
           ORDER BY tr.hcp ASC, tr.id ASC`,
          [g.id]
        )
        group = {
          id: g.id,
          flightLabel: g.flight_label,
          groupNumber: g.group_number,
          roundId: g.round_id,
          players: players.map((p) => ({ id: p.id, name: displayName(p), hcp: Number(p.hcp) })),
        }
      }
    }

    res.json({
      id: t.id,
      name: t.name,
      courseId: t.course_id,
      tee: t.tee,
      date: t.date,
      startTime: t.start_time,
      status: t.status,
      holesMode: t.holes_mode,
      handicapAllowancePct: t.handicap_allowance_pct,
      myRegistration: reg ? {
        id: reg.id,
        paid: reg.paid,
        checkedIn: reg.checked_in,
        // code only visible once check-in has opened, and not after they've already checked in
        accessCode: (!reg.checked_in && (t.status === 'live' || new Date(t.start_time) <= new Date())) ? reg.access_code : null,
        groupId: reg.group_id,
        flightLabel: reg.flight_label,
        hcp: Number(reg.hcp),
      } : null,
      group,
    })
  } catch (err) { next(err) }
})

// ── POST /api/official-tournaments/:id/checkin ────────────────────────────────

router.post('/:id/checkin', requireAuth, async (req, res, next) => {
  const code = String(req.body.code ?? '').trim().toUpperCase()
  try {
    const t = await loadTournament(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const reg = await loadRegistration(t.id, req.user.userId)
    if (!reg || !reg.paid) return res.status(403).json({ error: 'Not registered' })
    if (t.status !== 'live' && new Date(t.start_time) > new Date()) {
      return res.status(400).json({ error: 'Tournament has not started yet' })
    }
    if (!reg.access_code) return res.status(400).json({ error: 'Groups not assigned yet' })
    if (reg.access_code !== code) return res.status(400).json({ error: 'Invalid code' })

    await db.query(
      `UPDATE official_registrations SET checked_in = true, checked_in_at = NOW() WHERE id = $1`,
      [reg.id]
    )

    const { rows: [group] } = await db.query('SELECT * FROM official_tournament_groups WHERE id = $1', [reg.group_id])
    res.json({ groupId: reg.group_id, roundId: group?.round_id ?? null })
  } catch (err) { next(err) }
})

// ── POST /api/official-tournaments/:id/groups/:groupId/scores ────────────────

router.post('/:id/groups/:groupId/scores', requireAuth, async (req, res, next) => {
  const { scores } = req.body
  try {
    const reg = await loadRegistration(req.params.id, req.user.userId)
    if (!reg || !reg.checked_in || reg.group_id !== req.params.groupId) {
      return res.status(403).json({ error: 'Not part of this group' })
    }
    const { rows: [group] } = await db.query('SELECT * FROM official_tournament_groups WHERE id = $1', [req.params.groupId])
    if (!group?.round_id) return res.status(400).json({ error: 'Group has no round' })

    // Only allow writing scores for players who are actually in this group
    const { rows: groupPlayers } = await db.query(
      'SELECT id FROM official_registrations WHERE group_id = $1', [group.id]
    )
    const allowedIds = new Set(groupPlayers.map((p) => p.id))

    for (const s of scores ?? []) {
      if (!allowedIds.has(s.playerId)) continue
      await db.query(
        `INSERT INTO hole_scores (round_id, player_id, hole, score, putts, driving, gir, bunker, penalties)
         VALUES ($1,$2,$3,$4,$5,false,false,0,0)
         ON CONFLICT (round_id, player_id, hole) DO UPDATE SET
           score = EXCLUDED.score, putts = EXCLUDED.putts`,
        [group.round_id, s.playerId, s.hole, s.score, s.putts ?? 0]
      )
    }
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── GET /api/official-tournaments/:id/live ────────────────────────────────────

router.get('/:id/live', requireAuth, async (req, res, next) => {
  try {
    const t = await loadTournament(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })

    const { rows: groups } = await db.query(
      'SELECT * FROM official_tournament_groups WHERE tournament_id = $1 ORDER BY flight_label, group_number', [t.id]
    )
    const { rows: players } = await db.query(
      `SELECT tr.id, tr.group_id, tr.hcp, tr.flight_label, tr.guest_name, u.first_name, u.last_name, u.username
       FROM official_registrations tr LEFT JOIN users u ON u.id = tr.user_id
       WHERE tr.tournament_id = $1 AND tr.group_id IS NOT NULL
       ORDER BY tr.hcp ASC, tr.id ASC`,
      [t.id]
    )
    const roundIds = groups.map((g) => g.round_id).filter(Boolean)
    const { rows: scores } = roundIds.length
      ? await db.query(
          `SELECT round_id, player_id, hole, score FROM hole_scores WHERE round_id = ANY($1)`,
          [roundIds]
        )
      : { rows: [] }

    res.json({
      tournament: {
        id: t.id, name: t.name, courseId: t.course_id, tee: t.tee, holesMode: t.holes_mode,
        rating: Number(t.rating), slope: t.slope,
        handicapAllowancePct: t.handicap_allowance_pct, status: t.status,
      },
      groups: groups.map((g) => ({
        id: g.id, flightLabel: g.flight_label, groupNumber: g.group_number, roundId: g.round_id,
      })),
      players: players.map((p) => ({
        id: p.id, groupId: p.group_id, flightLabel: p.flight_label, hcp: Number(p.hcp), name: displayName(p),
      })),
      scores: scores.map((s) => ({ roundId: s.round_id, playerId: s.player_id, hole: s.hole, score: s.score })),
    })
  } catch (err) { next(err) }
})

// ── Admin routes ───────────────────────────────────────────────────────────────

router.post('/', requireAdmin, async (req, res, next) => {
  const { name, courseId, courseName, tee, rating, slope, date, startTime, holesMode, handicapAllowancePct, flightCount, groupSize } = req.body
  if (!name || !date || !startTime) return res.status(400).json({ error: 'name, date, startTime required' })
  try {
    const { rows: [t] } = await db.query(
      `INSERT INTO official_tournaments
         (name, course_id, course_name, tee, rating, slope, date, start_time, holes_mode, handicap_allowance_pct, flight_count, group_size, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        name, courseId || null, courseName || name, tee || 'yellow', rating ?? 72, slope ?? 113,
        date, startTime, holesMode || '18', handicapAllowancePct ?? 80, flightCount ?? 3, groupSize ?? 4,
        req.user.userId,
      ]
    )
    res.json(t)
  } catch (err) { next(err) }
})

router.put('/:id', requireAdmin, async (req, res, next) => {
  const { name, courseId, courseName, tee, rating, slope, date, startTime, holesMode, handicapAllowancePct, flightCount, groupSize, status } = req.body
  try {
    const { rows: [t] } = await db.query(
      `UPDATE official_tournaments SET
         name = COALESCE($2, name), course_id = COALESCE($3, course_id), course_name = COALESCE($4, course_name),
         tee = COALESCE($5, tee), rating = COALESCE($6, rating), slope = COALESCE($7, slope),
         date = COALESCE($8, date), start_time = COALESCE($9, start_time), holes_mode = COALESCE($10, holes_mode),
         handicap_allowance_pct = COALESCE($11, handicap_allowance_pct), flight_count = COALESCE($12, flight_count),
         group_size = COALESCE($13, group_size), status = COALESCE($14, status)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, courseId, courseName, tee, rating, slope, date, startTime, holesMode, handicapAllowancePct, flightCount, groupSize, status]
    )
    if (!t) return res.status(404).json({ error: 'Not found' })
    if (status === 'completed') {
      await db.query(`UPDATE rounds SET completed = true, updated_at = NOW() WHERE tournament_id = $1`, [t.id])
    }
    res.json(t)
  } catch (err) { next(err) }
})

router.get('/:id/admin', requireAdmin, async (req, res, next) => {
  try {
    const t = await loadTournament(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const { rows: regs } = await db.query(
      `SELECT tr.*, u.first_name, u.last_name, u.username
       FROM official_registrations tr LEFT JOIN users u ON u.id = tr.user_id
       WHERE tr.tournament_id = $1
       ORDER BY tr.hcp ASC`,
      [t.id]
    )
    const { rows: groups } = await db.query(
      'SELECT * FROM official_tournament_groups WHERE tournament_id = $1 ORDER BY flight_label, group_number', [t.id]
    )
    res.json({
      tournament: t,
      registrations: regs.map((r) => ({
        id: r.id, userId: r.user_id, name: displayName(r), hcp: Number(r.hcp),
        paid: r.paid, checkedIn: r.checked_in, groupId: r.group_id, flightLabel: r.flight_label,
        accessCode: r.access_code,
      })),
      groups: groups.map((g) => ({ id: g.id, flightLabel: g.flight_label, groupNumber: g.group_number, roundId: g.round_id })),
    })
  } catch (err) { next(err) }
})

router.post('/:id/registrations', requireAdmin, async (req, res, next) => {
  const { userId, guestName, hcp } = req.body
  if (!userId && !guestName) return res.status(400).json({ error: 'userId or guestName required' })
  try {
    const { rows: [reg] } = await db.query(
      `INSERT INTO official_registrations (tournament_id, user_id, guest_name, hcp)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (tournament_id, user_id) DO UPDATE SET hcp = EXCLUDED.hcp
       RETURNING *`,
      [req.params.id, userId || null, userId ? null : guestName, hcp ?? 0]
    )
    res.json(reg)
  } catch (err) { next(err) }
})

router.put('/:id/registrations/:regId', requireAdmin, async (req, res, next) => {
  const { hcp, guestName, paid } = req.body
  try {
    const { rows: [reg] } = await db.query(
      `UPDATE official_registrations SET
         hcp = COALESCE($3, hcp),
         guest_name = COALESCE($4, guest_name),
         paid = COALESCE($5, paid),
         paid_at = CASE WHEN $5 = true AND paid = false THEN NOW() ELSE paid_at END
       WHERE id = $1 AND tournament_id = $2 RETURNING *`,
      [req.params.regId, req.params.id, hcp, guestName, paid]
    )
    if (!reg) return res.status(404).json({ error: 'Not found' })
    res.json(reg)
  } catch (err) { next(err) }
})

router.delete('/:id/registrations/:regId', requireAdmin, async (req, res, next) => {
  try {
    await db.query('DELETE FROM official_registrations WHERE id = $1 AND tournament_id = $2', [req.params.regId, req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── POST /api/official-tournaments/:id/regroup ────────────────────────────────

router.post('/:id/regroup', requireAdmin, async (req, res, next) => {
  try {
    const t = await loadTournament(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    if (t.status === 'live' || t.status === 'completed') {
      return res.status(400).json({ error: 'Cannot regroup once the tournament is live' })
    }

    const { rows: paidRegs } = await db.query(
      `SELECT tr.*, u.first_name, u.last_name, u.username
       FROM official_registrations tr LEFT JOIN users u ON u.id = tr.user_id
       WHERE tr.tournament_id = $1 AND tr.paid = true
       ORDER BY tr.hcp ASC`,
      [t.id]
    )
    if (paidRegs.length === 0) return res.status(400).json({ error: 'No paid players to group' })

    await db.query('BEGIN')

    // Wipe previous groups/rounds/scores for this tournament
    const { rows: oldGroups } = await db.query('SELECT round_id FROM official_tournament_groups WHERE tournament_id = $1', [t.id])
    for (const g of oldGroups) {
      if (!g.round_id) continue
      await db.query('DELETE FROM hole_scores WHERE round_id = $1', [g.round_id])
      await db.query('DELETE FROM round_players WHERE round_id = $1', [g.round_id])
      await db.query('DELETE FROM rounds WHERE id = $1', [g.round_id])
    }
    await db.query('DELETE FROM official_tournament_groups WHERE tournament_id = $1', [t.id])
    await db.query(
      `UPDATE official_registrations SET group_id = NULL, flight_label = NULL, access_code = NULL, checked_in = false, checked_in_at = NULL
       WHERE tournament_id = $1`,
      [t.id]
    )

    // Split into flights of ~equal size
    const flightCount = Math.max(1, Math.min(t.flight_count, paidRegs.length))
    const base = Math.floor(paidRegs.length / flightCount)
    const extra = paidRegs.length % flightCount
    const flights = []
    let cursor = 0
    for (let i = 0; i < flightCount; i++) {
      const size = base + (i < extra ? 1 : 0)
      flights.push(paidRegs.slice(cursor, cursor + size))
      cursor += size
    }

    const groupSize = Math.max(2, t.group_size || 4)
    let flightIdx = 0
    for (const flightRegs of flights) {
      flightIdx++
      if (flightRegs.length === 0) continue
      const lo = Math.min(...flightRegs.map((r) => Number(r.hcp)))
      const hi = Math.max(...flightRegs.map((r) => Number(r.hcp)))
      const label = flightCount === 1 ? 'Все игроки' : (lo === hi ? `HCP ${lo}` : `HCP ${lo}–${hi}`)

      let groupNumber = 0
      for (let i = 0; i < flightRegs.length; i += groupSize) {
        groupNumber++
        const groupRegs = flightRegs.slice(i, i + groupSize)

        const roundId = `ot-${t.id.slice(0, 8)}-f${flightIdx}-g${groupNumber}`
        await db.query(
          `INSERT INTO rounds (id, user_id, date, course_id, course_name, tee, rating, slope, completed, tournament_id, format, holes_mode, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,'stableford',$10,NOW())`,
          [roundId, t.created_by, t.date, t.course_id, t.course_name, t.tee, t.rating, t.slope, t.id, t.holes_mode]
        )

        const { rows: [group] } = await db.query(
          `INSERT INTO official_tournament_groups (tournament_id, flight_label, group_number, round_id)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [t.id, label, groupNumber, roundId]
        )

        for (const r of groupRegs) {
          const code = genCode()
          await db.query(
            `UPDATE official_registrations SET group_id = $1, flight_label = $2, access_code = $3 WHERE id = $4`,
            [group.id, label, code, r.id]
          )
          await db.query(
            `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me, user_id)
             VALUES ($1,$2,$3,$4,$5,false,$6)`,
            [roundId, r.id, displayName(r), (displayName(r).split(' ').map((p) => p[0]).join('').slice(0, 2) || '??').toUpperCase(), r.hcp, r.user_id]
          )
        }
      }
    }

    await db.query('COMMIT')
    res.json({ success: true, flights: flights.map((f) => f.length) })
  } catch (err) {
    await db.query('ROLLBACK')
    next(err)
  }
})

export default router
