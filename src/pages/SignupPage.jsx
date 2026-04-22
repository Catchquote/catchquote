import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function SignupPage({ onSwitchToLogin }) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signUp(email, password)
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
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c"/>
            <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(120 14 14)"/>
            <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(240 14 14)"/>
          </svg>
          <span className="font-bold text-gray-900 text-xl">CatchQuote</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-6">Start building professional quotes</p>

          {success ? (
            <div className="text-center py-4">
              <div className="text-green-600 font-semibold mb-2">Check your email</div>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={onSwitchToLogin}
                className="mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Back to sign in
              </button>
            </div>
          ) : (
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
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
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
      </div>
    </div>
  )
}
