import { useState } from 'react'
import { CATEGORIES, PRESET_ITEMS } from '../../data/presetItems.js'

export default function PresetPicker({ onAdd, onAddBlank }) {
  const [open, setOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0])

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add from Presets
        </button>
        <button
          onClick={onAddBlank}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Blank Line
        </button>
      </div>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="flex">
            {/* Category sidebar */}
            <div className="w-40 bg-gray-50 border-r border-gray-100 flex flex-col py-2 shrink-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`text-left text-xs px-3 py-2 transition-colors ${
                    selectedCat === cat
                      ? 'bg-brand-50 text-brand-700 font-semibold border-r-2 border-brand-500'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="flex-1 p-3 max-h-72 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{selectedCat}</p>
              <div className="flex flex-col gap-1">
                {(PRESET_ITEMS[selectedCat] || []).map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onAdd({ ...preset, category: selectedCat })
                      setOpen(false)
                    }}
                    className="flex items-center justify-between text-left px-3 py-2 rounded-lg hover:bg-brand-50 hover:text-brand-700 group transition-colors"
                  >
                    <span className="text-sm text-gray-700 group-hover:text-brand-700">{preset.description}</span>
                    <span className="text-xs text-gray-400 ml-3 shrink-0">
                      ${preset.unitPrice.toLocaleString()} / {preset.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-400">
            Click a preset to add it to your quote. Prices are editable after adding.
          </div>
        </div>
      )}
    </div>
  )
}
