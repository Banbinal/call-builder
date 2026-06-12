import { describe, expect, it } from 'vitest'
import { toJsonSchema } from '../../schema/model'
import { defaultL2Config, DEFAULT_SYSTEM_PROMPT } from '../l2/config'
import {
  KEBAB_CASE_PATTERN,
  generateSkillMd,
  skillFormFromL2Config,
  toKebabCase,
} from './skill'

describe('toKebabCase', () => {
  it('force minuscules, tirets et suppression des accents', () => {
    expect(toKebabCase('Analyse Verbatim')).toBe('analyse-verbatim')
    expect(toKebabCase('Qualité réseau !')).toBe('qualite-reseau')
    expect(toKebabCase('--déjà--kebab--')).toBe('deja-kebab')
  })

  it('produit une forme acceptée par le pattern kebab-case', () => {
    for (const raw of ['Analyse Verbatim', 'Été 2026', 'a__b  c']) {
      expect(toKebabCase(raw)).toMatch(KEBAB_CASE_PATTERN)
    }
  })

  it('retourne une chaîne vide si rien ne survit', () => {
    expect(toKebabCase('!!!')).toBe('')
  })
})

describe('skillFormFromL2Config', () => {
  it('pré-remplit les instructions depuis le system prompt L2 (même éteint)', () => {
    const config = defaultL2Config()
    expect(config.system.enabled).toBe(false)
    const form = skillFormFromL2Config(config)
    expect(form.instructions).toBe(DEFAULT_SYSTEM_PROMPT)
  })

  it('reprend le system prompt modifié par l’utilisateur', () => {
    const config = defaultL2Config()
    config.system.value = 'Réponds toujours en un mot.'
    const form = skillFormFromL2Config(config)
    expect(form.instructions).toBe('Réponds toujours en un mot.')
  })

  it('injecte le schéma T6 par copie (pas de partage avec la config L2)', () => {
    const config = defaultL2Config()
    const form = skillFormFromL2Config(config)
    expect(form.schema).toEqual(config.schema.value.spec)
    form.schema.fields[0].name = 'mutation'
    expect(config.schema.value.spec.fields[0].name).toBe('irritant')
  })

  it('pré-remplit un exemple et un contre-exemple sur le schéma par défaut', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    expect(form.examples).toHaveLength(2)
    expect(form.examples.filter((e) => e.counter)).toHaveLength(1)
    // Les sorties pré-remplies sont conformes au schéma : du JSON parsable
    // avec exactement les champs du contrat.
    for (const example of form.examples) {
      const parsed = JSON.parse(example.output) as Record<string, unknown>
      expect(Object.keys(parsed).sort()).toEqual(
        form.schema.fields.map((f) => f.name).sort(),
      )
    }
  })

  it('ne pré-remplit pas d’exemples si le schéma a été modifié en L2', () => {
    const config = defaultL2Config()
    config.schema.value.spec.fields.push({
      name: 'canal',
      type: 'string',
      required: false,
      description: '',
    })
    expect(skillFormFromL2Config(config).examples).toHaveLength(0)
  })
})

describe('generateSkillMd', () => {
  it('génère le SKILL.md complet du fil rouge (snapshot)', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    expect(generateSkillMd(form)).toMatchSnapshot()
  })

  it('produit un frontmatter YAML avec name et description', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    const md = generateSkillMd(form)
    const lines = md.split('\n')
    expect(lines[0]).toBe('---')
    expect(lines[1]).toBe('name: analyse-verbatim')
    expect(lines[2].startsWith('description: "')).toBe(true)
    expect(lines[3]).toBe('---')
  })

  it('échappe la description dans le frontmatter (guillemets, retours ligne)', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    form.description = 'dit "bonjour"\nsur deux lignes'
    const md = generateSkillMd(form)
    const descriptionLine = md.split('\n')[2]
    // Une seule ligne, échappement JSON (sous-ensemble du YAML double-quoté).
    expect(descriptionLine).toBe(
      'description: "dit \\"bonjour\\"\\nsur deux lignes"',
    )
  })

  it('inclut le contrat de sortie : le JSON Schema exact du T6', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    const md = generateSkillMd(form)
    expect(md).toContain('## Contrat de sortie')
    expect(md).toContain(JSON.stringify(toJsonSchema(form.schema), null, 2))
  })

  it('rend les exemples et les contre-exemples avec leurs sections dédiées', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    const md = generateSkillMd(form)
    expect(md).toContain('### Exemple')
    expect(md).toContain('**Sortie attendue :**')
    expect(md).toContain('### Contre-exemple')
    expect(md).toContain('**Sortie à ne pas produire :**')
    expect(md).toContain('_Pourquoi :_')
  })

  it('omet la section Exemples quand il n’y en a aucun', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    form.examples = []
    expect(generateSkillMd(form)).not.toContain('## Exemples')
  })

  it('numérote les exemples seulement à partir de deux', () => {
    const form = skillFormFromL2Config(defaultL2Config())
    form.examples = [
      { input: 'a', output: '{}', counter: false, note: '' },
      { input: 'b', output: '{}', counter: false, note: '' },
    ]
    const md = generateSkillMd(form)
    expect(md).toContain('### Exemple 1')
    expect(md).toContain('### Exemple 2')
  })
})
