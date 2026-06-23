import express from 'express'
import https from 'https'
import { db } from '../db.js'

const router = express.Router()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * GET /api/tournaments/:id
 * Get tournament details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { rows: [tournament] } = await db.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json(tournament)
  } catch (error) {
    console.error('Error getting tournament:', error)
    res.status(500).json({ error: 'Failed to get tournament' })
  }
})

/**
 * GET /api/tournaments/:id/flights-photos
 * Get flights photos for a tournament
 */
router.get('/:id/flights-photos', async (req, res) => {
  try {
    const { id } = req.params
    const { rows: [tournament] } = await db.query(
      'SELECT flights_photos FROM tournaments WHERE id = $1',
      [id]
    )

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    res.json({
      photos: tournament.flights_photos || []
    })
  } catch (error) {
    console.error('Error getting flights photos:', error)
    res.status(500).json({ error: 'Failed to get flights photos' })
  }
})

/**
 * DELETE /api/tournaments/:id/flights-photos/:fileId
 * Delete a specific flight photo from tournament
 */
router.delete('/:id/flights-photos/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params

    // Remove the file_id from the JSON array
    await db.query(
      `UPDATE tournaments
       SET flights_photos = (
         SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(flights_photos) elem
         WHERE elem::text != $1::text
       )
       WHERE id = $2`,
      [JSON.stringify(fileId), id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting flight photo:', error)
    res.status(500).json({ error: 'Failed to delete flight photo' })
  }
})

/**
 * GET /api/tournaments/telegram-photo/:fileId
 * Proxy Telegram photo to frontend
 */
router.get('/telegram-photo/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: 'Telegram bot token not configured' })
    }

    // Get file path from Telegram
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
      return res.status(404).json({ error: 'File not found' })
    }

    // Download and stream the file
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`

    https.get(fileUrl, (photoResponse) => {
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day
      photoResponse.pipe(res)
    }).on('error', (error) => {
      console.error('Error downloading photo:', error)
      res.status(500).json({ error: 'Failed to download photo' })
    })
  } catch (error) {
    console.error('Error proxying telegram photo:', error)
    res.status(500).json({ error: 'Failed to proxy photo' })
  }
})

export default router
