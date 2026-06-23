import express from 'express'
import https from 'https'
import { db } from '../db.js'
import { calculateWinProbability } from '../services/winProbabilityAI.js'
import { parseParticipantsPhoto } from '../services/adminPhotoParser.js'

const router = express.Router()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * Download photo from Telegram
 */
async function downloadTelegramPhoto(fileId) {
  try {
    // Get file path
    const fileInfoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`

    const fileInfo = await new Promise((resolve, reject) => {
      https.get(fileInfoUrl, (response) => {
        let data = ''
        response.on('data', chunk => { data += chunk })
        response.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
        response.on('error', reject)
      })
    })

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      throw new Error('File not found')
    }

    // Download file
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`

    const buffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (response) => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', reject)
      })
    })

    return buffer
  } catch (error) {
    console.error('Error downloading Telegram photo:', error)
    return null
  }
}

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

    // Check if tournament has flights photos
    if (!tournament.flights_photos || tournament.flights_photos.length === 0) {
      return res.json({
        tournament: tournament.name,
        predictions: [],
        message: 'Нет фото флайтов для анализа'
      })
    }

    console.log(`[predictions] Analyzing ${tournament.flights_photos.length} flights photos for tournament ${tournament.name}`)

    // Parse all participants from flights photos
    const allParticipants = []

    for (const fileId of tournament.flights_photos) {
      try {
        console.log(`[predictions] Downloading and parsing photo ${fileId}`)
        const buffer = await downloadTelegramPhoto(fileId)

        if (buffer) {
          const { participants } = await parseParticipantsPhoto(buffer)
          console.log(`[predictions] Found ${participants.length} participants in photo`)
          allParticipants.push(...participants)
        }
      } catch (error) {
        console.error(`[predictions] Error parsing photo ${fileId}:`, error.message)
      }
    }

    // Get unique participant names
    const uniqueNames = [...new Set(allParticipants.map(p => p.name))]
    console.log(`[predictions] Total unique participants: ${uniqueNames.length}`)

    if (uniqueNames.length === 0) {
      return res.json({
        tournament: tournament.name,
        predictions: [],
        message: 'Не удалось распознать участников на фото флайтов'
      })
    }

    // Calculate probabilities for each participant
    const predictions = []

    for (const playerName of uniqueNames) {
      try {
        console.log(`[predictions] Calculating probability for ${playerName}`)
        const probability = await calculateWinProbability(
          playerName,
          tournament.id
        )

        if (probability && probability.probability !== null) {
          predictions.push({
            playerName: playerName,
            probability: probability.probability,
            confidence: probability.confidence,
            analysis: probability.analysis,
            stats: probability.stats,
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[predictions] Error calculating probability for ${playerName}:`, error.message)
      }
    }

    // Sort by probability
    predictions.sort((a, b) => (b.probability || 0) - (a.probability || 0))

    console.log(`[predictions] Successfully calculated ${predictions.length} predictions`)

    res.json({
      tournament: tournament.name,
      tournamentDate: tournament.date,
      predictions: predictions,
      totalParticipants: uniqueNames.length,
      totalAnalyzed: predictions.length,
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
