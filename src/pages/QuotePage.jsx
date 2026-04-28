import { useEffect, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import QuoteMetaForm from '../components/quote/QuoteMetaForm.jsx'
import AreaSection from '../components/quote/AreaSection.jsx'
import AddAreaModal from '../components/quote/AddAreaModal.jsx'
import PresetPicker from '../components/quote/PresetPicker.jsx'
import QuoteSummary from '../components/quote/QuoteSummary.jsx'
import { useQuote } from '../hooks/useQuote.js'
import { exportQuotePDF } from '../utils/pdfExport.js'
import { supabase } from '../lib/supabase.js'
import { useAuth, TRIAL_QUOTE_LIMIT } from '../context/AuthContext.jsx'

function todayISO()       { return new Date().toISOString().slice(0, 10) }
function futureISO(days)  { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

function defaultMeta() {
  const year = new Date().getFullYear()
  return {
    quoteNumber:   `QT-${year}-001`,
    projectTitle:  '',
    date:          todayISO(),
    validUntil:    futureISO(30),
    currency:      'SGD',
    clientName:    '',
    clientEmail:   '',
    clientContact: '',
    clientAddress: '',
    projectAddress:'',
    designerName:  '',
    notes:         '',
  }
}

export default function QuotePage({ quoteId, onBack, onNavigate }) {
  const { user, workspace, isTrial } = useAuth()

  const [quote,       setQuote]       = useState(defaultMeta)
  const [savedId,     setSavedId]     = useState(quoteId || null)
  const [pageLoading, setPageLoading] = useState(!!quoteId)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')
  const [wsSettings,  setWsSettings]  = useState(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [presetModal, setPresetModal] = useState(null)  // { defaultArea } or null

  const {
    areas, items, gstEnabled,
    addArea, removeArea, reorderAreas,
    addItem, addItems, updateItem, removeItem, reorderAreaItems,
    itemsByArea, areaSubtotals,
    subtotal, gst, total,
    setGstEnabled, resetAll,
  } = useQuote()

  // ── Load workspace settings ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('workspace_settings')
        .select('company_name,company_logo_url,brand_colour,tagline,company_address,company_phone,company_email,company_registration,designer_name,designer_position,footer_message,terms_and_conditions,pdf_layout')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
      if (data) setWsSettings(data)
    }
    load()
  }, [workspace.id])

  // ── Pre-fill designer name from settings ────────────────────────────────────
  useEffect(() => {
    if (wsSettings?.designer_name && !quoteId) {
      setQuote(prev => ({ ...prev, designerName: prev.designerName || wsSettings.designer_name }))
    }
  }, [wsSettings, quoteId])

  // ── Auto-generate sequential quote number ───────────────────────────────────
  useEffect(() => {
    if (quoteId) return
    async function genNumber() {
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
      const seq = String((count || 0) + 1).padStart(3, '0')
      setQuote(prev => ({ ...prev, quoteNumber: `QT-${year}-${seq}` }))
    }
    genNumber()
  }, [workspace.id, quoteId])

  // ── Load existing quote ────────────────────────────────────────────────────
  useEffect(() => {
    if (!quoteId) return

    async function loadQuote() {
      const [{ data: q }, { data: qItems }] = await Promise.all([
        supabase.from('quotes').select('*').eq('id', quoteId).single(),
        supabase.from('quote_items').select('*').eq('quote_id', quoteId).order('sort_order', { ascending: true }),
      ])

      if (q) {
        setQuote({
          quoteNumber:   q.quote_number  || '',
          projectTitle:  q.project_name  || '',
          date:          q.quote_date    || q.created_at?.slice(0, 10) || todayISO(),
          validUntil:    q.valid_until   || futureISO(30),
          currency:      q.currency      || 'SGD',
          clientName:    q.client_name   || '',
          clientEmail:   q.client_email  || '',
          clientContact: q.client_contact || '',
          clientAddress: q.client_address || '',
          projectAddress:q.project_address || '',
          designerName:  q.designer_name  || '',
          notes:         q.notes          || '',
        })
      }

      if (qItems?.length) {
        const areaOrder = []
        for (const item of qItems) {
          const area = item.area_of_works || 'General'
          if (!areaOrder.includes(area)) areaOrder.push(area)
        }
        const mapped = qItems.map(item => ({
          id:        item.id,
          area:      item.area_of_works || 'General',
          category:  item.category      || 'General Labour',
          description: item.description || '',
          unit:      item.unit          || 'item',
          qty:       item.quantity      ?? 1,
          unitPrice: item.unit_price    ?? 0,
        }))
        resetAll(areaOrder, mapped)
      }

      setPageLoading(false)
    }

    loadQuote()
  }, [quoteId])

  function updateMeta(field, value) {
    setQuote(prev => ({ ...prev, [field]: value }))
  }

  // ── Area management ────────────────────────────────────────────────────────
  function handleMoveAreaUp(name) {
    const idx = areas.indexOf(name)
    if (idx <= 0) return
    const next = [...areas]
    next.splice(idx - 1, 0, next.splice(idx, 1)[0])
    reorderAreas(next)
  }

  function handleMoveAreaDown(name) {
    const idx = areas.indexOf(name)
    if (idx >= areas.length - 1) return
    const next = [...areas]
    next.splice(idx + 1, 0, next.splice(idx, 1)[0])
    reorderAreas(next)
  }

  function handleDeleteArea(name) {
    const count = itemsByArea.get(name)?.length ?? 0
    if (count > 0 && !window.confirm(`Delete "${name}" and its ${count} item${count !== 1 ? 's' : ''}?`)) return
    removeArea(name)
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      // Defer off the current call stack so React can flush the button-disabled
      // state before the synchronous jsPDF work blocks the thread.
      await new Promise(resolve => setTimeout(resolve, 50))
      await exportQuotePDF({
        quote, areas, itemsByArea, areaSubtotals,
        subtotal, gst, gstEnabled, total,
        settings: wsSettings,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveError('')

    try {
      if (!savedId && isTrial) {
        const { count, error: ce } = await supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
        if (!ce && count >= TRIAL_QUOTE_LIMIT) {
          setSaveError(`Trial limit reached (${TRIAL_QUOTE_LIMIT} quotes). Upgrade to Pro to save more.`)
          return
        }
      }

      const payload = {
        user_id:        user.id,
        workspace_id:   workspace.id,
        created_by:     user.id,
        quote_number:   quote.quoteNumber,
        client_name:    quote.clientName,
        client_email:   quote.clientEmail,
        client_contact: quote.clientContact,
        client_address: quote.clientAddress,
        project_name:   quote.projectTitle,
        project_address:quote.projectAddress,
        quote_date:     quote.date,
        valid_until:    quote.validUntil,
        currency:       quote.currency,
        designer_name:  quote.designerName,
        notes:          quote.notes,
        subtotal,
        gst:            gstEnabled ? gst : 0,
        total,
      }

      let currentId = savedId

      if (currentId) {
        const { workspace_id, created_by, ...update } = payload
        const { error } = await supabase.from('quotes').update(update).eq('id', currentId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert({ ...payload, status: 'draft' })
          .select('id')
          .single()
        if (error) throw error
        currentId = data.id
        setSavedId(currentId)
      }

      // Rebuild items in area order
      await supabase.from('quote_items').delete().eq('quote_id', currentId)

      const rows = []
      let order = 0
      for (const area of areas) {
        for (const item of itemsByArea.get(area) ?? []) {
          rows.push({
            quote_id:      currentId,
            area_of_works: item.area,
            category:      item.category,
            description:   item.description,
            quantity:      item.qty,
            unit:          item.unit,
            unit_price:    item.unitPrice,
            sort_order:    order++,
          })
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('quote_items').insert(rows)
        if (error) throw error
      }
    } catch (err) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Title bar */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {quote.projectTitle || 'New Quote'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {quote.quoteNumber}
              {quote.clientName && ` · ${quote.clientName}`}
              {savedId && <span className="ml-2 text-green-600 font-medium">· Saved</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 rounded-lg font-medium text-sm border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Meta form */}
        <QuoteMetaForm quote={quote} onChange={updateMeta} wsSettings={wsSettings} />

        {/* Areas of works */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Areas of Works
            </h2>
            <span className="text-xs text-gray-400">
              {areas.length} area{areas.length !== 1 ? 's' : ''} · {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {areas.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-14 text-center">
              <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <p className="text-gray-400 text-sm mb-4">No areas added yet</p>
              <button
                onClick={() => setShowAddArea(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                + Add First Area
              </button>
            </div>
          ) : (
            areas.map((area, idx) => (
              <AreaSection
                key={area}
                areaName={area}
                items={itemsByArea.get(area) ?? []}
                subtotal={areaSubtotals.get(area) ?? 0}
                currency={quote.currency}
                isFirst={idx === 0}
                isLast={idx === areas.length - 1}
                onUpdate={updateItem}
                onRemove={removeItem}
                onReorder={newItems => reorderAreaItems(area, newItems)}
                onDeleteArea={() => handleDeleteArea(area)}
                onMoveUp={() => handleMoveAreaUp(area)}
                onMoveDown={() => handleMoveAreaDown(area)}
                onAddBlank={() => addItem(area)}
                onOpenPresets={() => setPresetModal({ defaultArea: area })}
              />
            ))
          )}

          {areas.length > 0 && (
            <button
              onClick={() => setShowAddArea(true)}
              className="mt-1 flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-600 transition-colors py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Area
            </button>
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
        )}

        {/* Summary */}
        <QuoteSummary
          subtotal={subtotal}
          gst={gst}
          gstEnabled={gstEnabled}
          total={total}
          currency={quote.currency}
          onToggleGst={() => setGstEnabled(v => !v)}
          onExportPDF={handleExport}
          exporting={exporting}
          onSaveQuote={handleSave}
          saving={saving}
        />
      </main>

      {/* Add area modal */}
      {showAddArea && (
        <AddAreaModal
          existingAreas={areas}
          onAdd={name => { addArea(name); setShowAddArea(false) }}
          onClose={() => setShowAddArea(false)}
        />
      )}

      {/* Preset picker modal */}
      {presetModal && (
        <PresetPicker
          areas={areas}
          defaultArea={presetModal.defaultArea}
          onAdd={(area, presets) => { addItems(area, presets); setPresetModal(null) }}
          onClose={() => setPresetModal(null)}
        />
      )}
    </div>
  )
}
