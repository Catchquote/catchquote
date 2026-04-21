import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORIES } from '../../data/presetItems.js'

const UNITS = ['item', 'm²', 'lm', 'm³', 'hr', 'day', 'set', 'lot']

export default function LineItemRow({ item, onUpdate, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 999 : undefined, gridTemplateColumns: '24px 1fr 2fr 80px 70px 100px 90px 32px' }}
      className="grid items-center gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-brand-200 hover:shadow-sm transition-all group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="drag-handle text-gray-300 hover:text-gray-500 flex items-center justify-center"
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6-12a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
        </svg>
      </button>

      {/* Category */}
      <select
        value={item.category}
        onChange={e => onUpdate(item.id, 'category', e.target.value)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-700"
      >
        {CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Description */}
      <input
        value={item.description}
        onChange={e => onUpdate(item.id, 'description', e.target.value)}
        placeholder="Item description…"
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 placeholder-gray-300"
      />

      {/* Unit */}
      <select
        value={item.unit}
        onChange={e => onUpdate(item.id, 'unit', e.target.value)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-700"
      >
        {UNITS.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>

      {/* Qty */}
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.qty}
        onChange={e => onUpdate(item.id, 'qty', e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right text-gray-800"
      />

      {/* Unit price */}
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.unitPrice}
        onChange={e => onUpdate(item.id, 'unitPrice', e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right text-gray-800"
        placeholder="0.00"
      />

      {/* Line total */}
      <div className="text-sm font-medium text-right text-gray-900 pr-1">
        {lineTotal > 0 ? `$${lineTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : <span className="text-gray-300">—</span>}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="text-gray-200 hover:text-red-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        title="Remove item"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
