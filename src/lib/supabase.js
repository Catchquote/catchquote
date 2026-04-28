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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Wraps a Supabase query function. On 401, refreshes the session and retries once.
// If the refresh itself fails, signs out so AuthContext detects the expiry and
// shows the "session expired" message on the login screen.
export async function callWithRetry(queryFn) {
  const result = await queryFn()
  if (result.error?.status !== 401) return result

  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    await supabase.auth.signOut()
    return result
  }

  return await queryFn()
}
