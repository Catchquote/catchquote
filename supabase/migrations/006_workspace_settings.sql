-- ============================================================
-- CatchQuote — Workspace settings (branding + quote footer)
-- Run in Supabase dashboard: SQL Editor > New query
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_settings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Company branding
  company_name         text,
  company_logo_url     text,
  brand_colour         text DEFAULT '#ea580c',
  tagline              text,
  company_address      text,
  company_phone        text,
  company_email        text,
  company_registration text,

  -- Quote footer
  terms_and_conditions text,
  footer_message       text DEFAULT 'Thank you for your business.',

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- Members of the workspace can read settings
DROP POLICY IF EXISTS "ws_settings_select" ON workspace_settings;
CREATE POLICY "ws_settings_select" ON workspace_settings
  FOR SELECT USING (workspace_id = auth_user_workspace_id());

-- Only admins can insert / update
DROP POLICY IF EXISTS "ws_settings_insert" ON workspace_settings;
CREATE POLICY "ws_settings_insert" ON workspace_settings
  FOR INSERT WITH CHECK (
    workspace_id = auth_user_workspace_id() AND auth_user_is_admin()
  );

DROP POLICY IF EXISTS "ws_settings_update" ON workspace_settings;
CREATE POLICY "ws_settings_update" ON workspace_settings
  FOR UPDATE USING (
    workspace_id = auth_user_workspace_id() AND auth_user_is_admin()
  );

-- Super admin can read all
DROP POLICY IF EXISTS "sa_ws_settings_select" ON workspace_settings;
CREATE POLICY "sa_ws_settings_select" ON workspace_settings
  FOR SELECT USING (auth_user_is_super_admin());

-- ── Storage bucket for logos ─────────────────────────────────────────────────
-- Creates a public bucket called "workspace-logos".
-- Files are stored at: workspace-logos/{workspace_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  2097152,                              -- 2 MB limit
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Workspace admins can upload to their own folder
DROP POLICY IF EXISTS "logo_upload" ON storage.objects;
CREATE POLICY "logo_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workspace-logos'
    AND auth_user_is_admin()
    AND (storage.foldername(name))[1] = auth_user_workspace_id()::text
  );

-- Anyone can read (bucket is public, but belt-and-suspenders)
DROP POLICY IF EXISTS "logo_read" ON storage.objects;
CREATE POLICY "logo_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'workspace-logos');

-- Admins can delete their own logos
DROP POLICY IF EXISTS "logo_delete" ON storage.objects;
CREATE POLICY "logo_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'workspace-logos'
    AND auth_user_is_admin()
    AND (storage.foldername(name))[1] = auth_user_workspace_id()::text
  );
