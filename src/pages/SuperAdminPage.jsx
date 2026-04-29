import { useEffect, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import { supabase } from '../lib/supabase.js'

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-500',
    green:  'bg-green-50 text-green-700 ring-1 ring-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
    red:    'bg-red-50 text-red-600 ring-1 ring-red-200',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function SuperAdminPage({ onNavigate }) {
  const [workspaces,    setWorkspaces]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState('')
  const [loadAttempt,   setLoadAttempt]   = useState(0)
  const [search,        setSearch]        = useState('')
  const [showCreate,    setShowCreate]    = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const [form, setForm] = useState({
    clientName: '',
    email: '',
    password: '',
    companyName: '',
  })
  const [formError, setFormError]   = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')

  async function loadWorkspaces() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id, name, owner_id, account_type, is_active, created_at,
          workspace_members(count),
          quotes(count)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error

      // Fetch owner emails from profiles
      const ownerIds = [...new Set((data || []).map(w => w.owner_id).filter(Boolean))]
      let profileMap = {}
      if (ownerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, email').in('id', ownerIds)
        ;(profiles || []).forEach(p => { profileMap[p.id] = p.email })
      }

      setWorkspaces((data || []).map(w => ({
        ...w,
        ownerEmail:  profileMap[w.owner_id] || '—',
        memberCount: w.workspace_members?.[0]?.count ?? 0,
        quoteCount:  w.quotes?.[0]?.count ?? 0,
      })))
    } catch (err) {
      console.error('SA load error:', err)
      setLoadError(err.message || 'Failed to load workspaces.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadWorkspaces() }, [loadAttempt])

  async function handleUpgrade(ws) {
    setActionLoading(ws.id + ':upgrade')
    try {
      const { error } = await supabase
        .from('workspaces').update({ account_type: 'pro' }).eq('id', ws.id)
      if (!error) setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, account_type: 'pro' } : w))
    } catch (err) {
      console.error('Upgrade error:', err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDowngrade(ws) {
    setActionLoading(ws.id + ':downgrade')
    try {
      const { error } = await supabase
        .from('workspaces').update({ account_type: 'trial' }).eq('id', ws.id)
      if (!error) setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, account_type: 'trial' } : w))
    } catch (err) {
      console.error('Downgrade error:', err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleToggleActive(ws) {
    setActionLoading(ws.id + ':toggle')
    const newActive = !ws.is_active
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ is_active: newActive, deactivated_at: newActive ? null : new Date().toISOString() })
        .eq('id', ws.id)
      if (!error) setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, is_active: newActive } : w))
    } catch (err) {
      console.error('Toggle active error:', err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      // Step 1: get the current session's access token
      console.log('[handleCreate] step 1 — getting session')
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw new Error(`Session error: ${sessionErr.message}`)
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error('Not authenticated — no access token in session')

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const fnUrl   = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`

      // Log enough of each value to confirm env vars loaded, without exposing full secrets
      console.log('[handleCreate] accessToken  :', accessToken  ? `${accessToken.slice(0,20)}…  (len ${accessToken.length})`   : 'MISSING')
      console.log('[handleCreate] anonKey      :', anonKey      ? `${anonKey.slice(0,20)}…  (len ${anonKey.length})`           : 'MISSING')
      console.log('[handleCreate] fnUrl        :', fnUrl        ?? 'MISSING')

      // Step 2: build the payload
      const payload = {
        name:         form.clientName,
        email:        form.email.toLowerCase().trim(),
        password:     form.password,
        company_name: form.companyName.trim() || form.clientName.trim(),
      }
      console.log('[handleCreate] step 2 — payload:', { ...payload, password: '***' })

      // Step 3: POST directly to the edge function URL
      console.log('[handleCreate] step 3 — fetching', fnUrl)
      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey':        anonKey,
        },
        body: JSON.stringify(payload),
      })

      console.log('[handleCreate] response status :', response.status)
      console.log('[handleCreate] response headers:', {
        'content-type':                response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      })

      // Step 4: parse the response body regardless of status
      let result
      try { result = await response.json() } catch { result = { raw: await response.text() } }
      console.log('[handleCreate] response body:', result)

      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}`)
      }

      // Step 5: success
      setFormSuccess(`Account created for ${result.user.email}. They can log in immediately.`)
      setForm({ clientName: '', email: '', password: '', companyName: '' })
      setTimeout(() => {
        setShowCreate(false)
        setFormSuccess('')
        loadWorkspaces()
      }, 2000)

    } catch (err) {
      console.error('[handleCreate] error:', err)
      // TypeError: Failed to fetch → CORS or network issue
      const msg = err.message === 'Failed to fetch'
        ? 'Network error — could not reach the edge function. Check browser console for CORS details.'
        : err.message || 'Account creation failed'
      setFormError(msg)
    } finally {
      setFormLoading(false)
    }
  }

  const filtered = workspaces.filter(w => {
    const q = search.toLowerCase()
    return !q || w.name.toLowerCase().includes(q) || w.ownerEmail.toLowerCase().includes(q)
  })

  const stats = {
    total: workspaces.length,
    pro: workspaces.filter(w => w.account_type === 'pro').length,
    trial: workspaces.filter(w => w.account_type !== 'pro').length,
    inactive: workspaces.filter(w => !w.is_active).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-600 text-lg font-bold">⚡</span>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
            </div>
            <p className="text-sm text-gray-500">Manage all client workspaces</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setFormError(''); setFormSuccess('') }}
            className="shrink-0 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Account
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Workspaces', value: stats.total },
            { label: 'Pro',    value: stats.pro,      color: 'text-green-600' },
            { label: 'Trial',  value: stats.trial,    color: 'text-yellow-600' },
            { label: 'Inactive', value: stats.inactive, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color || 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by workspace name or owner email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:max-w-sm px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-gray-400">Loading workspaces…</div>
          ) : loadError ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-red-500 mb-3">{loadError}</p>
              <button
                onClick={() => setLoadAttempt(n => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-gray-400">No workspaces found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Workspace</th>
                    <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Owner</th>
                    <th className="text-center px-5 py-3 font-semibold">Plan</th>
                    <th className="text-center px-5 py-3 font-semibold hidden sm:table-cell">Quotes</th>
                    <th className="text-center px-5 py-3 font-semibold hidden lg:table-cell">Members</th>
                    <th className="text-left px-5 py-3 font-semibold hidden xl:table-cell">Created</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(ws => {
                    const busy = (suffix) => actionLoading === ws.id + ':' + suffix
                    return (
                      <tr key={ws.id} className={`hover:bg-gray-50 transition-colors ${!ws.is_active ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-800">{ws.name}</p>
                          {!ws.is_active && <p className="text-xs text-red-400 mt-0.5">Deactivated</p>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell text-xs">
                          {ws.ownerEmail}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge color={ws.account_type === 'pro' ? 'green' : 'yellow'}>
                            {ws.account_type === 'pro' ? 'Pro' : 'Trial'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600 hidden sm:table-cell">
                          {ws.quoteCount}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600 hidden lg:table-cell">
                          {ws.memberCount}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs hidden xl:table-cell">
                          {ws.created_at?.slice(0, 10)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {ws.account_type !== 'pro' ? (
                              <button
                                onClick={() => handleUpgrade(ws)}
                                disabled={!!actionLoading}
                                className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                              >
                                {busy('upgrade') ? '…' : 'Upgrade'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDowngrade(ws)}
                                disabled={!!actionLoading}
                                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium disabled:opacity-50"
                              >
                                {busy('downgrade') ? '…' : 'Downgrade'}
                              </button>
                            )}
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleToggleActive(ws)}
                              disabled={!!actionLoading}
                              className={`text-xs font-medium disabled:opacity-50 ${ws.is_active ? 'text-red-400 hover:text-red-600' : 'text-brand-600 hover:text-brand-700'}`}
                            >
                              {busy('toggle') ? '…' : ws.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create account modal */}
      {showCreate && (
        <Modal title="Create Client Account" onClose={() => setShowCreate(false)}>
          {formSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
              {formSuccess}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="modal-label">Client Name</label>
                <input
                  className="modal-input"
                  placeholder="Jane Smith"
                  value={form.clientName}
                  onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="modal-label">Company Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  className="modal-input"
                  placeholder="Smith Renovations"
                  value={form.companyName}
                  onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="modal-label">Email Address</label>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="client@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="modal-label">Temporary Password</label>
                <input
                  type="password"
                  className="modal-input"
                  placeholder="Min. 8 characters"
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {formLoading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
