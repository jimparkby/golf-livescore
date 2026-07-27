import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { bot } from '../bot.js'
import { parseParticipantsPhoto, parseTournamentResultsPhoto } from '../services/adminPhotoParser.js'
import { calculateAndSavePredictions } from '../services/predictionsCalculator.js'
import { recalculatePredictionsForUpcomingTournaments } from '../services/winProbabilityAI.js'

const router = Router()

router.use(requireAuth, requireAdmin)

function bufferFromDataUrl(dataUrl) {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl || '')
  if (!match) throw new Error('Invalid image data')
  return Buffer.from(match[1], 'base64')
}

// Archives a web-uploaded photo to Telegram (DM to the admin) so it gets a
// file_id — the same artifact the bot produces when a photo is sent to it —
// letting it slot into tournaments.flights_photos and be picked up later by
// recalculatePredictionsForUpcomingTournaments() exactly like a bot upload.
async function archivePhotoToTelegram(telegramId, buffer, caption) {
  if (!bot || !telegramId) return null
  try {
    const msg = await bot.sendPhoto(telegramId, buffer, { caption })
    const sizes = msg.photo
    return sizes?.length ? sizes[sizes.length - 1].file_id : null
  } catch (err) {
    console.error('[admin] archivePhotoToTelegram failed:', err.message)
    return null
  }
}

// ── GET /api/admin/check ────────────────────────────────────────────────────

router.get('/check', (_req, res) => res.json({ ok: true }))

// ── GET /api/admin/tournaments ──────────────────────────────────────────────

router.get('/tournaments', async (_req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, date, slug
      FROM tournaments
      ORDER BY
        CASE WHEN date >= CURRENT_DATE THEN 0 ELSE 1 END,
        CASE WHEN date >= CURRENT_DATE THEN date END ASC,
        CASE WHEN date < CURRENT_DATE THEN date END DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// ── Results ──────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/results/parse', async (req, res, next) => {
  try {
    const buffer = bufferFromDataUrl(req.body.image)
    const { results } = await parseTournamentResultsPhoto(buffer)
    res.json({ results })
  } catch (err) { next(err) }
})

router.post('/tournaments/:id/results/save', async (req, res, next) => {
  try {
    const tournamentId = parseInt(req.params.id, 10)
    const results = Array.isArray(req.body.results) ? req.body.results : []
    if (!tournamentId || results.length === 0) {
      return res.status(400).json({ error: 'No results to save' })
    }

    let saved = 0
    for (const r of results) {
      const place = parseInt(r.place, 10)
      const score = parseInt(r.score, 10)
      const name = String(r.name || '').trim()
      if (!place || !score || !name) continue
      try {
        await db.query(
          `INSERT INTO tournament_results (tournament_id, place, player_name, score, group_name)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tournament_id, place, group_name)
           DO UPDATE SET player_name = $3, score = $4`,
          [tournamentId, place, name, score, r.group || null]
        )
        saved++
      } catch (err) {
        console.error('[admin] save result error:', err.message)
      }
    }

    try {
      await db.query('SELECT refresh_player_statistics_for_tournament($1)', [tournamentId])
    } catch (err) {
      console.error('[admin] refresh_player_statistics_for_tournament failed:', err.message)
    }
    recalculatePredictionsForUpcomingTournaments().catch((err) =>
      console.error('[admin] recalculatePredictionsForUpcomingTournaments failed:', err.message)
    )

    res.json({ saved })
  } catch (err) { next(err) }
})

// ── Participants ─────────────────────────────────────────────────────────────

router.post('/tournaments/:id/participants/parse', async (req, res, next) => {
  try {
    const buffer = bufferFromDataUrl(req.body.image)
    const { participants } = await parseParticipantsPhoto(buffer)
    res.json({ participants })
  } catch (err) { next(err) }
})

router.post('/tournaments/:id/participants/save', async (req, res, next) => {
  try {
    const tournamentId = parseInt(req.params.id, 10)
    const participants = Array.isArray(req.body.participants) ? req.body.participants : []
    if (!tournamentId || participants.length === 0) {
      return res.status(400).json({ error: 'No participants to save' })
    }

    let saved = 0
    for (const p of participants) {
      const name = String(p.name || '').trim()
      if (!name) continue
      const email = p.email ? String(p.email).trim() : null
      const phone = p.phone ? String(p.phone).trim() : null
      const handicap = Number.isFinite(p.handicap) ? p.handicap : (parseFloat(p.handicap) || 0)
      try {
        if (email) {
          await db.query(
            `INSERT INTO participants (name, email, phone, handicap)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO UPDATE SET name = $1, phone = $3, handicap = $4`,
            [name, email, phone, handicap]
          )
        } else {
          await db.query(
            `INSERT INTO participants (name, email, phone, handicap) VALUES ($1, NULL, $2, $3)`,
            [name, phone, handicap]
          )
        }
        saved++
      } catch (err) {
        console.error('[admin] save participant error:', err.message)
      }
    }

    let photoArchived = false
    if (req.body.image) {
      try {
        const buffer = bufferFromDataUrl(req.body.image)
        const fileId = await archivePhotoToTelegram(req.adminTelegramId, buffer, `Участники турнира #${tournamentId}`)
        if (fileId) {
          await db.query(
            `UPDATE tournaments
             SET flights_photos = COALESCE(flights_photos, '[]'::jsonb) || $1::jsonb
             WHERE id = $2`,
            [JSON.stringify([fileId]), tournamentId]
          )
          photoArchived = true
        }
      } catch (err) {
        console.error('[admin] archive participants photo failed:', err.message)
      }
    }

    calculateAndSavePredictions(tournamentId).catch((err) =>
      console.error('[admin] calculateAndSavePredictions failed:', err.message)
    )

    res.json({ saved, photoArchived })
  } catch (err) { next(err) }
})

// ── Registrations overview ──────────────────────────────────────────────────

router.get('/registrations', async (_req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        t.id,
        t.name,
        t.date,
        t.slug,
        COUNT(tr.id) FILTER (WHERE tr.id IS NOT NULL) AS total,
        COUNT(tr.id) FILTER (WHERE tr.status = 'pending_review') AS pending,
        COUNT(tr.id) FILTER (WHERE tr.status = 'awaiting_payment') AS awaiting,
        COUNT(tr.id) FILTER (WHERE tr.status = 'paid') AS paid
      FROM tournaments t
      LEFT JOIN tournament_registrations tr ON COALESCE(t.slug, t.id::text) = tr.tournament_id
      WHERE t.date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY t.id, t.name, t.date, t.slug
      HAVING COUNT(tr.id) > 0
      ORDER BY t.date DESC
      LIMIT 20
    `)
    res.json(rows.map((r) => ({
      id: r.slug || String(r.id),
      name: r.name,
      date: r.date,
      total: Number(r.total),
      pending: Number(r.pending),
      awaiting: Number(r.awaiting),
      paid: Number(r.paid),
    })))
  } catch (err) { next(err) }
})

export default router
