import { db } from '../db.js'

const TOURNAMENTS = [
  // Апрель
  { id: "spring-cup-ermashov", month: "Апрель", date: "26", day: "СБ-ВС", name: "III Весенний Кубок им. Н. Ермашова by БСБК", tier: "platinum", fee: "1.5", year: 2026 },
  // Май
  { id: "hole-in-one-challenge", month: "Май", date: "9", day: "СБ", name: "Hole in One Challenge (Академическое поле)", tier: "gold", fee: "1.2", year: 2026 },
  { id: "whitebird-spring-open", month: "Май", date: "16-17", day: "СБ-ВС", name: "Whitebird Spring Open Cup", tier: "platinum", fee: "1.7", year: 2026 },
  { id: "minsk-golf-invitational", month: "Май", date: "22-23", day: "ПТ-СБ", name: "Международные соревнования / Minsk Golf Invitational 2026", tier: "closed", year: 2026 },
  { id: "luch-kids", month: "Май", date: "31", day: "ВС", name: "Международный детский гольф-турнир «Луч»", tier: "gold", fee: "1.5", year: 2026 },
  // Июнь
  { id: "rookie-cup-18", month: "Июнь", date: "7", day: "ВС", name: "XVIII Rookie Cup 2026", tier: "gold", fee: "1.2", year: 2026 },
  { id: "hardy-cup", month: "Июнь", date: "12", day: "ПТ", name: "Hardy Cup", tier: "closed", fee: "1.3", year: 2026 },
  { id: "pets-day", month: "Июнь", date: "13", day: "СБ", name: "Pets Day", tier: "platinum", fee: "1.3", year: 2026 },
  { id: "prime-line-cup", month: "Июнь", date: "26-28", day: "ПТ-ВС", name: "PRIME LINE CUP", tier: "diamond", fee: "1.4", year: 2026 },
  // Июль
  { id: "belavia-open", month: "Июль", date: "4", day: "СБ", name: "BELAVIA Golf Open 2026", tier: "gold", fee: "1.5", year: 2026 },
  { id: "rookie-cup-19", month: "Июль", date: "5", day: "ВС", name: "XIX Rookie Cup 2026", tier: "gold", fee: "1.2", year: 2026 },
  { id: "club-cup-8", month: "Июль", date: "10-12", day: "ПТ-ВС", name: "VIII Кубок Гольф-клуба Минск", tier: "platinum", fee: "1.9", year: 2026 },
  { id: "futgolf-belarus-open", month: "Июль", date: "19", day: "ВС", name: "ФУТГОЛЬФ. Belarus Open", tier: "closed", year: 2026 },
  { id: "bratstvo-cup-2", month: "Июль", date: "24", day: "ПТ", name: "II Кубок Братства: Беларусь — Россия by WhiteBird", tier: "closed", year: 2026 },
  { id: "liga-rf-3", month: "Июль", date: "25-26", day: "СБ-ВС", name: "Лига Гольфа (РФ) 3 этап, Минск", tier: "closed", year: 2026 },
  // Август
  { id: "time-to-golf-10", month: "Август", date: "1", day: "СБ", name: "X Time to Golf 2026 (три клюшки)", tier: "gold", fee: "1.2", year: 2026 },
  { id: "ladies-open", month: "Август", date: "8", day: "СБ", name: "Ladies Golf Open", tier: "gold", fee: "1.2", year: 2026 },
  { id: "avatr-cup", month: "Август", date: "22", day: "СБ", name: "AVATR Golf Cup (Belarus-China)", tier: "platinum", fee: "1.3", year: 2026 },
  { id: "golden-50", month: "Август", date: "27", day: "ЧТ", name: "Тур «Золотые 50»", tier: "closed", year: 2026 },
  { id: "activleasing-cup", month: "Август", date: "29", day: "СБ", name: "Активлизинг Investment Cup", tier: "platinum", fee: "1.6", year: 2026 },
  // Сентябрь
  { id: "infinity-cup", month: "Сентябрь", date: "5", day: "СБ", name: "Infinity Golf Cup 2026", tier: "platinum", fee: "1.4", year: 2026 },
  { id: "liga-rf-4", month: "Сентябрь", date: "11-13", day: "ПТ-ВС", name: "Лига гольфа (РФ) 4 этап и финал (Москва)", tier: "platinum", year: 2026 },
  { id: "rookie-cup-20", month: "Сентябрь", date: "13", day: "ВС", name: "XX Rookie Cup", tier: "gold", fee: "1.2", year: 2026 },
  { id: "belarus-open-20", month: "Сентябрь", date: "19-20", day: "СБ-ВС", name: "XX Belarus Golf Open Cup", tier: "gold", fee: "1.7", year: 2026 },
  { id: "greenkeeper", month: "Сентябрь", date: "26", day: "СБ", name: "«Привет» от Гринкипера by Technogym", tier: "gold", fee: "1.3", year: 2026 },
  // Октябрь
  { id: "bmw-qualifier", month: "Октябрь", date: "2-4", day: "ПТ-ВС", name: "Отбор BMW Golf Cup World Final", tier: "platinum", fee: "1.7", year: 2026 },
  { id: "bmw-challenge", month: "Октябрь", date: "4", day: "ВС", name: "BMW Challenge Cup 2026", tier: "platinum", fee: "1.6", year: 2026 },
  { id: "eurasian-league", month: "Октябрь", date: "7", day: "СР", name: "Этап Евразийской Лиги Гольфа", tier: "closed", year: 2026 },
  { id: "interclub-kaspersky", month: "Октябрь", date: "9-10", day: "ПТ-СБ", name: "Minsk Golf InterClub 2026 by Kaspersky", tier: "closed", year: 2026 },
  { id: "futgolf-oct", month: "Октябрь", date: "11", day: "ВС", name: "Футгольф", tier: "closed", year: 2026 },
  { id: "bsbk-charity", month: "Октябрь", date: "17", day: "СБ", name: "Благотворительный турнир БСБК", tier: "gold", fee: "1.2", year: 2026 },
  { id: "rookie-cup-21", month: "Октябрь", date: "25", day: "ВС", name: "XXI Rookie Cup", tier: "gold", fee: "1.2", year: 2026 },
  // Ноябрь
  { id: "super-rookie-22", month: "Ноябрь", date: "*7", day: "СБ", name: "XXII SUPER Rookie Cup", tier: "gold", year: 2026 },
]

const MONTH_MAP = {
  "Апрель": 4,
  "Май": 5,
  "Июнь": 6,
  "Июль": 7,
  "Август": 8,
  "Сентябрь": 9,
  "Октябрь": 10,
  "Ноябрь": 11,
}

// Map photo dates to tournament IDs
const TOURNAMENT_RESULTS = {
  "spring-cup-ermashov": [
    "photo_2026-04-25_21-42-51.jpg",
    "photo_2026-04-25_21-43-01.jpg",
    "photo_2026-04-25_21-43-16.jpg",
    "photo_2026-04-25_21-43-35.jpg"
  ],
  "hole-in-one-challenge": [
    "photo_2026-05-09_21-05-24.jpg",
    "photo_2026-05-10_17-43-44.jpg",
    "photo_2026-05-10_17-43-54.jpg"
  ],
  "whitebird-spring-open": [
    "photo_2026-05-17_22-07-26.jpg",
    "photo_2026-05-17_22-07-31.jpg",
    "photo_2026-05-17_22-07-41.jpg",
    "photo_2026-05-17_22-07-51.jpg"
  ],
  "luch-kids": [
    "photo_2026-05-31_18-14-58.jpg",
    "photo_2026-05-31_18-15-07.jpg",
    "photo_2026-05-31_18-15-14.jpg"
  ],
  "rookie-cup-18": [
    "photo_2026-06-03_09-32-12.jpg",
    "photo_2026-06-03_09-32-19.jpg",
    "photo_2026-06-03_09-32-29.jpg",
    "photo_2026-06-07_19-30-47.jpg",
    "photo_2026-06-07_19-30-53.jpg"
  ],
  "pets-day": [
    "photo_2026-06-13_22-17-59.jpg",
    "photo_2026-06-13_22-18-08.jpg",
    "photo_2026-06-13_22-18-17.jpg"
  ]
}

function parseDate(dateStr, month, year) {
  const monthNum = MONTH_MAP[month]

  // Handle date ranges like "16-17" - use first date
  const dayMatch = dateStr.match(/^(\d+)/)
  if (!dayMatch) return null

  const day = parseInt(dayMatch[1])
  return new Date(year, monthNum - 1, day)
}

async function importTournaments() {
  console.log('[import] Starting tournament import...')

  try {
    let imported = 0
    let skipped = 0

    for (const tournament of TOURNAMENTS) {
      const startDate = parseDate(tournament.date, tournament.month, tournament.year)

      if (!startDate) {
        console.log(`[import] Skipping ${tournament.id} - invalid date`)
        skipped++
        continue
      }

      // Determine status based on date
      const now = new Date()
      const hasResults = TOURNAMENT_RESULTS[tournament.id]
      let status = 'upcoming'

      if (startDate < now) {
        status = hasResults ? 'completed' : 'completed'
      }

      // Check if tournament already exists
      const { rows: existing } = await db.query(
        'SELECT id FROM tournaments WHERE id = $1',
        [tournament.id]
      )

      if (existing.length > 0) {
        console.log(`[import] Tournament ${tournament.id} already exists, skipping`)
        skipped++
        continue
      }

      // Insert tournament
      const { rows } = await db.query(`
        INSERT INTO tournaments (
          id, name, start_date, status, tier,
          course_name, holes_count, entry_fee,
          settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        tournament.id,
        tournament.name,
        startDate.toISOString(),
        status,
        tournament.tier,
        'Golf Club Minsk',
        18,
        tournament.fee ? parseFloat(tournament.fee) : null,
        JSON.stringify({
          photos: TOURNAMENT_RESULTS[tournament.id] || [],
          original_date_display: tournament.date,
          original_day_display: tournament.day
        })
      ])

      console.log(`[import] ✓ Imported: ${tournament.name}`)
      imported++
    }

    console.log(`\n[import] Complete!`)
    console.log(`  Imported: ${imported}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`  Total: ${TOURNAMENTS.length}`)
  } catch (err) {
    console.error('[import] Error:', err)
    throw err
  } finally {
    await db.end()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importTournaments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

export { importTournaments }
