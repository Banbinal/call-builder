// Point d'entrée du moteur d'appel LLM.
// Invariant : ce dossier ne doit jamais importer React ni toucher au DOM
// ou à un storage navigateur — logique pure, testée avec Vitest.

export const ENGINE_NAME = 'call-builder-engine'

export * from './types'
export { createProvider, mapApiError } from './provider'
export type { CallOptions, Provider, ProviderDeps } from './provider'
export { createSSEParser } from './sse'
export type { RawSSEMessage, SSEParser } from './sse'
