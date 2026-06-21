import express from 'express'
import { db } from '../db.js'
import Anthropic from '@anthropic-ai/sdk'

const router = express.Router()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Helper function to normalize player names for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

// Get player historical data
async function getPlayerHistory(playerName, userId = null) {
  const normalized = normalizeName(playerName)

  // Try to find by user_id first if provided
  if (userId) {
    const { rows } = await db.query(`
      SELECT * FROM player_tournament_history
      WHERE user_id = $1
      ORDER BY tournament_date DESC
      LIMIT 20
    `, [userId])

    if (rows.length > 0) return rows
  }

  // Fall back to name matching
  const { rows } = await db.query(`
    SELECT * FROM player_tournament_history
    WHERE player_normalized_name = $1
    ORDER BY tournament_date DESC
    LIMIT 20
  `, [normalized])

  return rows
}

// Get player statistics
async function getPlayerStats(playerName, userId = null) {
  const normalized = normalizeName(playerName)

  const { rows } = await db.query(`
    SELECT * FROM player_statistics
    WHERE ${userId ? 'user_id = $1' : 'player_normalized_name = $1'}
    LIMIT 1
  `, [userId || normalized])

  return rows[0] || null
}

// Calculate win probability using AI
router.get('/tournament/:id/win-probability', async (req, res) => {
  try {
    const { id: tournamentId } = req.params

    // Get tournament info
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    // Get all participants with their user data
    const { rows: participants } = await db.query(`
      SELECT
        tp.*,
        u.name as player_name,
        u.handicap_index as current_hcp
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
    `, [tournamentId])

    if (participants.length === 0) {
      return res.json([])
    }

    // Gather historical data for each participant
    const participantsWithHistory = await Promise.all(
      participants.map(async (p) => {
        const history = await getPlayerHistory(p.player_name, p.user_id)
        const stats = await getPlayerStats(p.player_name, p.user_id)

        return {
          id: p.id,
          user_id: p.user_id,
          name: p.player_name,
          handicap_index: p.handicap_index || p.current_hcp,
          current_score: p.total_score,
          status: p.status,
          history_count: history.length,
          stats: stats ? {
            tournaments_played: stats.tournaments_played,
            tournaments_won: stats.tournaments_won,
            top3_finishes: stats.top3_finishes,
            average_score: stats.average_score,
            best_position: stats.best_position,
          } : null,
          recent_history: history.slice(0, 5).map(h => ({
            tournament: h.tournament_name,
            date: h.tournament_date,
            position: h.position,
            score: h.total_score,
          }))
        }
      })
    )

    // Check if tournament is active or completed
    const hasScores = participants.some(p => p.total_score !== null)

    // Prepare prompt for AI
    const prompt = `You are a golf analytics expert. Analyze the following tournament data and calculate win probabilities for each player.

Tournament: ${tournament.name}
Status: ${tournament.status}
Format: ${tournament.format}
${hasScores ? 'Note: Tournament is in progress with live scores.' : 'Note: Tournament has not started yet.'}

Players:
${participantsWithHistory.map((p, i) => `
${i + 1}. ${p.name}
   - Handicap Index: ${p.handicap_index || 'N/A'}
   ${hasScores && p.current_score !== null ? `- Current Score: ${p.current_score}` : ''}
   - Historical Data: ${p.history_count > 0 ? 'Available' : 'Limited'}
   ${p.stats ? `- Career Stats: ${p.stats.tournaments_played} tournaments, ${p.stats.tournaments_won} wins, ${p.stats.top3_finishes} top-3 finishes` : '- Career Stats: Not available'}
   ${p.recent_history.length > 0 ? `- Recent Results: ${p.recent_history.map(h => `${h.tournament} (${h.date}): Position ${h.position || 'N/A'}`).join(', ')}` : ''}
`).join('\n')}

Based on this data, provide win probability for each player. Consider:
1. Current handicap index (lower is better)
2. Historical performance (wins, top finishes)
3. Recent form (last 5 tournaments)
${hasScores ? '4. Current position/score in this tournament' : ''}
5. Tournament experience

Return a JSON array with this structure:
[
  {
    "player_id": "participant_id",
    "name": "Player Name",
    "win_probability": 0.XX (between 0 and 1),
    "confidence": "high|medium|low",
    "reasoning": "Brief explanation (max 100 chars)",
    "key_factors": ["factor1", "factor2"]
  }
]

Important:
- If player has limited historical data, set confidence to "low" and win_probability conservatively
- Probabilities should sum to approximately 1.0
- Be realistic - favorites should have 15-30% max, not 80%
- Consider field strength and competitiveness`

    // Call Claude AI
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    // Extract JSON from response
    const responseText = message.content[0].text
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)

    if (!jsonMatch) {
      console.error('[predictions] Failed to extract JSON from AI response')
      return res.status(500).json({ error: 'Failed to parse AI response' })
    }

    const predictions = JSON.parse(jsonMatch[0])

    // Map predictions back to participants
    const results = predictions.map(pred => {
      const participant = participantsWithHistory.find(p =>
        p.name === pred.name || p.id === pred.player_id
      )

      return {
        ...pred,
        player_id: participant?.id || pred.player_id,
        user_id: participant?.user_id,
        has_historical_data: (participant?.history_count || 0) > 0
      }
    })

    res.json(results)
  } catch (err) {
    console.error('[predictions] Error:', err)
    res.status(500).json({ error: 'Failed to calculate predictions' })
  }
})

// Get top players leaderboards
router.get('/leaderboards', async (req, res) => {
  try {
    // Top players by HCP (best handicap)
    const { rows: topByHcp } = await db.query(`
      SELECT
        ps.*,
        u.photo_url as avatar_url
      FROM player_statistics ps
      LEFT JOIN users u ON ps.user_id = u.id
      WHERE ps.current_handicap IS NOT NULL
        AND ps.tournaments_played >= 3
      ORDER BY ps.current_handicap ASC
      LIMIT 20
    `)

    // Top players by tournament wins
    const { rows: topByWins } = await db.query(`
      SELECT
        ps.*,
        u.photo_url as avatar_url
      FROM player_statistics ps
      LEFT JOIN users u ON ps.user_id = u.id
      WHERE ps.tournaments_won > 0
      ORDER BY ps.tournaments_won DESC, ps.top3_finishes DESC
      LIMIT 20
    `)

    res.json({
      byHandicap: topByHcp,
      byWins: topByWins
    })
  } catch (err) {
    console.error('[predictions] leaderboards error:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboards' })
  }
})

export default router
