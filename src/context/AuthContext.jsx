import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

// How long to wait between retries when workspace isn't found yet
const RETRY_DELAYS_MS = [800, 1600, 3000]
// Absolute max time before we give up and show an error
const LOAD_TIMEOUT_MS = 12000

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null)
  const [workspace, setWorkspace]           = useState(null)
  const [role, setRole]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [workspaceError, setWorkspaceError] = useState(null) // null | string

  // Lets us abort stale loadMembership calls when the user changes
  const activeUserId = useRef(null)

  async function loadMembership(userId) {
    activeUserId.current = userId
    setWorkspaceError(null)

    // Try immediately, then retry with backoff.
    // The DB trigger that creates the workspace is synchronous, but on brand-new
    // accounts there can be a brief propagation delay before RLS lets the query land.
    const attempts = [0, ...RETRY_DELAYS_MS]

    for (let i = 0; i < attempts.length; i++) {
      if (activeUserId.current !== userId) return // user changed, abort

      if (attempts[i] > 0) await sleep(attempts[i])

      if (activeUserId.current !== userId) return

      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspaces(id, name, owner_id)')
        .eq('user_id', userId)
        .maybeSingle()

      if (activeUserId.current !== userId) return

      if (error) {
        // Real DB/RLS/network error — stop retrying, surface it
        setWorkspaceError(
          `Could not load workspace: ${error.message}. ` +
          'Make sure you have run the Supabase migrations (001_initial.sql and 002_workspace_roles.sql).'
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

      // data === null — workspace not provisioned yet, keep retrying
    }

    // All retries exhausted and still no workspace
    if (activeUserId.current === userId) {
      setWorkspaceError(
        'Your account was created but your workspace was not set up. ' +
        'This usually means the Supabase trigger failed. ' +
        'Check that migration 002_workspace_roles.sql was run in the Supabase dashboard.'
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
    await loadMembership(user.id)
  }

  useEffect(() => {
    let mounted = true

    // Absolute timeout — if something hangs we still escape the loading screen
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
        setWorkspaceError(
          'Loading timed out. Check your internet connection and try refreshing.'
        )
      }
    }, LOAD_TIMEOUT_MS)

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return

        if (error) {
          console.error('getSession error:', error)
          return
        }

        const u = data.session?.user ?? null
        setUser(u)
        if (u) await loadMembership(u.id)
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) {
          clearTimeout(timeout)
          setLoading(false)
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          await loadMembership(u.id)
        } else {
          activeUserId.current = null
          setWorkspace(null)
          setRole(null)
          setWorkspaceError(null)
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

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }

  async function signOut() {
    activeUserId.current = null
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, workspace, role,
      loading, workspaceError,
      signIn, signUp, signOut, retryWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
