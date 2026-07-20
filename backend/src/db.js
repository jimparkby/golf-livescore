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

db.query(`ALTER TABLE hole_scores ADD COLUMN IF NOT EXISTS made_by TEXT`)
  .catch((err) => console.error('[db] made_by migration error:', err.message))

db.query(`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS teams JSONB`)
  .catch((err) => console.error('[db] teams migration error:', err.message))

db.query(`CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_unique_idx ON hole_scores (round_id, player_id, hole)`)
  .catch((err) => console.error('[db] hole_scores index error:', err.message))

db.query(`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS format TEXT`)
  .catch((err) => console.error('[db] format migration error:', err.message))

db.query(`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS holes_mode TEXT`)
  .catch((err) => console.error('[db] holes_mode migration error:', err.message))

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

db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`)
  .catch((err) => console.error('[db] is_admin migration error:', err.message))

// ── Official tournaments ────────────────────────────────────────────────────
// Chained (not fire-and-forget) because tournament_registrations/tournament_groups
// have FK dependencies on official_tournaments — with a connection pool, unawaited
// parallel CREATE TABLEs could otherwise race ahead of the table they reference.

db.query(`CREATE TABLE IF NOT EXISTS official_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_id TEXT,
  tee TEXT DEFAULT 'yellow',
  course_name TEXT,
  rating NUMERIC DEFAULT 72,
  slope INTEGER DEFAULT 113,
  date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  holes_mode TEXT DEFAULT '18',
  handicap_allowance_pct INTEGER DEFAULT 80,
  flight_count INTEGER DEFAULT 3,
  group_size INTEGER DEFAULT 4,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`)
  .then(() => db.query(`CREATE TABLE IF NOT EXISTS tournament_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES official_tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    guest_name TEXT,
    hcp NUMERIC NOT NULL DEFAULT 0,
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    access_code TEXT,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    group_id UUID,
    flight_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
  )`))
  .then(() => db.query(`CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES official_tournaments(id) ON DELETE CASCADE,
    flight_label TEXT NOT NULL,
    group_number INTEGER NOT NULL,
    round_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`))
  .catch((err) => console.error('[db] official tournaments migration error:', err.message))
