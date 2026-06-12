// Niveau 3 (T7) : le modèle du formulaire de skill et la génération du
// SKILL.md. C'est ici que la config L2 « se replie » : les instructions
// viennent du system prompt, le contrat de sortie du schéma T6. Module pur,
// sans React ni DOM — l'UI ne fait qu'appeler ces fonctions.

import {
  defaultSchemaSpec,
  toJsonSchema,
  type SchemaSpec,
} from '../../schema/model'
import type { L2Config } from '../l2/config'

export interface SkillExample {
  input: string
  output: string
  /** Contre-exemple : la sortie montrée est celle à NE PAS produire. */
  counter: boolean
  /** Pourquoi la sortie est fausse — affiché pour les contre-exemples. */
  note: string
}

export interface SkillForm {
  /** Identifiant technique de la skill, kebab-case forcé par l'UI. */
  name: string
  description: string
  instructions: string
  /** Contrat de sortie injecté depuis le schéma T6 (lecture seule en L3). */
  schema: SchemaSpec
  examples: SkillExample[]
}

/** Forme canonique kebab-case : minuscules sans accents, mots liés par `-`. */
export function toKebabCase(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Description par défaut : déclencheurs cités, plus de 80 caractères. */
const DEFAULT_DESCRIPTION =
  'À utiliser quand l’utilisateur demande d’analyser un verbatim client ou ' +
  'un retour client — « analyse ce verbatim », « qualifie cette réclamation » ' +
  '— pour produire la fiche structurée irritant / gravité / thème.'

/** Le verbatim seul (sans la consigne d'analyse), pour l'exemple pré-rempli. */
const FIL_ROUGE_VERBATIM =
  '« Impossible de joindre le service client depuis 3 jours, le chat coupe ' +
  'à chaque fois, je songe à résilier. »'

const FIL_ROUGE_EXAMPLE_OUTPUT = {
  irritant: 'Service client injoignable malgré des tentatives répétées',
  gravite: 'critique',
  theme: 'service client',
  verbatim_resume:
    'Le client ne parvient pas à joindre le service client depuis trois ' +
    'jours et envisage de résilier.',
}

const FIL_ROUGE_COUNTER_INPUT =
  '« L’appli plante de temps en temps mais bon, ça va, je la relance. »'

const FIL_ROUGE_COUNTER_OUTPUT = {
  irritant: 'L’application mobile plante',
  gravite: 'critique',
  theme: 'application mobile',
  verbatim_resume: 'L’application du client plante régulièrement.',
}

/**
 * Pré-remplit le formulaire depuis la config L2 courante : les valeurs des
 * blocs sont reprises même éteints (elles survivent à l'extinction, cf.
 * BlockState) — c'est le « repli » pédagogique du niveau. Les exemples ne
 * viennent pas de L2 : pré-remplis sur le fil rouge si le schéma est resté
 * celui par défaut, sinon générés depuis le schéma courant.
 */
export function skillFormFromL2Config(config: L2Config): SkillForm {
  const spec = structuredClone(config.schema.value.spec)
  const isDefaultSchema =
    JSON.stringify(toJsonSchema(spec)) ===
    JSON.stringify(toJsonSchema(defaultSchemaSpec()))
  return {
    name: 'analyse-verbatim',
    description: DEFAULT_DESCRIPTION,
    instructions: config.system.value,
    schema: spec,
    examples: isDefaultSchema ? filRougeExamples() : [],
  }
}

function filRougeExamples(): SkillExample[] {
  return [
    {
      input: FIL_ROUGE_VERBATIM,
      output: JSON.stringify(FIL_ROUGE_EXAMPLE_OUTPUT, null, 2),
      counter: false,
      note: '',
    },
    {
      input: FIL_ROUGE_COUNTER_INPUT,
      output: JSON.stringify(FIL_ROUGE_COUNTER_OUTPUT, null, 2),
      counter: true,
      note:
        'La gêne est ponctuelle et le client la minimise lui-même : la ' +
        'gravité est « faible », pas « critique ».',
    },
  ]
}

/**
 * Génère le SKILL.md : frontmatter YAML (name + description, cette dernière
 * toujours entre guillemets — l'échappement JSON est un sous-ensemble valide
 * du scalaire YAML double-quoté), puis instructions, contrat de sortie et
 * exemples. C'est exactement le fichier téléchargé.
 */
export function generateSkillMd(form: SkillForm): string {
  const lines: string[] = [
    '---',
    `name: ${form.name}`,
    `description: ${JSON.stringify(form.description)}`,
    '---',
    '',
    `# ${form.name}`,
    '',
    '## Instructions',
    '',
    form.instructions,
    '',
    '## Contrat de sortie',
    '',
    'Réponds uniquement avec un objet JSON conforme à ce schéma, sans aucun',
    'texte autour ni bloc de code :',
    '',
    '```json',
    JSON.stringify(toJsonSchema(form.schema), null, 2),
    '```',
  ]

  if (form.examples.length > 0) {
    lines.push('', '## Exemples')
    let exampleCount = 0
    let counterCount = 0
    const counters = form.examples.filter((e) => e.counter).length
    const examples = form.examples.length - counters
    for (const example of form.examples) {
      const title = example.counter
        ? `Contre-exemple${counters > 1 ? ` ${++counterCount}` : ''}`
        : `Exemple${examples > 1 ? ` ${++exampleCount}` : ''}`
      lines.push(
        '',
        `### ${title}`,
        '',
        '**Entrée :**',
        '',
        example.input,
        '',
        example.counter ? '**Sortie à ne pas produire :**' : '**Sortie attendue :**',
        '',
        '```json',
        example.output,
        '```',
      )
      if (example.counter && example.note) {
        lines.push('', `_Pourquoi :_ ${example.note}`)
      }
    }
  }

  lines.push('')
  return lines.join('\n')
}
