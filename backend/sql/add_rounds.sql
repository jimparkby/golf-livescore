-- Таблица раундов
CREATE TABLE IF NOT EXISTS rounds (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          TIMESTAMPTZ NOT NULL,
  course_id     TEXT NOT NULL,
  course_name   TEXT NOT NULL,
  tee           TEXT NOT NULL,
  rating        NUMERIC(5,1) NOT NULL,
  slope         INTEGER NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  tournament_id TEXT,
  format        TEXT,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица игроков в раунде
CREATE TABLE IF NOT EXISTS round_players (
  id          SERIAL PRIMARY KEY,
  round_id    TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  initials    TEXT NOT NULL,
  hcp         NUMERIC(5,1) NOT NULL,
  is_me       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица счетов по лункам
CREATE TABLE IF NOT EXISTS hole_scores (
  id          SERIAL PRIMARY KEY,
  round_id    TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL,
  hole        INTEGER NOT NULL,
  score       INTEGER NOT NULL,
  putts       INTEGER NOT NULL DEFAULT 0,
  driving     BOOLEAN NOT NULL DEFAULT FALSE,
  gir         BOOLEAN NOT NULL DEFAULT FALSE,
  bunker      INTEGER NOT NULL DEFAULT 0,
  penalties   INTEGER NOT NULL DEFAULT 0,
  tee_shot    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, player_id, hole)
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_date ON rounds(date DESC);
CREATE INDEX IF NOT EXISTS idx_round_players_round_id ON round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_hole_scores_round_id ON hole_scores(round_id);
CREATE INDEX IF NOT EXISTS idx_hole_scores_player_id ON hole_scores(player_id);
