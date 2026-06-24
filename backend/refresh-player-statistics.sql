-- Function to refresh player statistics from tournament_results
-- This syncs tournament_results -> player_tournament_results -> player_statistics

CREATE OR REPLACE FUNCTION refresh_player_statistics_for_tournament(tournament_id_param INTEGER)
RETURNS void AS $$
BEGIN
  -- Step 1: Sync tournament_results to player_tournament_results for this tournament
  -- Delete existing results for this tournament
  DELETE FROM player_tournament_results WHERE tournament_id = tournament_id_param;

  -- Insert new results from tournament_results
  INSERT INTO player_tournament_results (
    tournament_id,
    player_name,
    place,
    score,
    net,
    gross,
    format,
    group_name
  )
  SELECT
    tournament_id,
    player_name,
    place,
    score as score,
    NULL as net,  -- tournament_results doesn't have net/gross separation yet
    NULL as gross,
    NULL as format,
    COALESCE(group_name, 'Общий зачет') as group_name
  FROM tournament_results
  WHERE tournament_id = tournament_id_param;

  -- Step 2: Refresh player_statistics for affected players
  -- Get list of unique players from this tournament
  WITH affected_players AS (
    SELECT DISTINCT player_name
    FROM tournament_results
    WHERE tournament_id = tournament_id_param
  )
  -- Update or insert statistics for each affected player
  INSERT INTO player_statistics (
    player_name,
    total_tournaments,
    first_places,
    second_places,
    third_places,
    top3_finishes,
    best_score,
    best_net,
    average_place,
    estimated_hcp,
    win_rate
  )
  SELECT
    ptr.player_name,
    COUNT(DISTINCT ptr.tournament_id) as total_tournaments,
    SUM(CASE WHEN ptr.place = 1 THEN 1 ELSE 0 END) as first_places,
    SUM(CASE WHEN ptr.place = 2 THEN 1 ELSE 0 END) as second_places,
    SUM(CASE WHEN ptr.place = 3 THEN 1 ELSE 0 END) as third_places,
    SUM(CASE WHEN ptr.place <= 3 THEN 1 ELSE 0 END) as top3_finishes,
    MIN(NULLIF(ptr.score, 0)) as best_score,
    MIN(NULLIF(ptr.net, 0)) as best_net,
    AVG(ptr.place) as average_place,
    -- Estimated HCP based on average net score (simplified calculation)
    CASE
      WHEN AVG(NULLIF(ptr.net, 0)) IS NOT NULL
      THEN ROUND((AVG(NULLIF(ptr.net, 0)) - 72.0))
      ELSE NULL
    END as estimated_hcp,
    -- Win rate percentage
    CASE
      WHEN COUNT(DISTINCT ptr.tournament_id) > 0
      THEN ROUND((SUM(CASE WHEN ptr.place = 1 THEN 1 ELSE 0 END)::numeric / COUNT(DISTINCT ptr.tournament_id)::numeric) * 100, 1)
      ELSE 0
    END as win_rate
  FROM player_tournament_results ptr
  WHERE ptr.player_name IN (SELECT player_name FROM affected_players)
  GROUP BY ptr.player_name
  ON CONFLICT (player_name) DO UPDATE SET
    total_tournaments = EXCLUDED.total_tournaments,
    first_places = EXCLUDED.first_places,
    second_places = EXCLUDED.second_places,
    third_places = EXCLUDED.third_places,
    top3_finishes = EXCLUDED.top3_finishes,
    best_score = EXCLUDED.best_score,
    best_net = EXCLUDED.best_net,
    average_place = EXCLUDED.average_place,
    estimated_hcp = EXCLUDED.estimated_hcp,
    win_rate = EXCLUDED.win_rate,
    updated_at = CURRENT_TIMESTAMP;

  RAISE NOTICE 'Player statistics refreshed for tournament %', tournament_id_param;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Function refresh_player_statistics_for_tournament created successfully!' as status;
