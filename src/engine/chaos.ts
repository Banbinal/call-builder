// Pannes simulées (T9) : un décorateur de provider qui injecte des incidents
// contrôlés — le harness ne sait pas qu'il est testé, c'est le monde autour
// de lui qui est truqué. Deux chaos : corruption de la première réponse
// (sortie malformée) et panne d'un modèle (provider down).

import type { Provider } from './provider'
import type { LLMResult } from './types'

export interface ChaosOptions {
  /**
   * Corrompt le texte de la première réponse réussie : du texte est ajouté
   * autour du JSON — exactement la déviation que le contrat interdit.
   */
  malformFirstResponse?: boolean
  /** Tout appel vers ce modèle échoue (erreur serveur simulée). */
  downModel?: string
}

/** Préfixe de corruption — visible tel quel dans la timeline du chaos. */
export const MALFORMED_PREFIX = 'Voici mon analyse :\n'

/**
 * Enveloppe `inner` avec les pannes demandées. Le wrapper est à usage
 * unique : créer une instance par exécution (la corruption ne frappe que la
 * première réponse de la vie du wrapper).
 */
export function createChaosProvider(
  inner: Provider,
  chaos: ChaosOptions,
): Provider {
  let corrupted = false
  return {
    async callLLM(request, opts): Promise<LLMResult> {
      if (chaos.downModel !== undefined && request.model === chaos.downModel) {
        return {
          ok: false,
          error: {
            type: 'server',
            status: 529,
            message:
              'Panne simulée — le provider ne répond plus pour ce modèle (chaos).',
            detail: 'chaos: provider down',
          },
          events: [],
          totalLatencyMs: 0,
        }
      }
      const result = await inner.callLLM(request, opts)
      if (result.ok && chaos.malformFirstResponse && !corrupted) {
        corrupted = true
        return { ...result, text: MALFORMED_PREFIX + result.text }
      }
      return result
    },
  }
}
