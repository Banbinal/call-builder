// Presets pédagogiques du mode A/B (T5) : chargés en un clic, sur le verbatim
// fil rouge. Chaque preset est une fabrique — des configs fraîches à chaque
// chargement, jamais d'objet partagé entre les colonnes.

import { defaultL2Config, type L2Config } from './config'

export interface ABPreset {
  id: string
  label: string
  /** Ce que le preset fait constater, affiché en infobulle. */
  description: string
  make: () => { a: L2Config; b: L2Config }
}

export const AB_PRESETS: ABPreset[] = [
  {
    id: 'system',
    label: 'Sans / avec system prompt',
    description:
      'A envoie le prompt nu, B ajoute un system prompt qui cadre le rôle et ' +
      'le format — comparez la longueur et le ton des réponses.',
    make: () => {
      const a = defaultL2Config()
      const b = defaultL2Config()
      b.system.enabled = true
      return { a, b }
    },
  },
  {
    id: 'temperature',
    label: 'Température 0 vs 1',
    description:
      'Même prompt, température 0 sur A et 1 sur B — en ×10, comparez la ' +
      'dispersion des longueurs et des formats dans les deux synthèses.',
    make: () => {
      const a = defaultL2Config()
      a.temperature = { enabled: true, value: 0 }
      const b = defaultL2Config()
      b.temperature = { enabled: true, value: 1 }
      return { a, b }
    },
  },
  {
    id: 'schema',
    label: 'Schéma : consigne vs strict',
    description:
      'Même schéma de sortie : A le demande dans le system prompt, B l’impose ' +
      'via l’API (mode strict) — en ×20, comparez les taux de conformité.',
    make: () => {
      const a = defaultL2Config()
      a.schema.enabled = true
      const b = defaultL2Config()
      b.schema.enabled = true
      b.schema.value.strict = true
      return { a, b }
    },
  },
]
