import { useState } from 'react'
import Header from '../components/layout/Header.jsx'
import QuoteMetaForm from '../components/quote/QuoteMetaForm.jsx'
import LineItemsTable from '../components/quote/LineItemsTable.jsx'
import PresetPicker from '../components/quote/PresetPicker.jsx'
import QuoteSummary from '../components/quote/QuoteSummary.jsx'
import { useQuote } from '../hooks/useQuote.js'
import { exportQuotePDF } from '../utils/pdfExport.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function futureISO(days = 30) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const defaultMeta = {
  quoteNumber: `QT-${String(Date.now()).slice(-4)}`,
  projectTitle: '',
  date: todayISO(),
  validUntil: futureISO(30),
  clientName: '',
  clientEmail: '',
  clientAddress: '',
  notes: 'All prices include materials and labour unless stated otherwise.\nPayment terms: 30% deposit on acceptance, balance on completion.\nThis quote is valid for 30 days.',
}

export default function QuotePage({ onBack }) {
  const [quote, setQuote] = useState(defaultMeta)
  const { items, addItem, updateItem, removeItem, reorderItems, subtotal, gst, total } = useQuote()

  function updateMeta(field, value) {
    setQuote(prev => ({ ...prev, [field]: value }))
  }

  function handleExport() {
    exportQuotePDF({ quote, items, subtotal, gst, total })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onBack={onBack} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {quote.projectTitle || 'New Quote'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {quote.quoteNumber} · {quote.clientName || 'No client set'}
          </p>
        </div>

        <QuoteMetaForm quote={quote} onChange={updateMeta} />

        {/* Line items */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
          <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''} · drag to reorder</span>
        </div>

        <LineItemsTable
          items={items}
          onUpdate={updateItem}
          onRemove={removeItem}
          onReorder={reorderItems}
        />

        <PresetPicker onAdd={addItem} onAddBlank={() => addItem(null)} />

        <QuoteSummary
          subtotal={subtotal}
          gst={gst}
          total={total}
          onExportPDF={handleExport}
        />
      </main>
    </div>
  )
}
