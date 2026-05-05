const CURRENCIES = ['SGD', 'USD', 'AUD', 'GBP', 'EUR', 'MYR']

const cls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

export default function QuoteMetaForm({ quote, onChange, wsSettings }) {
  function f(name) {
    return { value: quote[name] ?? '', onChange: e => onChange(name, e.target.value) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

      {/* ── Quote Details ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Quote Details</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quote Number</label>
              <input className={cls} placeholder="QT-2026-001" {...f('quoteNumber')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select className={cls} {...f('currency')}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quote Date</label>
              <input type="date" className={cls} {...f('date')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valid Until</label>
              <input type="date" className={cls} {...f('validUntil')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project Title</label>
            <input className={cls} placeholder="HDB Renovation — Tampines Ave 8" {...f('projectTitle')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sales Designer</label>
            <input
              className={cls}
              placeholder={wsSettings?.designer_name || 'Designer name'}
              {...f('designerName')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className={`${cls} resize-none`}
              placeholder="Payment terms, inclusions/exclusions…"
              {...f('notes')}
            />
          </div>
        </div>
      </div>

      {/* ── Client Details ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Client Details</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Client Name</label>
            <input className={cls} placeholder="Jane Tan" {...f('clientName')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" className={cls} placeholder="jane@email.com" {...f('clientEmail')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
              <input className={cls} placeholder="+65 9123 4567" {...f('clientContact')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Client Address</label>
            <input className={cls} placeholder="123 Orchard Road, #01-01, Singapore 238858" {...f('clientAddress')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Project Address
              <span className="ml-1 text-gray-400 font-normal">(if different)</span>
            </label>
            <input className={cls} placeholder="Same as client address" {...f('projectAddress')} />
          </div>
        </div>
      </div>

    </div>
  )
}
