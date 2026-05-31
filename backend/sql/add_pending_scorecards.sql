CREATE TABLE IF NOT EXISTS pending_scorecards (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scores      JSONB NOT NULL,
  course_name TEXT,
  holes_count INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_scorecards_user_id ON pending_scorecards(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_scorecards_expires_at ON pending_scorecards(expires_at);
