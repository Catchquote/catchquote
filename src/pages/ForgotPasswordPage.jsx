import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const LONG_LOGO = "https://ljognnvocvcqnsfjskpo.supabase.co/storage/v1/object/public/Catchquote's%20logo/logo/long%20logo%20transparent%20bg.png"

export default function ForgotPasswordPage({ onBack }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://catchquote.io/reset-password',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
        </svg>
        Back to sign in
      </button>

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <img src={LONG_LOGO} alt="CatchQuote" className="w-[220px] h-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a password reset link to <span className="font-medium text-gray-700">{email}</span>.
                Check your inbox and click the link to reset your password.
              </p>
              <p className="text-xs text-gray-400 mt-4">Didn't receive it? Check your spam folder.</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
