import { useEffect, useMemo, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import PresetModal from '../components/presets/PresetModal.jsx'
import ImportModal from '../components/presets/ImportModal.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcMargin(cost, sell) {
  const c = parseFloat(cost) || 0
  const s = parseFloat(sell) || 0
  if (!c) return null
  return ((s - c) / c) * 100
}

function MarginBadge({ cost, sell }) {
  const pct = calcMargin(cost, sell)
  if (pct === null) return <span className="text-gray-300 text-xs">—</span>
  const cls =
    pct >= 20 ? 'text-green-700 bg-green-50 ring-green-200' :
    pct >= 10 ? 'text-orange-700 bg-orange-50 ring-orange-200' :
                'text-red-700 bg-red-50 ring-red-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${cls}`}>
      {pct.toFixed(1)}%
    </span>
  )
}

function fmtPrice(n) {
  const v = parseFloat(n)
  if (!v) return <span className="text-gray-300">—</span>
  return `$${v.toFixed(2)}`
}

function StatusBadge({ status }) {
  return status === 'active'
    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">Active</span>
    : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 ring-1 ring-gray-200">Inactive</span>
}

// ── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({ category, items, onEdit, onDelete, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{category}</h3>
        <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-2.5 font-semibold">Description</th>
              <th className="text-left px-4 py-2.5 font-semibold">Contractor</th>
              <th className="text-center px-3 py-2.5 font-semibold w-16">Unit</th>
              <th className="text-right px-4 py-2.5 font-semibold w-28">Cost Price</th>
              <th className="text-right px-4 py-2.5 font-semibold w-28">Sell Price</th>
              <th className="text-center px-4 py-2.5 font-semibold w-24">Margin %</th>
              <th className="text-left px-4 py-2.5 font-semibold">Notes</th>
              <th className="text-center px-3 py-2.5 font-semibold w-20">Status</th>
              <th className="px-5 py-2.5 w-36" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(p => {
              const inactive = p.status === 'inactive'
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 group transition-colors ${inactive ? 'opacity-50' : ''}`}
                >
                  <td className="px-5 py-3 font-medium text-gray-800">{p.description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.contractor_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-center text-xs text-gray-400 font-mono">{p.unit}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 font-mono">{fmtPrice(p.cost_price)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-800 font-semibold font-mono">
                    {fmtPrice(p.selling_price || p.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <MarginBadge cost={p.cost_price} sell={p.selling_price || p.unit_price} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate" title={p.notes || ''}>
                    {p.notes || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={p.status || 'active'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(p)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggle(p)}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                      >
                        {inactive ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PresetsPage({ onBack, onNavigate }) {
  const { user, workspace } = useAuth()
  const [presets,     setPresets]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('All')
  const [modal,       setModal]       = useState(null)
  const [importOpen,  setImportOpen]  = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // load() used by save/delete/import callbacks — simple re-fetch, errors surface inline
  async function load() {
    try {
      const { data, error } = await supabase
        .from('user_presets')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('category',    { ascending: true })
        .order('description', { ascending: true })
      if (error) throw error
      setPresets(data || [])
    } catch (err) {
      console.error('Presets reload error:', err.message)
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

    async function loadPresets() {
      try {
        const { data, error } = await supabase
          .from('user_presets')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('category',    { ascending: true })
          .order('description', { ascending: true })
        if (cancelled) return
        if (error) throw error
        setPresets(data || [])
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load presets.')
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }

    loadPresets()
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [workspace.id, loadAttempt])

  // All unique categories in the data
  const categories = useMemo(() => {
    const cats = [...new Set(presets.map(p => p.category || 'Uncategorised'))].sort()
    return ['All', ...cats]
  }, [presets])

  // Filtered + grouped
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim()
    const filtered = presets.filter(p => {
      const matchesCat = catFilter === 'All' || p.category === catFilter
      const matchesSearch = !q ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.contractor_name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.unit || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })

    const g = {}
    for (const p of filtered) {
      const cat = p.category || 'Uncategorised'
      if (!g[cat]) g[cat] = []
      g[cat].push(p)
    }
    return g
  }, [presets, search, catFilter])

  // Stats
  const activeCount = presets.filter(p => p.status === 'active').length
  const withMargin = presets.filter(p => parseFloat(p.cost_price) > 0)
  const avgMargin = withMargin.length
    ? withMargin.reduce((s, p) => s + (calcMargin(p.cost_price, p.selling_price || p.unit_price) || 0), 0) / withMargin.length
    : null

  // ── Save handler (create or update) ───────────────────────────────────────

  async function handleSave(form) {
    const payload = {
      workspace_id:    workspace.id,
      user_id:         user.id,
      category:        form.category,
      contractor_name: form.contractor_name || null,
      description:     form.description.trim(),
      unit:            form.unit,
      cost_price:      parseFloat(form.cost_price) || 0,
      selling_price:   parseFloat(form.selling_price) || 0,
      unit_price:      parseFloat(form.selling_price) || 0,
      notes:           form.notes || null,
      status:          form.status || 'active',
      item_code:       form.item_code || null,
    }

    if (form.id) {
      const { workspace_id, user_id, ...rest } = payload
      const { error } = await supabase.from('user_presets').update(rest).eq('id', form.id)
      if (error) return error.message
    } else {
      const { error } = await supabase.from('user_presets').insert(payload)
      if (error) return error.message
    }

    await load()
    return null
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id) {
    await supabase.from('user_presets').delete().eq('id', id)
    setPresets(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  // ── Toggle active/inactive ─────────────────────────────────────────────────

  async function handleToggle(preset) {
    const newStatus = preset.status === 'active' ? 'inactive' : 'active'
    await supabase.from('user_presets').update({ status: newStatus }).eq('id', preset.id)
    setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, status: newStatus } : p))
  }

  // ── CSV/Excel import ───────────────────────────────────────────────────────

  async function handleImport(rows) {
    function g(row, ...keys) {
      for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]
      return ''
    }

    const records = rows
      .map(row => ({
        workspace_id:    workspace.id,
        user_id:         user.id,
        category:        g(row, 'Category', 'category') || 'General Labour',
        contractor_name: g(row, 'Contractor Name', 'contractor_name') || null,
        description:     g(row, 'Description', 'description').toString().trim(),
        unit:            g(row, 'Unit', 'unit') || 'item',
        cost_price:      parseFloat(g(row, 'Cost Price', 'cost_price')) || 0,
        selling_price:   parseFloat(g(row, 'Selling Price', 'selling_price')) || 0,
        unit_price:      parseFloat(g(row, 'Selling Price', 'selling_price')) || 0,
        notes:           g(row, 'Notes', 'notes') || null,
        status:          'active',
      }))
      .filter(r => r.description)

    if (!records.length) return 'No valid rows found — Description column is required.'

    // Race the entire insert operation against a 30-second hard timeout.
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Import timed out after 30 seconds. Try a smaller file or check your connection.')),
        30000
      )
    })

    async function doInsert() {
      try {
        // Insert in batches of 50 to stay well within Supabase row limits.
        // Yield the event loop between batches so auth token refresh callbacks
        // are not starved during large imports.
        for (let i = 0; i < records.length; i += 50) {
          const { error } = await supabase
            .from('user_presets')
            .insert(records.slice(i, i + 50))
          if (error) throw new Error(error.message)
          await new Promise(resolve => setTimeout(resolve, 0))
        }
        await load()
        return null
      } finally {
        clearTimeout(timeoutId)
      }
    }

    try {
      return await Promise.race([doInsert(), timeoutPromise])
    } catch (err) {
      return err.message || 'Import failed. Please try again.'
    }
  }

  const hasPresets = presets.length > 0
  const hasResults = Object.keys(grouped).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onBack={onBack} onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presets Library</h1>
            <p className="text-sm text-gray-500 mt-1">{workspace.name}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Import CSV / Excel
            </button>
            <button
              onClick={() => setModal({})}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Preset
            </button>
          </div>
        </div>

        {/* Stats row */}
        {hasPresets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Presets', value: presets.length },
              { label: 'Active', value: activeCount },
              { label: 'Inactive', value: presets.length - activeCount },
              { label: 'Avg Margin', value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description, contractor, notes…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-700 shrink-0"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-sm text-gray-400">Loading presets…</div>
        ) : loadError ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-sm text-red-500 mb-3">{loadError}</p>
            <button
              onClick={() => setLoadAttempt(n => n + 1)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !hasPresets ? (
          <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.015H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.015H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.015H3.75v-.015zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-gray-500 font-medium mb-1">No presets yet</p>
            <p className="text-sm text-gray-400 mb-5">Add your first preset or import from CSV / Excel</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Import file
              </button>
              <button
                onClick={() => setModal({})}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
              >
                Add Preset
              </button>
            </div>
          </div>
        ) : !hasResults ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-sm text-gray-400">No presets match your search.</p>
            <button onClick={() => { setSearch(''); setCatFilter('All') }}
              className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(grouped).map(([category, items]) => (
              <CategoryGroup
                key={category}
                category={category}
                items={items}
                onEdit={p => setModal({ preset: p })}
                onDelete={id => setDeleteConfirm(id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal !== null && (
        <PresetModal
          preset={modal.preset}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {importOpen && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Delete preset?</h3>
            <p className="text-sm text-gray-500 mb-5">This can't be undone. The preset won't appear in future quotes.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
