import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Remove any Supabase auth keys whose value is not valid JSON.
// supabase-js silently fails to parse a corrupted token, leaving the app
// stuck on the loading screen. Clearing it here lets the client start fresh.
function clearCorruptedAuthStorage() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('sb-')) continue
      try {
        JSON.parse(localStorage.getItem(key))
      } catch {
        localStorage.removeItem(key)
      }
    }
  } catch { /* localStorage unavailable (e.g. Firefox private + strict mode) */ }
}

clearCorruptedAuthStorage()

// Replace navigator.locks (Web Locks API) with an in-memory sequential lock.
//
// Root cause of the ~5-10 s tab-switch hang:
//   React StrictMode double-mounts AuthProvider in development.
//   First mount → Supabase acquires a Web Lock for initialization.
//   React unmounts (StrictMode) while the lock is still held (async work in-flight).
//   Second mount → tries to acquire the same Web Lock → waits the full
//   lockAcquireTimeout (5 000 ms) then "steals" it → 5+ second freeze.
//   The same lock-acquisition path also runs on every visibilitychange (tab switch).
//
// The in-memory lock chains operations identically but with no Web Locks API
// overhead, no steal cascades, and no cross-tab coordination (not needed here —
// single-user SaaS with one active tab).
const _lockMap = Object.create(null)
function inMemoryLock(name, _acquireTimeout, fn) {
  const prior   = _lockMap[name] ?? Promise.resolve()
  const current = prior.then(() => fn(), () => fn())
  _lockMap[name] = current.then(() => {}, () => {})
  return current
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth:     { lock: inMemoryLock },
  realtime: { enabled: false },
})

