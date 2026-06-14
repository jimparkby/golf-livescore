import pg from 'pg'
const { Pool } = pg

export const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

db.query(`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS current_hole INTEGER`)
  .catch((err) => console.error('[db] migration error:', err.message))

db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`)
  .catch((err) => console.error('[db] photo_url migration error:', err.message))

db.query(`CREATE TABLE IF NOT EXISTS pending_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scores JSONB NOT NULL,
  course_name TEXT,
  holes_count INTEGER DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  status TEXT DEFAULT 'pending'
)`).catch((err) => console.error('[db] pending_scorecards migration error:', err.message))
