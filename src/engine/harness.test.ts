// Tests du harness (T9) avec provider mocké : succès direct, succès après
// retry (violations ré-injectées), épuisement des retries, fallback de
// modèle, échec total — et le coût en appels, compté juste.

import { describe, expect, it } from 'vitest'
import { buildRetryMessage, runHarness } from './harness'
import type { Provider } from './provider'
import type { LLMRequest, LLMResult, LLMSuccess } from './types'

function success(text: string): LLMSuccess {
  return {
    ok: true,
    text,
    model: null,
    usage: { inputTokens: 10, outputTokens: 5 },
    totalLatencyMs: 100,
    firstTokenLatencyMs: null,
    stopReason: 'end_turn',
    events: [],
  }
}

function failure(): LLMResult {
  return {
    ok: false,
    error: { type: 'server', status: 529, message: 'Surcharge.' },
    events: [],
    totalLatencyMs: 50,
  }
}

/** Provider mocké : sert les résultats dans l'ordre et journalise les requêtes. */
function mockProvider(queue: LLMResult[]) {
  const requests: LLMRequest[] = []
  const provider: Provider = {
    callLLM(request) {
      requests.push(request)
      const next = queue.shift()
      if (!next) throw new Error('mock provider : file de résultats vide')
      return Promise.resolve(next)
    },
  }
  return { provider, requests }
}

const BASE_REQUEST: LLMRequest = {
  model: 'remplacé-par-la-chaîne',
  messages: [{ role: 'user', content: 'Analyse ce verbatim.' }],
  max_tokens: 1024,
}

/** Validateur de test : seule la réponse exacte "OK" est conforme. */
const onlyOK = (text: string) =>
  text === 'OK' ? [] : [`Réponse "${text}" non conforme.`]

let tick = 0
const fakeNow = () => ++tick

describe('runHarness', () => {
  it('succès direct : 1 appel, étapes attempt puis valid', async () => {
    const { provider, requests } = mockProvider([success('OK')])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a'],
      validate: onlyOK,
      now: fakeNow,
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.calls).toBe(1)
    expect(outcome.result?.text).toBe('OK')
    expect(outcome.steps.map((s) => s.type)).toEqual(['attempt', 'valid'])
    expect(requests[0].model).toBe('modele-a')
  })

  it('succès après retry : les violations repartent vers le modèle', async () => {
    const { provider, requests } = mockProvider([
      success('BAD'),
      success('OK'),
    ])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a'],
      validate: onlyOK,
      now: fakeNow,
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.calls).toBe(2)
    expect(outcome.steps.map((s) => s.type)).toEqual([
      'attempt',
      'invalid',
      'retry',
      'attempt',
      'valid',
    ])
    // Le second appel rejoue la conversation : réponse fautive + correctif.
    expect(requests[1].messages).toEqual([
      ...BASE_REQUEST.messages,
      { role: 'assistant', content: 'BAD' },
      {
        role: 'user',
        content: buildRetryMessage(['Réponse "BAD" non conforme.']),
      },
    ])
    const retry = outcome.steps.find((s) => s.type === 'retry')
    expect(retry?.type === 'retry' && retry.message).toContain(
      'Réponse "BAD" non conforme.',
    )
  })

  it('épuisement des retries : abandon après 1 + maxSchemaRetries appels', async () => {
    const { provider } = mockProvider([
      success('BAD1'),
      success('BAD2'),
      success('BAD3'),
    ])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a'],
      validate: onlyOK,
      now: fakeNow,
    })
    expect(outcome.ok).toBe(false)
    expect(outcome.result).toBeNull()
    expect(outcome.calls).toBe(3)
    const last = outcome.steps.at(-1)
    expect(last?.type === 'gave_up' && last.reason).toBe('retries_exhausted')
  })

  it('fallback : erreur provider sur A, succès sur B', async () => {
    const { provider, requests } = mockProvider([failure(), success('OK')])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a', 'modele-b'],
      validate: onlyOK,
      now: fakeNow,
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.calls).toBe(2)
    expect(outcome.steps.map((s) => s.type)).toEqual([
      'attempt',
      'provider_error',
      'fallback',
      'attempt',
      'valid',
    ])
    const fallback = outcome.steps.find((s) => s.type === 'fallback')
    expect(fallback?.type === 'fallback' && fallback.from).toBe('modele-a')
    expect(fallback?.type === 'fallback' && fallback.to).toBe('modele-b')
    expect(requests.map((r) => r.model)).toEqual(['modele-a', 'modele-b'])
  })

  it('échec total : tous les modèles de la chaîne sont en panne', async () => {
    const { provider } = mockProvider([failure(), failure()])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a', 'modele-b'],
      validate: onlyOK,
      now: fakeNow,
    })
    expect(outcome.ok).toBe(false)
    expect(outcome.calls).toBe(2)
    const last = outcome.steps.at(-1)
    expect(last?.type === 'gave_up' && last.reason).toBe('models_exhausted')
  })

  it('sans validateur, toute réponse réussie est conforme', async () => {
    const { provider } = mockProvider([success('n’importe quoi')])
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a'],
      now: fakeNow,
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.calls).toBe(1)
  })

  it('les étapes sont horodatées dans l’ordre (horloge injectée)', async () => {
    const { provider } = mockProvider([success('BAD'), success('OK')])
    let clock = 1000
    const outcome = await runHarness(provider, BASE_REQUEST, {
      models: ['modele-a'],
      validate: onlyOK,
      now: () => (clock += 10),
    })
    const stamps = outcome.steps.map((s) => s.at)
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b))
    expect(new Set(stamps).size).toBe(stamps.length)
  })
})
