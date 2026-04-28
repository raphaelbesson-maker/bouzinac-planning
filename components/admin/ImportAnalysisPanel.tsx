'use client'

import { Button } from '@/components/ui/button'

interface Recommendation {
  level: 'urgent' | 'attention' | 'info'
  title: string
  detail: string
}

interface ImportAnalysisPanelProps {
  summary: string
  recommendations: Recommendation[]
  onAutoSchedule?: () => void
  onDismiss: () => void
}

const LEVEL_STYLES: Record<string, string> = {
  urgent:    'bg-red-50 border-red-200 text-red-900',
  attention: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  info:      'bg-blue-50 border-blue-200 text-blue-900',
}
const LEVEL_ICONS: Record<string, string> = {
  urgent: '🔴',
  attention: '🟡',
  info: 'ℹ️',
}

export function ImportAnalysisPanel({ summary, recommendations, onAutoSchedule, onDismiss }: ImportAnalysisPanelProps) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <p className="text-sm font-semibold text-indigo-900">Analyse IA de l&apos;import</p>
        </div>
        <button onClick={onDismiss} className="text-indigo-400 hover:text-indigo-700 text-lg leading-none">×</button>
      </div>

      <p className="text-sm text-indigo-800">{summary}</p>

      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${LEVEL_STYLES[rec.level]}`}>
              <p className="font-semibold flex items-center gap-1.5">
                <span>{LEVEL_ICONS[rec.level]}</span>
                {rec.title}
              </p>
              <p className="text-xs mt-0.5 opacity-80">{rec.detail}</p>
            </div>
          ))}
        </div>
      )}

      {onAutoSchedule && (
        <Button
          onClick={onAutoSchedule}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 text-sm font-semibold"
        >
          ✨ Planifier automatiquement les nouveaux OFs
        </Button>
      )}
    </div>
  )
}
