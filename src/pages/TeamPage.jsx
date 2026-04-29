import { useEffect, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_LABELS = { admin: 'Admin', sales_designer: 'Sales Designer' }

export default function TeamPage({ onBack, onNavigate }) {
  const { user, workspace, isTrial } = useAuth()
  const [members,     setMembers]     = useState([])
  const [invites,     setInvites]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [inviteEmail,   setInviteEmail]   = useState('')
  const [inviteRole,    setInviteRole]    = useState('sales_designer')
  const [inviting,      setInviting]      = useState(false)
  const [inviteError,   setInviteError]   = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  // Shared reload used after invite/revoke — does not reset the full loading spinner
  async function reload() {
    try {
      const [{ data: membersData, error: mErr }, { data: invitesData, error: iErr }] = await Promise.all([
        supabase
          .from('workspace_members')
          .select('id, role, created_at, user_id')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('workspace_invites')
          .select('id, email, role, created_at')
          .eq('workspace_id', workspace.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])
      if (mErr) throw mErr
      if (iErr) throw iErr

      // Fetch emails separately — workspace_members.user_id → auth.users, not public.profiles
      const rawMembers = membersData || []
      if (rawMembers.length) {
        const userIds = rawMembers.map(m => m.user_id).filter(Boolean)
        const { data: profiles } = await supabase
          .from('profiles').select('id, email').in('id', userIds)
        const profileMap = {}
        ;(profiles || []).forEach(p => { profileMap[p.id] = p.email })
        setMembers(rawMembers.map(m => ({ ...m, profiles: { email: profileMap[m.user_id] } })))
      } else {
        setMembers([])
      }
      setInvites(invitesData || [])
    } catch (err) {
      console.error('Team reload error:', err.message)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadError('Loading timed out. Check your connection and try again.')
        setLoading(false)
      }
    }, 15000)

    async function load() {
      try {
        const [{ data: membersData, error: mErr }, { data: invitesData, error: iErr }] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('id, role, created_at, user_id')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('workspace_invites')
            .select('id, email, role, created_at')
            .eq('workspace_id', workspace.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (mErr) throw mErr
        if (iErr) throw iErr

        // Fetch emails separately — workspace_members.user_id → auth.users, not public.profiles
        const rawMembers = membersData || []
        if (rawMembers.length) {
          const userIds = rawMembers.map(m => m.user_id).filter(Boolean)
          const { data: profiles } = await supabase
            .from('profiles').select('id, email').in('id', userIds)
          if (cancelled) return
          const profileMap = {}
          ;(profiles || []).forEach(p => { profileMap[p.id] = p.email })
          setMembers(rawMembers.map(m => ({ ...m, profiles: { email: profileMap[m.user_id] } })))
        } else {
          setMembers([])
        }
        setInvites(invitesData || [])
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load team data.')
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [workspace.id, loadAttempt])

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      const { error } = await supabase.from('workspace_invites').insert({
        workspace_id: workspace.id,
        email:        inviteEmail.toLowerCase().trim(),
        role:         inviteRole,
        invited_by:   user.id,
      })
      if (error) {
        setInviteError(
          error.code === '23505'
            ? 'This email has already been invited to your workspace.'
            : error.message
        )
      } else {
        setInviteSuccess(`Invite queued for ${inviteEmail}. They'll join automatically when they sign up.`)
        setInviteEmail('')
        reload()
      }
    } catch (err) {
      setInviteError(err.message || 'Failed to send invite. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevokeInvite(id) {
    try {
      await supabase.from('workspace_invites').delete().eq('id', id)
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Revoke invite error:', err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onBack={onBack} onNavigate={onNavigate} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">{workspace.name}</p>
        </div>

        {/* Invite form / trial lock */}
        {isTrial ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-yellow-800 text-sm">Team members require a Pro plan</p>
              <p className="text-xs text-yellow-600 mt-0.5">Upgrade to invite colleagues to your workspace.</p>
            </div>
            <button
              onClick={() => onNavigate?.('pricing')}
              className="shrink-0 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              View Pricing
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-1">Invite Team Member</h2>
            <p className="text-xs text-gray-400 mb-4">
              They'll join your workspace automatically when they sign up with this email address.
            </p>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="sales_designer">Sales Designer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="shrink-0 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </form>
            {inviteError   && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>}
            {inviteSuccess && <p className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">{inviteSuccess}</p>}
          </div>
        )}

        {/* Current members */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Members ({members.length})</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : loadError ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-red-500 mb-3">{loadError}</p>
              <button
                onClick={() => setLoadAttempt(n => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Role</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-gray-800">
                      {m.profiles?.email || '—'}
                      {m.user_id === user.id && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        m.role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell">
                      {m.created_at?.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Pending Invites ({invites.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Role</th>
                  <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Sent</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invites.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-gray-800">{inv.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                        {ROLE_LABELS[inv.role] || inv.role} · Pending
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell">
                      {inv.created_at?.slice(0, 10)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
