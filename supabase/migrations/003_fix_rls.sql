-- ============================================================
-- CatchQuote — fix RLS infinite recursion
-- Run in Supabase dashboard: SQL Editor > New query
--
-- Root cause: workspace_members policies referenced workspace_members
-- itself via subqueries, causing Postgres to recurse endlessly.
--
-- Fix: two SECURITY DEFINER helper functions that query
-- workspace_members WITHOUT triggering RLS. All policies use
-- only these functions + auth.uid() — no cross-table RLS chains.
-- ============================================================

-- ============================================================
-- Helper functions (SECURITY DEFINER = bypass RLS)
-- Safe to call from inside any RLS policy expression.
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_workspace_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id
  FROM   workspace_members
  WHERE  user_id = auth.uid()
  LIMIT  1
$$;

CREATE OR REPLACE FUNCTION auth_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   workspace_members
    WHERE  user_id = auth.uid()
      AND  role = 'admin'
  )
$$;

-- ============================================================
-- Drop every existing policy that may be recursive or stale
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select"     ON profiles;

-- workspaces
DROP POLICY IF EXISTS "workspaces_select"   ON workspaces;
DROP POLICY IF EXISTS "workspaces_update"   ON workspaces;

-- workspace_members
DROP POLICY IF EXISTS "wm_select"           ON workspace_members;
DROP POLICY IF EXISTS "wm_insert"           ON workspace_members;
DROP POLICY IF EXISTS "wm_delete"           ON workspace_members;

-- workspace_invites
DROP POLICY IF EXISTS "wi_select"           ON workspace_invites;
DROP POLICY IF EXISTS "wi_insert"           ON workspace_invites;
DROP POLICY IF EXISTS "wi_update"           ON workspace_invites;
DROP POLICY IF EXISTS "wi_delete"           ON workspace_invites;

-- quotes  (created in 001, rewritten in 002)
DROP POLICY IF EXISTS "quotes_select"       ON quotes;
DROP POLICY IF EXISTS "quotes_insert"       ON quotes;
DROP POLICY IF EXISTS "quotes_update"       ON quotes;
DROP POLICY IF EXISTS "quotes_delete"       ON quotes;

-- quote_items  (created in 001)
DROP POLICY IF EXISTS "quote_items_select"  ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert"  ON quote_items;
DROP POLICY IF EXISTS "quote_items_update"  ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete"  ON quote_items;
DROP POLICY IF EXISTS "qi_select"           ON quote_items;
DROP POLICY IF EXISTS "qi_insert"           ON quote_items;
DROP POLICY IF EXISTS "qi_update"           ON quote_items;
DROP POLICY IF EXISTS "qi_delete"           ON quote_items;

-- user_presets  (created in 001, rewritten in 002)
DROP POLICY IF EXISTS "user_presets_all"    ON user_presets;
DROP POLICY IF EXISTS "presets_select"      ON user_presets;
DROP POLICY IF EXISTS "presets_insert"      ON user_presets;
DROP POLICY IF EXISTS "presets_delete"      ON user_presets;

-- ============================================================
-- workspace_members
-- Each user sees all rows that share their workspace_id.
-- auth_user_workspace_id() is SECURITY DEFINER → no recursion.
-- ============================================================
CREATE POLICY "wm_select" ON workspace_members
  FOR SELECT USING (
    workspace_id = auth_user_workspace_id()
  );

CREATE POLICY "wm_insert" ON workspace_members
  FOR INSERT WITH CHECK (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

CREATE POLICY "wm_delete" ON workspace_members
  FOR DELETE USING (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

-- ============================================================
-- workspaces
-- ============================================================
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (
    id = auth_user_workspace_id()
  );

CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

-- ============================================================
-- workspace_invites
-- Admin-only access.  Both helper functions are SECURITY DEFINER.
-- ============================================================
CREATE POLICY "wi_select" ON workspace_invites
  FOR SELECT USING (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

CREATE POLICY "wi_insert" ON workspace_invites
  FOR INSERT WITH CHECK (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

CREATE POLICY "wi_update" ON workspace_invites
  FOR UPDATE USING (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

CREATE POLICY "wi_delete" ON workspace_invites
  FOR DELETE USING (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

-- ============================================================
-- profiles
-- A user sees their own profile plus every profile belonging to
-- a member of their workspace.
-- The subquery on workspace_members fires workspace_members RLS,
-- which calls auth_user_workspace_id() (SECURITY DEFINER) — safe.
-- ============================================================
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id
      FROM   workspace_members
      WHERE  workspace_id = auth_user_workspace_id()
    )
  );

-- ============================================================
-- quotes
-- Admin sees all quotes in workspace; sales_designer sees own only.
-- Both helper functions are SECURITY DEFINER — no RLS chain.
-- ============================================================
CREATE POLICY "quotes_select" ON quotes
  FOR SELECT USING (
    (auth_user_is_admin() AND workspace_id = auth_user_workspace_id())
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_insert" ON quotes
  FOR INSERT WITH CHECK (
    created_by    = auth.uid()
    AND workspace_id = auth_user_workspace_id()
  );

CREATE POLICY "quotes_update" ON quotes
  FOR UPDATE USING (
    (auth_user_is_admin() AND workspace_id = auth_user_workspace_id())
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_delete" ON quotes
  FOR DELETE USING (
    (auth_user_is_admin() AND workspace_id = auth_user_workspace_id())
    OR created_by = auth.uid()
  );

-- ============================================================
-- quote_items
-- Access derived from the parent quote.
-- The EXISTS subquery checks quotes — quotes RLS uses SECURITY
-- DEFINER helpers, so the chain terminates: no recursion.
-- ============================================================
CREATE POLICY "qi_select" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE  quotes.id = quote_items.quote_id
        AND  (
               (auth_user_is_admin() AND quotes.workspace_id = auth_user_workspace_id())
               OR quotes.created_by = auth.uid()
             )
    )
  );

CREATE POLICY "qi_insert" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE  quotes.id = quote_items.quote_id
        AND  (
               (auth_user_is_admin() AND quotes.workspace_id = auth_user_workspace_id())
               OR quotes.created_by = auth.uid()
             )
    )
  );

CREATE POLICY "qi_update" ON quote_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE  quotes.id = quote_items.quote_id
        AND  (
               (auth_user_is_admin() AND quotes.workspace_id = auth_user_workspace_id())
               OR quotes.created_by = auth.uid()
             )
    )
  );

CREATE POLICY "qi_delete" ON quote_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE  quotes.id = quote_items.quote_id
        AND  (
               (auth_user_is_admin() AND quotes.workspace_id = auth_user_workspace_id())
               OR quotes.created_by = auth.uid()
             )
    )
  );

-- ============================================================
-- user_presets
-- All workspace members can read; only admins can write.
-- ============================================================
CREATE POLICY "presets_select" ON user_presets
  FOR SELECT USING (
    workspace_id = auth_user_workspace_id()
  );

CREATE POLICY "presets_insert" ON user_presets
  FOR INSERT WITH CHECK (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );

CREATE POLICY "presets_delete" ON user_presets
  FOR DELETE USING (
    workspace_id = auth_user_workspace_id()
    AND auth_user_is_admin()
  );
