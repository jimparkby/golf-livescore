import { Telegraf } from 'telegraf'
import { supabase } from './supabase.js'

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('start', async (ctx) => {
  const token = ctx.message.text.split(' ')[1]

  if (!token) {
    return ctx.reply('👋 Привет! Чтобы войти на сайт, используйте ссылку с сайта.')
  }

  // Find pending auth token
  const { data: authRecord } = await supabase
    .from('tg_auth_tokens')
    .select()
    .eq('token', token)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!authRecord) {
    return ctx.reply('❌ Ссылка устарела или уже использована. Попробуйте снова.')
  }

  const tgUser = ctx.from

  // Check if telegram user already has an account
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('telegram_id', String(tgUser.id))
    .maybeSingle()

  let supabaseUserId

  if (existingProfile) {
    supabaseUserId = existingProfile.user_id
  } else {
    const email = `tg_${tgUser.id}@tg.golf`
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')

    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        telegram_id: String(tgUser.id),
        telegram_username: tgUser.username ?? null,
        display_name: displayName,
      },
    })

    if (error) {
      console.error('Create user error:', error)
      return ctx.reply('❌ Ошибка при создании аккаунта. Попробуйте позже.')
    }

    supabaseUserId = user.id
  }

  // Upsert profile with telegram data
  const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
  await supabase.from('profiles').upsert(
    {
      user_id: supabaseUserId,
      display_name: displayName,
      telegram_id: String(tgUser.id),
      telegram_username: tgUser.username ?? null,
      telegram_first_name: tgUser.first_name,
      telegram_last_name: tgUser.last_name ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  // Generate magic link so frontend can create a session
  const email = `tg_${tgUser.id}@tg.golf`
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError) {
    console.error('Generate link error:', linkError)
    return ctx.reply('❌ Ошибка генерации сессии. Попробуйте позже.')
  }

  // Mark token as verified, store hashed_token for frontend
  await supabase
    .from('tg_auth_tokens')
    .update({
      verified: true,
      telegram_id: String(tgUser.id),
      telegram_username: tgUser.username ?? null,
      telegram_first_name: tgUser.first_name,
      supabase_user_id: supabaseUserId,
      hashed_token: linkData.properties.hashed_token,
      email,
    })
    .eq('token', token)

  await ctx.reply('✅ Вы залогинены! Вернитесь на сайт — страница обновится автоматически.')
})
