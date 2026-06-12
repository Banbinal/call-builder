import { describe, expect, it, vi } from 'vitest'
import { createProvider } from './provider'
import type { LLMRequest, ProviderConfig, SSEEvent } from './types'

const CONFIG: ProviderConfig = {
  mode: 'direct',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-test',
}

const REQUEST: LLMRequest = {
  model: 'claude-haiku-4-5-20251001',
  messages: [{ role: 'user', content: 'Bonjour' }],
  max_tokens: 100,
}

// Horloge fausse : +10 ms à chaque lecture — latences déterministes.
function makeClock(step = 10) {
  let t = 0
  return () => (t += step)
}

// Flux SSE de référence, conforme au format de l'API Anthropic.
const STREAM_FIXTURE =
  'event: message_start\n' +
  'data: {"type":"message_start","message":{"id":"msg_01","model":"claude-haiku-4-5-20251001","usage":{"input_tokens":12,"output_tokens":1}}}\n\n' +
  'event: content_block_start\n' +
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n' +
  'event: content_block_delta\n' +
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Bon"}}\n\n' +
  'event: content_block_delta\n' +
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"jour !"}}\n\n' +
  'event: content_block_stop\n' +
  'data: {"type":"content_block_stop","index":0}\n\n' +
  'event: message_delta\n' +
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":7}}\n\n' +
  'event: message_stop\n' +
  'data: {"type":"message_stop"}\n\n'

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('callLLM — non-streaming', () => {
  const MESSAGE_BODY = {
    model: 'claude-haiku-4-5-20251001',
    content: [{ type: 'text', text: 'Bonjour !' }],
    usage: { input_tokens: 12, output_tokens: 7 },
    stop_reason: 'end_turn',
  }

  it('assemble texte, usage, stop_reason et latence', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MESSAGE_BODY))
    const provider = createProvider(CONFIG, { fetch: fetchMock, now: makeClock() })
    const result = await provider.callLLM(REQUEST, { stream: false })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('Bonjour !')
    expect(result.model).toBe('claude-haiku-4-5-20251001')
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
    expect(result.stopReason).toBe('end_turn')
    expect(result.firstTokenLatencyMs).toBeNull()
    expect(result.totalLatencyMs).toBeGreaterThan(0)
    expect(result.events).toEqual([])
  })

  it('envoie URL, headers et corps attendus (mode direct)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MESSAGE_BODY))
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    await provider.callLLM(
      { ...REQUEST, system: 'Réponds en français.', temperature: 0.5 },
      { stream: false },
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('sk-ant-test')
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')

    const body = JSON.parse(init.body)
    expect(body).toEqual({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Bonjour' }],
      system: 'Réponds en français.',
      temperature: 0.5,
    })
    expect(body.stream).toBeUndefined()
  })

  it('fusionne le champ libre extra dans le corps', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MESSAGE_BODY))
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    await provider.callLLM(
      { ...REQUEST, extra: { tools: [{ name: 'demo' }] } },
      { stream: false },
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.tools).toEqual([{ name: 'demo' }])
  })

  it("n'ajoute pas le header navigateur en mode proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MESSAGE_BODY))
    const provider = createProvider(
      { mode: 'proxy', baseUrl: 'https://proxy.example.com/' },
      { fetch: fetchMock },
    )
    await provider.callLLM(REQUEST, { stream: false })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proxy.example.com/v1/messages')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBeUndefined()
    expect(init.headers['x-api-key']).toBeUndefined()
  })
})

describe('callLLM — streaming', () => {
  it('assemble le texte et expose les événements bruts dans l\'ordre', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([STREAM_FIXTURE]))
    const provider = createProvider(CONFIG, { fetch: fetchMock, now: makeClock() })

    const received: SSEEvent[] = []
    const result = await provider.callLLM(REQUEST, {
      stream: true,
      onEvent: (e) => received.push(e),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('Bonjour !')
    expect(result.model).toBe('claude-haiku-4-5-20251001')
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
    expect(result.stopReason).toBe('end_turn')
    expect(result.events.map((e) => e.event)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
    // onEvent reçoit exactement les mêmes événements, en temps réel.
    expect(received).toEqual(result.events)
    // Le corps envoyé demande bien le streaming.
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.stream).toBe(true)
  })

  it('reconstitue le texte même avec des chunks coupés arbitrairement', async () => {
    // Coupures tous les 17 caractères : lignes et séparateurs fragmentés.
    const chunks = STREAM_FIXTURE.match(/[\s\S]{1,17}/g) ?? []
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(chunks))
    const provider = createProvider(CONFIG, { fetch: fetchMock })

    const result = await provider.callLLM(REQUEST, { stream: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('Bonjour !')
    expect(result.events).toHaveLength(7)
  })

  it('calcule les latences : premier token entre début et fin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([STREAM_FIXTURE]))
    const provider = createProvider(CONFIG, { fetch: fetchMock, now: makeClock(10) })

    const result = await provider.callLLM(REQUEST, { stream: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.firstTokenLatencyMs).not.toBeNull()
    expect(result.firstTokenLatencyMs!).toBeGreaterThan(0)
    expect(result.firstTokenLatencyMs!).toBeLessThan(result.totalLatencyMs)
    // Le premier token correspond au premier content_block_delta de texte.
    // Avec l'horloge +10 : start est lu juste avant le premier événement,
    // donc start = timestamp(events[0]) - 10.
    const firstDelta = result.events.find((e) => e.event === 'content_block_delta')!
    const start = result.events[0].timestamp - 10
    expect(result.firstTokenLatencyMs).toBe(firstDelta.timestamp - start)
  })

  it('horodate chaque événement dans un ordre croissant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([STREAM_FIXTURE]))
    const provider = createProvider(CONFIG, { fetch: fetchMock, now: makeClock() })
    const result = await provider.callLLM(REQUEST, { stream: true })
    if (!result.ok) throw new Error('expected success')
    const timestamps = result.events.map((e) => e.timestamp)
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps)
  })

  it("mappe l'événement SSE error en échec, en conservant les événements reçus", async () => {
    const stream =
      'event: message_start\n' +
      'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}\n\n' +
      'event: error\n' +
      'data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n'
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([stream]))
    const provider = createProvider(CONFIG, { fetch: fetchMock })

    const result = await provider.callLLM(REQUEST, { stream: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('server')
    expect(result.error.detail).toBe('Overloaded')
    expect(result.events.map((e) => e.event)).toEqual(['message_start', 'error'])
  })
})

describe('callLLM — gestion des erreurs', () => {
  function errorResponse(status: number, type: string, message: string): Response {
    return jsonResponse({ type: 'error', error: { type, message } }, status)
  }

  it('401 → erreur auth affichable, sans exception', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(401, 'authentication_error', 'invalid x-api-key'))
    const provider = createProvider(CONFIG, { fetch: fetchMock })

    const result = await provider.callLLM(REQUEST, { stream: false })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('auth')
    expect(result.error.status).toBe(401)
    expect(result.error.message).toMatch(/clé api/i)
    expect(result.error.detail).toBe('invalid x-api-key')
  })

  it('429 → erreur rate_limit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(429, 'rate_limit_error', 'rate limited'))
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    const result = await provider.callLLM(REQUEST, { stream: false })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('rate_limit')
  })

  it('400 de validation → erreur invalid_request avec le détail API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        errorResponse(400, 'invalid_request_error', 'max_tokens: must be positive'),
      )
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    const result = await provider.callLLM(REQUEST, { stream: false })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('invalid_request')
    expect(result.error.detail).toBe('max_tokens: must be positive')
  })

  it('529 → erreur server', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(529, 'overloaded_error', 'Overloaded'))
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    const result = await provider.callLLM(REQUEST, { stream: false })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('server')
  })

  it('corps d\'erreur non-JSON → mappage sur le statut HTTP seul', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>Bad Gateway</html>', { status: 502 }),
    )
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    const result = await provider.callLLM(REQUEST, { stream: false })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('server')
    expect(result.error.status).toBe(502)
  })

  it('échec réseau (fetch rejette) → erreur network affichable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const provider = createProvider(CONFIG, { fetch: fetchMock })
    const result = await provider.callLLM(REQUEST, { stream: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('network')
    expect(result.error.detail).toBe('Failed to fetch')
  })
})
