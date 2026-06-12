// Contexte provider : la clé API vit ici, en mémoire React uniquement
// (invariant n°4 — jamais de localStorage/sessionStorage, jamais d'URL).
// Un rechargement de page la perd : c'est voulu et affiché comme tel.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ANTHROPIC_BASE_URL, DEFAULT_MODEL_ID } from '../config/models'
import { createProvider, type Provider } from '../engine'

export type ConnectionStatus =
  | 'unconfigured' // pas de clé
  | 'untested' // clé saisie, connexion jamais testée
  | 'testing' // test en cours
  | 'ready' // test réussi
  | 'error' // test échoué

export type TestReport =
  | { ok: true; latencyMs: number; model: string | null }
  | { ok: false; message: string; detail?: string }

interface ProviderContextValue {
  apiKey: string
  setApiKey: (key: string) => void
  model: string
  setModel: (id: string) => void
  status: ConnectionStatus
  lastTest: TestReport | null
  testConnection: () => Promise<void>
  /** Provider prêt à l'emploi pour les niveaux, ou null sans clé. */
  provider: Provider | null
  /** Les boutons d'exécution des niveaux peuvent-ils être actifs ? */
  canExecute: boolean
  /** Texte du tooltip quand l'exécution est désactivée (null sinon). */
  executeDisabledReason: string | null
}

const ProviderContext = createContext<ProviderContextValue | null>(null)

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState('')
  const [model, setModelState] = useState(DEFAULT_MODEL_ID)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ready' | 'error'>(
    'idle',
  )
  const [lastTest, setLastTest] = useState<TestReport | null>(null)

  const provider = useMemo<Provider | null>(
    () =>
      apiKey
        ? createProvider({ mode: 'direct', baseUrl: ANTHROPIC_BASE_URL, apiKey })
        : null,
    [apiKey],
  )

  // Changer de clé ou de modèle invalide le résultat du test précédent.
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    setTestState('idle')
    setLastTest(null)
  }, [])

  const setModel = useCallback((id: string) => {
    setModelState(id)
    setTestState('idle')
    setLastTest(null)
  }, [])

  const testConnection = useCallback(async () => {
    if (!provider) return
    setTestState('testing')
    setLastTest(null)
    // Appel minimal : 1 token de sortie, le moins cher possible.
    const result = await provider.callLLM(
      { model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
      { stream: false },
    )
    if (result.ok) {
      setTestState('ready')
      setLastTest({ ok: true, latencyMs: result.totalLatencyMs, model: result.model })
    } else {
      setTestState('error')
      setLastTest({
        ok: false,
        message: result.error.message,
        detail: result.error.detail,
      })
    }
  }, [provider, model])

  const status: ConnectionStatus = !apiKey
    ? 'unconfigured'
    : testState === 'idle'
      ? 'untested'
      : testState

  const value: ProviderContextValue = {
    apiKey,
    setApiKey,
    model,
    setModel,
    status,
    lastTest,
    testConnection,
    provider,
    canExecute: apiKey !== '',
    executeDisabledReason: apiKey
      ? null
      : "Collez votre clé API pour exécuter. Sans clé, l'outil reste utilisable en génération de code seule.",
  }

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
}

export function useProvider(): ProviderContextValue {
  const ctx = useContext(ProviderContext)
  if (!ctx) {
    throw new Error('useProvider doit être appelé sous <ProviderProvider>')
  }
  return ctx
}
