import { readFileSync } from 'fs'
import { db } from '../src/db.js'

async function importHDIDMembers() {
  try {
    const csvPath = new URL('../../hdid_members.csv', import.meta.url).pathname
    const csvContent = readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split('\n')

    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim())

    console.log(`[import] Found ${dataLines.length} members to import`)

    let imported = 0
    let skipped = 0

    for (const line of dataLines) {
      const [last_name, first_name, hcp, gender] = line.split(',').map(s => s.trim())

      if (!last_name || !first_name || !hcp || !gender) {
        console.warn(`[import] Skipping invalid line: ${line}`)
        skipped++
        continue
      }

      try {
        await db.query(
          `INSERT INTO hdid_members (last_name, first_name, hcp, gender)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (last_name, first_name) DO UPDATE SET
             hcp = EXCLUDED.hcp,
             gender = EXCLUDED.gender`,
          [last_name, first_name, parseFloat(hcp), gender]
        )
        imported++
      } catch (err) {
        console.error(`[import] Error importing ${first_name} ${last_name}:`, err.message)
        skipped++
      }
    }

    console.log(`[import] Complete: ${imported} imported, ${skipped} skipped`)

    // Show stats
    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE gender = 'male') as males,
        COUNT(*) FILTER (WHERE gender = 'female') as females,
        MIN(hcp) as min_hcp,
        MAX(hcp) as max_hcp,
        ROUND(AVG(hcp)::numeric, 1) as avg_hcp
      FROM hdid_members
    `)

    console.log('[import] Database stats:', stats)

  } catch (err) {
    console.error('[import] Fatal error:', err)
    throw err
  } finally {
    await db.end()
  }
}

importHDIDMembers().catch(console.error)
