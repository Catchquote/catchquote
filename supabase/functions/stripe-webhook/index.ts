import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const STRIPE_SECRET_KEY         = Deno.env.get('STRIPE_SECRET_KEY')
  const STRIPE_WEBHOOK_SECRET     = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] Missing Stripe env vars')
    return new Response('Server misconfiguration', { status: 500 })
  }

  // ── Verify webhook signature ───────────────────────────────────────────────
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature header', { status: 400 })

  const body = await req.text()
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[stripe-webhook] Event: ${event.type}`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const workspace_id = session.metadata?.workspace_id

    if (!workspace_id) {
      console.error('[stripe-webhook] No workspace_id in metadata')
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (session.payment_status !== 'paid') {
      console.log(`[stripe-webhook] Not paid yet, skipping`)
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase
      .from('workspaces')
      .update({
        account_type:           'pro',
        stripe_customer_id:     session.customer as string ?? null,
        stripe_subscription_id: session.subscription as string ?? null,
        subscription_status:    'active',
      })
      .eq('id', workspace_id)

    if (error) {
      console.error('[stripe-webhook] DB update failed:', error.message)
      return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500 })
    }
    console.log(`[stripe-webhook] Workspace ${workspace_id} upgraded to pro`)
  }

  // ── customer.subscription.updated / deleted ────────────────────────────────
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const status = sub.status // active, canceled, past_due, etc.

    const updates: Record<string, unknown> = { subscription_status: status }
    if (status === 'canceled' || status === 'unpaid') {
      updates.account_type = 'trial'
    }

    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('stripe_subscription_id', sub.id)

    if (error) {
      console.error('[stripe-webhook] Subscription update failed:', error.message)
      return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500 })
    }
    console.log(`[stripe-webhook] Subscription ${sub.id} status → ${status}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
