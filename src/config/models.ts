// Liste centralisée des modèles proposés dans le sélecteur (cf. CLAUDE.md).
// Étendre cette liste suffit pour ajouter un modèle partout dans l'app.

export interface ModelOption {
  id: string
  label: string
  /** Note pédagogique courte affichée à côté du sélecteur. */
  hint: string
}

export const MODELS: ModelOption[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    hint: 'rapide et économique — idéal pour les exécutions ×N',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    hint: 'plus capable, plus lent et plus coûteux',
  },
]

export const DEFAULT_MODEL_ID = MODELS[0].id

export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
