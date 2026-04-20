-- Add telegram fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_first_name TEXT,
  ADD COLUMN IF NOT EXISTS telegram_last_name TEXT;

-- Table for pending telegram auth tokens
CREATE TABLE IF NOT EXISTS tg_auth_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           UUID NOT NULL UNIQUE,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_id     TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,
  supabase_user_id UUID,
  hashed_token    TEXT,
  email           TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only backend (service role) accesses this table
ALTER TABLE tg_auth_tokens ENABLE ROW LEVEL SECURITY;
