import { useState } from 'react'
import { useAuth, SUPER_ADMIN_EMAIL } from '../../context/AuthContext.jsx'

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c"/>
    <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(120 14 14)"/>
    <rect x="10" y="1" width="8" height="15" rx="4" fill="#ea580c" transform="rotate(240 14 14)"/>
  </svg>
)

export default function Header({ onBack, onNavigate }) {
  const { user, role, workspace, isSuperAdmin, isTrial, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  function nav(page) {
    onNavigate?.(page)
    setMobileOpen(false)
  }

  const navBtn = 'text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-colors font-medium'
  const mobileNavBtn = 'flex items-center w-full text-left text-sm text-gray-700 hover:text-brand-600 hover:bg-brand-50 px-4 py-3 transition-colors font-medium'

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Left: back + logo + desktop nav */}
          <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors shrink-0"
                title="Back"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <button
              onClick={() => nav('dashboard')}
              className="flex items-center gap-2 shrink-0"
            >
              <Logo />
              <span className="font-semibold text-gray-900 text-sm">CatchQuote</span>
            </button>

            {/* Desktop nav */}
            {onNavigate && (
              <nav className="hidden md:flex items-center gap-0.5 ml-2">
                <button onClick={() => nav('dashboard')} className={navBtn}>Dashboard</button>
                {role === 'admin' && (
                  <>
                    <button onClick={() => nav('presets')} className={navBtn}>Presets</button>
                    <button onClick={() => nav('team')} className={navBtn}>Team</button>
                    <button onClick={() => nav('settings')} className={navBtn}>Settings</button>
                    <button onClick={() => nav('billing')} className={navBtn}>Billing</button>
                  </>
                )}
                <button onClick={() => nav('pricing')} className={navBtn}>Pricing</button>
                {isSuperAdmin && (
                  <button
                    onClick={() => nav('superadmin')}
                    className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-1.5 rounded-md transition-colors font-semibold"
                  >
                    ⚡ Super Admin
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right: account info + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Account type badge — desktop only */}
            {workspace && (
              <span className={`hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                isTrial
                  ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                  : 'bg-green-50 text-green-700 ring-1 ring-green-200'
              }`}>
                {isTrial ? 'Trial' : 'Pro'}
              </span>
            )}

            {/* Role badge — desktop only */}
            {role && !isSuperAdmin && (
              <span className={`hidden lg:inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {role === 'admin' ? 'Admin' : 'Sales Designer'}
              </span>
            )}

            {/* Email — desktop only */}
            {user && (
              <span className="text-xs text-gray-400 hidden lg:block truncate max-w-[160px]">
                {user.email}
              </span>
            )}

            {/* Sign out — desktop only */}
            <button
              onClick={signOut}
              className="hidden sm:block text-xs text-gray-500 hover:text-brand-600 px-3 py-1.5 rounded-md border border-gray-200 hover:border-brand-300 transition-colors"
            >
              Sign Out
            </button>

            {/* Hamburger — mobile only */}
            {onNavigate && (
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-xl md:hidden">
          {/* User info */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {workspace && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isTrial
                      ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                      : 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  }`}>
                    {isTrial ? 'Trial' : 'Pro'}
                  </span>
                )}
                {role && (
                  <span className="text-xs text-gray-500 font-medium">
                    {role === 'admin' ? 'Admin' : 'Sales Designer'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="py-1">
            <button onClick={() => nav('dashboard')} className={mobileNavBtn}>
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Dashboard
            </button>
            <button onClick={() => { setMobileOpen(false); onNavigate?.('quote') }} className={mobileNavBtn}>
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Quote
            </button>
            {role === 'admin' && (
              <>
                <button onClick={() => nav('presets')} className={mobileNavBtn}>
                  <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.015H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.015H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.015H3.75v-.015zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Presets
                </button>
                <button onClick={() => nav('team')} className={mobileNavBtn}>
                  <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  Team
                </button>
                <button onClick={() => nav('settings')} className={mobileNavBtn}>
                  <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button onClick={() => nav('billing')} className={mobileNavBtn}>
                  <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  Billing
                </button>
              </>
            )}
            <button onClick={() => nav('pricing')} className={mobileNavBtn}>
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Pricing
            </button>
            {isSuperAdmin && (
              <button onClick={() => nav('superadmin')} className={`${mobileNavBtn} text-purple-600 hover:text-purple-700 hover:bg-purple-50`}>
                <svg className="w-4 h-4 mr-3 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Super Admin
              </button>
            )}
          </nav>

          {/* Sign out */}
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              onClick={() => { setMobileOpen(false); signOut() }}
              className="w-full text-left text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
