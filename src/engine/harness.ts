// Harness (T9) : wrapper de fiabilisation autour du provider — retry sur
// non-conformité au contrat de sortie (avec ré-injection des violations dans
// le message de retry) et fallback de modèle sur erreur provider. Chaque
// étape est émise au fil de l'exécution : l'UI du mode chaos les affiche en
// timeline, le coût (nombre d'appels) est compté — rien n'est masqué.
// Le validateur est injecté : l'engine ne connaît ni ajv ni le module schéma.

import type { Provider } from './provider'
import type { LLMError, LLMRequest, LLMSuccess } from './types'

/**
 * Validateur de conformité injecté : retourne la liste des violations en
 * français (vide si la réponse est conforme).
 */
export type HarnessValidator = (text: string) => string[]

export interface HarnessOptions {
  /**
   * Chaîne de modèles : le premier est essayé, les suivants prennent le
   * relais sur erreur provider (fallback). Au moins un modèle.
   */
  models: readonly string[]
  /** Retries maximum sur non-conformité au schéma (défaut : 2). */
  maxSchemaRetries?: number
  /** Sans validateur, toute réponse réussie est considérée conforme. */
  validate?: HarnessValidator
  /** Appelé à chaque étape, dans l'ordre — la timeline du mode chaos. */
  onStep?: (step: HarnessStep) => void
  /** Horloge injectable pour les tests. */
  now?: () => number
}

/** Une étape horodatée de l'exécution fiabilisée. */
export type HarnessStep =
  | { type: 'attempt'; at: number; call: number; model: string }
  | {
      type: 'invalid'
      at: number
      call: number
      violations: string[]
      /** La réponse fautive, telle que reçue. */
      text: string
    }
  | {
      type: 'retry'
      at: number
      /** Le message correctif envoyé au modèle — l'écart, rendu visible. */
      message: string
    }
  | {
      type: 'provider_error'
      at: number
      call: number
      model: string
      error: LLMError
    }
  | { type: 'fallback'; at: number; from: string; to: string }
  | { type: 'valid'; at: number; call: number; result: LLMSuccess }
  | {
      type: 'gave_up'
      at: number
      reason: 'retries_exhausted' | 'models_exhausted'
    }

export interface HarnessOutcome {
  ok: boolean
  /** Le résultat final conforme, ou null si le harness a abandonné. */
  result: LLMSuccess | null
  /** Toutes les étapes, dans l'ordre — la matière de la timeline. */
  steps: HarnessStep[]
  /** Nombre d'appels réellement émis — le coût du harness. */
  calls: number
}

/**
 * Message correctif construit à partir des violations — exporté pour que
 * l'UI et les tests montrent exactement ce qui repart vers le modèle.
 */
export function buildRetryMessage(violations: string[]): string {
  return (
    'Ta réponse précédente ne respecte pas le contrat de sortie. ' +
    'Violations :\n' +
    violations.map((v) => `- ${v}`).join('\n') +
    '\nRéponds à nouveau, uniquement avec un objet JSON conforme au schéma, ' +
    'sans aucun texte autour.'
  )
}

/**
 * Exécute `request` à travers le harness : appels non-streaming, retry sur
 * non-conformité (le modèle reçoit ses violations), fallback de modèle sur
 * erreur provider. Ne lance jamais d'exception — comme le provider (T1).
 */
export async function runHarness(
  provider: Provider,
  request: LLMRequest,
  opts: HarnessOptions,
): Promise<HarnessOutcome> {
  const now = opts.now ?? Date.now
  const maxSchemaRetries = opts.maxSchemaRetries ?? 2
  const steps: HarnessStep[] = []
  const emit = (step: HarnessStep) => {
    steps.push(step)
    opts.onStep?.(step)
  }

  let modelIndex = 0
  let retriesUsed = 0
  let messages = request.messages
  let calls = 0

  for (;;) {
    const model = opts.models[modelIndex]
    calls += 1
    emit({ type: 'attempt', at: now(), call: calls, model })

    const result = await provider.callLLM(
      { ...request, model, messages },
      { stream: false },
    )

    if (!result.ok) {
      emit({
        type: 'provider_error',
        at: now(),
        call: calls,
        model,
        error: result.error,
      })
      if (modelIndex + 1 < opts.models.length) {
        const next = opts.models[modelIndex + 1]
        emit({ type: 'fallback', at: now(), from: model, to: next })
        modelIndex += 1
        continue
      }
      emit({ type: 'gave_up', at: now(), reason: 'models_exhausted' })
      return { ok: false, result: null, steps, calls }
    }

    const violations = opts.validate?.(result.text) ?? []
    if (violations.length === 0) {
      emit({ type: 'valid', at: now(), call: calls, result })
      return { ok: true, result, steps, calls }
    }

    emit({
      type: 'invalid',
      at: now(),
      call: calls,
      violations,
      text: result.text,
    })
    if (retriesUsed >= maxSchemaRetries) {
      emit({ type: 'gave_up', at: now(), reason: 'retries_exhausted' })
      return { ok: false, result: null, steps, calls }
    }
    retriesUsed += 1
    const retryMessage = buildRetryMessage(violations)
    // La réponse fautive et le correctif rejoignent la conversation : le
    // modèle voit précisément ce qu'il a produit et ce qui n'allait pas.
    messages = [
      ...messages,
      { role: 'assistant', content: result.text },
      { role: 'user', content: retryMessage },
    ]
    emit({ type: 'retry', at: now(), message: retryMessage })
  }
}
