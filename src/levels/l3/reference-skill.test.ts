// T15 : la skill de référence `skills/analyse-verbatim/` doit rester alignée
// sur le Call Builder par construction — même schéma que T6, même structure
// de sections que l'export L3 (T7), zéro alerte du linter, et des vérités
// terrain d'évals conformes au contrat. Si l'un dérive, ce test casse.

import { describe, expect, it } from 'vitest'
// Imports `?raw` (Vite) plutôt que node:fs : pas de types Node requis au
// type-check du build, et le chemin est résolu par le bundler.
import skillMdRaw from '../../../skills/analyse-verbatim/SKILL.md?raw'
import verbatimsRaw from '../../../skills/analyse-verbatim/evals/verbatims.json?raw'
import { defaultSchemaSpec, toJsonSchema } from '../../schema/model'
import { validateResponse } from '../../schema/validate'
import { lintSkill } from './lint'
import type { SkillExample } from './skill'

// Normalisation CRLF : le contenu ne doit pas dépendre de core.autocrlf.
const skillMd = skillMdRaw.replace(/\r\n/g, '\n')
const evals = JSON.parse(verbatimsRaw) as {
  themes: string[]
  verbatims: {
    id: number
    verbatim: string
    attendu: Record<string, unknown>
  }[]
}

const t6Schema = toJsonSchema(defaultSchemaSpec())

function frontmatter(md: string): { name: string; description: string } {
  const match = md.match(/^---\nname: (.+)\ndescription: (".*")\n---\n/)
  if (!match) throw new Error('Frontmatter introuvable ou non conforme.')
  return { name: match[1], description: JSON.parse(match[2]) as string }
}

function contractSchema(md: string): Record<string, unknown> {
  const section = md.split('## Contrat de sortie')[1]
  const block = section?.match(/```json\n([\s\S]*?)\n```/)
  if (!block) throw new Error('Bloc JSON du contrat de sortie introuvable.')
  return JSON.parse(block[1]) as Record<string, unknown>
}

describe('skill de référence analyse-verbatim (T15)', () => {
  it('porte exactement le schéma T6 dans son contrat de sortie', () => {
    expect(contractSchema(skillMd)).toEqual(t6Schema)
  })

  it("suit la structure de sections de l'export L3 (T7)", () => {
    const headings = [
      '# analyse-verbatim',
      '## Instructions',
      '## Contrat de sortie',
      '## Exemples',
    ]
    const positions = headings.map((h) => skillMd.indexOf(`\n${h}\n`))
    for (const [i, position] of positions.entries()) {
      expect(position, `section manquante : ${headings[i]}`).toBeGreaterThan(-1)
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    // La consigne du contrat est celle générée par generateSkillMd.
    expect(skillMd).toContain(
      'Réponds uniquement avec un objet JSON conforme à ce schéma',
    )
  })

  it('passe le linter pédagogique T7 sans alerte', () => {
    const { name, description } = frontmatter(skillMd)
    const exampleCount = (skillMd.match(/^### Exemple/gm) ?? []).length
    const counterCount = (skillMd.match(/^### Contre-exemple/gm) ?? []).length
    const examples: SkillExample[] = [
      ...Array.from({ length: exampleCount }, () => ({
        input: 'x',
        output: 'x',
        counter: false,
        note: '',
      })),
      ...Array.from({ length: counterCount }, () => ({
        input: 'x',
        output: 'x',
        counter: true,
        note: 'x',
      })),
    ]
    const form = {
      name,
      description,
      instructions: 'x',
      schema: defaultSchemaSpec(),
      examples,
    }
    expect(lintSkill(form)).toEqual([])
  })

  it('fournit 10 vérités terrain conformes au schéma T6', () => {
    expect(evals.verbatims).toHaveLength(10)
    for (const { id, attendu } of evals.verbatims) {
      const result = validateResponse(JSON.stringify(attendu), t6Schema)
      expect(result.status, `vérité terrain ${id} non conforme`).toBe('valid')
    }
  })

  it('annote chaque verbatim avec un thème de la liste fermée de la skill', () => {
    expect(evals.themes).toHaveLength(8)
    for (const theme of evals.themes) {
      expect(skillMd, `thème absent de la skill : ${theme}`).toContain(
        `\`${theme}\``,
      )
    }
    for (const { id, attendu } of evals.verbatims) {
      expect(
        evals.themes,
        `vérité terrain ${id} : thème hors liste fermée`,
      ).toContain(attendu.theme)
    }
  })
})
