import { useEffect, useRef, useState } from 'react'
import Header from '../components/layout/Header.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const BUCKET = 'workspace-logos'

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

function SaveBar({ saving, msg, label, disabled }) {
  const isError = msg?.startsWith('Error')
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {msg && (
        <span className={`flex items-center gap-1.5 text-sm font-medium ${isError ? 'text-red-500' : 'text-green-600'}`}>
          {!isError && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {msg}
        </span>
      )}
      <button
        type="submit"
        disabled={saving || disabled}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saving && (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

const input = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const textarea = `${input} resize-y min-h-[100px]`

export default function SettingsPage({ onBack, onNavigate }) {
  const { workspace } = useAuth()

  const [branding, setBranding] = useState({
    company_name:         '',
    company_logo_url:     '',
    brand_colour:         '#ea580c',
    tagline:              '',
    company_address:      '',
    company_phone:        '',
    company_email:        '',
    company_registration: '',
    designer_name:        '',
    designer_position:    '',
    footer_message:       'Thank you for your business.',
    pdf_layout:           'modern',
  })
  const [tc, setTc] = useState('')

  const [loading,       setLoading]       = useState(true)
  const [savingBrand,   setSavingBrand]   = useState(false)
  const [brandMsg,      setBrandMsg]      = useState('')
  const [savingTc,      setSavingTc]      = useState(false)
  const [tcMsg,         setTcMsg]         = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState('')
  const logoInputRef = useRef(null)

  // track if either save is running so the other can show as disabled
  const anySaving = savingBrand || savingTc

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
      if (data) {
        setBranding({
          company_name:         data.company_name         ?? '',
          company_logo_url:     data.company_logo_url     ?? '',
          brand_colour:         data.brand_colour         ?? '#ea580c',
          tagline:              data.tagline              ?? '',
          company_address:      data.company_address      ?? '',
          company_phone:        data.company_phone        ?? '',
          company_email:        data.company_email        ?? '',
          company_registration: data.company_registration ?? '',
          designer_name:        data.designer_name        ?? '',
          designer_position:    data.designer_position    ?? '',
          footer_message:       data.footer_message       ?? 'Thank you for your business.',
          pdf_layout:           data.pdf_layout           ?? 'modern',
        })
        setTc(data.terms_and_conditions ?? '')
      }
      setLoading(false)
    }
    load()
  }, [workspace.id])

  function setBrand(field) {
    return e => setBranding(prev => ({ ...prev, [field]: e.target.value }))
  }

  function flashMsg(setMsg, msg) {
    setMsg(msg)
    setTimeout(() => setMsg(''), 6000)
  }

  async function handleSaveBranding(e) {
    e.preventDefault()
    if (savingBrand || savingTc) return
    setSavingBrand(true)
    setBrandMsg('')
    console.log('[Settings] saving branding fields')

    try {
      const payload = { workspace_id: workspace.id, ...branding }
      const { error } = await supabase
        .from('workspace_settings')
        .upsert(payload, { onConflict: 'workspace_id' })
      if (error) throw new Error(error.message)
      console.log('[Settings] branding save OK')
      flashMsg(setBrandMsg, 'Saved.')
    } catch (err) {
      console.error('[Settings] branding save error:', err)
      flashMsg(setBrandMsg, `Error: ${err.message}`)
    } finally {
      setSavingBrand(false)
    }
  }

  async function handleSaveTc(e) {
    e.preventDefault()
    if (savingBrand || savingTc) return
    setSavingTc(true)
    setTcMsg('')
    console.log('[Settings] saving T&C, length:', tc?.length)

    try {
      const { error } = await supabase
        .from('workspace_settings')
        .update({ terms_and_conditions: tc })
        .eq('workspace_id', workspace.id)
      if (error) throw new Error(error.message)
      console.log('[Settings] T&C save OK')
      flashMsg(setTcMsg, 'Saved.')
    } catch (err) {
      console.error('[Settings] T&C save error:', err)
      flashMsg(setTcMsg, `Error: ${err.message}`)
    } finally {
      setSavingTc(false)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File must be under 2 MB.')
      return
    }

    setLogoUploading(true)
    setLogoError('')

    const ext  = file.name.split('.').pop()
    const path = `${workspace.id}/logo.${ext}`

    await supabase.storage.from(BUCKET).remove([path])

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setLogoError(uploadErr.message)
      setLogoUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const urlWithCache = `${publicUrl}?t=${Date.now()}`
    setBranding(prev => ({ ...prev, company_logo_url: urlWithCache }))
    setLogoUploading(false)
  }

  async function handleRemoveLogo() {
    setBranding(prev => ({ ...prev, company_logo_url: '' }))
    const exts = ['png', 'jpg', 'jpeg', 'webp', 'svg']
    await Promise.all(
      exts.map(ext => supabase.storage.from(BUCKET).remove([`${workspace.id}/logo.${ext}`]))
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onBack={onBack} onNavigate={onNavigate} />
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-400">Loading settings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onBack={onBack} onNavigate={onNavigate} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">{workspace.name}</p>
        </div>

        {/* ── Branding form ── */}
        <form onSubmit={handleSaveBranding} noValidate>
          <Section title="Company Branding" description="Used on quotes and PDFs.">

            <Field label="Company Logo" hint="PNG, JPG, WebP or SVG · max 2 MB">
              <div className="flex items-start gap-4">
                {branding.company_logo_url ? (
                  <div className="relative shrink-0">
                    <img
                      src={branding.company_logo_url}
                      alt="Company logo"
                      className="h-16 w-auto max-w-[160px] rounded-lg border border-gray-200 object-contain bg-white p-1"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      title="Remove logo"
                    >×</button>
                  </div>
                ) : (
                  <div className="shrink-0 h-16 w-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M21 12V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading…' : branding.company_logo_url ? 'Replace logo' : 'Upload logo'}
                  </button>
                  {logoError && <p className="text-xs text-red-500">{logoError}</p>}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </Field>

            <Field label="Company Name">
              <input className={input} value={branding.company_name} onChange={setBrand('company_name')} placeholder="Smith Renovations Pty Ltd" />
            </Field>

            <Field label="Brand Primary Colour">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.brand_colour}
                  onChange={setBrand('brand_colour')}
                  className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={branding.brand_colour}
                  onChange={setBrand('brand_colour')}
                  placeholder="#ea580c"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </Field>

            <Field label="Tagline / Slogan">
              <input className={input} value={branding.tagline} onChange={setBrand('tagline')} placeholder="Quality renovations, delivered on time." />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company Phone">
                <input className={input} value={branding.company_phone} onChange={setBrand('company_phone')} placeholder="+65 9000 0000" />
              </Field>
              <Field label="Company Email">
                <input type="email" className={input} value={branding.company_email} onChange={setBrand('company_email')} placeholder="info@company.com.sg" />
              </Field>
            </div>

            <Field label="Company Address">
              <input className={input} value={branding.company_address} onChange={setBrand('company_address')} placeholder="1 Raffles Place, #01-01, Singapore 048616" />
            </Field>

            <Field label="Company Registration Number" hint="UEN or other registration number">
              <input className={input} value={branding.company_registration} onChange={setBrand('company_registration')} placeholder="202312345A" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Designer Name" hint="Appears on quote PDF signature block">
                <input className={input} value={branding.designer_name} onChange={setBrand('designer_name')} placeholder="Jane Smith" />
              </Field>
              <Field label="Designer Position">
                <input className={input} value={branding.designer_position} onChange={setBrand('designer_position')} placeholder="Interior Designer" />
              </Field>
            </div>
          </Section>

          <Section title="Quote Footer" description="Footer message on every quote PDF.">
            <Field label="Footer Message">
              <input className={input} value={branding.footer_message} onChange={setBrand('footer_message')} placeholder="Thank you for your business." />
            </Field>
          </Section>

          <Section title="PDF Layout" description="Choose the visual style for exported quote PDFs.">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  value: 'modern',
                  label: 'Modern',
                  desc: 'Full brand colour header, light section bands, alternating row shading.',
                },
                {
                  value: 'classic',
                  label: 'Classic',
                  desc: 'Clean white background, brand colour accents only on headers and totals.',
                },
              ].map(({ value, label, desc }) => {
                const selected = branding.pdf_layout === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBranding(prev => ({ ...prev, pdf_layout: value }))}
                    className={`text-left px-4 py-4 rounded-xl border-2 transition-colors ${selected ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-brand-600' : 'border-gray-300'}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-brand-600"/>}
                      </div>
                      <span className={`text-sm font-semibold ${selected ? 'text-brand-700' : 'text-gray-700'}`}>{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pl-6">{desc}</p>
                  </button>
                )
              })}
            </div>
          </Section>

          <SaveBar saving={savingBrand} msg={brandMsg} label="Save Branding" disabled={anySaving && !savingBrand} />
        </form>

        {/* ── T&C form ── */}
        <form onSubmit={handleSaveTc} noValidate className="mt-8">
          <Section title="Terms &amp; Conditions" description="Printed on the final page of every quote PDF.">
            <div>
              <textarea
                className={textarea}
                value={tc}
                onChange={e => setTc(e.target.value)}
                rows={12}
                placeholder={"1. All prices are in SGD and include GST where applicable.\n2. A 30% deposit is required upon acceptance.\n3. This quote is valid for 30 days from the date issued.\n4. …"}
              />
              <p className="text-xs text-gray-400 mt-1.5 text-right">
                {tc.length.toLocaleString()} characters
              </p>
            </div>
          </Section>

          <SaveBar saving={savingTc} msg={tcMsg} label="Save Terms & Conditions" disabled={anySaving && !savingTc} />
        </form>
      </main>
    </div>
  )
}
