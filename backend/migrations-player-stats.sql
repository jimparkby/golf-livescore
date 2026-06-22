-- Player statistics and historical tournament results
-- This tracks all player performances across tournaments for AI analysis

-- Table to store all historical tournament results by player
CREATE TABLE IF NOT EXISTS player_tournament_results (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  place INTEGER NOT NULL,
  group_name VARCHAR(255),
  score INTEGER,
  net INTEGER,
  gross INTEGER,
  format VARCHAR(50), -- 'Stableford', 'Stroke net', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_tournament_results_player ON player_tournament_results(player_name);
CREATE INDEX idx_player_tournament_results_tournament ON player_tournament_results(tournament_id);
CREATE INDEX idx_player_tournament_results_place ON player_tournament_results(place);

-- Table for player statistics aggregation (for quick lookups)
CREATE TABLE IF NOT EXISTS player_statistics (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(255) UNIQUE NOT NULL,
  total_tournaments INTEGER DEFAULT 0,
  first_places INTEGER DEFAULT 0,
  second_places INTEGER DEFAULT 0,
  third_places INTEGER DEFAULT 0,
  top3_finishes INTEGER DEFAULT 0,
  best_score INTEGER,
  best_net INTEGER,
  average_place DECIMAL(5, 2),
  last_tournament_date DATE,
  estimated_hcp DECIMAL(4, 1), -- Estimated based on performance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_statistics_name ON player_statistics(player_name);
CREATE INDEX idx_player_statistics_first_places ON player_statistics(first_places DESC);
CREATE INDEX idx_player_statistics_hcp ON player_statistics(estimated_hcp);

-- Table for nominations/special achievements
CREATE TABLE IF NOT EXISTS player_nominations (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  nomination_title VARCHAR(255) NOT NULL,
  nomination_value VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_nominations_player ON player_nominations(player_name);
CREATE INDEX idx_player_nominations_tournament ON player_nominations(tournament_id);

-- View for leaderboard by wins
CREATE OR REPLACE VIEW leaderboard_by_wins AS
SELECT
  player_name,
  total_tournaments,
  first_places,
  second_places,
  third_places,
  top3_finishes,
  ROUND((first_places::decimal / NULLIF(total_tournaments, 0) * 100), 1) as win_rate
FROM player_statistics
WHERE total_tournaments > 0
ORDER BY first_places DESC, second_places DESC, third_places DESC
LIMIT 50;

-- View for leaderboard by HCP
CREATE OR REPLACE VIEW leaderboard_by_hcp AS
SELECT
  player_name,
  estimated_hcp,
  total_tournaments,
  top3_finishes,
  best_net,
  last_tournament_date
FROM player_statistics
WHERE estimated_hcp IS NOT NULL
ORDER BY estimated_hcp ASC
LIMIT 50;

-- Function to update player statistics after inserting results
CREATE OR REPLACE FUNCTION update_player_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update player statistics
  INSERT INTO player_statistics (
    player_name,
    total_tournaments,
    first_places,
    second_places,
    third_places,
    top3_finishes,
    best_score,
    best_net,
    average_place
  )
  SELECT
    player_name,
    COUNT(DISTINCT tournament_id) as total_tournaments,
    SUM(CASE WHEN place = 1 THEN 1 ELSE 0 END) as first_places,
    SUM(CASE WHEN place = 2 THEN 1 ELSE 0 END) as second_places,
    SUM(CASE WHEN place = 3 THEN 1 ELSE 0 END) as third_places,
    SUM(CASE WHEN place <= 3 THEN 1 ELSE 0 END) as top3_finishes,
    MIN(NULLIF(score, 0)) as best_score,
    MIN(NULLIF(net, 0)) as best_net,
    AVG(place) as average_place
  FROM player_tournament_results
  WHERE player_name = NEW.player_name
  GROUP BY player_name
  ON CONFLICT (player_name) DO UPDATE SET
    total_tournaments = EXCLUDED.total_tournaments,
    first_places = EXCLUDED.first_places,
    second_places = EXCLUDED.second_places,
    third_places = EXCLUDED.third_places,
    top3_finishes = EXCLUDED.top3_finishes,
    best_score = EXCLUDED.best_score,
    best_net = EXCLUDED.best_net,
    average_place = EXCLUDED.average_place,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update statistics
DROP TRIGGER IF EXISTS trigger_update_player_statistics ON player_tournament_results;
CREATE TRIGGER trigger_update_player_statistics
  AFTER INSERT OR UPDATE ON player_tournament_results
  FOR EACH ROW
  EXECUTE FUNCTION update_player_statistics();

COMMENT ON TABLE player_tournament_results IS 'Historical tournament results for each player';
COMMENT ON TABLE player_statistics IS 'Aggregated statistics for AI win probability analysis';
COMMENT ON TABLE player_nominations IS 'Special achievements and nominations';
