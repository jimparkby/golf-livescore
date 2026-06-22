-- Admin panel database migrations
-- Run this file to create tables needed for admin functionality

-- Table for storing tournament results entered via admin panel
CREATE TABLE IF NOT EXISTS tournament_results (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL,
  place INTEGER NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL,
  group_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, place, COALESCE(group_name, ''))
);

CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id
  ON tournament_results(tournament_id);

-- Table for participants/players
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  handicap DECIMAL(4, 1) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participants_email
  ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_name
  ON participants(name);

-- Table for tournaments (if not exists)
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tournaments_date
  ON tournaments(date);

-- Add some sample tournaments for testing (optional)
-- INSERT INTO tournaments (name, date, location) VALUES
--   ('III Весенний Кубок имени Николая Ермашова', '2026-04-25', 'Golf Club Minsk'),
--   ('Hole in One Challenge', '2026-05-09', 'Golf Club Minsk'),
--   ('Whitebird Spring Open Cup', '2026-05-16', 'Golf Club Minsk')
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE tournament_results IS 'Results entered by admins via Telegram bot';
COMMENT ON TABLE participants IS 'Player database managed by admins';
COMMENT ON TABLE tournaments IS 'Tournament schedule and information';
