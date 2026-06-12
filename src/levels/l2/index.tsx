// Niveau 2 (T5) : structurer l'appel. Les blocs (system, température,
// max_tokens) s'activent un par un et « s'allument » dans le panneau requête ;
// le mode A/B duplique la configuration en deux colonnes, met le diff en
// évidence et exécute les deux côtés simultanément (run unique ou ×N, avec
// les deux synthèses côte à côte).

import { useId, useMemo, useState } from 'react'
import { BatchPanel, type BatchState } from '../../components/batch/BatchPanel'
import { RequestPanel } from '../../components/request/RequestPanel'
import { ValidationCard } from '../../components/validation/ValidationCard'
import { runBatch, type LLMResult } from '../../engine'
import { toJsonSchema } from '../../schema/model'
import { validateResponse, type ValidationResult } from '../../schema/validate'
import { useL2Config } from '../../state/L2ConfigContext'
import { useProvider } from '../../state/ProviderContext'
import { ChaosPanel } from './ChaosPanel'
import { describeDiff, toRequest, type L2Config } from './config'
import { ConfigPanel } from './ConfigPanel'
import { AB_PRESETS } from './presets'

const BATCH_SIZES = [5, 10, 20]
// Plafond global de 4 appels simultanés (comme L1) : réparti entre les
// colonnes en mode A/B.
const TOTAL_CONCURRENCY = 4

interface ColumnState {
  result: LLMResult | null
  batch: BatchState | null
}

const EMPTY_COLUMN: ColumnState = { result: null, batch: null }

/**
 * Validateur de conformité d'une colonne (T6) : présent seulement quand le
 * bloc schéma est actif. La validation tourne dans les deux modes — en strict
 * elle confirme la garantie de l'API, en repli elle mesure la déviation.
 */
function makeValidator(
  config: L2Config | null,
): ((text: string) => ValidationResult) | undefined {
  if (!config?.schema.enabled) return undefined
  const schema = toJsonSchema(config.schema.value.spec)
  return (text) => validateResponse(text, schema)
}

export function L2() {
  const { provider, model, canExecute, executeDisabledReason } = useProvider()
  const batchSizeId = useId()

  // La colonne A vit dans un contexte partagé : elle survit aux changements
  // d'onglet et le niveau 3 la « replie » dans une skill (T7).
  const { config: configA, setConfig: setConfigA } = useL2Config()
  // configB non-null = mode A/B actif.
  const [configB, setConfigB] = useState<L2Config | null>(null)
  const [columnA, setColumnA] = useState<ColumnState>(EMPTY_COLUMN)
  const [columnB, setColumnB] = useState<ColumnState>(EMPTY_COLUMN)
  const [runningSingles, setRunningSingles] = useState(false)
  const [batchSize, setBatchSize] = useState(10)

  const abEnabled = configB !== null
  const requestA = useMemo(() => toRequest(configA, model), [configA, model])
  const requestB = useMemo(
    () => (configB ? toRequest(configB, model) : null),
    [configB, model],
  )
  const diffEntries = useMemo(
    () => (requestB ? describeDiff(requestA, requestB) : []),
    [requestA, requestB],
  )
  const diffKeys = useMemo(
    () => new Set(diffEntries.map((d) => d.key)),
    [diffEntries],
  )
  const validateA = useMemo(() => makeValidator(configA), [configA])
  const validateB = useMemo(() => makeValidator(configB), [configB])

  const busy =
    runningSingles ||
    (columnA.batch?.running ?? false) ||
    (columnB.batch?.running ?? false)
  const disabled = !canExecute || busy
  const disabledReason =
    executeDisabledReason ?? (busy ? 'Exécution en cours…' : null)

  function enableAB() {
    setConfigB(structuredClone(configA))
    setColumnB(EMPTY_COLUMN)
  }

  function disableAB() {
    setConfigB(null)
    setColumnB(EMPTY_COLUMN)
  }

  function loadPreset(make: () => { a: L2Config; b: L2Config }) {
    const { a, b } = make()
    setConfigA(a)
    setConfigB(b)
    setColumnA(EMPTY_COLUMN)
    setColumnB(EMPTY_COLUMN)
  }

  async function executeSingles() {
    if (!provider || busy) return
    setRunningSingles(true)
    setColumnA((prev) => ({ ...prev, result: null }))
    setColumnB((prev) => ({ ...prev, result: null }))
    const tasks = [
      provider
        .callLLM(requestA, { stream: false })
        .then((result) => setColumnA((prev) => ({ ...prev, result }))),
    ]
    if (requestB) {
      tasks.push(
        provider
          .callLLM(requestB, { stream: false })
          .then((result) => setColumnB((prev) => ({ ...prev, result }))),
      )
    }
    await Promise.all(tasks)
    setRunningSingles(false)
  }

  async function executeBatches() {
    if (!provider || busy) return
    const concurrency = requestB
      ? Math.max(1, Math.floor(TOTAL_CONCURRENCY / 2))
      : TOTAL_CONCURRENCY
    const startBatch = (
      request: NonNullable<typeof requestB>,
      setColumn: typeof setColumnA,
    ) => {
      setColumn((prev) => ({
        ...prev,
        batch: {
          total: batchSize,
          completed: 0,
          running: true,
          results: Array<LLMResult | null>(batchSize).fill(null),
        },
      }))
      return runBatch(() => provider.callLLM(request, { stream: false }), {
        count: batchSize,
        concurrency,
        onResult: (index, runResult, completed) => {
          setColumn((prev) =>
            prev.batch
              ? {
                  ...prev,
                  batch: {
                    ...prev.batch,
                    completed,
                    results: prev.batch.results.map((r, i) =>
                      i === index ? runResult : r,
                    ),
                  },
                }
              : prev,
          )
        },
      }).then(() =>
        setColumn((prev) =>
          prev.batch
            ? { ...prev, batch: { ...prev.batch, running: false } }
            : prev,
        ),
      )
    }
    const tasks = [startBatch(requestA, setColumnA)]
    if (requestB) tasks.push(startBatch(requestB, setColumnB))
    await Promise.all(tasks)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Mode A/B</h2>
          <button
            type="button"
            onClick={abEnabled ? disableAB : enableAB}
            disabled={busy}
            className="rounded-md border border-indigo-600 px-3 py-1 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            {abEnabled ? 'Désactiver' : 'Dupliquer la configuration en A/B'}
          </button>
          <span className="text-xs text-slate-400">Presets :</span>
          {AB_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset.make)}
              disabled={busy}
              title={preset.description}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {abEnabled && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm">
            {diffEntries.length === 0 ? (
              <span className="text-slate-500">
                A et B sont identiques — modifiez un paramètre sur B pour
                comparer.
              </span>
            ) : (
              <>
                <span className="font-medium text-amber-700">
                  Différences A → B :
                </span>{' '}
                {diffEntries.map((entry, i) => (
                  <span key={entry.key} className="text-slate-700">
                    {i > 0 && ' · '}
                    <code className="rounded bg-amber-100 px-1 font-mono text-xs">
                      {entry.key}
                    </code>{' '}
                    <span className="font-mono text-xs">
                      {entry.a ?? 'absent'} → {entry.b ?? 'absent'}
                    </span>
                  </span>
                ))}
              </>
            )}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => void executeSingles()}
            disabled={disabled}
            title={disabledReason ?? undefined}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {abEnabled ? 'Exécuter A et B' : 'Exécuter'}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor={batchSizeId} className="text-sm text-slate-600">
              ×N
            </label>
            <select
              id={batchSizeId}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={busy}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {BATCH_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void executeBatches()}
              disabled={disabled}
              title={disabledReason ?? undefined}
              className="rounded-md border border-indigo-600 px-4 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {abEnabled
                ? `Exécuter ×${batchSize} sur A et B`
                : `Exécuter ×${batchSize}`}
            </button>
            <span className="text-xs text-slate-400">
              {TOTAL_CONCURRENCY} appels en parallèle au maximum
              {abEnabled ? ', répartis entre les colonnes' : ''}
            </span>
          </div>
        </div>
      </section>

      <div className={abEnabled ? 'grid items-start gap-6 lg:grid-cols-2' : ''}>
        <Column
          label={abEnabled ? 'A' : null}
          config={configA}
          onChange={setConfigA}
          request={requestA}
          diffKeys={abEnabled ? diffKeys : undefined}
          column={columnA}
          busy={busy}
          running={runningSingles}
          validate={validateA}
        />
        {configB && requestB && (
          <Column
            label="B"
            config={configB}
            onChange={setConfigB}
            request={requestB}
            diffKeys={diffKeys}
            column={columnB}
            busy={busy}
            running={runningSingles}
            validate={validateB}
          />
        )}
      </div>

      {/* T9 : le harness démontré sur la configuration A. */}
      <ChaosPanel />
    </div>
  )
}

function Column({
  label,
  config,
  onChange,
  request,
  diffKeys,
  column,
  busy,
  running,
  validate,
}: {
  label: string | null
  config: L2Config
  onChange: (next: L2Config) => void
  request: ReturnType<typeof toRequest>
  diffKeys?: ReadonlySet<string>
  column: ColumnState
  busy: boolean
  running: boolean
  validate?: (text: string) => ValidationResult
}) {
  return (
    <div className="space-y-4">
      {label !== null && (
        <h2 className="text-sm font-semibold text-slate-700">
          Configuration {label}
        </h2>
      )}
      <ConfigPanel
        config={config}
        onChange={onChange}
        disabled={busy}
        diffKeys={diffKeys}
      />
      <RequestPanel
        request={request}
        diffKeys={diffKeys}
        title={label !== null ? `Requête ${label}` : 'Requête'}
      />
      {(running || column.result !== null) && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Réponse{label !== null ? ` ${label}` : ''}
          </h3>
          {column.result === null ? (
            <p className="mt-2 animate-pulse text-sm text-slate-400">
              En cours…
            </p>
          ) : column.result.ok ? (
            <>
              <div className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
                {column.result.text}
              </div>
              {validate && (
                <div className="mt-3">
                  <ValidationCard result={validate(column.result.text)} />
                </div>
              )}
              <p className="mt-3 text-sm text-slate-600">
                Latence :{' '}
                <strong>{Math.round(column.result.totalLatencyMs)} ms</strong> ·
                Tokens :{' '}
                <strong>
                  {column.result.usage.inputTokens} entrée /{' '}
                  {column.result.usage.outputTokens} sortie
                </strong>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-red-600">
              {column.result.error.message}
              {column.result.error.detail && (
                <span className="text-red-400">
                  {' '}
                  — détail API : {column.result.error.detail}
                </span>
              )}
            </p>
          )}
        </section>
      )}
      {column.batch !== null && (
        <BatchPanel batch={column.batch} validate={validate} />
      )}
    </div>
  )
}
