import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { bot } from './bot.js'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'
import tournamentsRouter from './routes/tournaments.js'
import scoresRouter from './routes/scores.js'
import statsRouter from './routes/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/scores', scoresRouter)
app.use('/api/stats', statsRouter)

const distPath = path.join(__dirname, '../../dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))

bot.launch().catch((err) => {
  if (err?.response?.error_code === 409) {
    console.warn('Bot already running, skipping launch')
  } else {
    console.error('Bot launch error:', err.message)
  }
})
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
