import { db } from '../db.js'

/**
 * Update tournament slugs based on frontend tournaments.ts mapping
 */
const TOURNAMENT_SLUGS = {
  // Апрель
  'III Весенний Кубок им. Н. Ермашова by БСБК': 'spring-cup-ermashov',
  // Май
  'Hole in One Challenge (Академическое поле)': 'hole-in-one-challenge',
  'Whitebird Spring Open Cup': 'whitebird-spring-open',
  'Международные соревнования / Minsk Golf Invitational 2026': 'minsk-golf-invitational',
  'Международный детский гольф-турнир «Луч»': 'luch-kids',
  // Июнь
  'XVIII Rookie Cup 2026': 'rookie-cup-18',
  'Hardy Cup': 'hardy-cup',
  'Pets Day': 'pets-day',
  'PRIME LINE CUP': 'prime-line-cup',
  // Июль
  'BELAVIA Golf Open 2026': 'belavia-open',
  'XIX Rookie Cup 2026': 'rookie-cup-19',
  'VIII Кубок Гольф-клуба Минск': 'club-cup-8',
  'ФУТГОЛЬФ. Belarus Open': 'futgolf-belarus-open',
  'II Кубок Братства: Беларусь — Россия by WhiteBird': 'bratstvo-cup-2',
  'Лига Гольфа (РФ) 3 этап, Минск': 'liga-rf-3',
  // Август
  'X Time to Golf 2026 (три клюшки)': 'time-to-golf-10',
  'Ladies Golf Open': 'ladies-open',
  'AVATR Golf Cup (Belarus-China)': 'avatr-cup',
  'Тур «Золотые 50»': 'golden-50',
  'Активлизинг Investment Cup': 'activleasing-cup',
  // Сентябрь
  'Infinity Golf Cup 2026': 'infinity-cup',
  'Лига гольфа (РФ) 4 этап и финал (Москва)': 'liga-rf-4',
  'XX Rookie Cup': 'rookie-cup-20',
  'XX Belarus Golf Open Cup': 'belarus-open-20',
  '«Привет» от Гринкипера by Technogym': 'greenkeeper',
  // Октябрь
  'Отбор BMW Golf Cup World Final': 'bmw-qualifier',
  'BMW Challenge Cup 2026': 'bmw-challenge',
  'Этап Евразийской Лиги Гольфа': 'eurasian-league',
  'Minsk Golf InterClub 2026 by Kaspersky': 'interclub-kaspersky',
  'Футгольф': 'futgolf-oct',
  'Благотворительный турнир БСБК': 'bsbk-charity',
  'XXI Rookie Cup': 'rookie-cup-21',
  // Ноябрь
  'XXII SUPER Rookie Cup': 'super-rookie-22',
}

async function updateSlugs() {
  console.log('[update-slugs] Starting to update tournament slugs...')

  try {
    // Get all tournaments from database
    const { rows: tournaments } = await db.query('SELECT id, name FROM tournaments')
    console.log(`[update-slugs] Found ${tournaments.length} tournaments in database`)

    let updated = 0
    let skipped = 0

    for (const tournament of tournaments) {
      const slug = TOURNAMENT_SLUGS[tournament.name]

      if (slug) {
        await db.query(
          'UPDATE tournaments SET slug = $1 WHERE id = $2',
          [slug, tournament.id]
        )
        console.log(`[update-slugs] ✓ Updated "${tournament.name}" with slug "${slug}"`)
        updated++
      } else {
        console.log(`[update-slugs] ✗ No slug mapping found for "${tournament.name}"`)
        skipped++
      }
    }

    console.log(`[update-slugs] Complete! Updated: ${updated}, Skipped: ${skipped}`)
  } catch (err) {
    console.error('[update-slugs] Error:', err.message)
    throw err
  } finally {
    await db.end()
  }
}

updateSlugs()
