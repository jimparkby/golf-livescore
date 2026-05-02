import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.FRONTEND_URL || 'https://your-app-url.com'

if (!token) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN not set, bot disabled')
} else {
  const bot = new TelegramBot(token, { polling: true })

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id

    bot.sendMessage(chatId,
      'Добро пожаловать в golf live scoring Minsk. Хорошей игры!',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⛳ Открыть приложение',
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      }
    )
  })

  console.log('[bot] Telegram bot started, listening for /start command')
}

export default null
