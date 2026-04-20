import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { bot } from './bot.js'
import authRouter from './routes/auth.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())
app.use('/api/auth', authRouter)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
