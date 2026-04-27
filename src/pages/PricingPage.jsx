import Header from '../components/layout/Header.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const CONTACT_EMAIL = 'thedeepestwithin@gmail.com'

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

const TRIAL_FEATURES = [
  'Up to 3 quotes',
  'PDF export',
  'Preset library',
  'Single user only',
]

const PRO_FEATURES = [
  'Unlimited quotes',
  'PDF export',
  'Preset library',
  'Up to 3 team members',
  'Additional members at $25/user/mo',
  'Priority email support',
  'Custom workspace branding (coming soon)',
  'Client portal & e-signature (coming soon)',
]

export default function PricingPage({ onNavigate }) {
  const { isTrial, workspace } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h1>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Start free, upgrade when you're ready. No hidden fees, no lock-in contracts.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Trial card */}
          <div className={`bg-white rounded-2xl border p-7 flex flex-col ${!isTrial ? 'border-gray-200 opacity-80' : 'border-yellow-300 ring-2 ring-yellow-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-gray-900 text-lg">Trial</p>
              {isTrial && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
                  Current plan
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">Free</p>
            <p className="text-sm text-gray-500 mb-6">No credit card required</p>

            <ul className="space-y-3 mb-8 flex-1">
              {TRIAL_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              {isTrial ? 'Current plan' : 'Downgrade not available'}
            </button>
          </div>

          {/* Pro card */}
          <div className={`rounded-2xl border p-7 flex flex-col ${isTrial ? 'bg-white border-brand-300 ring-2 ring-brand-200' : 'bg-white border-green-300 ring-2 ring-green-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-gray-900 text-lg">Pro</p>
              {!isTrial && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
                  Current plan
                </span>
              )}
            </div>
            <div className="flex items-end gap-1 mb-1">
              <p className="text-3xl font-bold text-gray-900">$99</p>
              <p className="text-gray-500 text-sm mb-1">/month</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">Per workspace · billed monthly</p>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            {isTrial ? (
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=CatchQuote%20Pro%20Upgrade&body=Hi%2C%20I%27d%20like%20to%20upgrade%20my%20workspace%20%22${encodeURIComponent(workspace?.name || '')}%22%20to%20Pro.`}
                className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Contact us to upgrade
              </a>
            ) : (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 cursor-default"
              >
                Active
              </button>
            )}
          </div>
        </div>

        {/* Contact note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Questions? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:text-brand-700 font-medium">
            {CONTACT_EMAIL}
          </a>
        </p>
      </main>
    </div>
  )
}
