// Panneau « flux brut » repliable : chaque événement SSE affiché tel que reçu
// sur le fil, horodaté par rapport au lancement de la requête — l'utilisateur
// voit littéralement les chunks arriver.

import type { SSEEvent } from '../../engine'

export interface TimedEvent extends SSEEvent {
  /** Délai écoulé depuis le lancement de la requête (ms). */
  offsetMs: number
}

export function RawStreamPanel({ events }: { events: TimedEvent[] }) {
  if (events.length === 0) return null
  return (
    <details className="mt-4 rounded-md border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
        Flux brut — {events.length} événement{events.length > 1 ? 's' : ''} SSE
      </summary>
      <ol className="max-h-80 space-y-2 overflow-y-auto border-t border-slate-200 p-3">
        {events.map((e, i) => (
          <li key={i} className="text-xs">
            <span className="font-mono text-slate-400">
              +{Math.round(e.offsetMs)} ms
            </span>{' '}
            <span className="font-medium text-slate-600">{e.event}</span>
            <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-[11px] leading-snug text-slate-700">
              {e.raw}
            </pre>
          </li>
        ))}
      </ol>
    </details>
  )
}
