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

console.log('[boot] registering /api/auth ...')
app.use('/api/auth', authRouter)
console.log('[boot] registering /api/profile ...')
app.use('/api/profile', profileRouter)
console.log('[boot] all API routes registered')

app.get('/api/ping', (_req, res) => res.json({ ok: true }))
app.post('/api/ping', (_req, res) => res.json({ ok: true, method: 'POST' }))

// JSON error handler — returns proper JSON, not HTML
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' })
})

// Serve built frontend if dist exists (Docker build), otherwise API-only mode
const distPath = path.join(__dirname, '../../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  app.get('*', (_req, res) => res.json({ status: 'api-only', note: 'frontend not built' }))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
