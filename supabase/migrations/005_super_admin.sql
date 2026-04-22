-- ============================================================
-- CatchQuote — Super admin, account types, trial limits
-- Run in Supabase dashboard: SQL Editor > New query
-- ============================================================

-- ── 1. Extend workspaces ──────────────────────────────────────────────────────

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS account_type   text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS is_active      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_account_type_check;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_account_type_check
  CHECK (account_type IN ('trial', 'pro'));

-- Back-fill any existing workspaces
UPDATE workspaces SET account_type = 'trial' WHERE account_type IS NULL;

-- ── 2. Super admin helper function ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.email() = 'thedeepestwithin@gmail.com'
$$;

-- ── 3. Super admin RLS policies ──────────────────────────────────────────────
-- These sit alongside the existing workspace-scoped policies.
-- Postgres evaluates multiple policies with OR — if any pass, the row is visible.

-- workspaces: super admin reads all
DROP POLICY IF EXISTS "sa_workspaces_select" ON workspaces;
CREATE POLICY "sa_workspaces_select" ON workspaces
  FOR SELECT USING (auth_user_is_super_admin());

-- workspaces: super admin updates any (upgrade / deactivate)
DROP POLICY IF EXISTS "sa_workspaces_update" ON workspaces;
CREATE POLICY "sa_workspaces_update" ON workspaces
  FOR UPDATE USING (auth_user_is_super_admin());

-- workspaces: super admin inserts (manual workspace creation if needed)
DROP POLICY IF EXISTS "sa_workspaces_insert" ON workspaces;
CREATE POLICY "sa_workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (auth_user_is_super_admin());

-- workspace_members: super admin reads all
DROP POLICY IF EXISTS "sa_wm_select" ON workspace_members;
CREATE POLICY "sa_wm_select" ON workspace_members
  FOR SELECT USING (auth_user_is_super_admin());

-- workspace_members: super admin inserts (assign users to workspaces)
DROP POLICY IF EXISTS "sa_wm_insert" ON workspace_members;
CREATE POLICY "sa_wm_insert" ON workspace_members
  FOR INSERT WITH CHECK (auth_user_is_super_admin());

-- quotes: super admin reads all (for counts in admin panel)
DROP POLICY IF EXISTS "sa_quotes_select" ON quotes;
CREATE POLICY "sa_quotes_select" ON quotes
  FOR SELECT USING (auth_user_is_super_admin());

-- profiles: super admin reads all (to show owner emails)
DROP POLICY IF EXISTS "sa_profiles_select" ON profiles;
CREATE POLICY "sa_profiles_select" ON profiles
  FOR SELECT USING (auth_user_is_super_admin());

-- workspace_invites: super admin reads all
DROP POLICY IF EXISTS "sa_wi_select" ON workspace_invites;
CREATE POLICY "sa_wi_select" ON workspace_invites
  FOR SELECT USING (auth_user_is_super_admin());

-- user_presets: super admin reads/writes all
DROP POLICY IF EXISTS "sa_presets_select" ON user_presets;
CREATE POLICY "sa_presets_select" ON user_presets
  FOR SELECT USING (auth_user_is_super_admin());

-- ── 4. Update workspace creation trigger ─────────────────────────────────────
-- Ensure new workspaces created by the trigger default to 'trial'.
-- (The column DEFAULT handles this, but we update the function for clarity.)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pending_invite workspace_invites%ROWTYPE;
  new_workspace_id uuid;
BEGIN
  -- Insert profile (ignore conflict — profile may already exist from OAuth)
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Check for a pending invite
  SELECT * INTO pending_invite
  FROM workspace_invites
  WHERE email = NEW.email AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Join the inviting workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (pending_invite.workspace_id, NEW.id, pending_invite.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    UPDATE workspace_invites SET status = 'accepted' WHERE id = pending_invite.id;
  ELSE
    -- Create a new workspace for this user (trial by default)
    INSERT INTO workspaces (name, owner_id, account_type)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Workspace'),
      NEW.id,
      'trial'
    )
    RETURNING id INTO new_workspace_id;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (drop first to reset)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 5. Index for active workspace lookups ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces (is_active);
CREATE INDEX IF NOT EXISTS idx_workspaces_account_type ON workspaces (account_type);
