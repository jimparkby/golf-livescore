import { Telegraf } from 'telegraf'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('start', async (ctx) => {
  const token = ctx.message.text.split(' ')[1]

  if (!token) {
    return ctx.reply('👋 Привет! Используй ссылку с сайта для входа.')
  }

  const { rows: [authRecord] } = await db.query(
    `SELECT * FROM tg_auth_tokens WHERE token = $1 AND verified = FALSE AND expires_at > NOW()`,
    [token]
  )

  if (!authRecord) {
    return ctx.reply('❌ Ссылка устарела или уже использована. Попробуйте снова.')
  }

  const tgUser = ctx.from
  const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')

  const { rows: [user] } = await db.query(
    `INSERT INTO users (telegram_id, telegram_username, telegram_first_name, telegram_last_name, display_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id) DO UPDATE SET
       telegram_username = EXCLUDED.telegram_username,
       telegram_first_name = EXCLUDED.telegram_first_name,
       telegram_last_name = EXCLUDED.telegram_last_name,
       updated_at = NOW()
     RETURNING *`,
    [String(tgUser.id), tgUser.username ?? null, tgUser.first_name, tgUser.last_name ?? null, displayName]
  )

  const jwtToken = jwt.sign(
    { userId: user.id, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  await db.query(
    `UPDATE tg_auth_tokens SET verified = TRUE, user_id = $1, jwt = $2 WHERE token = $3`,
    [user.id, jwtToken, token]
  )

  await ctx.reply('✅ Вы залогинены! Вернитесь на сайт — страница обновится автоматически.')
})
