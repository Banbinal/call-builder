// Modèle de schéma de sortie (T6) : la représentation « éditeur visuel »
// (liste de champs) et sa conversion aller-retour vers le JSON Schema injecté
// dans la requête. Un seul niveau d'objet pour le v0 — fromJsonSchema rejette
// explicitement ce que l'éditeur visuel ne sait pas représenter.
// Module pur, sans React ni DOM.

export type FieldType = 'string' | 'number' | 'boolean' | 'enum'

export interface SchemaField {
  name: string
  type: FieldType
  required: boolean
  description: string
  /** Valeurs autorisées — uniquement pour le type 'enum'. */
  enumValues?: string[]
}

export interface SchemaSpec {
  fields: SchemaField[]
}

/** Schéma par défaut du fil rouge : l'analyse de verbatim client. */
export function defaultSchemaSpec(): SchemaSpec {
  return {
    fields: [
      {
        name: 'irritant',
        type: 'string',
        required: true,
        description: 'Le problème principal exprimé par le client, en une phrase',
      },
      {
        name: 'gravite',
        type: 'enum',
        required: true,
        description: 'Niveau de gravité de l’irritant',
        enumValues: ['faible', 'moyenne', 'critique'],
      },
      {
        name: 'theme',
        type: 'string',
        required: true,
        description: 'Le thème métier concerné (ex. service client, facturation)',
      },
      {
        name: 'verbatim_resume',
        type: 'string',
        required: true,
        description: 'Le verbatim résumé en une phrase neutre',
      },
    ],
  }
}

/**
 * Projette la liste de champs en JSON Schema — la forme exacte injectée dans
 * `output_config.format.schema` (mode strict) et affichée dans l'éditeur
 * « JSON brut ». `additionalProperties: false` est exigé par l'API pour le
 * structured output.
 */
export function toJsonSchema(spec: SchemaSpec): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const field of spec.fields) {
    const property: Record<string, unknown> = {}
    if (field.type === 'enum') {
      property.type = 'string'
      property.enum = field.enumValues ?? []
    } else {
      property.type = field.type
    }
    if (field.description) property.description = field.description
    properties[field.name] = property
  }
  return {
    type: 'object',
    properties,
    required: spec.fields.filter((f) => f.required).map((f) => f.name),
    additionalProperties: false,
  }
}

export type FromJsonSchemaResult =
  | { ok: true; spec: SchemaSpec }
  | { ok: false; error: string }

/**
 * Reconstruit la liste de champs depuis un JSON Schema édité à la main
 * (onglet « JSON brut »). Retourne une erreur affichable si le schéma sort du
 * sous-ensemble supporté par l'éditeur visuel (un niveau d'objet, types
 * string/number/boolean/enum de chaînes).
 */
export function fromJsonSchema(value: unknown): FromJsonSchemaResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Le schéma doit être un objet JSON.' }
  }
  const schema = value as Record<string, unknown>
  if (schema.type !== 'object') {
    return { ok: false, error: 'Le schéma racine doit avoir "type": "object".' }
  }
  const properties = schema.properties
  if (
    typeof properties !== 'object' ||
    properties === null ||
    Array.isArray(properties)
  ) {
    return { ok: false, error: 'Le schéma doit avoir un objet "properties".' }
  }
  const required = schema.required ?? []
  if (
    !Array.isArray(required) ||
    required.some((name) => typeof name !== 'string')
  ) {
    return {
      ok: false,
      error: '"required" doit être une liste de noms de champs.',
    }
  }

  const fields: SchemaField[] = []
  for (const [name, raw] of Object.entries(
    properties as Record<string, unknown>,
  )) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `Le champ "${name}" doit être un objet.` }
    }
    const property = raw as Record<string, unknown>
    const description =
      typeof property.description === 'string' ? property.description : ''
    const isRequired = (required as string[]).includes(name)

    if (Array.isArray(property.enum)) {
      if (
        property.enum.some((v) => typeof v !== 'string') ||
        (property.type !== undefined && property.type !== 'string')
      ) {
        return {
          ok: false,
          error: `Le champ "${name}" : seuls les enums de chaînes sont supportés par l'éditeur visuel.`,
        }
      }
      fields.push({
        name,
        type: 'enum',
        required: isRequired,
        description,
        enumValues: property.enum as string[],
      })
      continue
    }

    if (
      property.type !== 'string' &&
      property.type !== 'number' &&
      property.type !== 'boolean'
    ) {
      return {
        ok: false,
        error:
          `Le champ "${name}" a un type non supporté par l'éditeur visuel ` +
          '(types acceptés : string, number, boolean, enum de chaînes — un seul niveau d’objet).',
      }
    }
    fields.push({
      name,
      type: property.type,
      required: isRequired,
      description,
    })
  }
  return { ok: true, spec: { fields } }
}

/**
 * Exemple de réponse conforme au schéma, pré-rempli dans le « mode test » de
 * l'éditeur pour être altéré à la main et voir les violations apparaître.
 */
export function sampleResponse(spec: SchemaSpec): Record<string, unknown> {
  const sample: Record<string, unknown> = {}
  for (const field of spec.fields) {
    switch (field.type) {
      case 'string':
        sample[field.name] = field.description || 'texte'
        break
      case 'number':
        sample[field.name] = 0
        break
      case 'boolean':
        sample[field.name] = true
        break
      case 'enum':
        sample[field.name] = field.enumValues?.[0] ?? ''
        break
    }
  }
  return sample
}

/**
 * Consigne de repli injectée dans le system prompt quand le mode strict n'est
 * pas utilisé : le schéma est demandé au modèle, pas imposé par l'API — c'est
 * exactement ce que le taux de conformité du ×N rend visible.
 */
export function schemaPromptInstruction(spec: SchemaSpec): string {
  return (
    'Réponds uniquement avec un objet JSON conforme à ce schéma, sans aucun ' +
    'texte autour ni bloc de code :\n' +
    JSON.stringify(toJsonSchema(spec))
  )
}
