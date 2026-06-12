import { describe, expect, it } from 'vitest'
import type { LLMRequest } from '../engine'
import {
  API_KEY_PLACEHOLDER,
  generateCurl,
  generateJavaScript,
  generatePython,
} from './index'

/** Config minimale : uniquement les champs obligatoires. */
const minimal: LLMRequest = {
  model: 'claude-haiku-4-5-20251001',
  messages: [
    {
      role: 'user',
      content:
        'Analyse ce verbatim client : "Impossible de joindre le service ' +
        'client depuis 3 jours, le chat coupe à chaque fois, je songe à résilier."',
    },
  ],
  max_tokens: 1024,
}

/** Config complète : system, température, et options futures via extra. */
const full: LLMRequest = {
  model: 'claude-sonnet-4-6',
  system: 'Tu es un analyste de la relation client. Réponds en français.',
  messages: [
    { role: 'user', content: 'Analyse ce verbatim.' },
    { role: 'assistant', content: "D'accord, envoyez-le." },
    { role: 'user', content: 'Le chat coupe à chaque fois.' },
  ],
  temperature: 0.7,
  max_tokens: 500,
  extra: {
    output_format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: { irritant: { type: 'string' } },
        required: ['irritant'],
        additionalProperties: false,
      },
    },
  },
}

/** Caractères pièges : apostrophes (shell), guillemets et retours à la ligne. */
const trickyText: LLMRequest = {
  model: 'claude-haiku-4-5-20251001',
  messages: [
    {
      role: 'user',
      content: 'L\'abonné a dit : "ça coupe"\npuis a raccroché. 100 % vrai.',
    },
  ],
  max_tokens: 256,
}

describe.each([
  ['generatePython', generatePython],
  ['generateCurl', generateCurl],
  ['generateJavaScript', generateJavaScript],
] as const)('%s', (_name, generate) => {
  it('snapshot — config minimale', () => {
    expect(generate(minimal)).toMatchSnapshot()
  })

  it('snapshot — config complète (system, température, output_format)', () => {
    expect(generate(full)).toMatchSnapshot()
  })

  it('snapshot — caractères à échapper', () => {
    expect(generate(trickyText)).toMatchSnapshot()
  })

  it('contient le placeholder de clé, jamais une clé réelle', () => {
    const code = generate(full)
    expect(code).toContain(API_KEY_PLACEHOLDER)
    // La signature (LLMRequest → string) ne reçoit jamais la clé : on vérifie
    // qu'aucun motif de clé Anthropic ne peut s'y glisser.
    expect(code).not.toMatch(/sk-ant-/)
  })

  it('est une fonction pure : deux appels identiques, deux sorties identiques', () => {
    expect(generate(full)).toBe(generate(full))
  })
})

describe('contenu spécifique des générateurs', () => {
  it('le curl reprend le corps JSON exact, sans champ stream', () => {
    const code = generateCurl(minimal)
    const body = code.slice(code.indexOf("-d '") + 4, code.lastIndexOf("'"))
    expect(JSON.parse(body)).toEqual({
      model: minimal.model,
      max_tokens: minimal.max_tokens,
      messages: minimal.messages,
    })
  })

  it("le Python convertit les booléens JSON en littéraux Python", () => {
    const code = generatePython(full)
    expect(code).toContain('"additionalProperties": False')
    expect(code).not.toContain('false')
  })

  it("l'option baseUrl change l'URL cible (mode proxy, T12)", () => {
    const opts = { baseUrl: 'https://proxy.exemple.fr' }
    expect(generateCurl(minimal, opts)).toContain(
      'https://proxy.exemple.fr/v1/messages',
    )
    expect(generateJavaScript(minimal, opts)).toContain(
      'https://proxy.exemple.fr/v1/messages',
    )
    expect(generatePython(minimal, opts)).toContain(
      'base_url="https://proxy.exemple.fr"',
    )
  })
})
