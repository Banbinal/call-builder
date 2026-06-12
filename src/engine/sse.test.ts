import { describe, expect, it } from 'vitest'
import { createSSEParser } from './sse'

describe('createSSEParser', () => {
  it('parse un bloc événement simple', () => {
    const parser = createSSEParser()
    const messages = parser.push(
      'event: message_start\ndata: {"type":"message_start"}\n\n',
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].event).toBe('message_start')
    expect(messages[0].data).toBe('{"type":"message_start"}')
    expect(messages[0].raw).toContain('event: message_start')
  })

  it("n'émet rien tant que le bloc est incomplet, puis l'émet entier", () => {
    const parser = createSSEParser()
    // Coupures arbitraires : en pleine ligne, puis en plein séparateur.
    expect(parser.push('event: content_blo')).toHaveLength(0)
    expect(parser.push('ck_delta\ndata: {"x":1}\n')).toHaveLength(0)
    const messages = parser.push('\nevent: ping\ndata: {}\n\n')
    expect(messages).toHaveLength(2)
    expect(messages[0].event).toBe('content_block_delta')
    expect(messages[0].data).toBe('{"x":1}')
    expect(messages[1].event).toBe('ping')
  })

  it('émet plusieurs événements arrivés dans un même chunk, dans l\'ordre', () => {
    const parser = createSSEParser()
    const messages = parser.push(
      'event: a\ndata: 1\n\nevent: b\ndata: 2\n\nevent: c\ndata: 3\n\n',
    )
    expect(messages.map((m) => m.event)).toEqual(['a', 'b', 'c'])
  })

  it('joint les lignes data multiples avec \\n', () => {
    const parser = createSSEParser()
    const messages = parser.push('data: ligne1\ndata: ligne2\n\n')
    expect(messages[0].data).toBe('ligne1\nligne2')
    expect(messages[0].event).toBe('message') // défaut SSE
  })

  it('gère les fins de ligne CRLF', () => {
    const parser = createSSEParser()
    const messages = parser.push('event: e\r\ndata: {"ok":true}\r\n\r\n')
    expect(messages).toHaveLength(1)
    expect(messages[0].event).toBe('e')
    expect(messages[0].data).toBe('{"ok":true}')
  })

  it('ignore les commentaires (keep-alive) et les champs inconnus', () => {
    const parser = createSSEParser()
    expect(parser.push(': keep-alive\n\n')).toHaveLength(0)
    const messages = parser.push('id: 42\nretry: 100\nevent: e\ndata: x\n\n')
    expect(messages).toHaveLength(1)
    expect(messages[0].data).toBe('x')
  })

  it('flush récupère un bloc final non terminé par une ligne vide', () => {
    const parser = createSSEParser()
    expect(parser.push('event: last\ndata: fin')).toHaveLength(0)
    const messages = parser.flush()
    expect(messages).toHaveLength(1)
    expect(messages[0].event).toBe('last')
    expect(messages[0].data).toBe('fin')
    expect(parser.flush()).toHaveLength(0)
  })
})
