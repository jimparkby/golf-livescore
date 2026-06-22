-- Fix tournaments table structure and import data
-- Step 1: Add missing 'date' column if it doesn't exist

-- Add date column (will fail silently if exists in newer PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'date'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN date DATE;
    END IF;
END $$;

-- Step 2: Add location column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'location'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN location VARCHAR(255) DEFAULT 'Golf Club Minsk';
    END IF;
END $$;

-- Step 3: Add description column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournaments' AND column_name = 'description'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN description TEXT;
    END IF;
END $$;

-- Step 4: Import all tournaments for 2026 season
INSERT INTO tournaments (id, name, date, location, description) VALUES
  -- Апрель
  (1, 'III Весенний Кубок им. Н. Ермашова by БСБК', '2026-04-26', 'Golf Club Minsk', 'Platinum tier tournament'),

  -- Май
  (2, 'Hole in One Challenge (Академическое поле)', '2026-05-09', 'Golf Club Minsk', 'Gold tier tournament'),
  (3, 'Whitebird Spring Open Cup', '2026-05-16', 'Golf Club Minsk', 'Platinum tier - 2 days'),
  (4, 'Minsk Golf Invitational 2026', '2026-05-22', 'Golf Club Minsk', 'Closed international tournament'),
  (5, 'Международный детский гольф-турнир «Луч»', '2026-05-31', 'Golf Club Minsk', 'Gold tier - kids tournament'),

  -- Июнь
  (6, 'XVIII Rookie Cup 2026', '2026-06-07', 'Golf Club Minsk', 'Gold tier'),
  (7, 'Hardy Cup', '2026-06-12', 'Golf Club Minsk', 'Closed tournament'),
  (8, 'Pets Day', '2026-06-13', 'Golf Club Minsk', 'Platinum tier'),
  (9, 'PRIME LINE CUP', '2026-06-26', 'Golf Club Minsk', 'Diamond tier - 3 days'),

  -- Июль
  (10, 'BELAVIA Golf Open 2026', '2026-07-04', 'Golf Club Minsk', 'Gold tier'),
  (11, 'XIX Rookie Cup 2026', '2026-07-05', 'Golf Club Minsk', 'Gold tier'),
  (12, 'VIII Кубок Гольф-клуба Минск', '2026-07-10', 'Golf Club Minsk', 'Platinum tier - 3 days'),
  (13, 'ФУТГОЛЬФ. Belarus Open', '2026-07-19', 'Golf Club Minsk', 'Closed - Footgolf'),
  (14, 'II Кубок Братства: Беларусь — Россия by WhiteBird', '2026-07-24', 'Golf Club Minsk', 'Closed tournament'),
  (15, 'Лига Гольфа (РФ) 3 этап, Минск', '2026-07-25', 'Golf Club Minsk', 'Closed - Russian Golf League'),

  -- Август
  (16, 'X Time to Golf 2026 (три клюшки)', '2026-08-01', 'Golf Club Minsk', 'Gold tier - 3 club tournament'),
  (17, 'Ladies Golf Open', '2026-08-08', 'Golf Club Minsk', 'Gold tier - ladies only'),
  (18, 'AVATR Golf Cup (Belarus-China)', '2026-08-22', 'Golf Club Minsk', 'Platinum tier'),
  (19, 'Тур «Золотые 50»', '2026-08-27', 'Golf Club Minsk', 'Closed - Golden 50 tour'),
  (20, 'Активлизинг Investment Cup', '2026-08-29', 'Golf Club Minsk', 'Platinum tier'),

  -- Сентябрь
  (21, 'Infinity Golf Cup 2026', '2026-09-05', 'Golf Club Minsk', 'Platinum tier'),
  (22, 'Лига гольфа (РФ) 4 этап и финал (Москва)', '2026-09-11', 'Moscow', 'Platinum tier - Russian Golf League final'),
  (23, 'XX Rookie Cup', '2026-09-13', 'Golf Club Minsk', 'Gold tier'),
  (24, 'XX Belarus Golf Open Cup', '2026-09-19', 'Golf Club Minsk', 'Gold tier - 2 days'),
  (25, '«Привет» от Гринкипера by Technogym', '2026-09-26', 'Golf Club Minsk', 'Gold tier'),

  -- Октябрь
  (26, 'Отбор BMW Golf Cup World Final', '2026-10-02', 'Golf Club Minsk', 'Platinum tier - BMW qualifier'),
  (27, 'BMW Challenge Cup 2026', '2026-10-04', 'Golf Club Minsk', 'Platinum tier'),
  (28, 'Этап Евразийской Лиги Гольфа', '2026-10-07', 'Golf Club Minsk', 'Closed - Eurasian Golf League'),
  (29, 'Minsk Golf InterClub 2026 by Kaspersky', '2026-10-09', 'Golf Club Minsk', 'Closed - InterClub'),
  (30, 'Футгольф', '2026-10-11', 'Golf Club Minsk', 'Closed - Footgolf'),
  (31, 'Благотворительный турнир БСБК', '2026-10-17', 'Golf Club Minsk', 'Gold tier - Charity'),
  (32, 'XXI Rookie Cup', '2026-10-25', 'Golf Club Minsk', 'Gold tier'),

  -- Ноябрь
  (33, 'XXII SUPER Rookie Cup', '2026-11-07', 'Golf Club Minsk', 'Gold tier - Super Rookie')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  location = EXCLUDED.location,
  description = EXCLUDED.description;

-- Verify import
SELECT COUNT(*) as total_tournaments FROM tournaments;
SELECT id, name, date FROM tournaments ORDER BY date;
