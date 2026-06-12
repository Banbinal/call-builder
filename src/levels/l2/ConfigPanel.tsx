// Panneau de structuration (T5) : le prompt et les trois blocs activables
// individuellement. Chaque activation modifie la L2Config, donc le panneau
// requête (T4) — le bloc « s'allume » dans le JSON. Utilisé seul, ou une
// instance par colonne en mode A/B (diffKeys surligne les blocs qui diffèrent).

import { useId } from 'react'
import { DEFAULT_MAX_TOKENS } from '../../config/defaults'
import type { L2Config } from './config'

/** Clé wire correspondant à chaque bloc, pour aligner le surlignage du diff. */
const WIRE_KEYS = {
  prompt: 'messages',
  system: 'system',
  temperature: 'temperature',
  maxTokens: 'max_tokens',
} as const

export function ConfigPanel({
  config,
  onChange,
  disabled = false,
  diffKeys,
}: {
  config: L2Config
  onChange: (next: L2Config) => void
  disabled?: boolean
  /** Clés wire qui diffèrent entre A et B — surligne les blocs concernés. */
  diffKeys?: ReadonlySet<string>
}) {
  const promptId = useId()
  const systemId = useId()
  const temperatureId = useId()
  const maxTokensId = useId()

  const rowClass = (wireKey: string) =>
    `rounded-md border p-3 transition-colors ${
      diffKeys?.has(wireKey)
        ? 'border-amber-300 bg-amber-50'
        : 'border-slate-200'
    }`

  return (
    <div className="space-y-3">
      <div className={rowClass(WIRE_KEYS.prompt)}>
        <label
          htmlFor={promptId}
          className="text-sm font-medium text-slate-700"
        >
          Prompt
        </label>
        <textarea
          id={promptId}
          rows={3}
          value={config.prompt}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
        />
      </div>

      <div className={rowClass(WIRE_KEYS.system)}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={systemId}
            checked={config.system.enabled}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...config,
                system: { ...config.system, enabled: e.target.checked },
              })
            }
            className="h-4 w-4 accent-indigo-600"
          />
          <label
            htmlFor={systemId}
            className="text-sm font-medium text-slate-700"
          >
            System prompt
          </label>
          <span className="text-xs text-slate-400">
            le cadre de travail du modèle
          </span>
        </div>
        {config.system.enabled && (
          <textarea
            rows={3}
            value={config.system.value}
            disabled={disabled}
            spellCheck={false}
            aria-label="Contenu du system prompt"
            onChange={(e) =>
              onChange({
                ...config,
                system: { ...config.system, value: e.target.value },
              })
            }
            className="mt-2 w-full rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
          />
        )}
      </div>

      <div className={rowClass(WIRE_KEYS.temperature)}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={temperatureId}
            checked={config.temperature.enabled}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...config,
                temperature: {
                  ...config.temperature,
                  enabled: e.target.checked,
                },
              })
            }
            className="h-4 w-4 accent-indigo-600"
          />
          <label
            htmlFor={temperatureId}
            className="text-sm font-medium text-slate-700"
          >
            Température
          </label>
          <span className="text-xs text-slate-400">
            la dose de hasard (défaut implicite : 1)
          </span>
        </div>
        {config.temperature.enabled && (
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.temperature.value}
              disabled={disabled}
              aria-label="Valeur de la température"
              onChange={(e) =>
                onChange({
                  ...config,
                  temperature: {
                    ...config.temperature,
                    value: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-indigo-600"
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums text-slate-700">
              {config.temperature.value}
            </span>
          </div>
        )}
      </div>

      <div className={rowClass(WIRE_KEYS.maxTokens)}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={maxTokensId}
            checked={config.maxTokens.enabled}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...config,
                maxTokens: { ...config.maxTokens, enabled: e.target.checked },
              })
            }
            className="h-4 w-4 accent-indigo-600"
          />
          <label
            htmlFor={maxTokensId}
            className="text-sm font-medium text-slate-700"
          >
            max_tokens
          </label>
          <span className="text-xs text-slate-400">
            toujours envoyé — éteint, il vaut {DEFAULT_MAX_TOKENS}
          </span>
        </div>
        {config.maxTokens.enabled && (
          <input
            type="number"
            min={1}
            max={8192}
            value={config.maxTokens.value}
            disabled={disabled}
            aria-label="Valeur de max_tokens"
            onChange={(e) =>
              onChange({
                ...config,
                maxTokens: {
                  ...config.maxTokens,
                  value: Math.max(1, Number(e.target.value) || 1),
                },
              })
            }
            className="mt-2 w-32 rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
          />
        )}
      </div>
    </div>
  )
}
