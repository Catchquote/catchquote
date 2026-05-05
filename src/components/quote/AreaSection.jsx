import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import LineItemRow from './LineItemRow.jsx'

function fmtAmt(n, currency = 'SGD') {
  return `${currency} ${Number(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const COL_GRID = '20px 100px 1fr 72px 64px 92px 80px 28px'

export default function AreaSection({
  areaName, items, subtotal, currency,
  isFirst, isLast,
  onUpdate, onRemove, onReorder,
  onDeleteArea, onMoveUp, onMoveDown,
  onAddBlank, onOpenPresets,
}) {
  const [collapsed, setCollapsed] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd({ active, over }) {
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex(i => i.id === active.id)
      const newIdx = items.findIndex(i => i.id === over.id)
      onReorder(arrayMove(items, oldIdx, newIdx))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden shadow-sm">

      {/* ── Area header ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Area name */}
        <span className="font-semibold text-gray-900 text-sm flex-1 truncate">{areaName}</span>

        {/* Item count badge */}
        <span className="text-xs text-gray-400 shrink-0">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>

        {/* Subtotal */}
        <span className="text-sm font-semibold text-gray-700 shrink-0 ml-2">
          {fmtAmt(subtotal, currency)}
        </span>

        {/* Move up / down */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move area up"
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="Move area down"
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Delete area */}
        <button
          onClick={onDeleteArea}
          title="Delete area"
          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Body (collapsible) ── */}
      {!collapsed && (
        <>
          {/* Horizontally scrollable table area */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: '540px' }}>
              {/* Column headers */}
              {items.length > 0 && (
                <div
                  className="grid items-center px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  style={{ gridTemplateColumns: COL_GRID }}
                >
                  <span />
                  <span>Category</span>
                  <span>Description</span>
                  <span>Unit</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
              )}

              {/* DnD item rows */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1 p-2">
                    {items.map(item => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        colGrid={COL_GRID}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {items.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-400">
                  No items yet — add below.
                </div>
              )}
            </div>
          </div>

          {/* Add buttons */}
          <div className="flex items-center gap-2 px-3 pb-3 pt-1 border-t border-gray-100">
            <button
              onClick={onAddBlank}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Item
            </button>
            <button
              onClick={onOpenPresets}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              From Presets
            </button>
          </div>
        </>
      )}
    </div>
  )
}
