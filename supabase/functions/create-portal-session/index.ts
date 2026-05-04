import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')

  if (!STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500)

  // ── Verify caller ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { workspace_id?: string; return_url?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { workspace_id, return_url } = body
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400)

  // ── Fetch workspace (verify ownership + get stripe_customer_id) ────────────
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, stripe_customer_id')
    .eq('id', workspace_id)
    .eq('owner_id', user.id)
    .single()

  if (wsErr || !workspace) return json({ error: 'Workspace not found or not authorized' }, 403)

  if (!workspace.stripe_customer_id) {
    return json({ error: 'No Stripe customer found for this workspace. Please contact support.' }, 404)
  }

  // ── Create Customer Portal session ─────────────────────────────────────────
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  const origin = req.headers.get('origin') ?? ''

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   workspace.stripe_customer_id,
    return_url: return_url ?? `${origin}/`,
  })

  return json({ url: portalSession.url })
})
