import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export const SUPER_ADMIN_EMAIL = 'thedeepestwithin@gmail.com'
export const TRIAL_QUOTE_LIMIT = 3

const RETRY_DELAYS_MS = [800, 1600, 3000]
const HARD_TIMEOUT_MS = 10000

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null)
  const [workspace,      setWorkspace]      = useState(null)
  const [role,           setRole]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [workspaceError, setWorkspaceError] = useState(null)

  const activeUserId = useRef(null)

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

  useEffect(() => {
    let mounted = true

    // resolved guards setLoading(false) so it fires exactly once,
    // regardless of how many auth events fire.
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

        try {
          if (u) {
            await loadMembership(u.id, u.email)
          } else {
            activeUserId.current = null
            setWorkspace(null)
            setRole(null)
            setWorkspaceError(null)
          }
        } catch (err) {
          console.error('Auth state change error:', err)
          if (mounted) {
            setWorkspaceError('An unexpected error occurred. Please refresh.')
          }
        } finally {
          resolveLoading()
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    activeUserId.current = null
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
      signIn, signOut, retryWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
