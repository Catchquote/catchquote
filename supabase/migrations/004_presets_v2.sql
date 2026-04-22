-- ============================================================
-- CatchQuote — Presets v2: cost/selling price, contractor, margin
-- Run in Supabase dashboard: SQL Editor > New query
-- ============================================================

-- Extend user_presets with new columns
ALTER TABLE user_presets
  ADD COLUMN IF NOT EXISTS item_code        text,
  ADD COLUMN IF NOT EXISTS contractor_name  text,
  ADD COLUMN IF NOT EXISTS notes            text,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cost_price       numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price    numeric(12,2) NOT NULL DEFAULT 0;

-- Migrate existing unit_price into selling_price for any existing rows
UPDATE user_presets
SET selling_price = unit_price
WHERE selling_price = 0 AND unit_price > 0;

-- Add a CHECK constraint for status values
ALTER TABLE user_presets
  DROP CONSTRAINT IF EXISTS user_presets_status_check;

ALTER TABLE user_presets
  ADD CONSTRAINT user_presets_status_check
  CHECK (status IN ('active', 'inactive'));

-- ============================================================
-- RLS: workspace members can read all presets in their workspace
--      owners can write their own presets
-- ============================================================

-- Drop old single-user policy
DROP POLICY IF EXISTS "user_presets_all" ON user_presets;

-- Workspace members can read all active presets in their workspace (for quote picker)
CREATE POLICY "presets_select_workspace"
  ON user_presets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Only the owning user (or workspace admin) can insert
CREATE POLICY "presets_insert"
  ON user_presets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Only the owning user can update/delete their own presets
CREATE POLICY "presets_update"
  ON user_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "presets_delete"
  ON user_presets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Optional: index for fast workspace + status lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_presets_workspace_status
  ON user_presets (workspace_id, status);
