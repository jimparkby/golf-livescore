-- Add slug field to tournaments table to match frontend IDs
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Create index for faster lookups by slug
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug);

-- Update existing tournaments with slugs based on their IDs
-- This maps numeric IDs to the string IDs used in the frontend (TOURNAMENTS array)
UPDATE tournaments SET slug = 'spring-cup-ermashov' WHERE id = 1;
UPDATE tournaments SET slug = 'hole-in-one-challenge' WHERE id = 2;
UPDATE tournaments SET slug = 'whitebird-spring-open' WHERE id = 3;
UPDATE tournaments SET slug = 'minsk-golf-invitational' WHERE id = 4;
UPDATE tournaments SET slug = 'luch-kids' WHERE id = 5;
UPDATE tournaments SET slug = 'rookie-cup-18' WHERE id = 6;
UPDATE tournaments SET slug = 'hardy-cup' WHERE id = 7;
UPDATE tournaments SET slug = 'pets-day' WHERE id = 8;
UPDATE tournaments SET slug = 'prime-line-cup' WHERE id = 9;
UPDATE tournaments SET slug = 'belavia-open' WHERE id = 10;
UPDATE tournaments SET slug = 'rookie-cup-19' WHERE id = 11;
UPDATE tournaments SET slug = 'club-cup-8' WHERE id = 12;
UPDATE tournaments SET slug = 'futgolf-belarus-open' WHERE id = 13;
UPDATE tournaments SET slug = 'bratstvo-cup-2' WHERE id = 14;
UPDATE tournaments SET slug = 'liga-rf-3' WHERE id = 15;
UPDATE tournaments SET slug = 'time-to-golf-10' WHERE id = 16;
UPDATE tournaments SET slug = 'ladies-open' WHERE id = 17;
UPDATE tournaments SET slug = 'avatr-cup' WHERE id = 18;
UPDATE tournaments SET slug = 'golden-50' WHERE id = 19;
UPDATE tournaments SET slug = 'activleasing-cup' WHERE id = 20;
UPDATE tournaments SET slug = 'infinity-cup' WHERE id = 21;
UPDATE tournaments SET slug = 'liga-rf-4' WHERE id = 22;
UPDATE tournaments SET slug = 'rookie-cup-20' WHERE id = 23;
UPDATE tournaments SET slug = 'belarus-open-20' WHERE id = 24;
UPDATE tournaments SET slug = 'greenkeeper' WHERE id = 25;
UPDATE tournaments SET slug = 'bmw-qualifier' WHERE id = 26;
UPDATE tournaments SET slug = 'bmw-challenge' WHERE id = 27;
UPDATE tournaments SET slug = 'eurasian-league' WHERE id = 28;
UPDATE tournaments SET slug = 'interclub-kaspersky' WHERE id = 29;
UPDATE tournaments SET slug = 'futgolf-oct' WHERE id = 30;
UPDATE tournaments SET slug = 'bsbk-charity' WHERE id = 31;
UPDATE tournaments SET slug = 'closing-championship' WHERE id = 32;
UPDATE tournaments SET slug = 'whitebird-autumn-open' WHERE id = 33;

-- Success message
SELECT 'Added slug field to tournaments and updated existing records' as status;
