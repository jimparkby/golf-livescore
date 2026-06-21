import { db } from '../db.js'

export async function migrateTournaments() {
  try {
    // Tournaments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        course_name TEXT,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
        tier TEXT DEFAULT 'gold' CHECK (tier IN ('gold', 'platinum', 'diamond', 'closed')),
        format TEXT DEFAULT 'stroke_play',
        holes_count INTEGER DEFAULT 18,
        entry_fee NUMERIC(10, 2),
        max_participants INTEGER,
        registration_deadline TIMESTAMP WITH TIME ZONE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('[migration] tournaments table created')

    // Tournament participants
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flight_number INTEGER,
        tee_time TIMESTAMP WITH TIME ZONE,
        handicap_index NUMERIC(4, 1),
        status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'started', 'finished', 'withdrawn')),
        total_score INTEGER,
        position INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      )
    `)
    console.log('[migration] tournament_participants table created')

    // Tournament rounds (связь с rounds table для отслеживания раундов)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournament_rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
        round_number INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tournament_id, round_id)
      )
    `)
    console.log('[migration] tournament_rounds table created')

    // Player tournament history (для хранения исторических данных)
    await db.query(`
      CREATE TABLE IF NOT EXISTS player_tournament_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_name TEXT NOT NULL,
        player_normalized_name TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        tournament_name TEXT NOT NULL,
        tournament_date DATE NOT NULL,
        position INTEGER,
        total_score INTEGER,
        handicap_index NUMERIC(4, 1),
        scores JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('[migration] player_tournament_history table created')

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_player_history_normalized_name
      ON player_tournament_history(player_normalized_name)
    `)

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_player_history_user_id
      ON player_tournament_history(user_id)
    `)

    // Player statistics (агрегированная статистика)
    await db.query(`
      CREATE TABLE IF NOT EXISTS player_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        player_name TEXT NOT NULL,
        player_normalized_name TEXT NOT NULL,
        tournaments_played INTEGER DEFAULT 0,
        tournaments_won INTEGER DEFAULT 0,
        top3_finishes INTEGER DEFAULT 0,
        top10_finishes INTEGER DEFAULT 0,
        best_position INTEGER,
        average_score NUMERIC(5, 2),
        current_handicap NUMERIC(4, 1),
        best_handicap NUMERIC(4, 1),
        last_tournament_date DATE,
        statistics JSONB DEFAULT '{}',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(player_normalized_name)
      )
    `)
    console.log('[migration] player_statistics table created')

    // Flight photos (для хранения загруженных фото флайтов)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournament_flight_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        flight_number INTEGER NOT NULL,
        telegram_file_id TEXT,
        processed BOOLEAN DEFAULT false,
        scores JSONB,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('[migration] tournament_flight_photos table created')

    console.log('[migration] All tournament tables created successfully')
  } catch (err) {
    console.error('[migration] Error creating tournament tables:', err.message)
    throw err
  }
}
