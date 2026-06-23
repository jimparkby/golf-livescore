import express from 'express'
import { db } from '../db.js'
import { calculateWinProbability } from '../services/winProbabilityAI.js'

const router = express.Router()

/**
 * GET /api/predictions/tournament/:id
 * Calculate win probabilities for all participants in a tournament
 */
router.get('/tournament/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Get tournament by slug or numeric ID
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE slug = $1 OR id::text = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    // Get all participants from flights_photos by extracting names from the photos
    // For now, get all unique players who have participated before
    const { rows: participants } = await db.query(
      `SELECT DISTINCT player_name, handicap
       FROM participants
       ORDER BY player_name
       LIMIT 100`
    )

    if (participants.length === 0) {
      return res.json({
        tournament: tournament.name,
        predictions: [],
        message: 'Нет зарегистрированных участников'
      })
    }

    // Calculate probabilities for each participant
    const predictions = []

    for (const participant of participants.slice(0, 30)) { // Limit to 30 to avoid timeout
      try {
        const probability = await calculateWinProbability(
          participant.player_name,
          tournament.id
        )

        if (probability && probability.probability !== null) {
          predictions.push({
            playerName: participant.player_name,
            probability: probability.probability,
            confidence: probability.confidence,
            analysis: probability.analysis,
            stats: probability.stats,
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Error calculating probability for ${participant.player_name}:`, error.message)
      }
    }

    // Sort by probability
    predictions.sort((a, b) => (b.probability || 0) - (a.probability || 0))

    res.json({
      tournament: tournament.name,
      tournamentDate: tournament.date,
      predictions: predictions.slice(0, 20), // Top 20
      totalAnalyzed: predictions.length,
    })
  } catch (error) {
    console.error('Error calculating tournament predictions:', error)
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
