import { useEffect, useRef, useState } from 'react'
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
  const [loadError,   setLoadError]   = useState('')
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
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('workspace_settings')
          .select('company_name,company_logo_url,brand_colour,tagline,company_address,company_phone,company_email,company_registration,designer_name,designer_position,footer_message,terms_and_conditions,pdf_layout')
          .eq('workspace_id', workspace.id)
          .maybeSingle()
        if (cancelled) return
        if (!error && data) setWsSettings(data)
      } catch { /* non-blocking; PDF export proceeds without logo/settings */ }
    }
    load()
    return () => { cancelled = true }
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
    let cancelled = false
    async function genNumber() {
      try {
        const year = new Date().getFullYear()
        const { count } = await supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
        if (!cancelled) {
          const seq = String((count || 0) + 1).padStart(3, '0')
          setQuote(prev => ({ ...prev, quoteNumber: `QT-${year}-${seq}` }))
        }
      } catch { /* keep the default QT-YYYY-001 if this fails */ }
    }
    genNumber()
    return () => { cancelled = true }
  }, [workspace.id, quoteId])

  // ── Load existing quote ────────────────────────────────────────────────────
  useEffect(() => {
    if (!quoteId) return
    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadError('Loading timed out. Please go back and try again.')
        setPageLoading(false)
      }
    }, 15000)

    async function loadQuote() {
      try {
        const [{ data: q, error: qErr }, { data: qItems, error: iErr }] = await Promise.all([
          supabase.from('quotes').select('*').eq('id', quoteId).single(),
          supabase.from('quote_items').select('*').eq('quote_id', quoteId).order('sort_order', { ascending: true }),
        ])
        if (cancelled) return
        if (qErr) throw qErr
        if (iErr) throw iErr

        if (q) {
          setQuote({
            quoteNumber:   q.quote_number   || '',
            projectTitle:  q.project_name   || '',
            date:          q.quote_date     || q.created_at?.slice(0, 10) || todayISO(),
            validUntil:    q.valid_until    || futureISO(30),
            currency:      q.currency       || 'SGD',
            clientName:    q.client_name    || '',
            clientEmail:   q.client_email   || '',
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
            id:          item.id,
            area:        item.area_of_works || 'General',
            category:    item.category      || 'General Labour',
            description: item.description  || '',
            unit:        item.unit          || 'item',
            qty:         item.quantity      ?? 1,
            unitPrice:   item.unit_price    ?? 0,
          }))
          resetAll(areaOrder, mapped)
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load quote.')
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setPageLoading(false)
      }
    }

    loadQuote()
    return () => { cancelled = true; clearTimeout(timeoutId) }
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
  const [exporting,  setExporting]  = useState(false)
  const [pdfToast,   setPdfToast]   = useState(false)
  const pdfToastTimer = useRef(null)

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    // Yield twice: once so React flushes the disabled-button render before the
    // synchronous jsPDF compression blocks the thread, and once after so any
    // auth/keepalive callbacks queued during the sync block run before we
    // release the exporting flag.
    await new Promise(resolve => setTimeout(resolve, 100))
    try {
      await exportQuotePDF({
        quote, areas, itemsByArea, areaSubtotals,
        subtotal, gst, gstEnabled, total,
        settings: wsSettings,
      })
      // Show download toast for 5 seconds.
      clearTimeout(pdfToastTimer.current)
      setPdfToast(true)
      pdfToastTimer.current = setTimeout(() => setPdfToast(false), 5000)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 0))
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
  if (pageLoading || loadError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onBack={onBack} onNavigate={onNavigate} />
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          {loadError ? (
            <>
              <p className="text-sm text-red-500">{loadError}</p>
              <button onClick={onBack} className="text-sm font-medium text-brand-600 hover:underline">
                ← Back to dashboard
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Loading quote…</p>
          )}
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

      {/* PDF download toast */}
      {pdfToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-white border border-orange-200 shadow-xl rounded-xl px-5 py-4 max-w-sm w-full mx-4 animate-fadeInUp">
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">PDF downloaded successfully!</p>
            <p className="text-xs text-gray-500 mt-0.5">Open it from your Downloads folder for best experience.</p>
          </div>
          <button
            onClick={() => { clearTimeout(pdfToastTimer.current); setPdfToast(false) }}
            className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
