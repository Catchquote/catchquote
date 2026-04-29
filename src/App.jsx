import { useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { supabase } from './lib/supabase.js'
import Dashboard from './pages/Dashboard.jsx'
import QuotePage from './pages/QuotePage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import PresetsPage from './pages/PresetsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import SuperAdminPage from './pages/SuperAdminPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

const Spinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <svg className="animate-spin w-6 h-6 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  </div>
)

function AppContent() {
  const { user, workspace, role, loading, workspaceError, isSuperAdmin, signOut, retryWorkspace } = useAuth()
  const [page,          setPage]          = useState('dashboard')
  const [activeQuoteId, setActiveQuoteId] = useState(null)
  const [unauthPage,    setUnauthPage]    = useState('landing')
  const [reconnecting,  setReconnecting]  = useState(false)
  const [pageKey,       setPageKey]       = useState(0)

  const hiddenAtRef    = useRef(null)
  const reconnectTimer = useRef(null)

  // Auto-recovery on visibility change: refresh session, and if the tab was
  // hidden for >10 seconds force a page remount to clear any stuck loading state.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }

      // Page is visible again — always refresh the auth session silently.
      supabase.auth.refreshSession().catch(() => {})

      const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
      hiddenAtRef.current = null

      if (hiddenMs > 10000) {
        // Force all page components to remount, clearing any stuck loading state.
        setPageKey(k => k + 1)
        clearTimeout(reconnectTimer.current)
        setReconnecting(true)
        reconnectTimer.current = setTimeout(() => setReconnecting(false), 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(reconnectTimer.current)
    }
  }, [])

  function navigate(pg) {
    if ((pg === 'team' || pg === 'presets' || pg === 'settings') && role !== 'admin') return
    if (pg === 'superadmin' && !isSuperAdmin) return
    setPage(pg)
    if (pg !== 'quote') setActiveQuoteId(null)
  }

  function openQuote(id) {
    setActiveQuoteId(id)
    setPage('quote')
  }

  // Build page content into a variable so the reconnecting toast can be
  // appended in a single return, regardless of which branch is active.
  let content

  // ── Auth loading ──────────────────────────────────────────────────────────────
  if (loading) {
    content = <Spinner />

  // ── Not authenticated ─────────────────────────────────────────────────────────
  } else if (!user) {
    content = unauthPage === 'login'
      ? <LoginPage onBack={() => setUnauthPage('landing')} />
      : <LandingPage onSignIn={() => setUnauthPage('login')} />

  // ── Super admin: bypass workspace requirement entirely ─────────────────────────
  } else if (isSuperAdmin) {
    content = page === 'pricing'
      ? <PricingPage key={pageKey} onNavigate={navigate} />
      : <SuperAdminPage key={pageKey} onNavigate={navigate} />

  // ── Workspace still loading after sign-in (brief async gap) ──────────────────
  } else if (!workspace && !workspaceError) {
    content = <Spinner />

  // ── Workspace error ───────────────────────────────────────────────────────────
  } else if (workspaceError || !workspace) {
    content = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 text-lg mb-2">Workspace setup failed</p>
          <p className="text-sm text-gray-500 mb-5">{workspaceError || 'Workspace not found.'}</p>
          <div className="bg-gray-100 rounded-lg px-4 py-3 text-left mb-6 text-xs text-gray-600 leading-relaxed">
            <p className="font-semibold mb-1">Quick fix:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Supabase dashboard → SQL Editor</li>
              <li>Run migrations 001 through 005 in order</li>
              <li>Click "Try again" below</li>
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={retryWorkspace} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg">Try again</button>
            <button onClick={signOut} className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-200">Sign out</button>
          </div>
        </div>
      </div>
    )

  // ── Deactivated account ───────────────────────────────────────────────────────
  } else if (workspace.is_active === false) {
    content = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="font-bold text-gray-900 text-xl mb-2">Account deactivated</p>
          <p className="text-sm text-gray-500 mb-6">
            Your CatchQuote account has been deactivated. Please contact{' '}
            <a href="mailto:thedeepestwithin@gmail.com" className="text-brand-600 hover:underline">thedeepestwithin@gmail.com</a>
            {' '}to reactivate.
          </p>
          <button onClick={signOut} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50">
            Sign Out
          </button>
        </div>
      </div>
    )

  // ── Authenticated pages ───────────────────────────────────────────────────────
  } else if (page === 'pricing') {
    content = <PricingPage key={pageKey} onNavigate={navigate} />
  } else if (page === 'team' && role === 'admin') {
    content = <TeamPage key={pageKey} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  } else if (page === 'presets' && role === 'admin') {
    content = <PresetsPage key={pageKey} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  } else if (page === 'settings' && role === 'admin') {
    content = <SettingsPage key={pageKey} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  } else if (page === 'quote') {
    content = <QuotePage key={`quote-${activeQuoteId}-${pageKey}`} quoteId={activeQuoteId} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  } else {
    content = <Dashboard key={pageKey} onOpenQuote={openQuote} onNavigate={navigate} />
  }

  return (
    <>
      {content}

      {/* Auto-recovery toast — shown for 1 second after returning from a long absence */}
      {reconnecting && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none select-none">
          <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Reconnecting…
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
