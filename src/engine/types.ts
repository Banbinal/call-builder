// Types publics de la couche provider (T1).
// Les clés de LLMRequest reprennent volontairement le format du corps JSON
// envoyé à l'API (`max_tokens`, pas `maxTokens`) : le panneau requête (T4) et
// le codegen affichent ce que l'utilisateur verra réellement partir.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  model: string
  system?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens: number
  /** Options futures (tools, output_format…) fusionnées telles quelles dans le corps. */
  extra?: Record<string, unknown>
}

/**
 * Configuration du provider, injectée à chaque appel — la clé API ne vit que
 * dans cet objet, jamais dans un storage navigateur (invariant n°4).
 * `mode: 'proxy'` est prévu pour l'épic 2 (T12) : même interface, la clé
 * reste alors côté serveur.
 */
export interface ProviderConfig {
  mode: 'direct' | 'proxy'
  baseUrl: string
  apiKey?: string
}

/** Un événement SSE tel que reçu, horodaté, dans l'ordre d'arrivée. */
export interface SSEEvent {
  /** Nom de l'événement SSE (message_start, content_block_delta…). */
  event: string
  /** Charge utile désérialisée (ou chaîne brute si le JSON est invalide). */
  data: unknown
  /** Bloc SSE brut, exactement comme reçu sur le fil. */
  raw: string
  /** Horodatage de réception (epoch ms). */
  timestamp: number
}

export type LLMErrorType =
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'invalid_request'
  | 'server'
  | 'unknown'

/** Erreur affichable dans l'UI — jamais une exception qui remonte. */
export interface LLMError {
  type: LLMErrorType
  /** Statut HTTP si la requête a atteint l'API. */
  status?: number
  /** Message pédagogique en français, affichable tel quel. */
  message: string
  /** Message brut renvoyé par l'API (anglais), pour le détail technique. */
  detail?: string
}

export interface Usage {
  inputTokens: number
  outputTokens: number
}

export interface LLMSuccess {
  ok: true
  /** Texte assemblé à partir des deltas (ou du corps complet en non-streaming). */
  text: string
  /** Modèle confirmé par l'API (champ `model` de la réponse), si présent. */
  model: string | null
  usage: Usage
  totalLatencyMs: number
  /** Latence jusqu'au premier token de texte ; null en non-streaming. */
  firstTokenLatencyMs: number | null
  stopReason: string | null
  /** Liste brute des événements SSE reçus, dans l'ordre (vide en non-streaming). */
  events: SSEEvent[]
}

export interface LLMFailure {
  ok: false
  error: LLMError
  /** Événements reçus avant l'échec (utile pour montrer une erreur mi-flux). */
  events: SSEEvent[]
  totalLatencyMs: number
}

export type LLMResult = LLMSuccess | LLMFailure
