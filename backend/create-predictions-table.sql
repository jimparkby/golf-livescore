-- Create table for storing tournament predictions
CREATE TABLE IF NOT EXISTS tournament_predictions (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  probability DECIMAL(5, 2),
  confidence VARCHAR(20),
  analysis TEXT,
  stats JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, player_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_predictions_tournament ON tournament_predictions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_predictions_probability ON tournament_predictions(tournament_id, probability DESC);

-- Success message
SELECT 'Created tournament_predictions table' as status;
