import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'
export const TRIAL_QUOTE_LIMIT = 3

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [workspace,         setWorkspace]         = useState(null)
  const [role,              setRole]              = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [workspaceError,    setWorkspaceError]    = useState(null)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null)

  const intentionalSignOut = useRef(false)
  const wasAuthenticated   = useRef(false)

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          wasAuthenticated.current = true
          setSessionExpiredMsg(null)
          // Only load membership on initial session or after sign-in.
          // TOKEN_REFRESHED fires on every background token rotation — calling
          // loadMembership there causes a spurious DB round-trip that can set
          // workspaceError and clear the workspace on tab return.
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            try {
              await loadMembership(u.id, u.email)
            } catch (err) {
              setWorkspaceError(err.message || 'Failed to load workspace.')
            } finally {
              setLoading(false)
            }
          } else {
            setLoading(false)
          }
        } else {
          if (wasAuthenticated.current && !intentionalSignOut.current) {
            setSessionExpiredMsg('Your session expired, please log in again')
          }
          wasAuthenticated.current   = false
          intentionalSignOut.current = false
          setWorkspace(null)
          setRole(null)
          setWorkspaceError(null)
          setLoading(false)
        }
      }
    )

    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return
      // Only detect true session loss — do NOT call refreshSession() here.
      // Supabase already auto-refreshes tokens internally. A manual refreshSession()
      // call races with the internal refresh and invalidates the single-use refresh
      // token, leaving the client unable to make any requests.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && wasAuthenticated.current) {
          setSessionExpiredMsg('Your session expired, please log in again')
          setUser(null)
          setWorkspace(null)
          setRole(null)
          setLoading(false)
        }
      } catch {
        // getSession failure is non-fatal; onAuthStateChange will handle token events
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
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
