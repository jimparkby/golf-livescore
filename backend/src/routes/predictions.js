import express from 'express'
import { db } from '../db.js'
import { calculateAndSavePredictions } from '../services/predictionsCalculator.js'
import { getAllHcpGroups } from '../utils/hcpGroups.js'

const router = express.Router()

/**
 * GET /api/predictions/tournament/:id
 * Get cached predictions or trigger calculation
 */
router.get('/tournament/:id', async (req, res) => {
  try {
    const { id } = req.params
    const recalculate = req.query.recalculate === 'true'

    // Get tournament by slug or numeric ID
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE slug = $1 OR id::text = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    // Check if we need to recalculate
    if (recalculate) {
      // Start background calculation (don't wait)
      calculateAndSavePredictions(tournament.id).catch(err =>
        console.error('[predictions] Background calculation failed:', err)
      )

      return res.json({
        tournament: tournament.name,
        predictions: [],
        calculating: true,
        message: 'Расчет запущен. Обновите страницу через минуту.'
      })
    }

    // Check for cached predictions
    const { rows: cachedPredictions } = await db.query(
      `SELECT player_name, probability, confidence, analysis, stats, hcp_group, player_hcp
       FROM tournament_predictions
       WHERE tournament_id = $1
       ORDER BY hcp_group, probability DESC`,
      [tournament.id]
    )

    if (cachedPredictions.length > 0) {
      console.log(`[predictions] Returning ${cachedPredictions.length} cached predictions`)

      // Group predictions by HCP group and get top 3 in each
      const groupedPredictions = {}
      const allHcpGroups = getAllHcpGroups()

      // Initialize all groups
      allHcpGroups.forEach(group => {
        groupedPredictions[group] = []
      })

      // Fill groups with predictions
      cachedPredictions.forEach(p => {
        const groupName = p.hcp_group || 'Man A HCP по 13,5' // Default group
        if (!groupedPredictions[groupName]) {
          groupedPredictions[groupName] = []
        }
        groupedPredictions[groupName].push({
          playerName: p.player_name,
          probability: parseFloat(p.probability),
          confidence: p.confidence,
          analysis: p.analysis,
          stats: p.stats,
          playerHcp: p.player_hcp,
        })
      })

      // Get top 3 from each group
      const groups = Object.entries(groupedPredictions)
        .filter(([_, predictions]) => predictions.length > 0)
        .map(([groupName, predictions]) => ({
          groupName,
          predictions: predictions.slice(0, 3) // Top 3 only
        }))

      return res.json({
        tournament: tournament.name,
        tournamentDate: tournament.date,
        groups,
        totalParticipants: cachedPredictions.length,
        totalAnalyzed: cachedPredictions.length,
        cached: true,
      })
    }

    // No cached predictions - check if tournament has flights photos
    if (!tournament.flights_photos || tournament.flights_photos.length === 0) {
      return res.json({
        tournament: tournament.name,
        predictions: [],
        message: 'Нет фото флайтов для анализа'
      })
    }

    // Start background calculation (don't wait)
    calculateAndSavePredictions(tournament.id).catch(err =>
      console.error('[predictions] Background calculation failed:', err)
    )

    res.json({
      tournament: tournament.name,
      predictions: [],
      calculating: true,
      message: 'Анализ запущен. Это займет несколько минут. Обновите страницу позже.'
    })
  } catch (error) {
    console.error('[predictions] Error calculating tournament predictions:', error)
    res.status(500).json({ error: 'Failed to calculate predictions' })
  }
})

/**
 * GET /api/predictions/player/:name/tournament/:tournamentId
 * Get prediction for specific player in tournament
 */
router.get('/player/:name/tournament/:tournamentId', async (req, res) => {
  try {
    const { name, tournamentId } = req.params
    const playerName = decodeURIComponent(name)

    // Get tournament by slug or numeric ID
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE slug = $1 OR id::text = $1',
      [tournamentId]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const prediction = await calculateWinProbability(playerName, tournament.id)

    res.json(prediction)
  } catch (error) {
    console.error('Error calculating player prediction:', error)
    res.status(500).json({ error: 'Failed to calculate prediction' })
  }
})

export default router
