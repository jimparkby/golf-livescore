import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/notifications/tournament
// Schedule reminders for all opted-in users about an upcoming tournament
router.post('/tournament', requireAuth, async (req, res, next) => {
  const { name, date } = req.body
  if (!name || !date) return res.status(400).json({ error: 'name and date required' })

  const tournamentDate = new Date(date)
  if (isNaN(tournamentDate)) return res.status(400).json({ error: 'invalid date' })

  try {
    const { rows: users } = await db.query(
      'SELECT telegram_id, first_name FROM users WHERE notifications_enabled = true AND telegram_id IS NOT NULL'
    )

    let scheduled = 0
    for (const u of users) {
      const msgs = [
        { daysAgo: 3, text: `🏆 Турнир «${name}» через 3 дня!\nГотовься, ${u.first_name}! ⛳` },
        { daysAgo: 1, text: `🏆 Завтра турнир «${name}»!\nУдачной игры, ${u.first_name}! ⛳` },
      ]
      for (const { daysAgo, text } of msgs) {
        const sendAt = new Date(tournamentDate)
        sendAt.setDate(sendAt.getDate() - daysAgo)
        sendAt.setHours(9, 0, 0, 0)
        if (sendAt > new Date()) {
          await db.query(
            'INSERT INTO scheduled_notifications (telegram_id, user_id, send_at, message, context) VALUES ($1, $2, $3, $4, $5)',
            [u.telegram_id, req.user.userId, sendAt, text, 'tournament']
          )
          scheduled++
        }
      }
    }

    res.json({ scheduled, users: users.length })
  } catch (err) { next(err) }
})

// POST /api/notifications/round-start
// Called by frontend when a round starts — notifies starter + any registered participants
router.post('/round-start', requireAuth, async (req, res, next) => {
  const { playerIds, courseName } = req.body   // playerIds: UUID array (may be empty)

  try {
    const { rows: [requester] } = await db.query(
      'SELECT id, first_name, hcp, telegram_id, notifications_enabled FROM users WHERE id = $1',
      [req.user.userId]
    )

    // Queue round-start notification — the bot generates the personalized tip
    if (requester?.telegram_id && requester?.notifications_enabled) {
      try {
        await db.query(
          `INSERT INTO scheduled_notifications (telegram_id, user_id, send_at, message, context)
           VALUES ($1, $2, NOW(), $3, 'round-start')`,
          [requester.telegram_id, req.user.userId, 'Хорошей игры и прямых драйвов!']
        )
      } catch (e) { console.error('[notif] queue error:', e.message) }
    }

    // Queue notifications for other registered participants
    const targets = Array.isArray(playerIds) && playerIds.length > 0
      ? (await db.query(
          `SELECT id, telegram_id, first_name FROM users
           WHERE id = ANY($1::uuid[])
             AND notifications_enabled = true
             AND telegram_id IS NOT NULL`,
          [playerIds]
        )).rows
      : []
    for (const u of targets) {
      await db.query(
        `INSERT INTO scheduled_notifications (telegram_id, user_id, send_at, message, context)
         VALUES ($1, $2, NOW(), $3, 'round-start')`,
        [
          u.telegram_id,
          u.id,
          `${requester?.first_name ?? 'Игрок'} добавил тебя в раунд!\n${courseName ?? ''}\n\nОткрой приложение чтобы следить за счётом.`,
        ]
      )
    }
    res.json({ queued: targets.length + (requester?.telegram_id ? 1 : 0) })
  } catch (err) { next(err) }
})

// POST /api/notifications/test  — send test notification to yourself
router.post('/test', requireAuth, async (req, res, next) => {
  try {
    const { rows: [user] } = await db.query(
      'SELECT telegram_id, first_name FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (!user?.telegram_id) return res.status(400).json({ error: 'no telegram_id for this user' })
    if (!bot) return res.status(503).json({ error: 'bot not running' })

    await bot.sendMessage(
      user.telegram_id,
      `✅ Уведомления работают, ${user.first_name}! ⛳`,
      { reply_markup: { inline_keyboard: [[{ text: '⛳ Открыть приложение', web_app: { url: process.env.FRONTEND_URL } }]] } }
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
