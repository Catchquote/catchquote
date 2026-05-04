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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
  const STRIPE_SECRET_KEY         = Deno.env.get('STRIPE_SECRET_KEY')

  if (!STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500)

  // ── Verify caller is authenticated ─────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { workspace_id?: string; price_id?: string; success_url?: string; cancel_url?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { workspace_id, price_id, success_url, cancel_url } = body
  if (!workspace_id || !price_id) return json({ error: 'workspace_id and price_id are required' }, 400)

  // ── Verify caller owns the workspace ───────────────────────────────────────
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspace_id)
    .eq('owner_id', user.id)
    .single()

  if (wsErr || !workspace) return json({ error: 'Workspace not found or not authorized' }, 403)

  // ── Create Stripe Checkout session ─────────────────────────────────────────
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

  const origin = req.headers.get('origin') ?? ''
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    currency: 'sgd',
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: success_url ?? `${origin}/?upgraded=true`,
    cancel_url:  cancel_url  ?? `${origin}/`,
    customer_email: user.email,
    metadata: { workspace_id },
  })

  return json({ url: session.url })
})
