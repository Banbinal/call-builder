// Configuration du niveau 2 (T5) : les blocs de structuration activables un
// par un (system prompt, température, max_tokens) et leur projection en
// LLMRequest. Fonctions pures, testées — l'UI ne fait que les appeler.

import { DEFAULT_MAX_TOKENS, FIL_ROUGE_PROMPT } from '../../config/defaults'
import { buildRequestBody, type LLMRequest } from '../../engine'

/** Un bloc activable : la valeur est conservée même quand le bloc est éteint. */
export interface BlockState<T> {
  enabled: boolean
  value: T
}

export interface L2Config {
  prompt: string
  system: BlockState<string>
  temperature: BlockState<number>
  maxTokens: BlockState<number>
}

/** System prompt proposé à l'activation du bloc (modifiable ensuite). */
export const DEFAULT_SYSTEM_PROMPT =
  'Tu es analyste relation client chez un opérateur télécom. Réponds en ' +
  '3 phrases maximum, sur un ton factuel, et termine par une action ' +
  'recommandée.'

export function defaultL2Config(): L2Config {
  return {
    prompt: FIL_ROUGE_PROMPT,
    system: { enabled: false, value: DEFAULT_SYSTEM_PROMPT },
    // 1 est le défaut implicite de l'API : activer le bloc le rend visible.
    temperature: { enabled: false, value: 1 },
    maxTokens: { enabled: false, value: DEFAULT_MAX_TOKENS },
  }
}

/**
 * Projette la configuration en LLMRequest : un bloc éteint est absent de la
 * requête (le JSON du panneau T4 « s'allume » à l'activation), sauf
 * max_tokens, obligatoire pour l'API — éteint, il retombe sur le défaut.
 */
export function toRequest(config: L2Config, model: string): LLMRequest {
  const request: LLMRequest = {
    model,
    messages: [{ role: 'user', content: config.prompt }],
    max_tokens: config.maxTokens.enabled
      ? config.maxTokens.value
      : DEFAULT_MAX_TOKENS,
  }
  if (config.system.enabled) request.system = config.system.value
  if (config.temperature.enabled) request.temperature = config.temperature.value
  return request
}

/**
 * Clés de premier niveau du corps de requête qui diffèrent entre A et B —
 * comparaison au niveau wire (via buildRequestBody) pour que le surlignage
 * du panneau T4 corresponde exactement au JSON affiché.
 */
export function diffRequestKeys(a: LLMRequest, b: LLMRequest): Set<string> {
  const bodyA = buildRequestBody(a, false)
  const bodyB = buildRequestBody(b, false)
  const diff = new Set<string>()
  for (const key of new Set([...Object.keys(bodyA), ...Object.keys(bodyB)])) {
    if (JSON.stringify(bodyA[key]) !== JSON.stringify(bodyB[key])) diff.add(key)
  }
  return diff
}

export interface DiffEntry {
  key: string
  /** Valeur côté A, compactée pour affichage ; null si la clé est absente. */
  a: string | null
  b: string | null
}

const DIFF_VALUE_MAX_LENGTH = 60

/** Diff lisible pour la ligne « Différences A → B » de l'UI. */
export function describeDiff(a: LLMRequest, b: LLMRequest): DiffEntry[] {
  const bodyA = buildRequestBody(a, false)
  const bodyB = buildRequestBody(b, false)
  return [...diffRequestKeys(a, b)].sort().map((key) => ({
    key,
    a: key in bodyA ? compact(bodyA[key]) : null,
    b: key in bodyB ? compact(bodyB[key]) : null,
  }))
}

function compact(value: unknown): string {
  const json = JSON.stringify(value)
  return json.length > DIFF_VALUE_MAX_LENGTH
    ? json.slice(0, DIFF_VALUE_MAX_LENGTH) + '…'
    : json
}
