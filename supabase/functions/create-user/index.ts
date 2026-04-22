import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'

// Supabase's standard CORS header set — must be on EVERY response, including errors.
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
  console.log(`[create-user] ${req.method} ${req.url}`)

  // Supabase-standard preflight response: 200 with 'ok' body (not 204/null).
  if (req.method === 'OPTIONS') {
    console.log('[create-user] CORS preflight — returning 200 ok')
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── 1. Read env vars inside the handler so any missing var is logged clearly ─
  const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  console.log('[create-user] env check:', {
    hasUrl:            !!SUPABASE_URL,
    hasAnonKey:        !!SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[create-user] FATAL: missing Supabase env vars')
    return json({ error: 'Server misconfiguration: missing env vars' }, 500)
  }

  // ── 2. Verify the caller is the super admin via their JWT ───────────────────
  const authHeader = req.headers.get('Authorization')
  console.log('[create-user] Authorization header present:', !!authHeader)
  console.log('[create-user] Authorization header prefix:', authHeader?.slice(0, 15))

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing or malformed Authorization header' }, 401)
  }

  // Strip "Bearer " prefix to get the raw JWT.
  // IMPORTANT: getUser() must receive the token explicitly — in a server context
  // with persistSession:false there is no local session cache to fall back on.
  const jwt = authHeader.slice(7)
  console.log('[create-user] JWT length:', jwt.length)

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  console.log('[create-user] calling getUser(jwt) to verify JWT against auth server...')
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(jwt)

  if (callerErr) {
    console.error('[create-user] getUser error:', callerErr.message)
    return json({ error: `Token verification failed: ${callerErr.message}` }, 401)
  }
  if (!caller) {
    console.error('[create-user] getUser returned null user')
    return json({ error: 'Invalid token: no user found' }, 401)
  }

  console.log('[create-user] caller email:', caller.email)

  if (caller.email !== SUPER_ADMIN_EMAIL) {
    console.error('[create-user] Forbidden: caller is not super admin')
    return json({ error: 'Forbidden: super admin only' }, 403)
  }

  // ── 3. Parse and validate the request body ──────────────────────────────────
  let body: { name?: string; email?: string; password?: string; company_name?: string }
  try {
    body = await req.json()
    console.log('[create-user] request body:', {
      name: body.name,
      email: body.email,
      company_name: body.company_name,
      passwordLength: body.password?.length,
    })
  } catch (parseErr) {
    console.error('[create-user] JSON parse error:', parseErr)
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { name = '', email = '', password = '', company_name = '' } = body

  if (!email.trim()) {
    console.error('[create-user] missing email')
    return json({ error: 'email is required' }, 400)
  }
  if (!password || password.length < 8) {
    console.error('[create-user] password too short:', password?.length)
    return json({ error: 'password must be at least 8 characters' }, 400)
  }

  // ── 4. Create the auth user using the service role key ──────────────────────
  // The handle_new_user trigger (migration 005) automatically creates the
  // workspace + workspace_member row when the auth.users INSERT fires.
  console.log('[create-user] creating auth user:', email.toLowerCase().trim())

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error: createErr } = await adminClient.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
    user_metadata: {
      company_name: company_name.trim() || name.trim(),
    },
  })

  if (createErr) {
    console.error('[create-user] createUser error:', createErr.message, createErr)
    return json({ error: createErr.message }, 400)
  }

  console.log('[create-user] SUCCESS — created user:', data.user.id, data.user.email)
  return json({ user: { id: data.user.id, email: data.user.email } }, 200)
})
