import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'
export const TRIAL_QUOTE_LIMIT = 3

const KEEPALIVE_INTERVAL_MS       = 4 * 60 * 1000
const PROACTIVE_REFRESH_BUFFER_MS = 60 * 1000

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [workspace,         setWorkspace]         = useState(null)
  const [role,              setRole]              = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [workspaceError,    setWorkspaceError]    = useState(null)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null)

  const intentionalSignOut = useRef(false)
  const wasAuthenticated   = useRef(false)
  const refreshTimerRef    = useRef(null)
  const keepaliveRef       = useRef(null)

  async function loadMembership(userId, userEmail) {
    if (userEmail === SUPER_ADMIN_EMAIL) {
      setWorkspace(null)
      setRole(null)
      setWorkspaceError(null)
      return
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, owner_id, account_type, is_active)')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    setWorkspace(data.workspaces)
    setRole(data.role)
    setWorkspaceError(null)
  }

  async function retryWorkspace() {
    if (!user) return
    setWorkspace(null)
    setRole(null)
    setWorkspaceError(null)
    try {
      await loadMembership(user.id, user.email)
    } catch (err) {
      setWorkspaceError(err.message || 'Failed to load workspace.')
    }
  }

  function scheduleProactiveRefresh(session) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    if (!session?.expires_at) return
    const msUntilExpiry = session.expires_at * 1000 - Date.now()
    const refreshIn     = Math.max(msUntilExpiry - PROACTIVE_REFRESH_BUFFER_MS, 0)
    refreshTimerRef.current = setTimeout(async () => {
      const { error } = await supabase.auth.refreshSession()
      if (error) console.warn('Proactive token refresh failed:', error.message)
    }, refreshIn)
  }

  function startKeepalive() {
    if (keepaliveRef.current) return
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          wasAuthenticated.current = true
          scheduleProactiveRefresh(session)
          startKeepalive()
          setSessionExpiredMsg(null)
          try {
            await loadMembership(u.id, u.email)
          } catch (err) {
            setWorkspaceError(err.message || 'Failed to load workspace.')
          } finally {
            setLoading(false)
          }
        } else {
          if (wasAuthenticated.current && !intentionalSignOut.current) {
            setSessionExpiredMsg('Your session expired, please log in again')
          }
          wasAuthenticated.current   = false
          intentionalSignOut.current = false
          clearTimeout(refreshTimerRef.current)
          stopKeepalive()
          setWorkspace(null)
          setRole(null)
          setWorkspaceError(null)
          setLoading(false)
        }
      }
    )

    return () => {
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
