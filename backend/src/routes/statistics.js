import express from 'express'
import { db } from '../db.js'
import { getLeaderboards, getPlayerProfile } from '../services/winProbabilityAI.js'

const router = express.Router()

/**
 * GET /api/statistics/leaderboards
 * Get top players by wins and HCP
 */
router.get('/leaderboards', async (req, res) => {
  try {
    const leaderboards = await getLeaderboards()
    res.json(leaderboards)
  } catch (error) {
    console.error('Error getting leaderboards:', error)
    res.status(500).json({ error: 'Failed to get leaderboards' })
  }
})

/**
 * GET /api/statistics/players
 * Get all players with statistics
 */
router.get('/players', async (req, res) => {
  try {
    const { rows: players } = await db.query(`
      SELECT * FROM player_statistics
      ORDER BY total_tournaments DESC, first_places DESC
      LIMIT 100
    `)
    res.json(players)
  } catch (error) {
    console.error('Error getting players:', error)
    res.status(500).json({ error: 'Failed to get players' })
  }
})

/**
 * GET /api/statistics/player/:name
 * Get detailed player profile
 */
router.get('/player/:name', async (req, res) => {
  try {
    const playerName = decodeURIComponent(req.params.name)
    const profile = await getPlayerProfile(playerName)

    if (!profile) {
      return res.status(404).json({ error: 'Player not found' })
    }

    res.json(profile)
  } catch (error) {
    console.error('Error getting player profile:', error)
    res.status(500).json({ error: 'Failed to get player profile' })
  }
})

/**
 * GET /api/statistics/overall
 * Get overall tournament statistics
 */
router.get('/overall', async (req, res) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(DISTINCT ptr.player_name) as total_players,
        COUNT(DISTINCT ptr.tournament_id) as total_tournaments,
        COUNT(*) as total_results,
        (SELECT COUNT(*) FROM player_nominations) as total_nominations
      FROM player_tournament_results ptr
    `)

    const { rows: recentWinners } = await db.query(`
      SELECT
        t.name as tournament_name,
        t.date as tournament_date,
        ptr.player_name,
        ptr.place,
        ptr.group_name
      FROM player_tournament_results ptr
      JOIN tournaments t ON ptr.tournament_id = t.id
      WHERE ptr.place = 1
      ORDER BY t.date DESC
      LIMIT 20
    `)

    res.json({
      stats,
      recentWinners,
    })
  } catch (error) {
    console.error('Error getting overall statistics:', error)
    res.status(500).json({ error: 'Failed to get overall statistics' })
  }
})

export default router
