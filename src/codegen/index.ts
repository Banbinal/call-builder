// Génération de code (T4) : trois générateurs purs LLMRequest → string
// (Python SDK anthropic, curl, JavaScript fetch), testés par snapshots.
// La clé API ne peut pas apparaître dans le code généré : les générateurs ne
// la reçoivent jamais — seul le placeholder VOTRE_CLE_API est écrit.

import {
  ANTHROPIC_VERSION,
  buildRequestBody,
  type LLMRequest,
} from '../engine'

export const API_KEY_PLACEHOLDER = 'VOTRE_CLE_API'

const DEFAULT_BASE_URL = 'https://api.anthropic.com'

export interface CodegenOptions {
  /** URL de base de l'API (changera en mode proxy, T12). */
  baseUrl?: string
}

function messagesUrl(opts?: CodegenOptions): string {
  return (opts?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '') + '/v1/messages'
}

/** Code Python utilisant le SDK officiel `anthropic`. */
export function generatePython(
  request: LLMRequest,
  opts?: CodegenOptions,
): string {
  const body = buildRequestBody(request, false)
  const kwargs = Object.entries(body)
    .map(([key, value]) => `    ${key}=${toPythonLiteral(value, 1)},`)
    .join('\n')
  const clientArgs = [`api_key="${API_KEY_PLACEHOLDER}"`]
  if (opts?.baseUrl && opts.baseUrl !== DEFAULT_BASE_URL) {
    clientArgs.push(`base_url="${opts.baseUrl}"`)
  }
  return [
    '# pip install anthropic',
    'import anthropic',
    '',
    `client = anthropic.Anthropic(${clientArgs.join(', ')})`,
    '',
    'message = client.messages.create(',
    kwargs,
    ')',
    '',
    'print(message.content[0].text)',
    '',
  ].join('\n')
}

/** Commande curl avec le corps JSON exact de la requête. */
export function generateCurl(
  request: LLMRequest,
  opts?: CodegenOptions,
): string {
  const body = JSON.stringify(buildRequestBody(request, false), null, 2)
  // À l'intérieur d'une chaîne shell entre apostrophes, une apostrophe
  // s'écrit '\'' (fermer, échapper, rouvrir).
  const shellBody = body.replace(/'/g, "'\\''")
  return [
    `curl ${messagesUrl(opts)} \\`,
    `  -H "x-api-key: ${API_KEY_PLACEHOLDER}" \\`,
    `  -H "anthropic-version: ${ANTHROPIC_VERSION}" \\`,
    '  -H "content-type: application/json" \\',
    `  -d '${shellBody}'`,
    '',
  ].join('\n')
}

/** Code JavaScript (fetch natif), exécutable dans Node ≥ 18 ou un navigateur. */
export function generateJavaScript(
  request: LLMRequest,
  opts?: CodegenOptions,
): string {
  const body = indentBlock(
    JSON.stringify(buildRequestBody(request, false), null, 2),
    '  ',
  )
  return [
    `const response = await fetch("${messagesUrl(opts)}", {`,
    '  method: "POST",',
    '  headers: {',
    `    "x-api-key": "${API_KEY_PLACEHOLDER}",`,
    `    "anthropic-version": "${ANTHROPIC_VERSION}",`,
    '    "content-type": "application/json",',
    "    // Requis uniquement pour un appel depuis un navigateur (mode BYOK) :",
    '    "anthropic-dangerous-direct-browser-access": "true",',
    '  },',
    `  body: JSON.stringify(${body.trimStart()}),`,
    '})',
    '',
    'const data = await response.json()',
    'console.log(data.content[0].text)',
    '',
  ].join('\n')
}

/**
 * Sérialise une valeur en littéral Python (json.dumps « à l'envers ») :
 * mêmes chaînes que JSON (les échappements JSON sont du Python valide),
 * mais True/False/None à la place de true/false/null.
 */
function toPythonLiteral(value: unknown, depth: number): string {
  if (value === null) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  const pad = '    '.repeat(depth)
  const innerPad = '    '.repeat(depth + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value
      .map((item) => `${innerPad}${toPythonLiteral(item, depth + 1)},`)
      .join('\n')
    return `[\n${items}\n${pad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const items = entries
      .map(
        ([k, v]) =>
          `${innerPad}${JSON.stringify(k)}: ${toPythonLiteral(v, depth + 1)},`,
      )
      .join('\n')
    return `{\n${items}\n${pad}}`
  }
  return JSON.stringify(value) ?? 'None'
}

/** Préfixe chaque ligne d'un bloc multi-ligne (la première incluse). */
function indentBlock(block: string, prefix: string): string {
  return block
    .split('\n')
    .map((line) => prefix + line)
    .join('\n')
}
