import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
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
  const { user, workspace, role, loading, workspaceError, workspaceReady, isSuperAdmin, signOut, retryWorkspace } = useAuth()
  const [page,          setPage]          = useState('dashboard')
  const [activeQuoteId, setActiveQuoteId] = useState(null)
  const [unauthPage,    setUnauthPage]    = useState('landing')

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

  // ── Auth loading (first page load only — never block on background token refresh) ─
  if (loading && !workspaceReady) return <Spinner />

  // ── Not authenticated ─────────────────────────────────────────────────────────
  if (!user) {
    if (unauthPage === 'login') {
      return <LoginPage onBack={() => setUnauthPage('landing')} />
    }
    return <LandingPage onSignIn={() => setUnauthPage('login')} />
  }

  // ── Super admin: bypass workspace requirement entirely ─────────────────────────
  if (isSuperAdmin) {
    if (page === 'pricing') return <PricingPage onNavigate={navigate} />
    return <SuperAdminPage onNavigate={navigate} />
  }

  // ── Workspace still loading after sign-in (first load only) ──────────────────
  if (!workspace && !workspaceError && !workspaceReady) return <Spinner />

  // ── Workspace error ───────────────────────────────────────────────────────────
  if (workspaceError || !workspace) {
    return (
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
  }

  // ── Deactivated account ───────────────────────────────────────────────────────
  if (workspace.is_active === false) {
    return (
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
  }

  // ── Authenticated pages ───────────────────────────────────────────────────────
  if (page === 'pricing') {
    return <PricingPage onNavigate={navigate} />
  }
  if (page === 'team' && role === 'admin') {
    return <TeamPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
  }
  if (page === 'presets' && role === 'admin') {
    return <PresetsPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
  }
  if (page === 'settings' && role === 'admin') {
    return <SettingsPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
  }
  if (page === 'quote') {
    return <QuotePage quoteId={activeQuoteId} onBack={() => navigate('dashboard')} onNavigate={navigate} />
  }

  return <Dashboard onOpenQuote={openQuote} onNavigate={navigate} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
