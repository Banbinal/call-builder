// Barre d'état provider (T2) : saisie de clé masquée, choix du modèle,
// indicateur d'état et test de connexion. La clé n'est jamais stockée —
// le composant le dit explicitement à l'utilisateur.

import { useId, useState } from 'react'
import { MODELS } from '../config/models'
import { useProvider, type ConnectionStatus } from '../state/ProviderContext'

const STATUS_DISPLAY: Record<ConnectionStatus, { dot: string; label: string }> = {
  unconfigured: { dot: 'bg-slate-300', label: 'non configuré' },
  untested: { dot: 'bg-amber-400', label: 'clé saisie — non testée' },
  testing: { dot: 'bg-sky-500 animate-pulse', label: 'test en cours…' },
  ready: { dot: 'bg-emerald-500', label: 'prêt' },
  error: { dot: 'bg-red-500', label: 'erreur' },
}

export function ProviderBar() {
  const { apiKey, setApiKey, model, setModel, status, lastTest, testConnection } =
    useProvider()
  const [showKey, setShowKey] = useState(false)
  const keyInputId = useId()
  const modelSelectId = useId()
  const display = STATUS_DISPLAY[status]
  const selectedModel = MODELS.find((m) => m.id === model)

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <div className="flex items-center gap-2">
          <label htmlFor={keyInputId} className="text-sm font-medium text-slate-700">
            Clé API
          </label>
          <input
            id={keyInputId}
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            spellCheck={false}
            className="w-56 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            disabled={!apiKey}
            className="text-xs text-slate-500 hover:text-slate-800 disabled:invisible"
            aria-pressed={showKey}
          >
            {showKey ? 'masquer' : 'afficher'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={modelSelectId} className="text-sm font-medium text-slate-700">
            Modèle
          </label>
          <select
            id={modelSelectId}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {selectedModel && (
            <span className="hidden text-xs text-slate-400 lg:inline">
              {selectedModel.hint}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${display.dot}`}
            aria-hidden="true"
          />
          <span className="text-sm text-slate-600" role="status">
            {display.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={!apiKey || status === 'testing'}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          title={apiKey ? undefined : "Collez d'abord votre clé API"}
        >
          Tester la connexion
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-2">
        {lastTest?.ok && (
          <p className="text-xs text-emerald-700">
            Connexion confirmée en {Math.round(lastTest.latencyMs)} ms — modèle :{' '}
            <code className="font-mono">{lastTest.model ?? model}</code>
          </p>
        )}
        {lastTest && !lastTest.ok && (
          <p className="text-xs text-red-600">
            {lastTest.message}
            {lastTest.detail && (
              <span className="text-red-400"> — détail API : {lastTest.detail}</span>
            )}
          </p>
        )}
        <p className="text-xs text-slate-400">
          Votre clé n'est jamais stockée : elle vit en mémoire et disparaît au
          rechargement de la page. Sans clé, l'outil reste utilisable en génération de
          code seule.
        </p>
      </div>
    </div>
  )
}
