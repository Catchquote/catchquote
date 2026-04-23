import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
