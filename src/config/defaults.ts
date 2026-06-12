// Valeurs par défaut partagées par les niveaux.

/**
 * Verbatim fil rouge du workshop : le même cas client télécom traverse les
 * niveaux L1 à L4 (prompt en L1–L2, exemple de skill en L3, argument du
 * tools/call en L4).
 */
export const FIL_ROUGE_VERBATIM =
  'Impossible de joindre le service client depuis 3 jours, le chat coupe à ' +
  'chaque fois, je songe à résilier.'

/** Prompt fil rouge pré-rempli aux niveaux 1 et 2. */
export const FIL_ROUGE_PROMPT = `Analyse ce verbatim client : "${FIL_ROUGE_VERBATIM}"`

/** Plafond de tokens de sortie par défaut (devient réglable au niveau 2). */
export const DEFAULT_MAX_TOKENS = 1024
