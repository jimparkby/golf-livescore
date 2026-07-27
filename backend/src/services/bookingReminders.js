import { db } from '../db.js'
import { bot } from '../bot.js'

const TYPE_LABEL = { tee_time: 'Ти-тайм', training: 'Тренировка' }

// Runs on a cron tick — reminds users ~1 hour before their booked slot starts.
// The 50-70 min window matches the 10-min cron cadence in index.js so every
// booking gets exactly one reminder as it crosses the 1-hour-out mark.
export async function runBookingReminders() {
  if (!bot) return

  try {
    const { rows } = await db.query(
      `SELECT b.id AS booking_id, u.telegram_id,
              s.type, to_char(s.date, 'DD.MM') AS date, to_char(s.time, 'HH24:MI') AS time,
              s.trainer_name
       FROM slot_bookings b
       JOIN booking_slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.user_id
       WHERE b.reminded_at IS NULL
         AND (s.date + s.time) BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'`
    )

    for (const row of rows) {
      if (row.telegram_id) {
        const label = TYPE_LABEL[row.type] ?? row.type
        const trainerLine = row.trainer_name ? `\n👤 Тренер: ${row.trainer_name}` : ''
        try {
          await bot.sendMessage(
            row.telegram_id,
            `⏰ <b>${label} через час</b>\n\n📅 ${row.date} в ${row.time}${trainerLine}`,
            { parse_mode: 'HTML' }
          )
        } catch (err) {
          console.error('[bookingReminders] sendMessage failed:', err.message)
        }
      }
      await db.query('UPDATE slot_bookings SET reminded_at = NOW() WHERE id = $1', [row.booking_id])
    }
  } catch (err) {
    console.error('[bookingReminders] job failed:', err.message)
  }
}
