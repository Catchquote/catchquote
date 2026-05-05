import { useState } from 'react'
import { CATEGORIES } from '../../data/presetItems.js'
import { UNITS, unitLabel } from '../../constants/units.js'

const BLANK = {
  category: 'General Labour',
  contractor_name: '',
  description: '',
  unit: 'unit',
  cost_price: '',
  selling_price: '',
  notes: '',
  status: 'active',
  item_code: '',
}

function calcMargin(cost, sell) {
  const c = parseFloat(cost) || 0
  const s = parseFloat(sell) || 0
  if (!c) return null
  return ((s - c) / c) * 100
}

function MarginDisplay({ cost, sell, unit }) {
  const pct = calcMargin(cost, sell)
  const profit = (parseFloat(sell) || 0) - (parseFloat(cost) || 0)

  if (pct === null) {
    return <span className="text-gray-400 text-sm">Set a cost price to calculate margin</span>
  }

  const color = pct >= 20 ? 'text-green-600' : pct >= 10 ? 'text-orange-500' : 'text-red-500'

  return (
    <span className={`text-sm font-semibold ${color}`}>
      {pct.toFixed(1)}% margin &nbsp;·&nbsp;
      <span className="font-normal text-gray-500">
        ${profit.toFixed(2)} profit per {unitLabel(unit) || 'unit'}
      </span>
    </span>
  )
}

export default function PresetModal({ preset, onSave, onClose }) {
  const isEdit = !!preset?.id
  const [form, setForm] = useState(isEdit ? { ...BLANK, ...preset } : BLANK)
  const [customCat, setCustomCat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) return
    setSaving(true)
    setError('')
    const err = await onSave({ ...form, id: preset?.id })
    setSaving(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-sans font-semibold text-gray-900 text-base">{isEdit ? 'Edit Preset' : 'Add Preset'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

          {/* Row 1: Category + Contractor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-label">Category</label>
              {customCat ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="modal-input flex-1"
                    placeholder="Custom category name"
                  />
                  <button
                    type="button"
                    onClick={() => { setCustomCat(false); set('category', CATEGORIES[0]) }}
                    className="text-gray-400 hover:text-gray-600 text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={form.category}
                  onChange={e => {
                    if (e.target.value === '__custom__') { setCustomCat(true); set('category', '') }
                    else set('category', e.target.value)
                  }}
                  className="modal-input"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ Custom category…</option>
                </select>
              )}
            </div>
            <div>
              <label className="modal-label">Contractor Name</label>
              <input
                value={form.contractor_name || ''}
                onChange={e => set('contractor_name', e.target.value)}
                className="modal-input"
                placeholder="e.g. Smith Tiling Pty Ltd"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="modal-label">Description <span className="text-red-400">*</span></label>
            <input
              required
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="modal-input"
              placeholder="e.g. Supply and install 600×600 floor tiles"
            />
          </div>

          {/* Row 3: Unit + Cost + Sell */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="modal-label">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className="modal-input">
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="modal-label">Cost Price ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.cost_price || ''}
                onChange={e => set('cost_price', e.target.value)}
                className="modal-input text-right"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="modal-label">Selling Price ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.selling_price || ''}
                onChange={e => set('selling_price', e.target.value)}
                className="modal-input text-right"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Margin read-only display */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            <span className="text-xs text-gray-400 font-medium mr-1">Margin:</span>
            <MarginDisplay cost={form.cost_price} sell={form.selling_price} unit={form.unit} />
          </div>

          {/* Row 5: Notes + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-label">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                className="modal-input resize-none"
                placeholder="Internal notes, special conditions…"
              />
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="modal-label">Status</label>
                <select
                  value={form.status || 'active'}
                  onChange={e => set('status', e.target.value)}
                  className="modal-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="modal-label">Item Code (optional)</label>
                <input
                  value={form.item_code || ''}
                  onChange={e => set('item_code', e.target.value)}
                  className="modal-input"
                  placeholder="e.g. FLR-001"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
