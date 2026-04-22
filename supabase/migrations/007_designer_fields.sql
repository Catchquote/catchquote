-- ============================================================
-- CatchQuote — Add designer fields to workspace_settings
-- Run in Supabase dashboard: SQL Editor > New query
-- ============================================================

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS designer_name     text,
  ADD COLUMN IF NOT EXISTS designer_position text;
