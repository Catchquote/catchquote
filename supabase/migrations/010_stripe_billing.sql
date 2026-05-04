-- ============================================================
-- CatchQuote — Stripe billing columns on workspaces
-- ============================================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status    text;

CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer
  ON workspaces (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
