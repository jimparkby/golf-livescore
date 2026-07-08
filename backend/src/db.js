import pg from 'pg'
const { Pool } = pg

export const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if no connection available
  query_timeout: 30000, // Query timeout 30 seconds
})

// Run migrations sequentially to avoid overwhelming the connection pool
async function runMigrations() {
  const migrations = [
    { name: 'pg_trgm', query: `CREATE EXTENSION IF NOT EXISTS pg_trgm` },
    { name: 'current_hole', query: `ALTER TABLE rounds ADD COLUMN IF NOT EXISTS current_hole INTEGER` },
    { name: 'photo_url', query: `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT` },
    { name: 'made_by', query: `ALTER TABLE hole_scores ADD COLUMN IF NOT EXISTS made_by TEXT` },
    { name: 'teams', query: `ALTER TABLE rounds ADD COLUMN IF NOT EXISTS teams JSONB` },
    { name: 'hole_scores_index', query: `CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_unique_idx ON hole_scores (round_id, player_id, hole)` },
    { name: 'format', query: `ALTER TABLE rounds ADD COLUMN IF NOT EXISTS format TEXT` },
    { name: 'holes_mode', query: `ALTER TABLE rounds ADD COLUMN IF NOT EXISTS holes_mode TEXT` },
    { name: 'pending_scorecards', query: `CREATE TABLE IF NOT EXISTS pending_scorecards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scores JSONB NOT NULL,
      course_name TEXT,
      holes_count INTEGER DEFAULT 18,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
      status TEXT DEFAULT 'pending'
    )` },
    { name: 'hcp_group', query: `ALTER TABLE tournament_predictions ADD COLUMN IF NOT EXISTS hcp_group TEXT` },
    { name: 'player_hcp', query: `ALTER TABLE tournament_predictions ADD COLUMN IF NOT EXISTS player_hcp NUMERIC` },
    { name: 'tournament_results', query: `CREATE TABLE IF NOT EXISTS tournament_results (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      place INTEGER NOT NULL,
      score INTEGER NOT NULL,
      group_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tournament_id, player_name, group_name)
    )` },
    { name: 'hdid_members', query: `CREATE TABLE IF NOT EXISTS hdid_members (
      id SERIAL PRIMARY KEY,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      hcp NUMERIC NOT NULL,
      gender TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(last_name, first_name)
    )` },
    { name: 'last_hdid_sync', query: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_hdid_sync TIMESTAMP WITH TIME ZONE` },
    { name: 'tournament_registrations', query: `CREATE TABLE IF NOT EXISTS tournament_registrations (
      id SERIAL PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending_review',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tournament_id, user_id)
    )` },
    { name: 'tournament_slug', query: `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS slug TEXT` }
  ]

  for (const migration of migrations) {
    try {
      await db.query(migration.query)
      console.log(`[db] Migration '${migration.name}' completed`)
    } catch (err) {
      console.error(`[db] Migration '${migration.name}' error:`, err.message)
    }
  }
}

// Run migrations in background without blocking
runMigrations().catch(err => console.error('[db] Migrations failed:', err))
