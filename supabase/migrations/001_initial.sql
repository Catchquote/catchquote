-- ============================================================
-- CatchQuote — initial schema
-- Run this in the Supabase dashboard: SQL Editor > New query
-- ============================================================

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number text        NOT NULL,
  client_name  text,
  client_email text,
  project_name text,
  status       text        NOT NULL DEFAULT 'draft',
  notes        text,
  subtotal     numeric(12,2) NOT NULL DEFAULT 0,
  gst          numeric(12,2) NOT NULL DEFAULT 0,
  total        numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- quote_items
CREATE TABLE IF NOT EXISTS quote_items (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid          NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description text,
  quantity    numeric(12,4) NOT NULL DEFAULT 1,
  unit        text,
  unit_price  numeric(12,2) NOT NULL DEFAULT 0,
  sort_order  int           NOT NULL DEFAULT 0
);

-- user_presets
CREATE TABLE IF NOT EXISTS user_presets (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text,
  description text,
  unit        text,
  unit_price  numeric(12,2)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presets ENABLE ROW LEVEL SECURITY;

-- quotes: full CRUD for owner
CREATE POLICY "quotes_select" ON quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert" ON quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update" ON quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete" ON quotes FOR DELETE USING (auth.uid() = user_id);

-- quote_items: access via parent quote ownership
CREATE POLICY "quote_items_select" ON quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "quote_items_update" ON quote_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "quote_items_delete" ON quote_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

-- user_presets: full CRUD for owner
CREATE POLICY "user_presets_all" ON user_presets FOR ALL USING (auth.uid() = user_id);
