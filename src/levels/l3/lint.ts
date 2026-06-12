// Linter pédagogique du niveau 3 (T7) : cinq règles pures sur le formulaire
// de skill, chacune avec une explication d'une phrase. Le but n'est pas de
// bloquer l'export mais de montrer ce qui fait une bonne skill — les alertes
// restent affichées tant que le problème existe.

import { KEBAB_CASE_PATTERN, type SkillForm } from './skill'

export type LintRuleId =
  | 'nom-non-kebab-case'
  | 'description-trop-courte'
  | 'description-sans-declencheur'
  | 'sans-exemple'
  | 'sans-contre-exemple'

export interface LintAlert {
  rule: LintRuleId
  /** Libellé court de la règle, affiché en titre de l'alerte. */
  label: string
  /** L'explication pédagogique, une phrase. */
  message: string
}

const MIN_DESCRIPTION_LENGTH = 80

/**
 * Déclencheur « détectable » dans une description : une formulation citée
 * entre guillemets (les mots qu'emploierait l'utilisateur) ou un mot-clé qui
 * annonce quand utiliser la skill. Heuristique volontairement simple — c'est
 * la présence d'une intention de déclenchement qu'on vérifie, pas sa qualité.
 */
const TRIGGER_PATTERN =
  /[«»"“”]|\b(quand|lorsque|lorsqu|dès que|si l['’]utilisateur|à utiliser|utiliser (pour|quand)|déclench)/i

export function lintSkill(form: SkillForm): LintAlert[] {
  const alerts: LintAlert[] = []

  if (!KEBAB_CASE_PATTERN.test(form.name)) {
    alerts.push({
      rule: 'nom-non-kebab-case',
      label: 'Nom non kebab-case',
      message:
        'Le nom est l’identifiant technique de la skill : minuscules, ' +
        'chiffres et tirets uniquement (ex. analyse-verbatim).',
    })
  }

  if (form.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    alerts.push({
      rule: 'description-trop-courte',
      label: 'Description trop courte',
      message:
        `Une description de moins de ${MIN_DESCRIPTION_LENGTH} caractères ` +
        'est rarement assez précise pour que le modèle sache quand ' +
        'déclencher la skill.',
    })
  }

  if (!TRIGGER_PATTERN.test(form.description)) {
    alerts.push({
      rule: 'description-sans-declencheur',
      label: 'Pas de mot déclencheur',
      message:
        'Aucune formulation déclencheuse détectée : citez entre guillemets ' +
        'les mots qu’emploierait l’utilisateur (ex. « analyse ce verbatim »).',
    })
  }

  if (form.examples.length === 0) {
    alerts.push({
      rule: 'sans-exemple',
      label: 'Aucun exemple',
      message:
        'Sans paire entrée/sortie, le modèle devine le format attendu au ' +
        'lieu de l’imiter.',
    })
  } else if (!form.examples.some((e) => e.counter)) {
    alerts.push({
      rule: 'sans-contre-exemple',
      label: 'Aucun contre-exemple',
      message:
        'Un contre-exemple délimite la skill mieux qu’une règle abstraite : ' +
        'montrez une sortie à ne pas produire et pourquoi.',
    })
  }

  return alerts
}
