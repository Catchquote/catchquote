import { useState, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

export const GST_RATE = 0.09

export const DEFAULT_AREA_NAMES = [
  'Foyer', 'Living Room', 'Dining Room', 'Kitchen', 'Yard', 'Balcony',
  'Master Bedroom', 'Master Bathroom',
  'Common Bedroom 1', 'Common Bedroom 2', 'Common Bedroom 3', 'Common Bedroom 4', 'Common Bedroom 5',
  'Bathroom 1', 'Bathroom 2', 'Bathroom 3', 'Bathroom 4', 'Bathroom 5',
  'Study Room', 'Utility Room', 'Others',
]

function emptyItem(area = '') {
  return { id: uuidv4(), area, category: 'General Labour', description: '', unit: 'unit', qty: 1, unitPrice: 0 }
}

export function useQuote() {
  const [areas,      setAreas]      = useState([])
  const [items,      setItems]      = useState([])
  const [gstEnabled, setGstEnabled] = useState(true)

  // ── Area operations ────────────────────────────────────────────────────────

  const addArea = useCallback((name) => {
    setAreas(prev => prev.includes(name) ? prev : [...prev, name])
  }, [])

  const removeArea = useCallback((name) => {
    setAreas(prev => prev.filter(a => a !== name))
    setItems(prev => prev.filter(i => i.area !== name))
  }, [])

  const reorderAreas = useCallback((newAreas) => {
    setAreas(newAreas)
  }, [])

  const renameArea = useCallback((oldName, newName) => {
    if (!newName.trim()) return
    setAreas(prev => prev.map(a => a === oldName ? newName : a))
    setItems(prev => prev.map(i => i.area === oldName ? { ...i, area: newName } : i))
  }, [])

  // ── Item operations ────────────────────────────────────────────────────────

  const addItem = useCallback((area, preset = null) => {
    setItems(prev => [
      ...prev,
      preset ? { ...preset, id: uuidv4(), area, qty: preset.qty ?? 1 } : emptyItem(area),
    ])
  }, [])

  const addItems = useCallback((area, presets) => {
    setItems(prev => [
      ...prev,
      ...presets.map(p => ({ ...p, id: uuidv4(), area, qty: p.qty ?? 1 })),
    ])
  }, [])

  const updateItem = useCallback((id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  // Replaces all items for a given area with a new ordered list
  const reorderAreaItems = useCallback((area, newAreaItems) => {
    setItems(prev => [...prev.filter(i => i.area !== area), ...newAreaItems])
  }, [])

  // Called when loading an existing quote from DB
  const resetAll = useCallback((newAreas, newItems) => {
    setAreas(newAreas)
    setItems(newItems)
    setGstEnabled(true)
  }, [])

  // ── Derived state ──────────────────────────────────────────────────────────

  const itemsByArea = useMemo(() => {
    const map = new Map()
    for (const area of areas) {
      map.set(area, items.filter(i => i.area === area))
    }
    return map
  }, [areas, items])

  const areaSubtotals = useMemo(() => {
    const map = new Map()
    for (const [area, areaItems] of itemsByArea) {
      map.set(area, areaItems.reduce(
        (sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0
      ))
    }
    return map
  }, [itemsByArea])

  const subtotal = useMemo(() =>
    items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0),
    [items]
  )
  const gst   = gstEnabled ? subtotal * GST_RATE : 0
  const total = subtotal + gst

  return {
    areas, items, gstEnabled,
    addArea, removeArea, reorderAreas, renameArea,
    addItem, addItems, updateItem, removeItem, reorderAreaItems, resetAll,
    itemsByArea, areaSubtotals,
    subtotal, gst, total,
    setGstEnabled,
  }
}
