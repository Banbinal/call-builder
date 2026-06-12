// Galerie ×N (T3, UI partagée depuis T5) : barre de progression, grille de
// cartes (une par run) et ligne de synthèse longueurs/formats — c'est ici que
// la stochasticité se constate. Un échec sur un run reste local à sa carte.
// Utilisée par L1 (pleine largeur) et par chaque colonne du mode A/B de L2.
// Depuis T6 : `validate` (optionnel) colore chaque carte selon sa conformité
// au schéma de sortie et ajoute le taux de conformité à la synthèse.

import { useEffect, useState } from 'react'
import type { LLMResult, LLMSuccess } from '../../engine'
import type { ValidationResult } from '../../schema/validate'
import { ValidationCard } from '../validation/ValidationCard'
import { detectFormat, formatLabel, summarizeTexts } from './synthesis'

export interface BatchState {
  total: number
  completed: number
  running: boolean
  results: Array<LLMResult | null>
}

const EXCERPT_LENGTH = 160

export function BatchPanel({
  batch,
  validate,
}: {
  batch: BatchState
  /** Validation contre le schéma actif (T6) — absent quand pas de schéma. */
  validate?: (text: string) => ValidationResult
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex])

  const successes = batch.results.filter(
    (r): r is LLMSuccess => r !== null && r.ok,
  )
  const failures = batch.results.filter((r) => r !== null && !r.ok).length
  const done = !batch.running && batch.completed === batch.total
  const synthesis = done ? summarizeTexts(successes.map((s) => s.text)) : null
  const openResult = openIndex !== null ? batch.results[openIndex] : null
  const conformCount = validate
    ? successes.filter((s) => validate(s.text).status === 'valid').length
    : null

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Galerie ×{batch.total} — le même prompt, {batch.total} réponses
        </h2>
        <span className="text-xs tabular-nums text-slate-500">
          {batch.completed}/{batch.total}
        </span>
      </div>

      {batch.running && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={batch.total}
          aria-valuenow={batch.completed}
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${(batch.completed / batch.total) * 100}%` }}
          />
        </div>
      )}

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {batch.results.map((result, index) => (
          <li key={index} className="min-h-24">
            <RunCard
              result={result}
              index={index}
              validation={
                validate && result?.ok ? validate(result.text) : undefined
              }
              onOpen={() => setOpenIndex(index)}
            />
          </li>
        ))}
      </ul>

      {synthesis && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <strong>{successes.length}</strong> réponse
          {successes.length > 1 ? 's' : ''} — longueur min {synthesis.minLength} /
          médiane {synthesis.medianLength} / max {synthesis.maxLength} caractères —{' '}
          <strong>
            {synthesis.distinctFormats} format
            {synthesis.distinctFormats > 1 ? 's' : ''} distinct
            {synthesis.distinctFormats > 1 ? 's' : ''}
          </strong>{' '}
          ({synthesis.formatLabels.join(', ')})
          {conformCount !== null && (
            <span
              className={
                conformCount === successes.length
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }
            >
              {' '}
              —{' '}
              <strong>
                {conformCount}/{successes.length} conforme
                {conformCount > 1 ? 's' : ''} au schéma
              </strong>
            </span>
          )}
          {failures > 0 && (
            <span className="text-red-600">
              {' '}
              — {failures} run{failures > 1 ? 's' : ''} en erreur
            </span>
          )}
        </p>
      )}
      {done && !synthesis && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-red-600">
          Aucun run n'a abouti — voir les erreurs sur les cartes.
        </p>
      )}

      {openResult?.ok && openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6"
          onClick={() => setOpenIndex(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Réponse complète du run ${openIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Run {openIndex + 1} — {openResult.text.length} caractères ·{' '}
                {Math.round(openResult.totalLatencyMs)} ms
              </h3>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Fermer
              </button>
            </div>
            {validate && (
              <div className="mt-3">
                <ValidationCard result={validate(openResult.text)} />
              </div>
            )}
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
              {openResult.text}
            </pre>
          </div>
        </div>
      )}
    </section>
  )
}

function RunCard({
  result,
  index,
  validation,
  onOpen,
}: {
  result: LLMResult | null
  index: number
  /** Verdict de conformité au schéma (T6) — undefined sans schéma actif. */
  validation?: ValidationResult
  onOpen: () => void
}) {
  if (result === null) {
    return (
      <div className="h-full animate-pulse rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">
        Run {index + 1} — en cours…
      </div>
    )
  }
  if (!result.ok) {
    return (
      <div className="h-full rounded-md border border-red-200 bg-red-50 p-3">
        <p className="text-xs font-medium text-red-700">
          Run {index + 1} — erreur
        </p>
        <p className="mt-1 text-xs text-red-600">{result.error.message}</p>
        {result.error.detail && (
          <p className="mt-1 text-[11px] text-red-400">{result.error.detail}</p>
        )}
      </div>
    )
  }
  const excerpt =
    result.text.length > EXCERPT_LENGTH
      ? result.text.slice(0, EXCERPT_LENGTH) + '…'
      : result.text
  // Carte verte si conforme au schéma, rouge sinon — neutre sans schéma.
  const borderClass =
    validation === undefined
      ? 'border-slate-200'
      : validation.status === 'valid'
        ? 'border-emerald-300 bg-emerald-50/40'
        : 'border-red-300 bg-red-50/40'
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Voir la réponse complète"
      className={`h-full w-full rounded-md border bg-white p-3 text-left transition-colors hover:border-indigo-400 ${borderClass}`}
    >
      <p className="text-xs leading-snug text-slate-700">{excerpt}</p>
      <p className="mt-2 text-[11px] text-slate-400">
        {result.text.length} caractères · {Math.round(result.totalLatencyMs)} ms ·{' '}
        {formatLabel(detectFormat(result.text))}
        {validation !== undefined &&
          (validation.status === 'valid' ? (
            <span className="font-medium text-emerald-600"> · ✓ conforme</span>
          ) : (
            <span className="font-medium text-red-600"> · ✗ non conforme</span>
          ))}
      </p>
    </button>
  )
}
