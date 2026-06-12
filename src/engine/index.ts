// Point d'entrée du moteur d'appel LLM.
// Invariant : ce dossier ne doit jamais importer React ni toucher au DOM,
// au localStorage ou au sessionStorage — logique pure, testée avec Vitest.

export const ENGINE_NAME = 'call-builder-engine'
