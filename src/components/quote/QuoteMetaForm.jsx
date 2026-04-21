export default function QuoteMetaForm({ quote, onChange }) {
  function field(name) {
    return {
      value: quote[name] || '',
      onChange: e => onChange(name, e.target.value),
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Quote Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quote Number</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="QT-0001"
            {...field('quoteNumber')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project Title</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Kitchen & Bathroom Renovation"
            {...field('projectTitle')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quote Date</label>
          <input
            type="date"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            {...field('date')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Client Name</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="John Smith"
            {...field('clientName')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Client Email</label>
          <input
            type="email"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="john@example.com"
            {...field('clientEmail')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Valid Until</label>
          <input
            type="date"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            {...field('validUntil')}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Client Address / Site Address</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="123 Example Street, Suburb VIC 3000"
            {...field('clientAddress')}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes / Terms</label>
          <textarea
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            placeholder="Payment terms, inclusions/exclusions, warranty details…"
            {...field('notes')}
          />
        </div>
      </div>
    </div>
  )
}
