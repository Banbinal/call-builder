// Tests du décorateur chaos (T9) : corruption de la première réponse
// uniquement, panne ciblée sur un modèle, transparence pour le reste.

import { describe, expect, it } from 'vitest'
import { createChaosProvider, MALFORMED_PREFIX } from './chaos'
import type { Provider } from './provider'
import type { LLMSuccess } from './types'

function success(text: string): LLMSuccess {
  return {
    ok: true,
    text,
    model: null,
    usage: { inputTokens: 1, outputTokens: 1 },
    totalLatencyMs: 10,
    firstTokenLatencyMs: null,
    stopReason: 'end_turn',
    events: [],
  }
}

const innerProvider: Provider = {
  callLLM: () => Promise.resolve(success('{"ok":true}')),
}

describe('createChaosProvider', () => {
  it('« sortie malformée » : seule la première réponse est corrompue', async () => {
    const chaos = createChaosProvider(innerProvider, {
      malformFirstResponse: true,
    })
    const first = await chaos.callLLM(
      { model: 'm', messages: [], max_tokens: 1 },
      { stream: false },
    )
    const second = await chaos.callLLM(
      { model: 'm', messages: [], max_tokens: 1 },
      { stream: false },
    )
    expect(first.ok && first.text).toBe(MALFORMED_PREFIX + '{"ok":true}')
    expect(second.ok && second.text).toBe('{"ok":true}')
  })

  it('« provider down » : le modèle ciblé échoue, les autres passent', async () => {
    const chaos = createChaosProvider(innerProvider, { downModel: 'modele-a' })
    const down = await chaos.callLLM(
      { model: 'modele-a', messages: [], max_tokens: 1 },
      { stream: false },
    )
    const up = await chaos.callLLM(
      { model: 'modele-b', messages: [], max_tokens: 1 },
      { stream: false },
    )
    expect(down.ok).toBe(false)
    expect(!down.ok && down.error.type).toBe('server')
    expect(up.ok).toBe(true)
  })

  it('sans chaos demandé, le wrapper est transparent', async () => {
    const chaos = createChaosProvider(innerProvider, {})
    const result = await chaos.callLLM(
      { model: 'm', messages: [], max_tokens: 1 },
      { stream: false },
    )
    expect(result.ok && result.text).toBe('{"ok":true}')
  })
})
