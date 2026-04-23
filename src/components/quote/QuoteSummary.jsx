import { GST_RATE } from '../../hooks/useQuote.js'

function fmt(n, currency = 'SGD') {
  return `${currency} ${Number(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function QuoteSummary({
  subtotal, gst, gstEnabled, total, currency,
  onToggleGst, onExportPDF, onSaveQuote, saving,
}) {
  const cur = currency || 'SGD'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">

        {/* Totals */}
        <div className="flex flex-col gap-2 min-w-[240px]">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-800 tabular-nums">{fmt(subtotal, cur)}</span>
          </div>

          {/* GST row with toggle */}
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={onToggleGst}
                className="w-4 h-4 rounded accent-brand-600"
              />
              <span className="text-gray-500">
                GST ({(GST_RATE * 100).toFixed(0)}%)
              </span>
            </label>
            <span className={`font-medium tabular-nums ${gstEnabled ? 'text-gray-800' : 'text-gray-300 line-through'}`}>
              {fmt(subtotal * GST_RATE, cur)}
            </span>
          </div>

          <div className="h-px bg-gray-100 my-1" />

          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-xl text-brand-700 tabular-nums">{fmt(total, cur)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={onSaveQuote}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 rounded-lg font-medium text-sm border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {saving ? 'Saving…' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}
