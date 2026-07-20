/**
 * AI-powered win probability calculator
 * Analyzes player historical data to predict chances of winning upcoming tournaments
 */

import https from 'https'
import { db } from '../db.js'
import { getHcpGroup, detectGender } from '../utils/hcpGroups.js'

/**
 * Call OpenRouter AI API
 */
async function callOpenRouterAPI(prompt, temperature = 0.3) {
  const body = JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [{
      role: 'user',
      content: prompt,
    }],
    max_tokens: 1024,
    temperature,
  })

  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`OpenRouter ${res.statusCode}: ${raw.slice(0, 300)}`))
        try { resolve(JSON.parse(raw)) } catch { reject(new Error('OpenRouter: invalid JSON')) }
      })
      res.on('error', reject)
    })
    req.setTimeout(60000, () => req.destroy(new Error('OpenRouter timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter: empty response')

  return text
}

/**
 * Calculate win probability for a player in an upcoming tournament
 * @param {string} playerName - Player name to analyze
 * @param {number} tournamentId - Upcoming tournament ID
 * @returns {Promise<Object>} Win probability analysis
 */
export async function calculateWinProbability(playerName, tournamentId) {
  try {
    // Get player statistics
    const { rows: [playerStats] } = await db.query(
      `SELECT * FROM player_statistics WHERE player_name = $1`,
      [playerName]
    )

    // Get player's historical results
    const { rows: historicalResults } = await db.query(
      `SELECT ptr.*, t.name as tournament_name, t.date as tournament_date
       FROM player_tournament_results ptr
       JOIN tournaments t ON ptr.tournament_id = t.id
       WHERE ptr.player_name = $1
       ORDER BY t.date DESC
       LIMIT 10`,
      [playerName]
    )

    // Get upcoming tournament info
    const { rows: [tournament] } = await db.query(
      `SELECT * FROM tournaments WHERE id = $1`,
      [tournamentId]
    )

    // Check if we have enough data
    if (!playerStats || historicalResults.length === 0) {
      // Return minimal analysis based on tournament registration only
      return {
        playerName,
        probability: 5, // Low baseline probability for new players
        confidence: 'low',
        analysis: 'Игрок зарегистрирован на турнир. Данные о предыдущих выступлениях отсутствуют, вероятность рассчитана как базовая для новых участников.',
        recommendations: [],
        stats: {
          totalTournaments: 0,
          wins: 0,
          top3Finishes: 0,
          avgPlace: null,
        },
      }
    }

    // Prepare data for AI analysis
    const prompt = `Ты - эксперт по анализу гольф-статистики. Проанализируй данные игрока и рассчитай вероятность победы в предстоящем турнире.

ИГРОК: ${playerName}

ОБЩАЯ СТАТИСТИКА:
- Всего турниров: ${playerStats.total_tournaments}
- Первых мест: ${playerStats.first_places}
- Вторых мест: ${playerStats.second_places}
- Третьих мест: ${playerStats.third_places}
- Top-3 финишей: ${playerStats.top3_finishes}
- Средее место: ${playerStats.average_place ? Number(playerStats.average_place).toFixed(1) : 'н/д'}
- Лучший результат (net): ${playerStats.best_net || 'н/д'}
- Оценочный HCP: ${playerStats.estimated_hcp || 'н/д'}

ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ (${historicalResults.length} турниров):
${historicalResults.map((r, i) => `${i + 1}. ${r.tournament_name} (${new Date(r.tournament_date).toLocaleDateString('ru-RU')})
   - Место: ${r.place} в группе "${r.group_name}"
   - Формат: ${r.format || 'н/д'}
   - Результат: ${r.net ? `net ${r.net}` : r.score ? `score ${r.score}` : 'н/д'}`).join('\n')}

ПРЕДСТОЯЩИЙ ТУРНИР:
${tournament.name} - ${new Date(tournament.date).toLocaleDateString('ru-RU')}

ВАЖНЫЕ ПРАВИЛА ДЛЯ АНАЛИЗА:
1. Анализ должен быть ОЧЕНЬ КОРОТКИМ - максимум 50 символов
2. Формат: "[место] место, [турнир], net [число]" ИЛИ "[wins] побед из [total], место [avg]"
3. Убери все лишние слова: "занял", "с результатом", "на турнире" и т.д.
4. Используй только цифры и ключевые факты

ПРИМЕРЫ КОРОТКОГО АНАЛИЗА:
- "1-е место, net 25"
- "2 побед из 5, место 3.5"
- "Топ-3 в 80% турниров"

ЗАДАЧА:
1. Оцени вероятность победы на основе: win rate × 0.4 + (top3_finishes/total_tournaments) × 0.3 + позиция_в_последних_турнирах × 0.3
2. Укажи уровень уверенности: high если >20 турниров, medium если 5-20, low если <5
3. Дай ОЧЕНЬ КОРОТКИЙ анализ (максимум 50 символов) только с фактами
4. НЕ предлагай рекомендации

Верни ответ СТРОГО в JSON формате:
{
  "probability": <число от 0 до 100>,
  "confidence": "<low|medium|high>",
  "analysis": "<короткий анализ с конкретными турнирами и результатами>",
  "recommendations": []
}`

    // Call OpenRouter API with Claude
    const aiResponse = await callOpenRouterAPI(prompt, 0.3)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI response not in expected JSON format')
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      playerName,
      tournament: tournament.name,
      probability: result.probability,
      confidence: result.confidence,
      analysis: result.analysis,
      recommendations: result.recommendations,
      stats: {
        totalTournaments: playerStats.total_tournaments,
        wins: playerStats.first_places,
        top3Finishes: playerStats.top3_finishes,
        avgPlace: playerStats.average_place,
      },
    }
  } catch (error) {
    console.error('Error calculating win probability:', error)
    return {
      playerName,
      probability: null,
      confidence: 'low',
      message: 'Ошибка при расчете вероятности',
      error: error.message,
    }
  }
}

/**
 * Calculate win probabilities for all registered players in a tournament
 * @param {number} tournamentId - Tournament ID
 * @returns {Promise<Array>} Array of player probabilities
 */
export async function calculateTournamentProbabilities(tournamentId) {
  try {
    // Get all players who have registered for this tournament
    // (assuming there's a tournament_participants table or we use all known players)
    const { rows: players } = await db.query(
      `SELECT DISTINCT player_name FROM player_statistics
       WHERE total_tournaments > 0
       ORDER BY first_places DESC, total_tournaments DESC
       LIMIT 50`
    )

    const probabilities = []

    for (const player of players) {
      const prob = await calculateWinProbability(player.player_name, tournamentId)
      probabilities.push(prob)

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Sort by probability
    probabilities.sort((a, b) => (b.probability || 0) - (a.probability || 0))

    return probabilities
  } catch (error) {
    console.error('Error calculating tournament probabilities:', error)
    throw error
  }
}

/**
 * Get top players by different metrics
 * @returns {Promise<Object>} Leaderboards
 */
export async function getLeaderboards() {
  try {
    // Top by wins
    const { rows: topByWins } = await db.query(
      `SELECT * FROM leaderboard_by_wins LIMIT 20`
    )

    // Top by HCP
    const { rows: topByHcp } = await db.query(
      `SELECT * FROM leaderboard_by_hcp LIMIT 20`
    )

    return {
      topByWins,
      topByHcp,
    }
  } catch (error) {
    console.error('Error getting leaderboards:', error)
    throw error
  }
}

/**
 * Recalculate predictions for all upcoming tournaments after new results
 * This should be called after tournament results are entered to update probabilities
 * @returns {Promise<void>}
 */
export async function recalculatePredictionsForUpcomingTournaments() {
  try {
    console.log('[winProbabilityAI] Recalculating predictions for upcoming tournaments')

    // Get all upcoming tournaments that have participants registered
    const { rows: upcomingTournaments } = await db.query(
      `SELECT DISTINCT t.id, t.name, t.date
       FROM tournaments t
       INNER JOIN tournament_predictions tp ON t.id = tp.tournament_id
       WHERE t.date >= CURRENT_DATE
       ORDER BY t.date
       LIMIT 10`
    )

    if (upcomingTournaments.length === 0) {
      console.log('[winProbabilityAI] No upcoming tournaments with predictions to recalculate')
      return
    }

    console.log(`[winProbabilityAI] Found ${upcomingTournaments.length} upcoming tournaments`)

    for (const tournament of upcomingTournaments) {
      // Get all players with existing predictions for this tournament
      const { rows: players } = await db.query(
        `SELECT DISTINCT player_name FROM tournament_predictions
         WHERE tournament_id = $1`,
        [tournament.id]
      )

      console.log(`[winProbabilityAI] Recalculating ${players.length} predictions for ${tournament.name}`)

      for (const player of players) {
        try {
          const probability = await calculateWinProbability(player.player_name, tournament.id)

          if (probability && probability.probability !== null) {
            // Get player HCP from statistics
            const { rows: [playerStats] } = await db.query(
              `SELECT estimated_hcp FROM player_statistics WHERE player_name = $1`,
              [player.player_name]
            )

            // Skip players without HCP data
            if (!playerStats || playerStats.estimated_hcp === null) {
              console.log(`[winProbabilityAI] Skipping ${player.player_name} - no HCP data`)
              continue
            }

            const playerHcp = playerStats.estimated_hcp
            const gender = detectGender(player.player_name)
            const hcpGroup = getHcpGroup(playerHcp, gender)

            await db.query(
              `UPDATE tournament_predictions
               SET probability = $1,
                   confidence = $2,
                   analysis = $3,
                   stats = $4,
                   hcp_group = $5,
                   player_hcp = $6,
                   updated_at = CURRENT_TIMESTAMP
               WHERE tournament_id = $7 AND player_name = $8`,
              [
                probability.probability,
                probability.confidence,
                probability.analysis,
                JSON.stringify(probability.stats),
                hcpGroup,
                playerHcp,
                tournament.id,
                player.player_name
              ]
            )
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`[winProbabilityAI] Error recalculating for ${player.player_name}:`, error.message)
        }
      }
    }

    console.log('[winProbabilityAI] Predictions recalculation completed')
  } catch (error) {
    console.error('[winProbabilityAI] Error recalculating predictions:', error)
  }
}

/**
 * Get player profile with statistics
 * @param {string} playerName - Player name
 * @returns {Promise<Object>} Player profile
 */
export async function getPlayerProfile(playerName) {
  try {
    // Get player statistics
    const { rows: [stats] } = await db.query(
      `SELECT * FROM player_statistics WHERE player_name = $1`,
      [playerName]
    )

    if (!stats) {
      return null
    }

    // Get all tournament results
    const { rows: results } = await db.query(
      `SELECT ptr.*, t.name as tournament_name, t.date as tournament_date
       FROM player_tournament_results ptr
       JOIN tournaments t ON ptr.tournament_id = t.id
       WHERE ptr.player_name = $1
       ORDER BY t.date DESC`,
      [playerName]
    )

    // Get nominations
    const { rows: nominations } = await db.query(
      `SELECT pn.*, t.name as tournament_name, t.date as tournament_date
       FROM player_nominations pn
       JOIN tournaments t ON pn.tournament_id = t.id
       WHERE pn.player_name = $1
       ORDER BY t.date DESC`,
      [playerName]
    )

    return {
      playerName,
      stats,
      results,
      nominations,
    }
  } catch (error) {
    console.error('Error getting player profile:', error)
    throw error
  }
}
