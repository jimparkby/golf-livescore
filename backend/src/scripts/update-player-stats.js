import { db } from '../db.js'

/**
 * Recalculate player statistics from historical data
 * Run this after importing historical tournament data
 */
async function updatePlayerStatistics() {
  console.log('[update-stats] Starting player statistics update...')

  try {
    // Get all unique players from history
    const { rows: players } = await db.query(`
      SELECT DISTINCT player_normalized_name, player_name
      FROM player_tournament_history
    `)

    console.log(`[update-stats] Found ${players.length} unique players`)

    let updated = 0
    let created = 0

    for (const player of players) {
      const { player_normalized_name, player_name } = player

      // Get player statistics from history
      const { rows: [stats] } = await db.query(`
        SELECT
          COUNT(*) as tournaments_played,
          SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END) as tournaments_won,
          SUM(CASE WHEN position <= 3 THEN 1 ELSE 0 END) as top3_finishes,
          SUM(CASE WHEN position <= 10 THEN 1 ELSE 0 END) as top10_finishes,
          MIN(position) as best_position,
          AVG(total_score::numeric) as average_score,
          MIN(handicap_index) as best_handicap,
          MAX(tournament_date) as last_tournament_date
        FROM player_tournament_history
        WHERE player_normalized_name = $1
      `, [player_normalized_name])

      // Get current handicap (from most recent tournament)
      const { rows: [latest] } = await db.query(`
        SELECT handicap_index
        FROM player_tournament_history
        WHERE player_normalized_name = $1
        ORDER BY tournament_date DESC
        LIMIT 1
      `, [player_normalized_name])

      // Try to find associated user
      const { rows: [user] } = await db.query(`
        SELECT id FROM users WHERE LOWER(name) = $1
      `, [player_name.toLowerCase()])

      // Insert or update statistics
      const { rows } = await db.query(`
        INSERT INTO player_statistics (
          user_id,
          player_name,
          player_normalized_name,
          tournaments_played,
          tournaments_won,
          top3_finishes,
          top10_finishes,
          best_position,
          average_score,
          current_handicap,
          best_handicap,
          last_tournament_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (player_normalized_name) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          player_name = EXCLUDED.player_name,
          tournaments_played = EXCLUDED.tournaments_played,
          tournaments_won = EXCLUDED.tournaments_won,
          top3_finishes = EXCLUDED.top3_finishes,
          top10_finishes = EXCLUDED.top10_finishes,
          best_position = EXCLUDED.best_position,
          average_score = EXCLUDED.average_score,
          current_handicap = EXCLUDED.current_handicap,
          best_handicap = EXCLUDED.best_handicap,
          last_tournament_date = EXCLUDED.last_tournament_date,
          updated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `, [
        user?.id || null,
        player_name,
        player_normalized_name,
        stats.tournaments_played,
        stats.tournaments_won,
        stats.top3_finishes,
        stats.top10_finishes,
        stats.best_position,
        stats.average_score,
        latest.handicap_index,
        stats.best_handicap,
        stats.last_tournament_date
      ])

      if (rows[0].inserted) {
        created++
      } else {
        updated++
      }
    }

    console.log(`[update-stats] Complete! Created: ${created}, Updated: ${updated}`)
  } catch (err) {
    console.error('[update-stats] Error:', err)
    throw err
  } finally {
    await db.end()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updatePlayerStatistics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

export { updatePlayerStatistics }
