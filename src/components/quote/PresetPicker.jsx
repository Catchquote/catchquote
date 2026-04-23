import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { CATEGORIES, PRESET_ITEMS } from '../../data/presetItems.js'

function buildStaticGroups() {
  const g = {}
  for (const [cat, items] of Object.entries(PRESET_ITEMS)) {
    g[cat] = items.map((item, i) => ({
      id: `static-${cat}-${i}`,
      category: cat,
      description: item.description,
      unit: item.unit,
      selling_price: item.unitPrice,
      _static: true,
    }))
  }
  return g
}

function fmt(n) {
  const v = parseFloat(n) || 0
  return v ? `${v.toLocaleString('en-SG', { minimumFractionDigits: 2 })}` : '—'
}

export default function PresetPicker({ areas, defaultArea, onAdd, onClose }) {
  const { workspace } = useAuth()

  const [groups,     setGroups]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeCat,  setActiveCat]  = useState(null)
  const [selected,   setSelected]   = useState(new Set())
  const [search,     setSearch]     = useState('')
  const [targetArea, setTargetArea] = useState(defaultArea || areas[0] || '')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_presets')
        .select('id, category, contractor_name, description, unit, selling_price, unit_price')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active')
        .order('category')
        .order('description')

      if (data?.length) {
        const g = {}
        for (const p of data) {
          const cat = p.category || 'Uncategorised'
          if (!g[cat]) g[cat] = []
          g[cat].push(p)
        }
        setGroups(g)
      } else {
        setGroups(buildStaticGroups())
      }
      setLoading(false)
    }
    load()
  }, [workspace.id])

  const categories  = groups ? Object.keys(groups) : []
  const currentCat  = activeCat && categories.includes(activeCat) ? activeCat : categories[0]
  const allItems    = groups?.[currentCat] ?? []

  const filteredItems = search.trim()
    ? allItems.filter(p =>
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.contractor_name?.toLowerCase().includes(search.toLowerCase())
      )
    : allItems

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll()  { setSelected(prev => { const n = new Set(prev); filteredItems.forEach(p => n.add(p.id));    return n }) }
  function clearAll()   { setSelected(prev => { const n = new Set(prev); filteredItems.forEach(p => n.delete(p.id)); return n }) }

  function handleAdd() {
    if (!groups || !targetArea) return
    const toAdd = []
    for (const catItems of Object.values(groups)) {
      for (const item of catItems) {
        if (selected.has(item.id)) {
          toAdd.push({
            category:   item.category || 'General Labour',
            description: item.description,
            unit:        item.unit || 'item',
            unitPrice:   parseFloat(item.selling_price || item.unit_price) || 0,
          })
        }
      }
    }
    if (toAdd.length) onAdd(targetArea, toAdd)
  }

  const selectedCount       = selected.size
  const allVisibleSelected  = filteredItems.length > 0 && filteredItems.every(p => selected.has(p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white w-full sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 680, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-sm">Add from Presets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-sm text-gray-400">
            Loading presets…
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Category sidebar */}
            <div className="w-40 bg-gray-50 border-r border-gray-100 flex flex-col overflow-y-auto shrink-0">
              <div className="py-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCat(cat); setSearch('') }}
                    className={`w-full text-left text-xs px-3 py-2 transition-colors ${
                      currentCat === cat
                        ? 'bg-brand-50 text-brand-700 font-semibold border-r-2 border-brand-500'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                    {groups?.[cat] && (
                      <span className="ml-1 text-gray-400 font-normal">({groups[cat].length})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Items panel */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Search + select all */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0">
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter items…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  onClick={allVisibleSelected ? clearAll : selectAll}
                  className="text-xs text-gray-400 hover:text-brand-600 whitespace-nowrap font-medium px-1"
                >
                  {allVisibleSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No items match.</p>
                ) : (
                  filteredItems.map(item => {
                    const isSelected = selected.has(item.id)
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                          isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.id)}
                          className="w-4 h-4 rounded accent-brand-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{item.description}</p>
                          {item.contractor_name && (
                            <p className="text-xs text-gray-400 truncate">{item.contractor_name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-700">{fmt(item.selling_price || item.unit_price)}</p>
                          <p className="text-xs text-gray-400">{item.unit}</p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer: area selector + add button */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 shrink-0 flex-wrap">
          <p className="text-xs text-gray-500">
            {selectedCount > 0
              ? `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`
              : 'Select items to add'}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Area selector */}
            {areas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 whitespace-nowrap">Add to:</span>
                <select
                  value={targetArea}
                  onChange={e => setTargetArea(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}

            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedCount === 0 || !targetArea}
              className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors"
            >
              Add {selectedCount > 0 ? selectedCount : ''} to {targetArea || 'area'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
