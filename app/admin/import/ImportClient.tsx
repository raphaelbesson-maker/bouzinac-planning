'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RawRow {
  reference_of?: string
  client_nom?: string
  gamme?: string
  sla_date?: string
  priorite?: string
  temps_estime_minutes?: string | number
  [key: string]: unknown
}

export function ImportClient() {
  const [rows, setRows] = useState<RawRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    if (file.name.endsWith('.csv')) {
      const Papa = (await import('papaparse')).default
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => setRows(res.data as RawRow[]),
      })
    } else {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<RawRow>(ws)
      setRows(data)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  })

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setResult(data)
    if (res.ok) {
      toast.success(`Import terminé : ${data.inserted} nouveaux, ${data.updated} mis à jour.`)
    } else {
      toast.error('Erreur lors de l\'import.')
    }
    setImporting(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Import CSV / Excel</h1>
        <p className="text-sm text-slate-500 mt-1">
          Importez votre carnet de commandes. Colonnes requises : <code className="bg-slate-100 px-1 rounded">reference_of</code>, <code className="bg-slate-100 px-1 rounded">client_nom</code>, <code className="bg-slate-100 px-1 rounded">sla_date</code>, <code className="bg-slate-100 px-1 rounded">temps_estime_minutes</code>.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
      >
        <input {...getInputProps()} />
        <p className="text-4xl mb-3">📄</p>
        {fileName ? (
          <p className="font-semibold text-slate-800">{fileName}</p>
        ) : (
          <>
            <p className="font-semibold text-slate-700">Déposez votre fichier ici</p>
            <p className="text-sm text-slate-500 mt-1">ou cliquez pour sélectionner (.csv ou .xlsx)</p>
          </>
        )}
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{rows.length} lignes détectées — aperçu des 5 premières :</p>
            <Button onClick={handleImport} disabled={importing} className="h-11 bg-slate-900 hover:bg-slate-700">
              {importing ? 'Import en cours...' : `Importer ${rows.length} OFs`}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {Object.keys(rows[0]).slice(0, 7).map((k) => (
                    <th key={k} className="text-left px-3 py-2 font-semibold text-slate-600">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).slice(0, 7).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-slate-700 truncate max-w-[120px]">{String(v ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="font-semibold">{result.inserted} OFs importés · {result.updated} mis à jour</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-yellow-800">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
