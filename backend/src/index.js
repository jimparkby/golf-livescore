import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
console.log('[boot] /api/auth and /api/profile registered')

app.get('/api/ping', (_req, res) => res.json({ ok: true }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' })
})

// Try to find the built frontend in several possible locations
const distCandidates = [
  path.join(__dirname, '../../../frontend/dist'),  // /home/app/frontend/dist
  path.join(__dirname, '../../dist'),               // /home/app/dist
  path.join(__dirname, '../../../../dist'),         // one level higher
]
const distPath = distCandidates.find(p => existsSync(p)) ?? null
console.log('[boot] distPath:', distPath ?? 'NOT FOUND — api-only mode')

if (distPath) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
} else {
  app.get('*', (_req, res) => res.json({ status: 'api-only' }))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
