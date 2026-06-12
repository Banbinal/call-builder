// Couche provider : exécute un appel POST /v1/messages (streaming ou non)
// contre l'API Anthropic, directement depuis le navigateur (BYOK).
// Aucune dépendance React/DOM ; fetch et l'horloge sont injectables pour les
// tests. Toute erreur revient comme un LLMResult { ok: false } affichable —
// jamais une exception non catchée dans l'UI.

import type {
  LLMError,
  LLMRequest,
  LLMResult,
  ProviderConfig,
  SSEEvent,
} from './types'
import { createSSEParser, type RawSSEMessage } from './sse'

const ANTHROPIC_VERSION = '2023-06-01'

export interface CallOptions {
  stream: boolean
  /** Callback temps réel, appelé pour chaque événement SSE reçu. */
  onEvent?: (event: SSEEvent) => void
  signal?: AbortSignal
}

/** Dépendances injectables — uniquement pour les tests. */
export interface ProviderDeps {
  fetch?: typeof globalThis.fetch
  now?: () => number
}

export interface Provider {
  callLLM(request: LLMRequest, opts: CallOptions): Promise<LLMResult>
}

// Formes minimales des charges utiles Anthropic que l'on lit.
interface AnthropicUsage {
  input_tokens?: number
  output_tokens?: number
}

interface AnthropicStreamData {
  type?: string
  message?: { usage?: AnthropicUsage }
  delta?: { type?: string; text?: string; stop_reason?: string }
  usage?: AnthropicUsage
  error?: { type?: string; message?: string }
}

interface AnthropicMessageBody {
  content?: Array<{ type?: string; text?: string }>
  usage?: AnthropicUsage
  stop_reason?: string | null
}

interface AnthropicErrorBody {
  error?: { type?: string; message?: string }
}

export function createProvider(
  config: ProviderConfig,
  deps: ProviderDeps = {},
): Provider {
  const fetchFn = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const url = config.baseUrl.replace(/\/+$/, '') + '/v1/messages'

  async function callLLM(
    request: LLMRequest,
    opts: CallOptions,
  ): Promise<LLMResult> {
    const start = now()
    const events: SSEEvent[] = []
    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(buildBody(request, opts.stream)),
        signal: opts.signal,
      })
      if (!response.ok) {
        const error = await readHttpError(response)
        return { ok: false, error, events, totalLatencyMs: now() - start }
      }
      if (opts.stream) {
        return await consumeStream(response, { events, start, now, onEvent: opts.onEvent })
      }
      return await consumeJson(response, { start, now })
    } catch (err) {
      // Échec réseau, CORS, abort, ou coupure en plein flux.
      return {
        ok: false,
        error: {
          type: 'network',
          message:
            "Erreur réseau — impossible de joindre l'API ou flux interrompu. " +
            'Vérifiez votre connexion.',
          detail: err instanceof Error ? err.message : String(err),
        },
        events,
        totalLatencyMs: now() - start,
      }
    }
  }

  return { callLLM }
}

function buildHeaders(config: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  }
  if (config.apiKey) headers['x-api-key'] = config.apiKey
  if (config.mode === 'direct') {
    // Header exigé par Anthropic pour autoriser les appels CORS navigateur :
    // son nom dit le risque — la clé est visible côté client (mode BYOK).
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }
  return headers
}

function buildBody(
  request: LLMRequest,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.max_tokens,
    messages: request.messages,
  }
  if (request.system !== undefined) body.system = request.system
  if (request.temperature !== undefined) body.temperature = request.temperature
  if (request.extra) Object.assign(body, request.extra)
  if (stream) body.stream = true
  return body
}

interface StreamContext {
  events: SSEEvent[]
  start: number
  now: () => number
  onEvent?: (event: SSEEvent) => void
}

async function consumeStream(
  response: Response,
  ctx: StreamContext,
): Promise<LLMResult> {
  const { events, start, now, onEvent } = ctx
  if (!response.body) {
    return {
      ok: false,
      error: {
        type: 'unknown',
        message: 'Réponse sans corps — le streaming est indisponible.',
      },
      events,
      totalLatencyMs: now() - start,
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSSEParser()

  let text = ''
  let firstTokenAt: number | null = null
  let inputTokens = 0
  let outputTokens = 0
  let stopReason: string | null = null
  let streamError: LLMError | null = null

  const handle = (message: RawSSEMessage) => {
    let data: unknown
    try {
      data = JSON.parse(message.data)
    } catch {
      data = message.data
    }
    const event: SSEEvent = {
      event: message.event,
      data,
      raw: message.raw,
      timestamp: now(),
    }
    events.push(event)
    onEvent?.(event)

    const payload = data as AnthropicStreamData
    switch (message.event) {
      case 'message_start':
        inputTokens = payload.message?.usage?.input_tokens ?? inputTokens
        break
      case 'content_block_delta':
        if (payload.delta?.type === 'text_delta') {
          if (firstTokenAt === null) firstTokenAt = event.timestamp
          text += payload.delta.text ?? ''
        }
        break
      case 'message_delta':
        stopReason = payload.delta?.stop_reason ?? stopReason
        outputTokens = payload.usage?.output_tokens ?? outputTokens
        break
      case 'error':
        streamError = mapApiError(
          undefined,
          payload.error?.type,
          payload.error?.message,
        )
        break
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    for (const message of parser.push(decoder.decode(value, { stream: true }))) {
      handle(message)
    }
  }
  for (const message of parser.flush()) handle(message)

  const totalLatencyMs = now() - start
  if (streamError) {
    return { ok: false, error: streamError, events, totalLatencyMs }
  }
  return {
    ok: true,
    text,
    usage: { inputTokens, outputTokens },
    totalLatencyMs,
    firstTokenLatencyMs: firstTokenAt === null ? null : firstTokenAt - start,
    stopReason,
    events,
  }
}

async function consumeJson(
  response: Response,
  ctx: { start: number; now: () => number },
): Promise<LLMResult> {
  const body = (await response.json()) as AnthropicMessageBody
  const text = (body.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
  return {
    ok: true,
    text,
    usage: {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    },
    totalLatencyMs: ctx.now() - ctx.start,
    firstTokenLatencyMs: null,
    stopReason: body.stop_reason ?? null,
    events: [],
  }
}

async function readHttpError(response: Response): Promise<LLMError> {
  let apiType: string | undefined
  let apiMessage: string | undefined
  try {
    const body = (await response.json()) as AnthropicErrorBody
    apiType = body.error?.type
    apiMessage = body.error?.message
  } catch {
    // Corps non-JSON (proxy, page d'erreur HTML…) : on mappe sur le statut seul.
  }
  return mapApiError(response.status, apiType, apiMessage)
}

/**
 * Mappe un statut HTTP et/ou un type d'erreur API Anthropic vers une erreur
 * typée avec message français affichable. Le type API prime quand il est
 * connu (il arrive aussi via l'événement SSE `error`, sans statut HTTP).
 */
export function mapApiError(
  status?: number,
  apiType?: string,
  apiMessage?: string,
): LLMError {
  const base = { status, detail: apiMessage }
  switch (apiType) {
    case 'authentication_error':
    case 'permission_error':
      return {
        ...base,
        type: 'auth',
        message: 'Clé API invalide ou non autorisée. Vérifiez la clé saisie.',
      }
    case 'rate_limit_error':
      return {
        ...base,
        type: 'rate_limit',
        message:
          'Limite de débit atteinte. Patientez quelques secondes avant de relancer.',
      }
    case 'invalid_request_error':
    case 'not_found_error':
    case 'request_too_large':
      return {
        ...base,
        type: 'invalid_request',
        message: "Requête rejetée par l'API : un paramètre est invalide.",
      }
    case 'api_error':
    case 'overloaded_error':
      return {
        ...base,
        type: 'server',
        message:
          "Erreur côté API Anthropic (surcharge ou incident). Réessayez dans un instant.",
      }
  }
  if (status === 401 || status === 403) {
    return {
      ...base,
      type: 'auth',
      message: 'Clé API invalide ou non autorisée. Vérifiez la clé saisie.',
    }
  }
  if (status === 429) {
    return {
      ...base,
      type: 'rate_limit',
      message:
        'Limite de débit atteinte. Patientez quelques secondes avant de relancer.',
    }
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return {
      ...base,
      type: 'invalid_request',
      message: "Requête rejetée par l'API : un paramètre est invalide.",
    }
  }
  if (status !== undefined && status >= 500) {
    return {
      ...base,
      type: 'server',
      message:
        "Erreur côté API Anthropic (surcharge ou incident). Réessayez dans un instant.",
    }
  }
  return {
    ...base,
    type: 'unknown',
    message: "Erreur inattendue lors de l'appel à l'API.",
  }
}
