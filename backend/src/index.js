import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'
import roundsRouter from './routes/rounds.js'
import usersRouter from './routes/users.js'
import scorecardsRouter from './routes/scorecards.js'
import aiRouter from './routes/ai.js'
import tournamentsRouter from './routes/tournaments.js'
import predictionsRouter from './routes/predictions.js'
import flightPhotosRouter from './routes/flight-photos.js'
import { processUpdate } from './bot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

// Telegram webhook — must be before other routes
app.post('/bot-webhook', (req, res) => {
  res.sendStatus(200)
  processUpdate(req.body)
})

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/rounds', roundsRouter)
app.use('/api/users', usersRouter)
app.use('/api/scorecards', scorecardsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/predictions', predictionsRouter)
app.use('/api/flights', flightPhotosRouter)
console.log('[boot] API routes registered: auth, profile, rounds, users, scorecards, ai, tournaments, predictions, flights')

app.get('/api/ping', (_req, res) => res.json({ ok: true }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Try to find the built frontend in several possible locations
const distCandidates = [
  path.join(__dirname, '../../dist'),               // Docker: /app/dist  (vite outDir: ../dist from frontend/)
  path.join(__dirname, '../../../dist'),             // Nixpacks from /app/backend/src → /app/dist
  path.join(__dirname, '../../../frontend/dist'),   // vite default outDir
  path.join(__dirname, '../../../../dist'),          // one level higher
  path.join(process.cwd(), '../dist'),              // relative to cwd
  path.join(process.cwd(), 'dist'),                 // cwd/dist
]
const distPath = distCandidates.find(p => existsSync(p)) ?? null
console.log('[boot] distPath:', distPath ?? 'NOT FOUND — api-only mode')
if (!distPath) {
  console.log('[boot] Searched:', distCandidates)
}

if (distPath) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
} else {
  app.get('*', (_req, res) => res.json({ status: 'api-only' }))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
