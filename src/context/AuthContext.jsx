import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'
export const TRIAL_QUOTE_LIMIT = 3

const RETRY_DELAYS_MS             = [800, 1600, 3000]
const HARD_TIMEOUT_MS             = 10000
const KEEPALIVE_INTERVAL_MS       = 4 * 60 * 1000  // 4 minutes — prevents Supabase free tier sleep
const PROACTIVE_REFRESH_BUFFER_MS = 60 * 1000       // refresh 60s before token expiry
const VISIBILITY_THRESHOLD_MS     = 30 * 1000       // only recover after 30s away

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [workspace,         setWorkspace]         = useState(null)
  const [role,              setRole]              = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [workspaceError,    setWorkspaceError]    = useState(null)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null)
  const [reconnecting,      setReconnecting]      = useState(false)
  const [connectionError,   setConnectionError]   = useState(false)

  const activeUserId       = useRef(null)
  const intentionalSignOut = useRef(false)  // true only when signOut() is called deliberately
  const wasAuthenticated   = useRef(false)  // tracks whether a session was active
  const refreshTimerRef    = useRef(null)
  const keepaliveRef       = useRef(null)
  const hiddenAtRef        = useRef(null)
  const reconnectTimerRef  = useRef(null)

  // Loads workspace membership for a regular (non-super-admin) user.
  // Super admin bypasses this entirely — they have no workspace_members row.
  async function loadMembership(userId, userEmail) {
    if (userEmail === SUPER_ADMIN_EMAIL) {
      setWorkspace(null)
      setRole(null)
      setWorkspaceError(null)
      return
    }

    activeUserId.current = userId
    setWorkspaceError(null)

    const attempts = [0, ...RETRY_DELAYS_MS]

    for (let i = 0; i < attempts.length; i++) {
      if (activeUserId.current !== userId) return
      if (attempts[i] > 0) await sleep(attempts[i])
      if (activeUserId.current !== userId) return

      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspaces(id, name, owner_id, account_type, is_active)')
        .eq('user_id', userId)
        .maybeSingle()

      if (activeUserId.current !== userId) return

      if (error) {
        setWorkspaceError(
          `Could not load workspace: ${error.message}. ` +
          'Make sure migrations 001–005 have been run in Supabase.'
        )
        setWorkspace(null)
        setRole(null)
        return
      }

      if (data) {
        setRole(data.role)
        setWorkspace(data.workspaces)
        setWorkspaceError(null)
        return
      }
      // data is null — no membership row yet, retry
    }

    // All retries exhausted
    if (activeUserId.current === userId) {
      setWorkspaceError(
        'Workspace not found. Check that migrations 001–005 were run in Supabase.'
      )
      setWorkspace(null)
      setRole(null)
    }
  }

  // Single-attempt membership re-fetch used after returning to the tab.
  // Does not touch the loading spinner or workspaceError — throws on failure
  // so the caller can decide whether to show the connection banner.
  async function silentReloadMembership(userId, userEmail) {
    if (userEmail === SUPER_ADMIN_EMAIL) return
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, owner_id, account_type, is_active)')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (data) {
      setRole(data.role)
      setWorkspace(data.workspaces)
      setWorkspaceError(null)
    }
  }

  async function retryWorkspace() {
    if (!user) return
    setWorkspace(null)
    setRole(null)
    setWorkspaceError(null)
    await loadMembership(user.id, user.email)
  }

  async function retryConnection() {
    if (!user) return
    setConnectionError(false)
    setReconnecting(true)
    clearTimeout(reconnectTimerRef.current)
    try {
      await silentReloadMembership(user.id, user.email)
    } catch {
      setConnectionError(true)
    } finally {
      reconnectTimerRef.current = setTimeout(() => setReconnecting(false), 500)
    }
  }

  // Schedules a proactive token refresh 60s before the session expires.
  // Supabase already auto-refreshes, but this is belt-and-suspenders.
  function scheduleProactiveRefresh(session) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    if (!session?.expires_at) return

    const msUntilExpiry = session.expires_at * 1000 - Date.now()
    const refreshIn     = Math.max(msUntilExpiry - PROACTIVE_REFRESH_BUFFER_MS, 0)

    refreshTimerRef.current = setTimeout(async () => {
      const { error } = await supabase.auth.refreshSession()
      if (error) console.warn('Proactive token refresh failed:', error.message)
      // supabase fires SIGNED_OUT on unrecoverable failure, which we handle below
    }, refreshIn)
  }

  // Lightweight ping to prevent Supabase free tier from sleeping.
  function startKeepalive() {
    if (keepaliveRef.current) return  // already running — don't reset the interval
    keepaliveRef.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('workspace_settings').select('id').limit(1)
    }, KEEPALIVE_INTERVAL_MS)
  }

  function stopKeepalive() {
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current)
      keepaliveRef.current = null
    }
  }

  // Auth state — single source of truth.
  useEffect(() => {
    let mounted = true

    // resolveLoading fires exactly once regardless of how many auth events arrive
    let resolved = false
    function resolveLoading() {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      if (mounted) setLoading(false)
    }

    // Hard 10-second timeout — always breaks out of loading
    const timeout = setTimeout(() => {
      if (mounted && !resolved) {
        resolved = true
        setLoading(false)
        setWorkspaceError('Loading timed out. Check your internet connection and refresh the page.')
      }
    }, HARD_TIMEOUT_MS)

    // Single source of truth: onAuthStateChange fires INITIAL_SESSION immediately
    // in supabase-js v2, so we don't need a separate init() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        const u = session?.user ?? null
        setUser(u)

        if (u) {
          wasAuthenticated.current = true
          scheduleProactiveRefresh(session)
          startKeepalive()
          setSessionExpiredMsg(null)
        } else {
          // Distinguish an unexpected sign-out (token expiry) from a deliberate one
          if (wasAuthenticated.current && !intentionalSignOut.current) {
            setSessionExpiredMsg('Your session expired, please log in again')
          }
          wasAuthenticated.current   = false
          intentionalSignOut.current = false
          clearTimeout(refreshTimerRef.current)
          stopKeepalive()
          activeUserId.current = null
          setWorkspace(null)
          setRole(null)
          setWorkspaceError(null)
        }

        try {
          if (u) await loadMembership(u.id, u.email)
        } catch (err) {
          console.error('Auth state change error:', err)
          if (mounted) setWorkspaceError('An unexpected error occurred. Please refresh.')
        } finally {
          resolveLoading()
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      clearTimeout(refreshTimerRef.current)
      clearTimeout(reconnectTimerRef.current)
      stopKeepalive()
      subscription.unsubscribe()
    }
  }, [])

  // Visibility-change recovery — when user returns after 30+ seconds away,
  // silently refresh the session and re-fetch workspace membership.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }

      const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
      hiddenAtRef.current = null
      if (hiddenMs < VISIBILITY_THRESHOLD_MS) return

      // Show "Reconnecting…" pill for 1 second
      setConnectionError(false)
      setReconnecting(true)
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => setReconnecting(false), 1000)

      ;(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession()
          if (error || !session) {
            // Session unrecoverable — onAuthStateChange will fire SIGNED_OUT
            // which clears state and shows the login screen automatically.
            return
          }
          await silentReloadMembership(session.user.id, session.user.email)
        } catch {
          setConnectionError(true)
        }
      })()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(reconnectTimerRef.current)
    }
  }, [])

  async function signIn(email, password) {
    setSessionExpiredMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    intentionalSignOut.current = true
    activeUserId.current = null
    setWorkspace(null)
    setRole(null)
    setWorkspaceError(null)
    clearTimeout(refreshTimerRef.current)
    stopKeepalive()
    await supabase.auth.signOut()
  }

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL
  const isTrial      = workspace?.account_type !== 'pro'

  return (
    <AuthContext.Provider value={{
      user, workspace, role,
      loading, workspaceError,
      isSuperAdmin, isTrial,
      sessionExpiredMsg,
      signIn, signOut, retryWorkspace,
    }}>
      {children}

      {reconnecting && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none select-none">
          <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Reconnecting…
        </div>
      )}

      {connectionError && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium px-4 py-3 shadow-md">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Connection lost —
          <button
            onClick={retryConnection}
            className="underline underline-offset-2 hover:no-underline font-semibold"
          >
            click to retry
          </button>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
