import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { bot } from './bot.js'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'
import tournamentsRouter from './routes/tournaments.js'
import scoresRouter from './routes/scores.js'
import statsRouter from './routes/stats.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/scores', scoresRouter)
app.use('/api/stats', statsRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
