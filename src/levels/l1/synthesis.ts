// Heuristiques pures de synthèse pour la galerie ×N (T3) : longueurs et
// détection grossière du format de chaque réponse. Volontairement simples —
// l'objectif pédagogique est de montrer que N réponses au même prompt
// divergent, pas d'analyser finement leur contenu.

export interface FormatTraits {
  hasList: boolean
  hasJson: boolean
  hasHeading: boolean
}

export function detectFormat(text: string): FormatTraits {
  return {
    // Ligne commençant par une puce ou un numéro.
    hasList: /^\s*(?:[-*•]|\d+[.)])\s+\S/m.test(text),
    // Bloc ```json ou texte qui démarre directement sur un objet/tableau.
    hasJson: /```json/i.test(text) || /^\s*[{[]/.test(text),
    // Titre Markdown ou ligne entièrement en gras.
    hasHeading: /^#{1,6}\s+\S/m.test(text) || /^\*\*[^*\n]+\*\*:?\s*$/m.test(text),
  }
}

/** Étiquette lisible d'une combinaison de traits, ex. « liste + titres ». */
export function formatLabel(traits: FormatTraits): string {
  const parts: string[] = []
  if (traits.hasJson) parts.push('JSON')
  if (traits.hasList) parts.push('liste')
  if (traits.hasHeading) parts.push('titres')
  return parts.length > 0 ? parts.join(' + ') : 'texte simple'
}

export interface TextsSynthesis {
  minLength: number
  maxLength: number
  medianLength: number
  /** Nombre de combinaisons de traits distinctes parmi les réponses. */
  distinctFormats: number
  formatLabels: string[]
}

export function summarizeTexts(texts: string[]): TextsSynthesis | null {
  if (texts.length === 0) return null
  const lengths = texts.map((t) => t.length).sort((a, b) => a - b)
  const labels = new Set(texts.map((t) => formatLabel(detectFormat(t))))
  return {
    minLength: lengths[0],
    maxLength: lengths[lengths.length - 1],
    medianLength: median(lengths),
    distinctFormats: labels.size,
    formatLabels: [...labels],
  }
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}
