import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'
export const TRIAL_QUOTE_LIMIT = 3

const RETRY_DELAYS_MS             = [800, 1600, 3000]
const HARD_TIMEOUT_MS             = 10000
const KEEPALIVE_INTERVAL_MS       = 4 * 60 * 1000  // 4 minutes — prevents Supabase free tier sleep
const PROACTIVE_REFRESH_BUFFER_MS = 60 * 1000       // refresh 60s before token expiry

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [workspace,         setWorkspace]         = useState(null)
  const [role,              setRole]              = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [workspaceError,    setWorkspaceError]    = useState(null)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null)

  const activeUserId       = useRef(null)
  const intentionalSignOut = useRef(false)  // true only when signOut() is called deliberately
  const wasAuthenticated   = useRef(false)  // tracks whether a session was active
  const refreshTimerRef    = useRef(null)
  const keepaliveRef       = useRef(null)

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

  async function retryWorkspace() {
    if (!user) return
    setWorkspace(null)
    setRole(null)
    setWorkspaceError(null)
    await loadMembership(user.id, user.email)
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
      stopKeepalive()
      subscription.unsubscribe()
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
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
