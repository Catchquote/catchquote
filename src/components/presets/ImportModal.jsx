import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

const EXPECTED = ['Category', 'Contractor Name', 'Description', 'Unit', 'Cost Price', 'Selling Price', 'Notes']

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

function RowCount({ n }) {
  return <span className="font-semibold text-gray-900">{n}</span>
}

export default function ImportModal({ onImport, onClose }) {
  const inputRef = useRef()
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError('')
    setImportError('')
    setFileName(file.name)
    try {
      const parsed = await parseFile(file)
      if (!parsed.length) {
        setParseError('The file appears to be empty.')
        return
      }
      setRows(parsed)
    } catch {
      setParseError('Could not parse the file. Make sure it is a valid .xlsx or .csv.')
    }
  }

  function reset() {
    setRows(null)
    setFileName('')
    setParseError('')
    setImportError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleConfirm() {
    setImporting(true)
    setImportError('')
    const err = await onImport(rows)
    setImporting(false)
    if (err) setImportError(err)
    else onClose()
  }

  const validRows = rows?.filter(r => getField(r, 'Description', 'description').toString().trim()) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">Import Presets</h2>
            <p className="text-xs text-gray-400 mt-0.5">Bulk-import from .xlsx or .csv — existing presets are not overwritten</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {!rows ? (
            <div className="flex flex-col gap-5">
              {/* Expected columns */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected columns</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {EXPECTED.map(c => (
                    <span key={c} className="text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1 font-mono text-gray-600">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">Row 1 must be the header. Column order doesn't matter. <strong>Description</strong> is the only required field.</p>
              </div>

              {/* Drop zone */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-14 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <svg className="w-12 h-12 text-gray-300 group-hover:text-brand-400 mb-3 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-gray-600 group-hover:text-brand-600 mb-1">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400">.xlsx or .csv files supported</p>
                <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
              </label>

              {parseError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{parseError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* File info + change */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-400">
                      <RowCount n={validRows.length} /> valid row{validRows.length !== 1 ? 's' : ''} ready to import
                      {rows.length !== validRows.length && (
                        <span className="text-orange-500 ml-2">({rows.length - validRows.length} skipped — no description)</span>
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Change file
                </button>
              </div>

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {EXPECTED.map(c => (
                          <th key={c} className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {validRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{getField(row, 'Category', 'category') || <span className="text-gray-300">General Labour</span>}</td>
                          <td className="px-3 py-2 text-gray-500">{getField(row, 'Contractor Name', 'contractor_name') || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[220px]">
                            {getField(row, 'Description', 'description')}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{getField(row, 'Unit', 'unit') || 'item'}</td>
                          <td className="px-3 py-2 text-gray-500 text-right font-mono">
                            {getField(row, 'Cost Price', 'cost_price') || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-700 text-right font-mono font-medium">
                            {getField(row, 'Selling Price', 'selling_price') || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-400 max-w-[160px] truncate">
                            {getField(row, 'Notes', 'notes') || <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validRows.length > 50 && (
                  <p className="text-xs text-gray-400 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    Previewing first 50 rows — all {validRows.length} will be imported.
                  </p>
                )}
              </div>

              {importError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{importError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            {rows ? `${validRows.length} preset${validRows.length !== 1 ? 's' : ''} will be added` : 'No file selected'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {rows && validRows.length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {importing ? 'Importing…' : `Import ${validRows.length} preset${validRows.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
