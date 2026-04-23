-- ============================================================
-- CatchQuote — Quote redesign: areas of works + new header fields
-- Run in Supabase dashboard: SQL Editor > New query
-- ============================================================

-- ── quotes: new header columns ───────────────────────────────────────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quote_date      date,
  ADD COLUMN IF NOT EXISTS valid_until     date,
  ADD COLUMN IF NOT EXISTS currency        text          DEFAULT 'SGD',
  ADD COLUMN IF NOT EXISTS client_address  text,
  ADD COLUMN IF NOT EXISTS client_contact  text,
  ADD COLUMN IF NOT EXISTS project_address text,
  ADD COLUMN IF NOT EXISTS designer_name   text;

-- Backfill quote_date from created_at for all existing rows
UPDATE quotes
SET quote_date = created_at::date
WHERE quote_date IS NULL;

-- ── quote_items: area_of_works + category ────────────────────────────────────
ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS area_of_works text,
  ADD COLUMN IF NOT EXISTS category      text DEFAULT 'General Labour';

-- Backfill category for existing items that have none
UPDATE quote_items
SET category = 'General Labour'
WHERE category IS NULL;
