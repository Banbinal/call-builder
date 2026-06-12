import { describe, expect, it } from 'vitest'
import { defaultSchemaSpec, toJsonSchema } from './model'
import { validateResponse } from './validate'

const SCHEMA = toJsonSchema(defaultSchemaSpec())

const CONFORMING = JSON.stringify({
  irritant: 'Service client injoignable',
  gravite: 'critique',
  theme: 'service client',
  verbatim_resume: 'Le client ne joint pas le support et menace de résilier.',
})

describe('validateResponse', () => {
  it('réponse conforme : valid, avec l’objet parsé', () => {
    const result = validateResponse(CONFORMING, SCHEMA)
    expect(result.status).toBe('valid')
    if (result.status === 'valid') {
      expect((result.parsed as { gravite: string }).gravite).toBe('critique')
    }
  })

  it('texte non-JSON : not_json avec message pédagogique', () => {
    const result = validateResponse('Voici l’analyse : {...}', SCHEMA)
    expect(result.status).toBe('not_json')
    if (result.status === 'not_json') {
      expect(result.message).toContain('JSON')
    }
  })

  it('champ manquant : violation kind missing nommant le champ', () => {
    const altered = JSON.parse(CONFORMING) as Record<string, unknown>
    delete altered.theme
    const result = validateResponse(JSON.stringify(altered), SCHEMA)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.violations).toEqual([
        {
          kind: 'missing',
          field: 'theme',
          message: expect.stringContaining('"theme"'),
        },
      ])
    }
  })

  it('type faux : violation kind type sur le champ concerné', () => {
    const altered = JSON.parse(CONFORMING) as Record<string, unknown>
    altered.irritant = 42
    const result = validateResponse(JSON.stringify(altered), SCHEMA)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.violations).toEqual([
        {
          kind: 'type',
          field: 'irritant',
          message: expect.stringContaining('string'),
        },
      ])
    }
  })

  it('valeur hors enum : violation kind enum listant les valeurs permises', () => {
    const altered = JSON.parse(CONFORMING) as Record<string, unknown>
    altered.gravite = 'catastrophique'
    const result = validateResponse(JSON.stringify(altered), SCHEMA)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.violations[0].kind).toBe('enum')
      expect(result.violations[0].message).toContain('"critique"')
    }
  })

  it('champ non prévu : violation kind unexpected', () => {
    const altered = JSON.parse(CONFORMING) as Record<string, unknown>
    altered.commentaire = 'en trop'
    const result = validateResponse(JSON.stringify(altered), SCHEMA)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.violations).toEqual([
        {
          kind: 'unexpected',
          field: 'commentaire',
          message: expect.stringContaining('"commentaire"'),
        },
      ])
    }
  })

  it('violations multiples : toutes listées (allErrors)', () => {
    const result = validateResponse(
      JSON.stringify({ gravite: 'haute', extra: 1 }),
      SCHEMA,
    )
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      const kinds = result.violations.map((v) => v.kind).sort()
      // 3 champs requis manquants + 1 hors enum + 1 non prévu
      expect(kinds).toEqual(['enum', 'missing', 'missing', 'missing', 'unexpected'])
    }
  })
})
