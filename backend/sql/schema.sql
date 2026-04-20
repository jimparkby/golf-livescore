CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   TEXT NOT NULL UNIQUE,
  telegram_username   TEXT,
  telegram_first_name TEXT,
  telegram_last_name  TEXT,
  display_name  TEXT NOT NULL,
  country       TEXT,
  handicap      NUMERIC(5,1) NOT NULL DEFAULT 0,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tg_auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       UUID NOT NULL UNIQUE,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  jwt         TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  course_name TEXT NOT NULL DEFAULT 'Минский гольф-клуб',
  format      TEXT NOT NULL DEFAULT 'stroke_play',
  status      TEXT NOT NULL DEFAULT 'upcoming',
  start_date  DATE NOT NULL,
  total_holes INT NOT NULL DEFAULT 18,
  total_par   INT NOT NULL DEFAULT 72,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE holes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  hole_number      INT NOT NULL,
  par              INT NOT NULL,
  handicap_index   INT,
  yards            INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, hole_number)
);

CREATE TABLE tournament_players (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_name     TEXT,
  PRIMARY KEY (tournament_id, user_id)
);

CREATE TABLE scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hole_id           UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  hole_number       INT NOT NULL,
  strokes           INT,
  stableford_points INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, user_id, hole_id)
);

CREATE INDEX idx_scores_tournament   ON scores(tournament_id);
CREATE INDEX idx_scores_user         ON scores(user_id);
CREATE INDEX idx_tp_tournament       ON tournament_players(tournament_id);
CREATE INDEX idx_tp_user             ON tournament_players(user_id);
CREATE INDEX idx_holes_tournament    ON holes(tournament_id);
CREATE INDEX idx_tg_tokens_token     ON tg_auth_tokens(token);
