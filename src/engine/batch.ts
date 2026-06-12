// Exécution ×N : lance le même appel N fois avec un plafond de concurrence.
// Un échec sur un run reste local à son slot — il n'interrompt jamais les
// autres runs du lot.

import type { LLMResult } from './types'

export interface BatchOptions {
  count: number
  /** Nombre maximal d'appels simultanés. */
  concurrency: number
  /** Appelé à chaque run terminé (succès ou échec), avec le compte global. */
  onResult?: (index: number, result: LLMResult, completed: number) => void
}

/**
 * Exécute `runOne` pour les index 0..count-1 via un pool de workers.
 * Les résultats sont rendus dans l'ordre des index, quel que soit l'ordre
 * d'arrivée des réponses.
 */
export async function runBatch(
  runOne: (index: number) => Promise<LLMResult>,
  opts: BatchOptions,
): Promise<LLMResult[]> {
  const results: LLMResult[] = new Array(opts.count)
  let nextIndex = 0
  let completed = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex++
      if (index >= opts.count) return
      let result: LLMResult
      try {
        result = await runOne(index)
      } catch (err) {
        // Le provider ne lance jamais d'exception (contrat T1) ; ce filet
        // garantit qu'un bug dans un run ne fait pas tomber le reste du lot.
        result = {
          ok: false,
          error: {
            type: 'unknown',
            message: "Erreur inattendue lors de l'exécution de ce run.",
            detail: err instanceof Error ? err.message : String(err),
          },
          events: [],
          totalLatencyMs: 0,
        }
      }
      results[index] = result
      completed += 1
      opts.onResult?.(index, result, completed)
    }
  }

  const workerCount = Math.max(1, Math.min(opts.concurrency, opts.count))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
