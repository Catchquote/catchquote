import { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import QuotePage from './pages/QuotePage.jsx'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [activeQuoteId, setActiveQuoteId] = useState(null)

  function openQuote(id) {
    setActiveQuoteId(id)
    setPage('quote')
  }

  function goHome() {
    setPage('dashboard')
    setActiveQuoteId(null)
  }

  if (page === 'quote') {
    return <QuotePage quoteId={activeQuoteId} onBack={goHome} />
  }

  return <Dashboard onOpenQuote={openQuote} />
}
