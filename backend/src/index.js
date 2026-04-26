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

app.get('/api/ping', (_req, res) => res.json({ ok: true }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' })
})

const distPath = path.join(__dirname, '../../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  app.get('*', (_req, res) => res.json({ status: 'api-only' }))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
