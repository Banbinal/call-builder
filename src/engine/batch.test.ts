import { describe, expect, it } from 'vitest'
import { runBatch } from './batch'
import type { LLMResult } from './types'

function okResult(text: string): LLMResult {
  return {
    ok: true,
    text,
    model: null,
    usage: { inputTokens: 1, outputTokens: 1 },
    totalLatencyMs: 1,
    firstTokenLatencyMs: null,
    stopReason: 'end_turn',
    events: [],
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('runBatch', () => {
  it('retourne les résultats dans l’ordre des index, pas dans l’ordre d’arrivée', async () => {
    const resolvers: Array<(r: LLMResult) => void> = []
    const promise = runBatch(
      (index) =>
        new Promise<LLMResult>((resolve) => {
          resolvers[index] = resolve
        }),
      { count: 3, concurrency: 3 },
    )
    // Résolution volontairement dans le désordre.
    resolvers[2](okResult('run-2'))
    resolvers[0](okResult('run-0'))
    resolvers[1](okResult('run-1'))
    const results = await promise
    expect(results.map((r) => (r.ok ? r.text : 'erreur'))).toEqual([
      'run-0',
      'run-1',
      'run-2',
    ])
  })

  it('ne dépasse jamais le plafond de concurrence', async () => {
    let active = 0
    let maxActive = 0
    const gates: Array<() => void> = []
    const promise = runBatch(
      () => {
        active += 1
        maxActive = Math.max(maxActive, active)
        return new Promise<LLMResult>((resolve) => {
          gates.push(() => {
            active -= 1
            resolve(okResult('x'))
          })
        })
      },
      { count: 10, concurrency: 4 },
    )
    // Seuls 4 runs démarrent tant qu'aucun n'est terminé.
    expect(gates.length).toBe(4)
    while (gates.length > 0) {
      gates.shift()!()
      await flush()
    }
    const results = await promise
    expect(maxActive).toBe(4)
    expect(results).toHaveLength(10)
    expect(results.every((r) => r.ok)).toBe(true)
  })

  it('convertit une exception en échec local sans interrompre le lot', async () => {
    const results = await runBatch(
      (index) =>
        index === 1
          ? Promise.reject(new Error('boom'))
          : Promise.resolve(okResult(`run-${index}`)),
      { count: 3, concurrency: 2 },
    )
    expect(results[0].ok).toBe(true)
    expect(results[2].ok).toBe(true)
    expect(results[1].ok).toBe(false)
    if (!results[1].ok) {
      expect(results[1].error.type).toBe('unknown')
      expect(results[1].error.detail).toBe('boom')
    }
  })

  it('notifie chaque run terminé avec un compteur croissant', async () => {
    const completions: number[] = []
    const indices: number[] = []
    await runBatch((index) => Promise.resolve(okResult(`run-${index}`)), {
      count: 5,
      concurrency: 2,
      onResult: (index, _result, completed) => {
        indices.push(index)
        completions.push(completed)
      },
    })
    expect(completions).toEqual([1, 2, 3, 4, 5])
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
  })

  it('tolère un plafond supérieur au nombre de runs', async () => {
    const results = await runBatch(
      (index) => Promise.resolve(okResult(`run-${index}`)),
      { count: 2, concurrency: 8 },
    )
    expect(results).toHaveLength(2)
  })
})
