-- ============================================================
-- CatchQuote — workspace & role system
-- Run this in the Supabase dashboard: SQL Editor > New query
-- ============================================================

-- profiles (used to display member emails on the Team page)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- workspace_members
CREATE TABLE IF NOT EXISTS workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'sales_designer' CHECK (role IN ('admin', 'sales_designer')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- workspace_invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL DEFAULT 'sales_designer' CHECK (role IN ('admin', 'sales_designer')),
  invited_by   uuid NOT NULL REFERENCES auth.users(id),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Extend quotes: add workspace_id and created_by
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES auth.users(id);

-- Extend user_presets: add workspace_id
ALTER TABLE user_presets ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================
-- Trigger: auto-provision workspace on signup
-- New users with a pending invite join that workspace (no own workspace created).
-- New users without an invite get their own workspace as admin.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  pending_invite   workspace_invites%ROWTYPE;
BEGIN
  -- Always create a profile row
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Check for a pending invite matching this email
  SELECT * INTO pending_invite
  FROM workspace_invites
  WHERE email = NEW.email AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Join the inviting workspace; skip creating their own
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (pending_invite.workspace_id, NEW.id, pending_invite.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    UPDATE workspace_invites SET status = 'accepted' WHERE id = pending_invite.id;
  ELSE
    -- Create their own workspace and become admin
    INSERT INTO workspaces (name, owner_id)
    VALUES (split_part(NEW.email, '@', 1) || '''s Workspace', NEW.id)
    RETURNING id INTO new_workspace_id;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- NOTE: existing users (signed up before this migration) will not
-- have a workspace. Run the block below manually for each existing
-- user, replacing the email and uuid values:
--
-- INSERT INTO workspaces (name, owner_id)
--   VALUES ('My Workspace', '<user_uuid>')
--   RETURNING id;
-- INSERT INTO workspace_members (workspace_id, user_id, role)
--   VALUES ('<workspace_uuid>', '<user_uuid>', 'admin');
-- INSERT INTO profiles (id, email) VALUES ('<user_uuid>', '<email>')
--   ON CONFLICT DO NOTHING;
-- ============================================================

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- profiles: visible to workspace-mates
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members a
      JOIN   workspace_members b ON a.workspace_id = b.workspace_id
      WHERE  a.user_id = auth.uid() AND b.user_id = profiles.id
    )
  );

-- workspaces: visible to members
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
  );

CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- workspace_members: visible to workspace-mates
CREATE POLICY "wm_select" ON workspace_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members x WHERE x.workspace_id = workspace_members.workspace_id AND x.user_id = auth.uid())
  );

CREATE POLICY "wm_insert" ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members x WHERE x.workspace_id = workspace_members.workspace_id AND x.user_id = auth.uid() AND x.role = 'admin')
  );

CREATE POLICY "wm_delete" ON workspace_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM workspace_members x WHERE x.workspace_id = workspace_members.workspace_id AND x.user_id = auth.uid() AND x.role = 'admin')
  );

-- workspace_invites: admin only
CREATE POLICY "wi_select" ON workspace_invites FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invites.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "wi_insert" ON workspace_invites FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invites.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "wi_update" ON workspace_invites FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invites.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "wi_delete" ON workspace_invites FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invites.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Quotes RLS — drop old policies, replace with workspace-aware ones
-- ============================================================
DROP POLICY IF EXISTS "quotes_select" ON quotes;
DROP POLICY IF EXISTS "quotes_insert" ON quotes;
DROP POLICY IF EXISTS "quotes_update" ON quotes;
DROP POLICY IF EXISTS "quotes_delete" ON quotes;

-- Admin sees all workspace quotes; sales_designer sees only their own
CREATE POLICY "quotes_select" ON quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = quotes.workspace_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = quotes.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "quotes_update" ON quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = quotes.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_delete" ON quotes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = quotes.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
    OR created_by = auth.uid()
  );

-- ============================================================
-- user_presets RLS — admin manages, members can read
-- ============================================================
DROP POLICY IF EXISTS "user_presets_all" ON user_presets;

CREATE POLICY "presets_select" ON user_presets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = user_presets.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "presets_insert" ON user_presets FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = user_presets.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "presets_delete" ON user_presets FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = user_presets.workspace_id AND user_id = auth.uid() AND role = 'admin')
  );
