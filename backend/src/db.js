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

// Add current_hole column if it doesn't exist yet
db.query(`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS current_hole INTEGER`)
  .catch((err) => console.error('[db] migration error:', err.message))
