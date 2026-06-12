// Panneau chaos (T9) : injecter des pannes simulées et regarder le harness
// réagir, événement par événement. La timeline montre tout — la tentative
// fautive et ses violations, le message correctif qui repart vers le modèle,
// la bascule de modèle — et le compteur de coût affiche le trade-off : la
// fiabilité se paie en appels supplémentaires.

import { useState } from 'react'
import { MODELS } from '../../config/models'
import {
  createChaosProvider,
  runHarness,
  type HarnessOutcome,
  type HarnessStep,
  type HarnessValidator,
} from '../../engine'
import { toJsonSchema } from '../../schema/model'
import { validateResponse } from '../../schema/validate'
import { useL2Config } from '../../state/L2ConfigContext'
import { useProvider } from '../../state/ProviderContext'
import { toRequest, type L2Config } from './config'

/** Projette la validation T6 en liste de violations pour le harness. */
function makeHarnessValidator(config: L2Config): HarnessValidator | undefined {
  if (!config.schema.enabled) return undefined
  const schema = toJsonSchema(config.schema.value.spec)
  return (text) => {
    const result = validateResponse(text, schema)
    if (result.status === 'valid') return []
    if (result.status === 'not_json') return [result.message]
    return result.violations.map((v) => v.message)
  }
}

export function ChaosPanel() {
  const { provider, model, canExecute, executeDisabledReason } = useProvider()
  const { config } = useL2Config()

  const [malformed, setMalformed] = useState(false)
  const [providerDown, setProviderDown] = useState(false)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<HarnessStep[]>([])
  const [outcome, setOutcome] = useState<HarnessOutcome | null>(null)

  // Chaîne de fallback : le modèle courant, puis l'autre modèle de la liste.
  const fallbackModel = MODELS.find((m) => m.id !== model) ?? MODELS[0]
  const models = [model, fallbackModel.id]

  const schemaActive = config.schema.enabled
  const disabled = !canExecute || running
  const disabledReason =
    executeDisabledReason ?? (running ? 'Exécution en cours…' : null)

  async function execute() {
    if (!provider || running) return
    setRunning(true)
    setSteps([])
    setOutcome(null)
    // Un wrapper chaos par exécution : la corruption ne frappe que la
    // première réponse de sa vie.
    const chaosProvider = createChaosProvider(provider, {
      malformFirstResponse: malformed,
      downModel: providerDown ? model : undefined,
    })
    const result = await runHarness(chaosProvider, toRequest(config, model), {
      models,
      validate: makeHarnessValidator(config),
      onStep: (step) => setSteps((prev) => [...prev, step]),
    })
    setOutcome(result)
    setRunning(false)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">
        Mode chaos — le harness rendu visible
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        En production, un appel LLM est enveloppé dans un{' '}
        <strong>harness</strong> : du code qui vérifie la réponse, fait
        réessayer le modèle, ou bascule vers un autre en cas de panne.
        Injectez une panne simulée et regardez-le réagir, étape par étape.
      </p>

      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={malformed}
            disabled={running || !schemaActive}
            onChange={(e) => setMalformed(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Forcer une sortie malformée au 1ᵉʳ essai
          <span className="text-xs text-slate-400">
            la réponse est interceptée et corrompue — le harness doit la faire
            corriger
          </span>
        </label>
        {!schemaActive && (
          <p className="ml-6 text-xs text-amber-700">
            Activez le bloc « Schéma de sortie » ci-dessus : sans contrat, le
            harness n&apos;a rien à vérifier — donc rien à faire corriger.
          </p>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={providerDown}
            disabled={running}
            onChange={(e) => setProviderDown(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Simuler provider down
          <span className="text-xs text-slate-400">
            le 1ᵉʳ modèle échoue — le harness doit basculer sur le suivant
          </span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => void execute()}
          disabled={disabled}
          title={disabledReason ?? undefined}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Exécuter via le harness
        </button>
        <span className="font-mono text-xs text-slate-500">
          chaîne : {models.join(' → ')}
        </span>
        <span className="text-xs text-slate-400">
          retry ×2 max sur non-conformité · fallback sur erreur provider
        </span>
      </div>

      {(running || steps.length > 0) && (
        <Timeline steps={steps} running={running} />
      )}

      {outcome && <CostSummary outcome={outcome} />}

      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
        Non simulé ici : les guardrails d&apos;entrée (filtrage des prompts
        malveillants, détection d&apos;injection) — l&apos;autre moitié
        d&apos;un harness de production.
      </p>
    </section>
  )
}

/** La timeline de l'exécution : chaque étape horodatée depuis le départ. */
function Timeline({
  steps,
  running,
}: {
  steps: HarnessStep[]
  running: boolean
}) {
  const t0 = steps[0]?.at
  return (
    <ol className="mt-4 space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-20 shrink-0 pt-2 text-right font-mono text-xs tabular-nums text-slate-400">
            +{t0 !== undefined ? step.at - t0 : 0} ms
          </span>
          <StepCard step={step} />
        </li>
      ))}
      {running && (
        <li className="ml-23 animate-pulse text-sm text-slate-400">
          En cours…
        </li>
      )}
    </ol>
  )
}

function StepCard({ step }: { step: HarnessStep }) {
  switch (step.type) {
    case 'attempt':
      return (
        <div className="flex-1 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
          Tentative {step.call} — appel du modèle{' '}
          <code className="font-mono text-xs">{step.model}</code>
        </div>
      )
    case 'invalid':
      return (
        <div className="flex-1 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          <p className="font-medium">✗ Réponse non conforme au contrat</p>
          <ul className="mt-1 list-inside list-disc text-red-700">
            {step.violations.map((violation, i) => (
              <li key={i}>{violation}</li>
            ))}
          </ul>
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-red-600">
              Voir la réponse fautive
            </summary>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white/60 p-2 font-mono text-xs text-red-900">
              {step.text}
            </pre>
          </details>
        </div>
      )
    case 'retry':
      return (
        <div className="flex-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          <p className="font-medium">
            ↻ Retry — l&apos;écart repart vers le modèle, tel quel :
          </p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white/60 p-2 font-mono text-xs text-amber-900">
            {step.message}
          </pre>
        </div>
      )
    case 'provider_error':
      return (
        <div className="flex-1 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          <p className="font-medium">
            ✗ Erreur provider sur{' '}
            <code className="font-mono text-xs">{step.model}</code>
          </p>
          <p className="mt-0.5 text-red-700">{step.error.message}</p>
        </div>
      )
    case 'fallback':
      return (
        <div className="flex-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          ⇄ Fallback — bascule de{' '}
          <code className="font-mono text-xs">{step.from}</code> vers{' '}
          <code className="font-mono text-xs">{step.to}</code>
        </div>
      )
    case 'valid':
      return (
        <div className="flex-1 rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800">
          <p className="font-medium">✓ Réponse conforme — exécution terminée</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white/60 p-2 font-mono text-xs text-emerald-900">
            {step.result.text}
          </pre>
        </div>
      )
    case 'gave_up':
      return (
        <div className="flex-1 rounded-md border border-red-400 bg-red-100 p-2 text-sm font-medium text-red-900">
          ■ Abandon —{' '}
          {step.reason === 'retries_exhausted'
            ? 'retries épuisés, la réponse reste non conforme'
            : 'tous les modèles de la chaîne sont en échec'}
        </div>
      )
  }
}

/** Le trade-off du harness, en une phrase : la fiabilité coûte des appels. */
function CostSummary({ outcome }: { outcome: HarnessOutcome }) {
  return (
    <p className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
      <strong>Coût de cette exécution :</strong>{' '}
      {outcome.calls === 1 ? (
        <>1 appel — aucun incident, le harness n&apos;a rien eu à faire.</>
      ) : (
        <>
          cette exécution {outcome.ok ? 'fiabilisée ' : ''}a coûté{' '}
          <strong>{outcome.calls} appels au lieu d&apos;1</strong> — c&apos;est
          le trade-off du harness : de la fiabilité contre des tokens et de la
          latence.
        </>
      )}
    </p>
  )
}
