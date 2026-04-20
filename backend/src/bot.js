import { Telegraf } from 'telegraf'

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('start', (ctx) => {
  ctx.reply('👋 Привет! Войди на сайт через кнопку «Войти через Telegram».')
})
