import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { TRIAL_QUOTE_LIMIT } from '../context/AuthContext.jsx'

export default function SignupPage({ onSwitchToLogin, onBack }) {
  const { signUp } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signUp(email, password, companyName)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="https://ljognnvocvcqnsfjskpo.supabase.co/storage/v1/object/public/Catchquote's%20logo/logo/long%20logo%20transparent%20bg.png" alt="CatchQuote" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {success ? (
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Check your email</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Your free trial includes:</p>
                <ul className="space-y-1.5 text-xs text-yellow-700">
                  <li>✓ Up to {TRIAL_QUOTE_LIMIT} quotes</li>
                  <li>✓ PDF export on all quotes</li>
                  <li>✓ Full preset library access</li>
                  <li>✓ Single user (no team members)</li>
                </ul>
                <p className="text-xs text-yellow-600 mt-3">
                  Upgrade to Pro anytime for unlimited quotes, team members, and more.
                </p>
              </div>

              <button
                onClick={onSwitchToLogin}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Start your free trial</h1>
              <p className="text-sm text-gray-500 mb-6">
                {TRIAL_QUOTE_LIMIT} quotes free · no credit card required
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Company / workspace name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Studio Blanche"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
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
                  {loading ? 'Creating account…' : 'Start Free Trial'}
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Sign in
            </button>
          </p>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="block mx-auto mt-3 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back to home
          </button>
        )}
      </div>
    </div>
  )
}
