import { useState, useEffect } from 'react'

const CONTACT_EMAIL = 'info@catchquote.io'
const CONTACT       = `mailto:${CONTACT_EMAIL}`

/* ─── Shared components ─────────────────────────────────────── */

const LONG_LOGO  = "https://ljognnvocvcqnsfjskpo.supabase.co/storage/v1/object/public/Catchquote's%20logo/logo/long%20logo%20transparent%20bg.png"
const SQUARE_LOGO = "https://ljognnvocvcqnsfjskpo.supabase.co/storage/v1/object/public/Catchquote's%20logo/logo/logo%20transparent%20bg.png"

function Logo({ light = false }) {
  return <img src={LONG_LOGO} alt="CatchQuote" className="h-10 w-auto" />
}

function Check({ white = false }) {
  return (
    <svg className={`w-5 h-5 shrink-0 mt-0.5 ${white ? 'text-brand-300' : 'text-brand-600'}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  )
}

/* ─── Hero: Quote Builder Mockup ────────────────────────────── */

function QuoteMockup() {
  return (
    <div className="rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white w-full max-w-[460px] mx-auto">
      {/* Browser chrome */}
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"/>
          <div className="w-3 h-3 rounded-full bg-yellow-400"/>
          <div className="w-3 h-3 rounded-full bg-green-400"/>
        </div>
        <div className="ml-2 flex-1 bg-white rounded-md text-xs text-gray-400 px-3 py-1 text-center truncate">
          catchquote.io/quote
        </div>
      </div>

      {/* Quote header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-sm text-gray-900">QT-2025-0042</div>
            <div className="text-xs text-gray-400 mt-0.5">Chan Residence · 8 Tampines Ave</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Valid Until</div>
            <div className="text-xs font-medium text-gray-600">31 Mar 2025</div>
          </div>
        </div>
      </div>

      {/* Area 1: Living Room */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex justify-between items-center bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-lg mb-2">
          <span>Living Room</span>
          <span className="tabular-nums">SGD 5,515</span>
        </div>
        <div className="pl-1 space-y-0">
          {/* Column headers */}
          <div className="grid text-[10px] text-gray-400 uppercase tracking-wide pb-1" style={{gridTemplateColumns:'1fr 32px 28px 52px 52px'}}>
            <span>Description</span><span className="text-center">Unit</span><span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-right">Total</span>
          </div>
          {[
            ['Vinyl plank flooring',  'm²',  '45', '75.00', '3,375'],
            ['Feature wall paint',    'm²',  '20', '95.00', '1,900'],
            ['Power points install',  'unit', '2', '120.00',  '240'],
          ].map(([desc, unit, qty, price, total]) => (
            <div key={desc} className="grid items-center text-[11px] py-1 border-b border-gray-50" style={{gridTemplateColumns:'1fr 32px 28px 52px 52px'}}>
              <span className="text-gray-700 truncate pr-1">{desc}</span>
              <span className="text-gray-400 text-center">{unit}</span>
              <span className="text-right text-gray-600">{qty}</span>
              <span className="text-right tabular-nums text-gray-600">{price}</span>
              <span className="text-right font-medium tabular-nums text-gray-900">{total}</span>
            </div>
          ))}
          <div className="flex justify-end text-[11px] pt-1.5">
            <span className="text-gray-400 mr-1.5">Subtotal:</span>
            <span className="font-semibold text-gray-700 tabular-nums">SGD 5,515</span>
          </div>
        </div>
      </div>

      {/* Area 2: Master Bedroom */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex justify-between items-center bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-lg mb-2">
          <span>Master Bedroom</span>
          <span className="tabular-nums">SGD 2,340</span>
        </div>
        <div className="pl-1">
          {[
            ['Vinyl plank flooring', 'm²',  '18', '75.00', '1,350'],
            ['Ceiling board & skim', 'm²',  '18', '55.00',   '990'],
          ].map(([desc, unit, qty, price, total]) => (
            <div key={desc} className="grid items-center text-[11px] py-1 border-b border-gray-50" style={{gridTemplateColumns:'1fr 32px 28px 52px 52px'}}>
              <span className="text-gray-700 truncate pr-1">{desc}</span>
              <span className="text-gray-400 text-center">{unit}</span>
              <span className="text-right text-gray-600">{qty}</span>
              <span className="text-right tabular-nums text-gray-600">{price}</span>
              <span className="text-right font-medium tabular-nums text-gray-900">{total}</span>
            </div>
          ))}
          <div className="flex justify-end text-[11px] pt-1.5">
            <span className="text-gray-400 mr-1.5">Subtotal:</span>
            <span className="font-semibold text-gray-700 tabular-nums">SGD 2,340</span>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Subtotal</span><span className="tabular-nums">SGD 7,855</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-2.5">
          <span>GST (9%)</span><span className="tabular-nums">SGD 707</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-2.5">
          <span className="font-bold text-sm text-gray-900">Total</span>
          <span className="font-extrabold text-xl text-brand-600 tabular-nums">SGD 8,562</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Speed: Preset Picker Mockup ───────────────────────────── */

function PresetPickerMockup() {
  return (
    <div className="rounded-2xl shadow-xl border border-gray-200 bg-white overflow-hidden w-full max-w-[340px] mx-auto">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-sm text-gray-900">Add Presets</span>
        <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">Living Room</span>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <span className="text-xs text-gray-400">Search presets…</span>
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
        {['Flooring', 'Tiling', 'Electrical', 'Painting'].map((cat, i) => (
          <span key={cat} className={`text-xs px-2.5 py-1 rounded-full font-medium ${i === 0 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {cat}
          </span>
        ))}
      </div>

      <div className="px-4 pb-1 divide-y divide-gray-50">
        {[
          { desc: 'Vinyl plank supply & install', price: '$75/m²',  checked: true },
          { desc: 'Engineered timber flooring',   price: '$110/m²', checked: true },
          { desc: 'Laminate flooring supply & lay',price: '$65/m²',  checked: false },
          { desc: 'Carpet supply & lay (standard)',price: '$55/m²',  checked: false },
        ].map(({ desc, price, checked }) => (
          <div key={desc} className="flex items-center gap-3 py-2.5">
            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${checked ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
              {checked && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-800 truncate">{desc}</div>
            </div>
            <div className="text-xs text-gray-400 tabular-nums shrink-0">{price}</div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">2 selected</span>
        <button className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors">
          Add 2 to Quote
        </button>
      </div>
    </div>
  )
}

/* ─── Margins: Preset Library Table Mockup ──────────────────── */

function PresetTableMockup() {
  const rows = [
    { cat: 'Flooring',    catCls: 'bg-blue-100 text-blue-700',    desc: 'Vinyl plank supply & install',       sell: '$75',  margin: 32 },
    { cat: 'Flooring',    catCls: 'bg-blue-100 text-blue-700',    desc: 'Engineered timber flooring',         sell: '$110', margin: 28 },
    { cat: 'Tiling',      catCls: 'bg-purple-100 text-purple-700',desc: 'Floor tiles supply & lay',           sell: '$85',  margin: 41 },
    { cat: 'Electrical',  catCls: 'bg-yellow-100 text-yellow-800',desc: 'LED downlight supply & install',     sell: '$95',  margin: 18 },
    { cat: 'General',     catCls: 'bg-gray-100 text-gray-600',    desc: 'Site clean-up (per visit)',          sell: '$350', margin: 8  },
  ]

  function marginCls(m) {
    if (m >= 20) return 'bg-green-100 text-green-700'
    if (m >= 10) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-600'
  }

  return (
    <div className="rounded-2xl shadow-xl border border-gray-200 bg-white overflow-hidden w-full max-w-[480px] mx-auto">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <span className="font-semibold text-sm text-gray-900">Preset Library</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <span className="text-xs text-gray-300">Search…</span>
          </div>
          <button className="text-xs font-semibold bg-brand-600 text-white px-3 py-1.5 rounded-lg">+ Add</button>
        </div>
      </div>

      {/* Table header */}
      <div className="grid px-4 py-2 bg-gray-50 border-b border-gray-100" style={{gridTemplateColumns:'90px 1fr 56px 44px 52px'}}>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Category</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Description</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center flex items-center justify-center gap-1">
          Cost
          <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd"/>
          </svg>
        </span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Sell</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Margin</span>
      </div>

      {rows.map(({ cat, catCls, desc, sell, margin }) => (
        <div key={desc} className="grid items-center px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors" style={{gridTemplateColumns:'90px 1fr 56px 44px 52px'}}>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${catCls}`}>{cat}</span>
          <span className="text-xs text-gray-700 truncate pr-2">{desc}</span>
          <span className="text-center text-sm text-gray-300 tracking-widest font-mono">•••••</span>
          <span className="text-right text-xs font-semibold text-gray-800 tabular-nums">{sell}</span>
          <div className="flex justify-end">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${marginCls(margin)}`}>{margin}%</span>
          </div>
        </div>
      ))}

      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
        Cost prices hidden from Sales Designers
      </div>
    </div>
  )
}

/* ─── Mobile: Phone Mockup ──────────────────────────────────── */

function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{width: 224, height: 448}}>
      {/* Body */}
      <div className="absolute inset-0 bg-gray-900 rounded-[2.75rem] shadow-2xl"/>
      {/* Screen */}
      <div className="absolute bg-white overflow-hidden" style={{inset: 10, borderRadius: '2.25rem'}}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1 bg-white">
          <span className="text-[10px] font-bold text-gray-900">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.371 4.94A17.902 17.902 0 0112 1.5c3.924 0 7.55 1.264 10.629 3.44.4.29.444.847.103 1.193L12 17l-10.732-10.867a.869.869 0 01.103-1.193z"/>
            </svg>
            <div className="flex items-end gap-px">
              {[2,3,4,5].map(h => (
                <div key={h} className="w-1 bg-gray-700 rounded-sm" style={{height: h * 2}}/>
              ))}
            </div>
            <div className="w-5 h-2.5 border border-gray-700 rounded-sm relative ml-0.5">
              <div className="absolute bg-gray-700 rounded-sm" style={{top:1,bottom:1,left:1,right:'25%'}}/>
              <div className="absolute right-[-3px] top-[3px] w-[2px] h-[5px] bg-gray-700 rounded-r-sm"/>
            </div>
          </div>
        </div>

        {/* App header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
          <div className="flex items-center">
            <img src={LONG_LOGO} alt="CatchQuote" className="h-3.5 w-auto" />
          </div>
          <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
          </div>
        </div>

        {/* Quote meta */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="text-[10px] font-bold text-gray-900">QT-2025-0042</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Chan Residence · Tampines</div>
        </div>

        {/* Area header */}
        <div className="mx-3 mt-2.5 bg-brand-600 rounded-lg px-2.5 py-2 flex justify-between items-center">
          <span className="text-[10px] font-semibold text-white">Living Room</span>
          <span className="text-[9px] text-brand-200 tabular-nums">SGD 5,515</span>
        </div>

        {/* Items */}
        <div className="px-3 mt-2 space-y-1.5">
          {[
            ['Vinyl plank flooring', 'm²',  'SGD 3,375'],
            ['Feature wall paint',   'm²',  'SGD 1,900'],
            ['Power points',         'unit','SGD 240'],
          ].map(([d, u, t]) => (
            <div key={d} className="flex items-center border-b border-gray-50 pb-1">
              <span className="text-[9px] text-gray-600 flex-1 truncate">{d}</span>
              <span className="text-[9px] text-gray-400 mx-1.5 shrink-0">{u}</span>
              <span className="text-[9px] font-semibold text-gray-800 tabular-nums shrink-0">{t}</span>
            </div>
          ))}
        </div>

        {/* Bottom totals + CTA */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-gray-500">Total (inc. GST)</span>
            <span className="text-[13px] font-extrabold text-brand-600 tabular-nums">SGD 8,562</span>
          </div>
          <div className="bg-brand-600 rounded-xl py-2 text-center">
            <span className="text-[10px] font-bold text-white tracking-wide">Export PDF</span>
          </div>
        </div>
      </div>

      {/* Physical buttons */}
      <div className="absolute bg-gray-700 rounded-l-sm" style={{top:72,left:-3,width:3,height:28}}/>
      <div className="absolute bg-gray-700 rounded-l-sm" style={{top:110,left:-3,width:3,height:20}}/>
      <div className="absolute bg-gray-700 rounded-l-sm" style={{top:136,left:-3,width:3,height:20}}/>
      <div className="absolute bg-gray-700 rounded-r-sm" style={{top:88,right:-3,width:3,height:36}}/>
      {/* Home bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/40 rounded-full" style={{width:64,height:4}}/>
    </div>
  )
}

/* ─── Main Landing Page ─────────────────────────────────────── */

export default function LandingPage({ onSignIn, onSignUp }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-200 ${scrolled ? 'shadow-sm border-b border-gray-100' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="text-sm font-semibold text-gray-600 hover:text-brand-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-brand-100">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"/>
              Built for Singapore interior designers
            </div>
            <h1 className="font-serif text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6">
              Quote Faster.<br />Win More.<br />
              <span className="text-brand-600">Protect Your Margins.</span>
            </h1>
            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              The quotation tool built for Singapore interior designers — preset your rates, drag to build, send professional PDFs in minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onSignUp}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm shadow-brand-200"
              >
                Start Free Trial
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 border-2 border-gray-200 hover:border-brand-300 hover:text-brand-600 text-gray-600 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="order-first lg:order-last">
            <QuoteMockup />
          </div>
        </div>
      </section>

      {/* ── Pain Points ─────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Sound familiar?</h2>
            <p className="text-gray-500 max-w-md mx-auto">The everyday problems CatchQuote was built to eliminate.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ),
                title: 'Quoting takes hours',
                body: "You're losing clients while building proposals in spreadsheets. By the time your quote lands, someone faster has already won the job.",
              },
              {
                icon: (
                  <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ),
                title: "Staff don't know your margins",
                body: 'Pricing inconsistency costs you money. Junior designers quote below margin without realising it, and you only find out at invoice time.',
              },
              {
                icon: (
                  <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                  </svg>
                ),
                title: 'Excel quotes look unprofessional',
                body: "Clients compare your messy spreadsheet against a competitor's branded PDF. First impressions lose deals before the project even starts.",
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature: Speed ──────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-brand-600 font-bold text-xs uppercase tracking-widest mb-3">Quote faster</div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
              Quote in Minutes,<br />Not Hours
            </h2>
            <div className="space-y-5">
              {[
                ['Drag and drop line items', 'Reorder items within each area of work instantly — no cutting and pasting.'],
                ['Preset library with all your rates', 'Your full catalogue pre-loaded with contractor costs and selling prices, ready to use.'],
                ['Add an entire room in seconds', 'Select 10 items from the preset library and add them to any area in one click.'],
                ['PDF generated instantly', 'Branded, professional quote PDFs with area breakdowns, signatures, and T&C.'],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3">
                  <Check />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-0.5">{title}</div>
                    <div className="text-sm text-gray-500">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PresetPickerMockup />
          </div>
        </div>
      </section>

      {/* ── Feature: Margins ────────────────────────────────── */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center lg:justify-start order-last lg:order-first">
            <PresetTableMockup />
          </div>
          <div>
            <div className="text-brand-600 font-bold text-xs uppercase tracking-widest mb-3">Margin protection</div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
              Your Cost Prices<br />Stay Secret
            </h2>
            <div className="space-y-5">
              {[
                ['Set cost and selling price per item', 'Only you see what it costs. Your team sees what to charge. The gap stays yours.'],
                ['Staff only see selling price', 'Designers quote confidently using approved rates — without ever seeing your margins.'],
                ['Colour-coded margin alerts', 'Green, orange, and red indicators tell you at a glance if any preset is underpriced.'],
                ['Admin controls all pricing', 'Only admins can edit the preset library. Your sales team works from your approved rates only.'],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3">
                  <Check />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-0.5">{title}</div>
                    <div className="text-sm text-gray-500">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature: Mobile ─────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-brand-600 font-bold text-xs uppercase tracking-widest mb-3">Mobile first</div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
              Quote Right in Front<br />of Your Client
            </h2>
            <div className="space-y-5">
              {[
                ['Works on iPhone, iPad, any device', 'Fully responsive — no app download required. Open a browser and go.'],
                ['No laptop needed on site visits', 'Build and adjust quotes while walking the client through their future home.'],
                ['Professional PDF in one tap', 'Generate and share the quote before you even leave the property.'],
                ['Impress clients on the spot', 'Real-time quoting shows confidence. Clients love seeing numbers build live.'],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3">
                  <Check />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-0.5">{title}</div>
                    <div className="text-sm text-gray-500">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Feature: Team ───────────────────────────────────── */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-brand-600 font-bold text-xs uppercase tracking-widest mb-3">Team control</div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">One Firm, One Standard</h2>
            <p className="text-gray-500 max-w-md mx-auto">Clear roles so everyone knows exactly what they can see and do.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                role: 'Admin',
                emoji: '🔑',
                badgeCls: 'bg-brand-100 text-brand-700',
                borderCls: 'border-brand-200',
                perms: [
                  'Manages preset library & pricing',
                  'Views all quotes across the firm',
                  'Sees cost prices and margins',
                  'Adds and manages team members',
                  'Controls branding & T&C',
                ],
              },
              {
                role: 'Sales Designer',
                emoji: '✏️',
                badgeCls: 'bg-blue-100 text-blue-700',
                borderCls: 'border-blue-200',
                perms: [
                  'Creates and edits quotes',
                  'Accesses the full preset library',
                  'Exports professional PDFs',
                  'Sees only their own quotes',
                  'Cannot see any cost prices',
                ],
              },
              {
                role: 'Client View',
                emoji: '📋',
                badgeCls: 'bg-gray-100 text-gray-600',
                borderCls: 'border-gray-200',
                perms: [
                  'Receives a branded PDF quote',
                  'Sees clear area-by-area breakdown',
                  'Professional, polished format',
                  'No system login required',
                  'Signs off cleanly by email',
                ],
              },
            ].map(({ role, emoji, badgeCls, borderCls, perms }) => (
              <div key={role} className={`bg-white rounded-2xl p-6 border-2 ${borderCls} shadow-sm`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5 ${badgeCls}`}>
                  <span>{emoji}</span>
                  <span>{role}</span>
                </div>
                <ul className="space-y-2.5">
                  {perms.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section className="py-20 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500">Start free. Scale when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 items-start">

            {/* Trial */}
            <div className="rounded-2xl border-2 border-gray-200 p-8">
              <div className="mb-6">
                <div className="text-sm font-semibold text-gray-500 mb-1">Trial</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">Free</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">No credit card required</div>
              </div>
              <ul className="space-y-3 mb-8">
                {['Up to 3 quotes', 'PDF export included', '1 user', 'Full preset library access', 'Email support'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <Check />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignUp}
                className="block w-full text-center border-2 border-brand-600 text-brand-600 hover:bg-brand-50 font-semibold py-3 rounded-xl transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-brand-600 p-8 bg-gradient-to-b from-brand-50 to-white relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <div className="text-sm font-semibold text-brand-700 mb-1">Pro</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">$99</span>
                  <span className="text-gray-400 mb-1">/month SGD</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">+$25/user for additional members</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited quotes',
                  'Up to 3 team members',
                  'Custom branding & logo',
                  'Full preset library with margins',
                  'Terms & conditions on every PDF',
                  'Priority support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <Check />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignUp}
                className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border-2 border-gray-800 bg-gray-900 p-8">
              <div className="mb-6">
                <div className="text-sm font-semibold text-gray-400 mb-1">Enterprise</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-white">Custom</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Tailored to your firm</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pro',
                  'Unlimited team members',
                  'White-label PDF branding',
                  'Dedicated account manager',
                  'Custom integrations',
                  'SLA & priority support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=CatchQuote%20Enterprise%20Enquiry`}
                className="block text-center bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
              >
                Contact us
              </a>
            </div>

          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Enterprise enquiries:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline font-medium">{CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section className="py-24 bg-brand-600 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight">
            Ready to transform<br />how you quote?
          </h2>
          <p className="text-brand-100 mb-10 text-lg">
            Join Singapore ID firms already saving hours every week.
          </p>
          <button
            onClick={onSignUp}
            className="inline-flex items-center gap-3 bg-white text-brand-600 hover:bg-brand-50 font-bold px-8 py-4 rounded-2xl transition-colors text-lg shadow-xl"
          >
            Start Free Trial
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </button>
          <p className="mt-4 text-brand-200 text-sm">Free · no credit card required</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <img src={SQUARE_LOGO} alt="CatchQuote" className="h-7 w-auto" />
              <span className="font-bold text-white text-lg">CatchQuote</span>
            </div>
            <p className="text-sm text-gray-500">The quotation tool for Singapore ID firms.</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={onSignIn} className="hover:text-white transition-colors">Sign In</button>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
          © 2026 CatchQuote. Built for Singapore ID firms.
        </div>
      </footer>

    </div>
  )
}
