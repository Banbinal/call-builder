import { describe, expect, it } from 'vitest'
import { defaultL2Config } from '../l2/config'
import { lintSkill } from './lint'
import { skillFormFromL2Config, type SkillForm } from './skill'

/** Formulaire de référence : le pré-rempli fil rouge, qui doit être propre. */
function validForm(): SkillForm {
  return skillFormFromL2Config(defaultL2Config())
}

function ruleIds(form: SkillForm): string[] {
  return lintSkill(form).map((a) => a.rule)
}

describe('lintSkill', () => {
  it('ne lève aucune alerte sur le formulaire pré-rempli du fil rouge', () => {
    expect(lintSkill(validForm())).toEqual([])
  })

  it('déclenche « nom-non-kebab-case » sur un nom invalide ou vide', () => {
    const form = validForm()
    form.name = 'Analyse Verbatim'
    expect(ruleIds(form)).toContain('nom-non-kebab-case')
    form.name = ''
    expect(ruleIds(form)).toContain('nom-non-kebab-case')
    form.name = 'analyse-verbatim'
    expect(ruleIds(form)).not.toContain('nom-non-kebab-case')
  })

  it('déclenche « description-trop-courte » sous 80 caractères', () => {
    const form = validForm()
    form.description = 'À utiliser quand on dit « analyse ce verbatim ».'
    const rules = ruleIds(form)
    expect(rules).toContain('description-trop-courte')
    // Le déclencheur est bien présent : seule la longueur est en cause.
    expect(rules).not.toContain('description-sans-declencheur')
  })

  it('déclenche « description-sans-declencheur » sans citation ni mot-clé', () => {
    const form = validForm()
    form.description =
      'Cette skill produit une fiche structurée à partir des retours ' +
      'clients pour le suivi de la qualité des opérations télécom.'
    const rules = ruleIds(form)
    expect(rules).toContain('description-sans-declencheur')
    // Plus de 80 caractères : seule l'absence de déclencheur est en cause.
    expect(rules).not.toContain('description-trop-courte')
  })

  it('déclenche « sans-exemple » quand la liste est vide', () => {
    const form = validForm()
    form.examples = []
    const rules = ruleIds(form)
    expect(rules).toContain('sans-exemple')
    // Pas de double peine : « sans-contre-exemple » ne s'ajoute pas.
    expect(rules).not.toContain('sans-contre-exemple')
  })

  it('déclenche « sans-contre-exemple » quand aucun exemple n’est marqué', () => {
    const form = validForm()
    form.examples = form.examples.filter((e) => !e.counter)
    expect(form.examples.length).toBeGreaterThan(0)
    const rules = ruleIds(form)
    expect(rules).toContain('sans-contre-exemple')
    expect(rules).not.toContain('sans-exemple')
  })

  it('chaque alerte porte un libellé et une explication d’une phrase', () => {
    const form = validForm()
    form.name = 'X'
    form.description = 'courte'
    form.examples = []
    for (const alert of lintSkill(form)) {
      expect(alert.label.length).toBeGreaterThan(0)
      expect(alert.message.length).toBeGreaterThan(20)
    }
  })
})
