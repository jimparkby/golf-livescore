-- Add holes_mode to rounds table for correct 9-hole HCP calculation
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS holes_mode TEXT NOT NULL DEFAULT '18';
