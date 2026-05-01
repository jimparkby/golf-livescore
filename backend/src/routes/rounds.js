import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Получить все раунды пользователя
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows: rounds } = await db.query(
      `SELECT * FROM rounds
       WHERE user_id = $1
       ORDER BY date DESC`,
      [req.user.userId]
    )

    // Для каждого раунда получаем игроков и счета
    const roundsWithData = await Promise.all(
      rounds.map(async (round) => {
        const { rows: players } = await db.query(
          `SELECT player_id as id, name, initials, hcp, is_me
           FROM round_players
           WHERE round_id = $1`,
          [round.id]
        )

        const { rows: scores } = await db.query(
          `SELECT player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot
           FROM hole_scores
           WHERE round_id = $1`,
          [round.id]
        )

        // Группируем счета по игрокам
        const scoresByPlayer = {}
        scores.forEach((s) => {
          if (!scoresByPlayer[s.player_id]) scoresByPlayer[s.player_id] = []
          scoresByPlayer[s.player_id].push({
            hole: s.hole,
            score: s.score,
            putts: s.putts,
            driving: s.driving,
            gir: s.gir,
            bunker: s.bunker,
            penalties: s.penalties,
            teeShot: s.tee_shot,
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
          players: players.map(p => ({
            id: p.id,
            name: p.name,
            initials: p.initials,
            hcp: parseFloat(p.hcp),
            isMe: p.is_me,
          })),
          scores: scoresByPlayer,
          completed: round.completed,
          tournamentId: round.tournament_id,
          format: round.format,
          photoUrl: round.photo_url,
        }
      })
    )

    res.json(roundsWithData)
  } catch (err) {
    next(err)
  }
})

// Сохранить раунд
router.post('/', requireAuth, async (req, res, next) => {
  const { round } = req.body

  try {
    // Начинаем транзакцию
    await db.query('BEGIN')

    // Сохраняем раунд
    await db.query(
      `INSERT INTO rounds (
        id, user_id, date, course_id, course_name, tee, rating, slope,
        completed, tournament_id, format, photo_url, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        course_id = EXCLUDED.course_id,
        course_name = EXCLUDED.course_name,
        tee = EXCLUDED.tee,
        rating = EXCLUDED.rating,
        slope = EXCLUDED.slope,
        completed = EXCLUDED.completed,
        tournament_id = EXCLUDED.tournament_id,
        format = EXCLUDED.format,
        photo_url = EXCLUDED.photo_url,
        updated_at = NOW()`,
      [
        round.id,
        req.user.userId,
        round.date,
        round.courseId,
        round.courseName,
        round.tee,
        round.rating,
        round.slope,
        round.completed,
        round.tournamentId || null,
        round.format || null,
        round.photoUrl || null,
      ]
    )

    // Удаляем старых игроков и счета
    await db.query('DELETE FROM round_players WHERE round_id = $1', [round.id])
    await db.query('DELETE FROM hole_scores WHERE round_id = $1', [round.id])

    // Добавляем игроков
    for (const player of round.players) {
      await db.query(
        `INSERT INTO round_players (round_id, player_id, name, initials, hcp, is_me)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [round.id, player.id, player.name, player.initials, player.hcp, player.isMe || false]
      )
    }

    // Добавляем счета
    for (const [playerId, scores] of Object.entries(round.scores)) {
      for (const score of scores) {
        await db.query(
          `INSERT INTO hole_scores (
            round_id, player_id, hole, score, putts, driving, gir, bunker, penalties, tee_shot
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            round.id,
            playerId,
            score.hole,
            score.score,
            score.putts || 0,
            score.driving || false,
            score.gir || false,
            score.bunker || 0,
            score.penalties || 0,
            score.teeShot || null,
          ]
        )
      }
    }

    await db.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await db.query('ROLLBACK')
    next(err)
  }
})

// Удалить раунд
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM rounds WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Обновить фото раунда
router.put('/:id/photo', requireAuth, async (req, res, next) => {
  const { photoUrl } = req.body
  try {
    await db.query(
      'UPDATE rounds SET photo_url = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [photoUrl, req.params.id, req.user.userId]
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
