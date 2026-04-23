import { useState } from 'react'
import { DEFAULT_AREA_NAMES } from '../../hooks/useQuote.js'

export default function AddAreaModal({ existingAreas, onAdd, onClose }) {
  const [custom, setCustom] = useState('')

  function handlePreset(name) {
    onAdd(name)
  }

  function handleCustom(e) {
    e.preventDefault()
    const trimmed = custom.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setCustom('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Add Area of Works</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preset area names */}
        <div className="p-4 max-h-72 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Common areas</p>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_AREA_NAMES.map(name => {
              const already = existingAreas.includes(name)
              return (
                <button
                  key={name}
                  onClick={() => !already && handlePreset(name)}
                  disabled={already}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                    already
                      ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {name}
                  {already && <span className="ml-1 text-xs text-gray-300">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom area input */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Custom area</p>
          <form onSubmit={handleCustom} className="flex gap-2">
            <input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="e.g. Bomb Shelter, Store Room…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!custom.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
