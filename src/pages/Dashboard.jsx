import { useEffect, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TRIAL_QUOTE_LIMIT } from '../context/AuthContext.jsx'

const STATUS_STYLES = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-600',
  declined: 'bg-red-50 text-red-500',
}

function fmt(n) {
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Draft'
}

export default function Dashboard({ onOpenQuote, onNavigate, upgraded = false, onDismissUpgraded }) {
  const { user, workspace, role, isTrial } = useAuth()
  const [quotes,      setQuotes]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadError('Loading timed out. Check your connection and try again.')
        setLoading(false)
      }
    }, 15000)

    async function loadQuotes() {
      try {
        // RLS handles role filtering: admin sees all workspace quotes,
        // sales_designer sees only quotes where created_by = auth.uid()
        const { data, error } = await supabase
          .from('quotes')
          .select('id, quote_number, project_name, client_name, created_at, total, status, created_by')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
        if (cancelled) return
        if (error) throw error
        setQuotes(data || [])
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load quotes.')
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }

    loadQuotes()
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [workspace.id, loadAttempt])

  const accepted = quotes.filter(q => q.status === 'accepted')
  const pending  = quotes.filter(q => q.status === 'sent')
  const revenue  = accepted.reduce((s, q) => s + (q.total || 0), 0)
  const trialRemaining = Math.max(0, TRIAL_QUOTE_LIMIT - quotes.length)
  const trialExhausted = isTrial && quotes.length >= TRIAL_QUOTE_LIMIT

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Upgrade success banner */}
        {upgraded && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Welcome to CatchQuote Pro!</p>
                <p className="text-xs text-green-600">You now have unlimited quotes and full team access.</p>
              </div>
            </div>
            <button onClick={onDismissUpgraded} className="text-green-400 hover:text-green-600 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Trial banner */}
        {isTrial && (
          <div className={`mb-6 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            trialExhausted
              ? 'bg-red-50 border border-red-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div>
              <p className={`text-sm font-semibold ${trialExhausted ? 'text-red-700' : 'text-yellow-800'}`}>
                {trialExhausted
                  ? 'Trial limit reached — upgrade to create more quotes'
                  : `Trial plan: ${quotes.length} of ${TRIAL_QUOTE_LIMIT} quotes used`}
              </p>
              <p className={`text-xs mt-0.5 ${trialExhausted ? 'text-red-500' : 'text-yellow-600'}`}>
                {trialExhausted
                  ? 'You have used all your trial quotes.'
                  : `${trialRemaining} quote${trialRemaining !== 1 ? 's' : ''} remaining on your free trial.`}
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('pricing')}
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                trialExhausted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-700 to-brand-500 rounded-2xl p-8 mb-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {role === 'admin' ? workspace.name : 'My Quotes'}
              </h1>
              <p className="text-brand-100 text-sm">Create professional renovation quotes in minutes.</p>
            </div>
            <button
              onClick={() => !trialExhausted && onOpenQuote(null)}
              disabled={trialExhausted}
              title={trialExhausted ? 'Upgrade to Pro to create more quotes' : undefined}
              className="shrink-0 flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Quote
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: role === 'admin' ? 'Total Quotes' : 'My Quotes', value: quotes.length,   sub: 'all time' },
            { label: 'Accepted',  value: accepted.length, sub: 'this month' },
            { label: 'Pending',   value: pending.length,  sub: 'awaiting response' },
            { label: 'Revenue',   value: fmt(revenue),    sub: 'accepted value' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quotes table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">
              {role === 'admin' ? 'All Quotes' : 'My Quotes'}
            </h2>
            {!trialExhausted && (
              <button
                onClick={() => onOpenQuote(null)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                + New Quote
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">Loading quotes…</div>
          ) : loadError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-500 mb-3">{loadError}</p>
              <button
                onClick={() => setLoadAttempt(n => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400 mb-3">No quotes yet</p>
              <button
                onClick={() => onOpenQuote(null)}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Create your first quote →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-semibold">Quote #</th>
                    <th className="text-left px-4 py-3 font-semibold">Project</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Client</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quotes.map(q => (
                    <tr
                      key={q.id}
                      onClick={() => onOpenQuote(q.id)}
                      className="hover:bg-gray-50 active:bg-brand-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4 font-mono text-xs text-gray-500">{q.quote_number}</td>
                      <td className="px-4 py-4 font-medium text-gray-800">
                        {q.project_name || '—'}
                        {role === 'admin' && q.created_by !== user.id && (
                          <span className="ml-1.5 text-xs text-gray-400">(team)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-500 hidden sm:table-cell">{q.client_name || '—'}</td>
                      <td className="px-4 py-4 text-gray-400 hidden md:table-cell">{q.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">{fmt(q.total || 0)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[q.status] || STATUS_STYLES.draft}`}>
                          {capitalize(q.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upgrade CTA — only for trial users */}
        {isTrial && (
          <div className="mt-6 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div>
              <p className="font-semibold">Unlock unlimited quotes with CatchQuote Pro</p>
              <p className="text-gray-400 text-xs mt-0.5">Unlimited quotes, team members, and priority support.</p>
            </div>
            <button
              onClick={() => onNavigate?.('pricing')}
              className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              View Pricing
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
