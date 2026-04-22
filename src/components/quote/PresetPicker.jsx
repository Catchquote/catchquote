import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { CATEGORIES, PRESET_ITEMS } from '../../data/presetItems.js'

// Build static grouped presets as fallback when workspace has no user presets
function buildStaticGroups() {
  const groups = {}
  for (const [cat, items] of Object.entries(PRESET_ITEMS)) {
    groups[cat] = items.map((item, i) => ({
      id: `static-${cat}-${i}`,
      category: cat,
      description: item.description,
      unit: item.unit,
      selling_price: item.unitPrice,
      contractor_name: null,
      _static: true,
    }))
  }
  return groups
}

function fmt(n) {
  const v = parseFloat(n) || 0
  return v ? `$${v.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : '—'
}

export default function PresetPicker({ onAddItems, onAddBlank }) {
  const { workspace } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [groups, setGroups] = useState(null)   // null = not loaded
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')

  async function load() {
    if (groups !== null) return
    setLoading(true)
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
      // No user presets — fall back to built-in library
      setGroups(buildStaticGroups())
    }
    setLoading(false)
  }

  function toggle() {
    if (!open) load()
    setOpen(v => !v)
    setSelected(new Set())
    setSearch('')
  }

  const categories = groups ? Object.keys(groups) : []
  const currentCat = activeCat && categories.includes(activeCat) ? activeCat : categories[0]
  const allItems = groups?.[currentCat] ?? []

  const filteredItems = search.trim()
    ? allItems.filter(p =>
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.contractor_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : allItems

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      filteredItems.forEach(p => next.add(p.id))
      return next
    })
  }

  function clearAll() {
    setSelected(prev => {
      const next = new Set(prev)
      filteredItems.forEach(p => next.delete(p.id))
      return next
    })
  }

  function addSelected() {
    if (!groups) return
    const toAdd = []
    for (const catItems of Object.values(groups)) {
      for (const item of catItems) {
        if (selected.has(item.id)) {
          toAdd.push({
            category: item.category || 'General Labour',
            description: item.description,
            unit: item.unit || 'item',
            unitPrice: parseFloat(item.selling_price || item.unit_price) || 0,
            contractor_name: item.contractor_name || null,
          })
        }
      }
    }
    if (toAdd.length) onAddItems(toAdd)
    setSelected(new Set())
    setOpen(false)
    setSearch('')
  }

  const selectedCount = selected.size
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every(p => selected.has(p.id))

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add from Presets
        </button>
        <button
          onClick={onAddBlank}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Blank Line
        </button>
      </div>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading presets…</div>
          ) : (
            <div className="flex" style={{ maxHeight: '420px' }}>

              {/* Category sidebar */}
              <div className="w-44 bg-gray-50 border-r border-gray-100 flex flex-col overflow-y-auto shrink-0">
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
                    <p className="text-xs text-gray-400 text-center py-6">No items match.</p>
                  ) : (
                    filteredItems.map(item => {
                      const isSelected = selected.has(item.id)
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                            isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 rounded text-brand-600 border-gray-300 accent-brand-600 shrink-0"
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

          {/* Footer: add selected */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-400">
              {selectedCount > 0
                ? `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`
                : 'Check items to add to your quote'}
            </p>
            <div className="flex gap-2">
              <button onClick={toggle} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={addSelected}
                disabled={selectedCount === 0}
                className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors"
              >
                Add {selectedCount > 0 ? selectedCount : ''} to Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
