-- CatchQuote: add pdf_layout preference to workspace_settings
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS pdf_layout text DEFAULT 'modern';
