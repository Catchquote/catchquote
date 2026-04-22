import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import QuotePage from './pages/QuotePage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import PresetsPage from './pages/PresetsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'

function AppContent() {
  const { user, workspace, role, loading, workspaceError, signOut, retryWorkspace } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [activeQuoteId, setActiveQuoteId] = useState(null)
  const [authView, setAuthView] = useState('login')

  function navigate(pg) {
    if ((pg === 'team' || pg === 'presets') && role !== 'admin') return
    setPage(pg)
    if (pg !== 'quote') setActiveQuoteId(null)
  }

  function openQuote(id) {
    setActiveQuoteId(id)
    setPage('quote')
  }

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-6 h-6 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Auth walls ───────────────────────────────────────────────────────────────
  if (!user) {
    if (authView === 'signup') {
      return <SignupPage onSwitchToLogin={() => setAuthView('login')} />
    }
    return <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
  }

  // ── Workspace error / provisioning failure ───────────────────────────────────
  if (workspaceError || !workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <p className="font-semibold text-gray-900 text-lg mb-2">Workspace setup failed</p>

          {workspaceError ? (
            <p className="text-sm text-gray-500 mb-2">{workspaceError}</p>
          ) : (
            <p className="text-sm text-gray-500 mb-2">
              Your account was created but the workspace wasn't provisioned. This usually means the Supabase migration hasn't been run yet.
            </p>
          )}

          <div className="bg-gray-100 rounded-lg px-4 py-3 text-left mb-6 text-xs text-gray-600 leading-relaxed">
            <p className="font-semibold mb-1">Quick fix:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your Supabase dashboard → SQL Editor</li>
              <li>Run <code className="bg-white px-1 rounded">002_workspace_roles.sql</code></li>
              <li>Then manually run the backfill from the comments at the top of that file for your existing account</li>
              <li>Click "Try again" below</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={retryWorkspace}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Try again
            </button>
            <button
              onClick={signOut}
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated pages ──────────────────────────────────────────────────────
  if (page === 'team' && role === 'admin') {
    return <TeamPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
  }

  if (page === 'presets' && role === 'admin') {
    return <PresetsPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
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
