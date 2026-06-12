import { describe, expect, it } from 'vitest'
import {
  defaultSchemaSpec,
  fromJsonSchema,
  sampleResponse,
  schemaPromptInstruction,
  toJsonSchema,
  type SchemaSpec,
} from './model'

describe('toJsonSchema', () => {
  it('schéma fil rouge : objet, required, additionalProperties false', () => {
    const schema = toJsonSchema(defaultSchemaSpec())
    expect(schema.type).toBe('object')
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toEqual([
      'irritant',
      'gravite',
      'theme',
      'verbatim_resume',
    ])
    const properties = schema.properties as Record<string, Record<string, unknown>>
    expect(properties.gravite).toEqual({
      type: 'string',
      enum: ['faible', 'moyenne', 'critique'],
      description: expect.any(String),
    })
    expect(properties.irritant.type).toBe('string')
  })

  it('champ optionnel absent de required, description vide omise', () => {
    const spec: SchemaSpec = {
      fields: [
        { name: 'note', type: 'number', required: false, description: '' },
      ],
    }
    const schema = toJsonSchema(spec)
    expect(schema.required).toEqual([])
    expect(schema.properties).toEqual({ note: { type: 'number' } })
  })
})

describe('fromJsonSchema (synchronisation JSON brut → éditeur visuel)', () => {
  it('aller-retour : toJsonSchema puis fromJsonSchema rend le spec initial', () => {
    const spec = defaultSchemaSpec()
    const result = fromJsonSchema(toJsonSchema(spec))
    expect(result).toEqual({ ok: true, spec })
  })

  it('enum string : reconnu comme type enum', () => {
    const result = fromJsonSchema({
      type: 'object',
      properties: { statut: { enum: ['ouvert', 'fermé'] } },
      required: ['statut'],
    })
    expect(result).toEqual({
      ok: true,
      spec: {
        fields: [
          {
            name: 'statut',
            type: 'enum',
            required: true,
            description: '',
            enumValues: ['ouvert', 'fermé'],
          },
        ],
      },
    })
  })

  it('rejette un schéma non-objet à la racine', () => {
    expect(fromJsonSchema({ type: 'array' }).ok).toBe(false)
    expect(fromJsonSchema('texte').ok).toBe(false)
    expect(fromJsonSchema(null).ok).toBe(false)
  })

  it('rejette un objet imbriqué (hors sous-ensemble v0) avec message explicite', () => {
    const result = fromJsonSchema({
      type: 'object',
      properties: { detail: { type: 'object' } },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('"detail"')
  })

  it('rejette un enum non-chaînes', () => {
    const result = fromJsonSchema({
      type: 'object',
      properties: { niveau: { enum: [1, 2, 3] } },
    })
    expect(result.ok).toBe(false)
  })
})

describe('sampleResponse', () => {
  it('produit un exemple avec une valeur par champ, enum sur sa première valeur', () => {
    const sample = sampleResponse(defaultSchemaSpec())
    expect(Object.keys(sample)).toEqual([
      'irritant',
      'gravite',
      'theme',
      'verbatim_resume',
    ])
    expect(sample.gravite).toBe('faible')
  })
})

describe('schemaPromptInstruction', () => {
  it('contient la consigne JSON seul et le schéma sérialisé', () => {
    const instruction = schemaPromptInstruction(defaultSchemaSpec())
    expect(instruction).toContain('objet JSON conforme')
    expect(instruction).toContain('"additionalProperties":false')
    expect(instruction).toContain('"gravite"')
  })
})
