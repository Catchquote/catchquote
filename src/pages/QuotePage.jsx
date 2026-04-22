import { useEffect, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import QuoteMetaForm from '../components/quote/QuoteMetaForm.jsx'
import LineItemsTable from '../components/quote/LineItemsTable.jsx'
import PresetPicker from '../components/quote/PresetPicker.jsx'
import QuoteSummary from '../components/quote/QuoteSummary.jsx'
import { useQuote } from '../hooks/useQuote.js'
import { exportQuotePDF } from '../utils/pdfExport.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

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

export default function QuotePage({ quoteId, onBack, onNavigate }) {
  const { user, workspace } = useAuth()
  const [quote, setQuote] = useState(defaultMeta)
  const [savedQuoteId, setSavedQuoteId] = useState(quoteId || null)
  const [pageLoading, setPageLoading] = useState(!!quoteId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const { items, addItem, addItems, updateItem, removeItem, reorderItems, resetItems, subtotal, gst, total } = useQuote()

  useEffect(() => {
    if (!quoteId) return

    async function loadQuote() {
      const { data: q } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single()

      const { data: qItems } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order')

      if (q) {
        setQuote({
          quoteNumber: q.quote_number || defaultMeta.quoteNumber,
          projectTitle: q.project_name || '',
          date: q.created_at?.slice(0, 10) || todayISO(),
          validUntil: futureISO(30),
          clientName: q.client_name || '',
          clientEmail: q.client_email || '',
          clientAddress: '',
          notes: q.notes || defaultMeta.notes,
        })
      }

      if (qItems?.length) {
        resetItems(qItems.map(item => ({
          id: item.id,
          category: 'General Labour',
          description: item.description || '',
          unit: item.unit || 'item',
          qty: item.quantity ?? 1,
          unitPrice: item.unit_price ?? 0,
        })))
      }

      setPageLoading(false)
    }

    loadQuote()
  }, [quoteId])

  function updateMeta(field, value) {
    setQuote(prev => ({ ...prev, [field]: value }))
  }

  function handleExport() {
    exportQuotePDF({ quote, items, subtotal, gst, total })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    try {
      const quotePayload = {
        user_id:      user.id,
        workspace_id: workspace.id,
        created_by:   user.id,
        quote_number: quote.quoteNumber,
        client_name:  quote.clientName,
        client_email: quote.clientEmail,
        project_name: quote.projectTitle,
        notes:        quote.notes,
        subtotal,
        gst,
        total,
      }

      let currentId = savedQuoteId

      if (currentId) {
        // Exclude workspace_id and created_by from updates (set once on insert)
        const { workspace_id, created_by, ...updatePayload } = quotePayload
        const { error } = await supabase.from('quotes').update(updatePayload).eq('id', currentId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert({ ...quotePayload, status: 'draft' })
          .select('id')
          .single()
        if (error) throw error
        currentId = data.id
        setSavedQuoteId(currentId)
      }

      // Replace all line items
      await supabase.from('quote_items').delete().eq('quote_id', currentId)

      if (items.length > 0) {
        const { error } = await supabase.from('quote_items').insert(
          items.map((item, index) => ({
            quote_id:   currentId,
            description: item.description,
            quantity:   item.qty,
            unit:       item.unit,
            unit_price: item.unitPrice,
            sort_order: index,
          }))
        )
        if (error) throw error
      }
    } catch (err) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onBack={onBack} onNavigate={onNavigate} />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-sm">Loading quote…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onBack={onBack} onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {quote.projectTitle || 'New Quote'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {quote.quoteNumber} · {quote.clientName || 'No client set'}
            {savedQuoteId && <span className="ml-2 text-green-600">· Saved</span>}
          </p>
        </div>

        <QuoteMetaForm quote={quote} onChange={updateMeta} />

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

        <PresetPicker onAddItems={addItems} onAddBlank={() => addItem(null)} />

        {saveError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
        )}

        <QuoteSummary
          subtotal={subtotal}
          gst={gst}
          total={total}
          onExportPDF={handleExport}
          onSaveQuote={handleSave}
          saving={saving}
        />
      </main>
    </div>
  )
}
