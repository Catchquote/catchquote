import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const GST_RATE = 0.1

function emptyItem() {
  return {
    id: uuidv4(),
    category: 'General Labour',
    description: '',
    unit: 'item',
    qty: 1,
    unitPrice: 0,
  }
}

export function useQuote(initialItems = []) {
  const [items, setItems] = useState(initialItems.length ? initialItems : [emptyItem()])

  const addItem = useCallback((preset = null) => {
    setItems(prev => [
      ...prev,
      preset ? { ...preset, id: uuidv4(), qty: preset.qty ?? 1 } : emptyItem(),
    ])
  }, [])

  const addItems = useCallback((presets) => {
    setItems(prev => [
      ...prev,
      ...presets.map(p => ({ ...p, id: uuidv4(), qty: p.qty ?? 1 })),
    ])
  }, [])

  const updateItem = useCallback((id, field, value) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const removeItem = useCallback(id => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const reorderItems = useCallback(newItems => {
    setItems(newItems)
  }, [])

  const resetItems = useCallback(newItems => {
    setItems(newItems.length ? newItems : [emptyItem()])
  }, [])

  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
  }, 0)

  const gst = subtotal * GST_RATE
  const total = subtotal + gst

  return {
    items,
    addItem,
    addItems,
    updateItem,
    removeItem,
    reorderItems,
    resetItems,
    subtotal,
    gst,
    total,
    GST_RATE,
  }
}
