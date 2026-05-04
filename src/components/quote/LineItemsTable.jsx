import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import LineItemRow from './LineItemRow.jsx'

// Shared column template used by both the header and every row so they stay aligned.
// Minimum content width (640 px) is enforced by the scroll wrapper so mobile users
// can horizontally scroll rather than having columns squish to unreadable widths.
const COL_GRID = '24px 1fr 2fr 80px 70px 100px 90px 32px'

export default function LineItemsTable({ items, onUpdate, onRemove, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onReorder(arrayMove(items, oldIndex, newIndex))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Horizontal scroll container — keeps columns readable on narrow screens */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: '640px' }}>
          {/* Column headers */}
          <div
            className="grid px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide"
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

          {/* Sortable rows */}
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
            <div className="text-center py-10 text-gray-400 text-sm">
              No items yet — add one below.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
