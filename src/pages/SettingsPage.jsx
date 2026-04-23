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

const input = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const textarea = `${input} resize-y min-h-[100px]`

export default function SettingsPage({ onBack, onNavigate }) {
  const { workspace } = useAuth()
  const [settings, setSettings] = useState({
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
    terms_and_conditions: '',
    footer_message:       'Thank you for your business.',
  })
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saveMsg,      setSaveMsg]      = useState('')
  const [savingTc,     setSavingTc]     = useState(false)
  const [saveTcMsg,    setSaveTcMsg]    = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,    setLogoError]    = useState('')
  const logoInputRef   = useRef(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
      if (data) {
        setSettings(prev => ({
          ...prev,
          company_name:         data.company_name         ?? prev.company_name,
          company_logo_url:     data.company_logo_url     ?? prev.company_logo_url,
          brand_colour:         data.brand_colour         ?? prev.brand_colour,
          tagline:              data.tagline              ?? prev.tagline,
          company_address:      data.company_address      ?? prev.company_address,
          company_phone:        data.company_phone        ?? prev.company_phone,
          company_email:        data.company_email        ?? prev.company_email,
          company_registration: data.company_registration ?? prev.company_registration,
          designer_name:        data.designer_name        ?? prev.designer_name,
          designer_position:    data.designer_position    ?? prev.designer_position,
          terms_and_conditions: data.terms_and_conditions ?? prev.terms_and_conditions,
          footer_message:       data.footer_message       ?? prev.footer_message,
        }))
      }
      setLoading(false)
    }
    load()
  }, [workspace.id])

  function set(field) {
    return e => setSettings(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    console.log('[Settings] handleSave called')
    setSaving(true)
    setSaveMsg('')

    try {
      const brandingPayload = {
        workspace_id:         workspace.id,
        company_name:         settings.company_name,
        company_logo_url:     settings.company_logo_url,
        brand_colour:         settings.brand_colour,
        tagline:              settings.tagline,
        company_address:      settings.company_address,
        company_phone:        settings.company_phone,
        company_email:        settings.company_email,
        company_registration: settings.company_registration,
        designer_name:        settings.designer_name,
        designer_position:    settings.designer_position,
        footer_message:       settings.footer_message,
      }
      console.log('[Settings] upserting branding fields:', brandingPayload)

      const { error: brandErr } = await Promise.race([
        supabase.from('workspace_settings').upsert(brandingPayload, { onConflict: 'workspace_id' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out — Supabase may still be waking up. Try again in a moment.')), 20000)
        ),
      ])
      if (brandErr) throw new Error(brandErr.message)
      console.log('[Settings] branding save OK')

      setSaveMsg('Settings saved.')
    } catch (err) {
      console.error('[Settings] save error:', err)
      setSaveMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 6000)
    }
  }

  async function handleSaveTc() {
    setSavingTc(true)
    setSaveTcMsg('')
    console.log('[Settings] saving T&C, length:', settings.terms_and_conditions?.length)

    try {
      const { error } = await supabase
        .from('workspace_settings')
        .update({ terms_and_conditions: settings.terms_and_conditions })
        .eq('workspace_id', workspace.id)

      if (error) throw new Error(error.message)
      console.log('[Settings] T&C save OK')
      setSaveTcMsg('Saved.')
    } catch (err) {
      console.error('[Settings] T&C save error:', err)
      setSaveTcMsg(`Error: ${err.message}`)
    } finally {
      setSavingTc(false)
      setTimeout(() => setSaveTcMsg(''), 6000)
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

    const ext      = file.name.split('.').pop()
    const path     = `${workspace.id}/logo.${ext}`

    // Remove old logo first (ignore errors — may not exist)
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
    // Bust the browser cache with a timestamp query param
    const urlWithCache = `${publicUrl}?t=${Date.now()}`
    setSettings(prev => ({ ...prev, company_logo_url: urlWithCache }))
    setLogoUploading(false)
  }

  async function handleRemoveLogo() {
    setSettings(prev => ({ ...prev, company_logo_url: '' }))
    // Best-effort removal from storage; errors are non-critical
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

        <form onSubmit={handleSave} noValidate>
          {/* ── Company branding ── */}
          <Section title="Company Branding" description="Used on quotes and PDFs.">

            {/* Logo */}
            <Field label="Company Logo" hint="PNG, JPG, WebP or SVG · max 2 MB">
              <div className="flex items-start gap-4">
                {settings.company_logo_url ? (
                  <div className="relative shrink-0">
                    <img
                      src={settings.company_logo_url}
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
                    {logoUploading ? 'Uploading…' : settings.company_logo_url ? 'Replace logo' : 'Upload logo'}
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

            {/* Company name */}
            <Field label="Company Name">
              <input className={input} value={settings.company_name} onChange={set('company_name')} placeholder="Smith Renovations Pty Ltd" />
            </Field>

            {/* Brand colour */}
            <Field label="Brand Primary Colour">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.brand_colour}
                  onChange={set('brand_colour')}
                  className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={settings.brand_colour}
                  onChange={set('brand_colour')}
                  pattern="^#[0-9a-fA-F]{6}$"
                  placeholder="#ea580c"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </Field>

            {/* Tagline */}
            <Field label="Tagline / Slogan">
              <input className={input} value={settings.tagline} onChange={set('tagline')} placeholder="Quality renovations, delivered on time." />
            </Field>

            {/* Two-column contact fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company Phone">
                <input className={input} value={settings.company_phone} onChange={set('company_phone')} placeholder="+61 400 000 000" />
              </Field>
              <Field label="Company Email">
                <input type="email" className={input} value={settings.company_email} onChange={set('company_email')} placeholder="info@smithreno.com.au" />
              </Field>
            </div>

            <Field label="Company Address">
              <input className={input} value={settings.company_address} onChange={set('company_address')} placeholder="123 Main St, Sydney NSW 2000" />
            </Field>

            <Field label="Company Registration Number" hint="ABN, ACN, or other registration number">
              <input className={input} value={settings.company_registration} onChange={set('company_registration')} placeholder="12 345 678 901" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Designer Name" hint="Appears on quote PDF signature block">
                <input className={input} value={settings.designer_name} onChange={set('designer_name')} placeholder="Jane Smith" />
              </Field>
              <Field label="Designer Position">
                <input className={input} value={settings.designer_position} onChange={set('designer_position')} placeholder="Interior Designer" />
              </Field>
            </div>
          </Section>

          {/* ── Quote footer ── */}
          <Section title="Quote Footer" description="Appears at the bottom of every quote PDF.">
            <Field label="Footer Message">
              <input className={input} value={settings.footer_message} onChange={set('footer_message')} placeholder="Thank you for your business." />
            </Field>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Terms &amp; Conditions</label>
              <textarea
                className={textarea}
                value={settings.terms_and_conditions}
                onChange={set('terms_and_conditions')}
                rows={10}
                placeholder={"1. All prices are in SGD and include GST where applicable.\n2. A 30% deposit is required upon acceptance.\n3. This quote is valid for 30 days from the date issued.\n4. …"}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {(settings.terms_and_conditions || '').length.toLocaleString()} characters
                </p>
                <div className="flex items-center gap-3">
                  {saveTcMsg && (
                    <p className={`text-xs font-medium ${saveTcMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                      {saveTcMsg}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTc}
                    disabled={savingTc}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {savingTc ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Saving…
                      </>
                    ) : 'Save Terms & Conditions'}
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Save bar */}
          <div className="flex items-center justify-between gap-4 py-4">
            <p className={`text-sm font-medium transition-opacity ${saveMsg ? 'opacity-100' : 'opacity-0'} ${saveMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMsg || '—'}
            </p>
            <button
              type="submit"
              disabled={saving || logoUploading}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
