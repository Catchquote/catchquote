import { useState } from 'react'
import Header from '../components/layout/Header.jsx'

const SAMPLE_QUOTES = [
  { id: '1', quoteNumber: 'QT-2401', projectTitle: 'Kitchen Renovation', clientName: 'Sarah Johnson', date: '2026-04-18', total: 28450, status: 'Sent' },
  { id: '2', quoteNumber: 'QT-2402', projectTitle: 'Master Bathroom Remodel', clientName: 'Mark & Lisa Chen', date: '2026-04-15', total: 16800, status: 'Accepted' },
  { id: '3', quoteNumber: 'QT-2403', projectTitle: 'Deck & Landscaping', clientName: 'Tony Nguyen', date: '2026-04-10', total: 9200, status: 'Draft' },
]

const STATUS_STYLES = {
  Draft:    'bg-gray-100 text-gray-500',
  Sent:     'bg-blue-50 text-blue-600',
  Accepted: 'bg-green-50 text-green-600',
  Declined: 'bg-red-50 text-red-500',
}

function fmt(n) {
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`
}

export default function Dashboard({ onOpenQuote }) {
  const [quotes] = useState(SAMPLE_QUOTES)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-700 to-brand-500 rounded-2xl p-8 mb-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome to CatchQuote</h1>
              <p className="text-brand-100 text-sm">Create professional renovation quotes in minutes.</p>
            </div>
            <button
              onClick={() => onOpenQuote(null)}
              className="shrink-0 flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Quote
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Quotes', value: quotes.length, sub: 'all time' },
            { label: 'Accepted', value: quotes.filter(q => q.status === 'Accepted').length, sub: 'this month' },
            { label: 'Pending', value: quotes.filter(q => q.status === 'Sent').length, sub: 'awaiting response' },
            { label: 'Revenue', value: fmt(quotes.filter(q => q.status === 'Accepted').reduce((s, q) => s + q.total, 0)), sub: 'accepted value' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent quotes table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Quotes</h2>
            <button
              onClick={() => onOpenQuote(null)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              + New Quote
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Quote #</th>
                <th className="text-left px-5 py-3 font-semibold">Project</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Client</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 font-semibold">Total</th>
                <th className="text-center px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{q.quoteNumber}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{q.projectTitle}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{q.clientName}</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden md:table-cell">{q.date}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{fmt(q.total)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[q.status] || STATUS_STYLES.Draft}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onOpenQuote(q.id)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upgrade CTA — placeholder for Stripe */}
        <div className="mt-6 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div>
            <p className="font-semibold">Unlock unlimited quotes with CatchQuote Pro</p>
            <p className="text-gray-400 text-xs mt-0.5">Includes client portal, e-signature, and custom branding.</p>
          </div>
          <button
            className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            title="Stripe subscription — coming soon"
          >
            Upgrade to Pro
          </button>
        </div>
      </main>
    </div>
  )
}
