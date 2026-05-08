-- Run once: add notification preferences and default tee to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS default_tee TEXT NOT NULL DEFAULT 'yellow';

-- Table for scheduled notifications (tournament reminders etc.)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id         SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  send_at    TIMESTAMPTZ NOT NULL,
  message    TEXT NOT NULL,
  sent       BOOLEAN NOT NULL DEFAULT FALSE,
  context    TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_send_at
  ON scheduled_notifications(send_at) WHERE sent = FALSE;
