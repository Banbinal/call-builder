// Validation des réponses contre le schéma actif (T6) : parse JSON puis
// validation ajv, avec chaque violation traduite en message français
// affichable (champ manquant, type faux, valeur hors enum…). Module pur —
// réutilisable par le harness T9 (retry sur non-conformité).

import { Ajv, type ErrorObject } from 'ajv'

export type ViolationKind = 'missing' | 'type' | 'enum' | 'unexpected' | 'other'

export interface Violation {
  kind: ViolationKind
  /** Champ concerné (vide si la violation porte sur la racine). */
  field: string
  /** Message français affichable tel quel. */
  message: string
}

export type ValidationResult =
  | { status: 'valid'; parsed: unknown }
  | { status: 'invalid'; parsed: unknown; violations: Violation[] }
  | { status: 'not_json'; message: string }

// allErrors : on veut la liste complète des violations, pas la première.
// strict désactivé : le schéma vient de l'utilisateur (onglet JSON brut).
const ajv = new Ajv({ allErrors: true, strict: false })

// La compilation ajv est coûteuse et le ×N valide N réponses contre le même
// schéma : cache borné, keyé par le schéma sérialisé.
const COMPILED_CACHE_MAX = 32
const compiledCache = new Map<string, ReturnType<typeof ajv.compile>>()

function compileSchema(schema: Record<string, unknown>) {
  const key = JSON.stringify(schema)
  let validate = compiledCache.get(key)
  if (!validate) {
    validate = ajv.compile(schema)
    if (compiledCache.size >= COMPILED_CACHE_MAX) compiledCache.clear()
    compiledCache.set(key, validate)
  }
  return validate
}

/**
 * Parse `text` comme JSON puis le valide contre `schema` (JSON Schema).
 * Un texte non parsable est une non-conformité à part entière : la consigne
 * demande du JSON seul, un texte autour est une violation du contrat.
 */
export function validateResponse(
  text: string,
  schema: Record<string, unknown>,
): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      status: 'not_json',
      message:
        'La réponse n’est pas du JSON parsable — le contrat demandait un ' +
        'objet JSON seul, sans texte autour.',
    }
  }
  const validate = compileSchema(schema)
  if (validate(parsed)) return { status: 'valid', parsed }
  const violations = (validate.errors ?? []).map(toViolation)
  return { status: 'invalid', parsed, violations }
}

/** Traduit une erreur ajv en violation française. */
function toViolation(error: ErrorObject): Violation {
  // instancePath vaut "/champ" pour une propriété de premier niveau.
  const field = error.instancePath.replace(/^\//, '')
  switch (error.keyword) {
    case 'required': {
      const missing = (error.params as { missingProperty: string })
        .missingProperty
      return {
        kind: 'missing',
        field: missing,
        message: `Champ manquant : "${missing}" est requis par le schéma.`,
      }
    }
    case 'type': {
      const expected = (error.params as { type: string }).type
      return {
        kind: 'type',
        field,
        message: `Type faux : "${field}" devrait être de type ${expected}.`,
      }
    }
    case 'enum': {
      const allowed = (error.params as { allowedValues: unknown[] })
        .allowedValues
      return {
        kind: 'enum',
        field,
        message:
          `Valeur hors enum : "${field}" doit être l'une de ` +
          `${allowed.map((v) => JSON.stringify(v)).join(', ')}.`,
      }
    }
    case 'additionalProperties': {
      const extra = (error.params as { additionalProperty: string })
        .additionalProperty
      return {
        kind: 'unexpected',
        field: extra,
        message: `Champ non prévu : "${extra}" n'existe pas dans le schéma.`,
      }
    }
    default:
      return {
        kind: 'other',
        field,
        message: `Violation sur "${field || 'la racine'}" : ${error.message ?? error.keyword}.`,
      }
  }
}
