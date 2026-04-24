import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

router.post('/register', async (req, res, next) => {
  const { email, first_name, last_name } = req.body

  if (!email?.trim() || !first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'Email, имя и фамилия обязательны' })
  }

  try {
    const { rows: [user] } = await db.query(
      `INSERT INTO users (email, first_name, last_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [email.trim().toLowerCase(), first_name.trim(), last_name.trim()]
    )

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    )
    res.json({ jwt: token })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email уже зарегистрирован' })
    }
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  const { email } = req.body

  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email обязателен' })
  }

  try {
    const { rows: [user] } = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    )

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден. Зарегистрируйтесь.' })
    }

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    )
    res.json({ jwt: token })
  } catch (err) {
    next(err)
  }
})

export default router
