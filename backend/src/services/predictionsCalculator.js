/**
 * Background predictions calculator
 * Calculates AI win probabilities for tournament participants
 */

import https from 'https'
import { db } from '../db.js'
import { calculateWinProbability } from './winProbabilityAI.js'
import { parseParticipantsPhoto } from './adminPhotoParser.js'
import { getHcpGroup, detectGender } from '../utils/hcpGroups.js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * Download photo from Telegram
 */
async function downloadTelegramPhoto(fileId) {
  try {
    const fileInfoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`

    const fileInfo = await new Promise((resolve, reject) => {
      https.get(fileInfoUrl, (response) => {
        let data = ''
        response.on('data', chunk => { data += chunk })
        response.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch (e) { reject(e) }
        })
        response.on('error', reject)
      })
    })

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      throw new Error('File not found')
    }

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
    console.error('[predictionsCalc] Error downloading photo:', error.message)
    return null
  }
}

// Track running calculations to prevent duplicates
const runningCalculations = new Set()

/**
 * Calculate and save predictions for a tournament (background job)
 */
export async function calculateAndSavePredictions(tournamentId) {
  // Prevent duplicate calculations
  if (runningCalculations.has(tournamentId)) {
    console.log(`[predictionsCalc] Calculation already running for tournament ${tournamentId}`)
    return
  }

  runningCalculations.add(tournamentId)

  try {
    console.log(`[predictionsCalc] Starting calculation for tournament ${tournamentId}`)

    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    )

    if (!tournament || !tournament.flights_photos || tournament.flights_photos.length === 0) {
      console.log(`[predictionsCalc] No flights photos for tournament ${tournamentId}`)
      return
    }

    // Parse all participants from flights photos
    const allParticipants = []

    for (const fileId of tournament.flights_photos) {
      try {
        const buffer = await downloadTelegramPhoto(fileId)
        if (buffer) {
          const { participants } = await parseParticipantsPhoto(buffer)
          allParticipants.push(...participants)
        }
      } catch (error) {
        console.error(`[predictionsCalc] Error parsing photo ${fileId}:`, error.message)
      }
    }

    const uniqueNames = [...new Set(allParticipants.map(p => p.name))]
    console.log(`[predictionsCalc] Calculating for ${uniqueNames.length} participants`)

    let calculated = 0

    for (const playerName of uniqueNames) {
      try {
        const probability = await calculateWinProbability(playerName, tournament.id)

        if (probability && probability.probability !== null) {
          // Get player HCP from statistics
          const { rows: [playerStats] } = await db.query(
            `SELECT estimated_hcp FROM player_statistics WHERE player_name = $1`,
            [playerName]
          )

          const playerHcp = playerStats?.estimated_hcp || 36 // Default to max HCP if not found
          const gender = detectGender(playerName)
          const hcpGroup = getHcpGroup(playerHcp, gender)

          await db.query(
            `INSERT INTO tournament_predictions
             (tournament_id, player_name, probability, confidence, analysis, stats, hcp_group, player_hcp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, player_name)
             DO UPDATE SET
               probability = $3,
               confidence = $4,
               analysis = $5,
               stats = $6,
               hcp_group = $7,
               player_hcp = $8,
               updated_at = CURRENT_TIMESTAMP`,
            [
              tournament.id,
              playerName,
              probability.probability,
              probability.confidence,
              probability.analysis,
              JSON.stringify(probability.stats),
              hcpGroup,
              playerHcp
            ]
          )
          calculated++

          if (calculated % 10 === 0) {
            console.log(`[predictionsCalc] Progress: ${calculated}/${uniqueNames.length}`)
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[predictionsCalc] Error for ${playerName}:`, error.message)
      }
    }

    console.log(`[predictionsCalc] Completed: ${calculated}/${uniqueNames.length} predictions saved`)
  } catch (error) {
    console.error('[predictionsCalc] Calculation error:', error)
  } finally {
    runningCalculations.delete(tournamentId)
  }
}
