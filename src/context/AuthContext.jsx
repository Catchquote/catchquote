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
  // True once workspace has been successfully loaded at least once this session.
  // Prevents background token refreshes from re-triggering full-page spinners.
  const [workspaceReady,    setWorkspaceReady]    = useState(false)

  const intentionalSignOut = useRef(false)
  const wasAuthenticated   = useRef(false)
  // Tracks current workspace ID so we can:
  //   (a) skip redundant setWorkspace calls when the workspace hasn't changed
  //   (b) detect whether a concurrent loadMembership already succeeded (null = not loaded)
  const workspaceIdRef     = useRef(null)

  async function loadMembership(userId, userEmail) {
    if (userEmail === SUPER_ADMIN_EMAIL) {
      workspaceIdRef.current = null
      setWorkspace(null)
      setRole(null)
      setWorkspaceError(null)
      setWorkspaceReady(true)
      return
    }

    // Race the DB query against a 10-second timeout.
    // Without this, a hanging query pins the app on the spinner indefinitely.
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Connection timed out. Check your connection and try again.')),
        10000
      )
    })

    try {
      const { data, error } = await Promise.race([
        supabase
          .from('workspace_members')
          .select('role, workspaces(id, name, owner_id, account_type, is_active)')
          .eq('user_id', userId)
          .single(),
        timeoutPromise,
      ])

      if (error) throw error

      // Only update the workspace object when the ID actually changes.
      // This prevents downstream page useEffects from re-running (and re-fetching
      // their data) just because a token refresh created a new object reference.
      if (workspaceIdRef.current !== data.workspaces?.id) {
        workspaceIdRef.current = data.workspaces?.id ?? null
        setWorkspace(data.workspaces)
      }
      setRole(data.role)
      setWorkspaceError(null)
      setWorkspaceReady(true)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async function retryWorkspace() {
    if (!user) return
    workspaceIdRef.current = null
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

          // Load the workspace when:
          //   INITIAL_SESSION / SIGNED_IN  — always (first load or fresh sign-in)
          //   TOKEN_REFRESHED              — only if workspace isn't loaded yet
          //
          // The TOKEN_REFRESHED branch handles the new-tab + expired-token case:
          //   INITIAL_SESSION fires → loadMembership fails with 401 (expired JWT)
          //   → workspaceIdRef stays null → TOKEN_REFRESHED fires after supabase
          //   refreshes internally → we retry with the fresh token and succeed.
          //
          // When the workspace IS already loaded (workspaceIdRef is non-null),
          // TOKEN_REFRESHED skips loadMembership entirely, eliminating spurious
          // DB round-trips and the workspace-flicker bug on tab return.
          const needsWorkspace =
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN'       ||
            (event === 'TOKEN_REFRESHED' && workspaceIdRef.current === null)

          if (needsWorkspace) {
            // Clear any previous error so the app shows a spinner during the
            // retry instead of keeping a stale "Workspace setup failed" screen.
            setWorkspaceError(null)
            try {
              await loadMembership(u.id, u.email)
            } catch (err) {
              // Guard against the concurrent-handler race:
              //   INITIAL_SESSION and TOKEN_REFRESHED can both be in-flight at
              //   the same time (async handler yields at each await).  If
              //   TOKEN_REFRESHED's loadMembership succeeded first, workspaceIdRef
              //   is now non-null — don't overwrite a successful load with this
              //   stale failure.
              if (workspaceIdRef.current === null) {
                setWorkspaceError(err.message || 'Failed to load workspace.')
              }
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
          workspaceIdRef.current     = null
          setWorkspace(null)
          setRole(null)
          setWorkspaceError(null)
          setWorkspaceReady(false)
          setLoading(false)
        }
      }
    )

    return () => {
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
    workspaceIdRef.current     = null
    setWorkspace(null)
    setRole(null)
    setWorkspaceError(null)
    setWorkspaceReady(false)
    await supabase.auth.signOut()
  }

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL
  const isTrial      = workspace?.account_type !== 'pro'

  return (
    <AuthContext.Provider value={{
      user, workspace, role,
      loading, workspaceError, workspaceReady,
      isSuperAdmin, isTrial,
      sessionExpiredMsg,
      signIn, signOut, retryWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
