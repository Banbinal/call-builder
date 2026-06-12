// Parseur SSE incrémental, pur (aucune dépendance réseau ou DOM).
// Le flux arrive en chunks arbitraires : un événement peut être coupé en
// plein milieu d'une ligne. On accumule dans un buffer et on n'émet que les
// blocs complets (terminés par une ligne vide).

export interface RawSSEMessage {
  /** Valeur du champ `event:` (défaut SSE : "message"). */
  event: string
  /** Lignes `data:` concaténées (séparées par \n si multiples). */
  data: string
  /** Le bloc complet tel que reçu, pour l'affichage du flux brut. */
  raw: string
}

const BLOCK_SEPARATOR = /\r?\n\r?\n/

function parseBlock(block: string): RawSSEMessage | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) continue // commentaire SSE (keep-alive)
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const field = line.slice(0, colon)
    let value = line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n'), raw: block }
}

export interface SSEParser {
  /** Ajoute un chunk et retourne les événements complets qu'il débloque. */
  push(chunk: string): RawSSEMessage[]
  /** Vide le buffer en fin de flux (bloc final sans ligne vide terminale). */
  flush(): RawSSEMessage[]
}

export function createSSEParser(): SSEParser {
  let buffer = ''
  return {
    push(chunk) {
      buffer += chunk
      const messages: RawSSEMessage[] = []
      let match: RegExpExecArray | null
      while ((match = BLOCK_SEPARATOR.exec(buffer)) !== null) {
        const block = buffer.slice(0, match.index)
        buffer = buffer.slice(match.index + match[0].length)
        const message = parseBlock(block)
        if (message) messages.push(message)
      }
      return messages
    },
    flush() {
      const block = buffer.trim()
      buffer = ''
      const message = block ? parseBlock(block) : null
      return message ? [message] : []
    },
  }
}
