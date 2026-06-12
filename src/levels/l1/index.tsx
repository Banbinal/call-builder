// Niveau 1 (T3) : l'appel nu. Un prompt, un bouton Exécuter qui montre le
// streaming tel qu'il arrive (réponse assemblée en direct + flux SSE brut),
// et le bouton ×N pour faire constater la stochasticité sur le même prompt.

import { useId, useMemo, useState } from 'react'
import { RequestPanel } from '../../components/request/RequestPanel'
import { DEFAULT_MAX_TOKENS, FIL_ROUGE_PROMPT } from '../../config/defaults'
import {
  runBatch,
  type LLMRequest,
  type LLMResult,
  type SSEEvent,
} from '../../engine'
import { useProvider } from '../../state/ProviderContext'
import { BatchPanel, type BatchState } from './BatchPanel'
import { RawStreamPanel, type TimedEvent } from './RawStreamPanel'

const BATCH_SIZES = [5, 10, 20]
const BATCH_CONCURRENCY = 4

export function L1() {
  const { provider, model, canExecute, executeDisabledReason } = useProvider()
  const promptId = useId()
  const batchSizeId = useId()

  const [prompt, setPrompt] = useState(FIL_ROUGE_PROMPT)
  const [running, setRunning] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [events, setEvents] = useState<TimedEvent[]>([])
  const [result, setResult] = useState<LLMResult | null>(null)
  const [batchSize, setBatchSize] = useState(10)
  const [batch, setBatch] = useState<BatchState | null>(null)

  const busy = running || (batch?.running ?? false)
  const disabled = !canExecute || busy || prompt.trim() === ''
  const disabledReason =
    executeDisabledReason ?? (busy ? 'Exécution en cours…' : null)

  // Recalculée à chaque changement de configuration : le panneau requête
  // (T4) se met à jour en temps réel, même sans exécuter.
  const request = useMemo<LLMRequest>(
    () => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: DEFAULT_MAX_TOKENS,
    }),
    [model, prompt],
  )

  async function execute() {
    if (!provider || busy) return
    setRunning(true)
    setStreamText('')
    setEvents([])
    setResult(null)
    const startedAt = Date.now()
    const res = await provider.callLLM(request, {
      stream: true,
      onEvent: (event: SSEEvent) => {
        setEvents((prev) => [
          ...prev,
          { ...event, offsetMs: event.timestamp - startedAt },
        ])
        const delta = textDelta(event)
        if (delta !== null) setStreamText((prev) => prev + delta)
      },
    })
    setResult(res)
    setRunning(false)
  }

  async function executeBatch() {
    if (!provider || busy) return
    const total = batchSize
    setBatch({
      total,
      completed: 0,
      running: true,
      results: Array<LLMResult | null>(total).fill(null),
    })
    await runBatch(() => provider.callLLM(request, { stream: false }), {
      count: total,
      concurrency: BATCH_CONCURRENCY,
      onResult: (index, runResult, completed) => {
        setBatch((prev) =>
          prev
            ? {
                ...prev,
                completed,
                results: prev.results.map((r, i) => (i === index ? runResult : r)),
              }
            : prev,
        )
      },
    })
    setBatch((prev) => (prev ? { ...prev, running: false } : prev))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label htmlFor={promptId} className="text-sm font-medium text-slate-700">
          Prompt
        </label>
        <textarea
          id={promptId}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => void execute()}
            disabled={disabled}
            title={disabledReason ?? undefined}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Exécuter
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor={batchSizeId} className="text-sm text-slate-600">
              ×N
            </label>
            <select
              id={batchSizeId}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={busy}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {BATCH_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void executeBatch()}
              disabled={disabled}
              title={disabledReason ?? undefined}
              className="rounded-md border border-indigo-600 px-4 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              Exécuter ×{batchSize}
            </button>
            <span className="text-xs text-slate-400">
              {BATCH_CONCURRENCY} appels en parallèle au maximum
            </span>
          </div>
        </div>
      </section>

      <RequestPanel request={request} />

      {(running || result !== null) && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Réponse</h2>
          <div className="mt-2 min-h-16 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
            {streamText}
            {running && (
              <span className="animate-pulse text-indigo-500" aria-hidden="true">
                ▍
              </span>
            )}
          </div>

          {result?.ok && (
            <p className="mt-3 text-sm text-slate-600">
              Premier token :{' '}
              <strong>
                {result.firstTokenLatencyMs !== null
                  ? `${Math.round(result.firstTokenLatencyMs)} ms`
                  : '—'}
              </strong>{' '}
              · Latence totale :{' '}
              <strong>{Math.round(result.totalLatencyMs)} ms</strong> · Tokens :{' '}
              <strong>
                {result.usage.inputTokens} entrée / {result.usage.outputTokens}{' '}
                sortie
              </strong>
            </p>
          )}
          {result !== null && !result.ok && (
            <p className="mt-3 text-sm text-red-600">
              {result.error.message}
              {result.error.detail && (
                <span className="text-red-400">
                  {' '}
                  — détail API : {result.error.detail}
                </span>
              )}
            </p>
          )}

          <RawStreamPanel events={events} />
        </section>
      )}

      {batch !== null && <BatchPanel batch={batch} />}
    </div>
  )
}

/** Extrait le texte d'un événement content_block_delta, sinon null. */
function textDelta(event: SSEEvent): string | null {
  if (event.event !== 'content_block_delta') return null
  const data = event.data as {
    delta?: { type?: string; text?: string }
  } | null
  return data?.delta?.type === 'text_delta' ? (data.delta.text ?? '') : null
}
