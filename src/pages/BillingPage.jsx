import { useState } from 'react'
import Header from '../components/layout/Header.jsx'
import { useAuth, TRIAL_QUOTE_LIMIT } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const ENTERPRISE_EMAIL = 'info@catchquote.io'

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

export default function BillingPage({ onNavigate }) {
  const { workspace, isTrial } = useAuth()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState('')

  async function openPortal() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          workspace_id: workspace.id,
          return_url:   window.location.origin,
        },
      })
      if (error) throw new Error(error.message)
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned.')
      }
    } catch (err) {
      setPortalError(err.message || 'Failed to open billing portal.')
      setPortalLoading(false)
    }
  }

  const statusLabel = workspace?.subscription_status
    ? workspace.subscription_status.charAt(0).toUpperCase() + workspace.subscription_status.slice(1)
    : null

  const statusColor = {
    active:    'bg-green-50 text-green-700 ring-green-200',
    past_due:  'bg-red-50 text-red-700 ring-red-200',
    canceled:  'bg-gray-100 text-gray-500 ring-gray-200',
    trialing:  'bg-blue-50 text-blue-700 ring-blue-200',
  }[workspace?.subscription_status ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your plan and subscription.</p>
        </div>

        {/* Current plan */}
        <Section title="Current plan">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTrial ? 'bg-yellow-50' : 'bg-brand-50'}`}>
                {isTrial ? (
                  <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{isTrial ? 'Trial' : 'Pro'}</p>
                  {statusLabel && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${statusColor}`}>
                      {statusLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isTrial
                    ? `Up to ${TRIAL_QUOTE_LIMIT} quotes · single user · free`
                    : '$99 / month SGD · unlimited quotes · team access'}
                </p>
              </div>
            </div>

            {isTrial ? (
              <button
                onClick={() => onNavigate?.('pricing')}
                className="shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            ) : (
              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-400 mb-1">Next billing date</p>
                <p className="text-sm font-medium text-gray-700">Managed via Stripe</p>
              </div>
            )}
          </div>
        </Section>

        {/* Pro: Stripe Customer Portal */}
        {!isTrial && (
          <Section
            title="Manage subscription"
            description="Update payment method, download invoices, or cancel your subscription."
          >
            {portalError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{portalError}</p>
            )}

            {workspace?.stripe_customer_id ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-brand-300 hover:text-brand-600 text-gray-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  {portalLoading ? 'Opening…' : 'Manage billing on Stripe'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No Stripe customer linked yet. If you recently upgraded, it may take a moment.
                Contact <a href={`mailto:${ENTERPRISE_EMAIL}`} className="text-brand-600 hover:underline">{ENTERPRISE_EMAIL}</a> if this persists.
              </p>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                Billing is managed securely through Stripe. CatchQuote does not store your card details.
                Use the portal above to update your payment method, view invoices, or cancel your subscription.
                Cancellations take effect at the end of the current billing period.
              </p>
            </div>
          </Section>
        )}

        {/* Trial: what's included + upgrade */}
        {isTrial && (
          <Section title="Trial limits">
            <ul className="space-y-3 mb-5">
              {[
                [`${TRIAL_QUOTE_LIMIT} quotes maximum`, true],
                ['PDF export on all quotes', true],
                ['Full preset library', true],
                ['Single user — no team members', false],
                ['Unlimited quotes', false],
                ['Team access (up to 3 members)', false],
                ['Custom branding on PDFs', false],
              ].map(([label, included]) => (
                <li key={label} className="flex items-center gap-2.5 text-sm">
                  {included ? (
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={included ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => onNavigate?.('pricing')}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Upgrade to Pro — $99/month SGD
            </button>
          </Section>
        )}

        {/* Enterprise */}
        <Section title="Enterprise">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1">Need more for your firm?</p>
              <p className="text-sm text-gray-500 mb-3">
                Enterprise plans include unlimited team members, white-label PDF branding,
                dedicated support, and custom integrations. Pricing is tailored to your firm.
              </p>
              <a
                href={`mailto:${ENTERPRISE_EMAIL}?subject=CatchQuote%20Enterprise%20Enquiry`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-brand-600 transition-colors"
              >
                Contact {ENTERPRISE_EMAIL}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
