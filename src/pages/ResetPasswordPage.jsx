import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const LONG_LOGO = "https://ljognnvocvcqnsfjskpo.supabase.co/storage/v1/object/public/Catchquote's%20logo/logo/long%20logo%20transparent%20bg.png"

export default function ResetPasswordPage({ onInvalidToken }) {
  const [ready,    setReady]    = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    // Supabase processes the hash tokens automatically and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    // If no recovery event within 4 seconds, token is missing — redirect back
    const fallback = setTimeout(() => {
      if (!ready) onInvalidToken()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    }
  }

  if (!ready && !done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Verifying reset link…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <img src={LONG_LOGO} alt="CatchQuote" className="w-[220px] h-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
              <p className="text-sm text-gray-500">Redirecting you to the app…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
