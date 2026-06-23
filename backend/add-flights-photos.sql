-- Add flights_photos field to tournaments table
-- This field stores Telegram file_id array of flights/participants photos

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS flights_photos JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tournaments_flights_photos
ON tournaments USING gin (flights_photos);

-- Success message
SELECT 'Added flights_photos field to tournaments table' as status;
