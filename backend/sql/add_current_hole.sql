-- Add current_hole to rounds for mid-round persistence (saving which hole user was on)
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS current_hole INTEGER;
