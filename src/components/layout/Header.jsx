import { useAuth } from '../../context/AuthContext.jsx'

export default function Header({ onBack, onNavigate }) {
  const { user, role, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 mr-1 transition-colors"
              title="Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c"/>
              <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(120 14 14)"/>
              <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(240 14 14)"/>
            </svg>
            <span className="font-semibold text-gray-900 text-sm">CatchQuote</span>
          </div>

          {/* Admin nav links */}
          {role === 'admin' && onNavigate && (
            <nav className="hidden sm:flex items-center gap-0.5 ml-3">
              <button
                onClick={() => onNavigate('team')}
                className="text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-colors font-medium"
              >
                Team
              </button>
              <button
                onClick={() => onNavigate('presets')}
                className="text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-colors font-medium"
              >
                Presets
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[180px]">
              {user.email}
            </span>
          )}
          {role && (
            <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
              role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {role === 'admin' ? 'Admin' : 'Sales Designer'}
            </span>
          )}
          <button
            onClick={signOut}
            className="text-xs text-gray-500 hover:text-brand-600 px-3 py-1.5 rounded-md border border-gray-200 hover:border-brand-300 transition-colors"
          >
            Sign Out
          </button>
          <button
            className="text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-md transition-colors font-medium"
            title="Stripe subscription — coming soon"
          >
            Get Pro
          </button>
        </div>
      </div>
    </header>
  )
}
