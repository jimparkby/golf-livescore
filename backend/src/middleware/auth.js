import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    req.userId = req.user.userId // JWT token contains userId field, not id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
