-- Run this once to reset the users table with the correct schema
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name  TEXT NOT NULL DEFAULT '',
  hcp        NUMERIC(5,1) NOT NULL DEFAULT 0,
  home_club  TEXT NOT NULL DEFAULT 'Golf Club Minsk',
  city       TEXT NOT NULL DEFAULT 'Минск, Беларусь',
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
