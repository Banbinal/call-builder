// Niveau 4 (T8) : simulateur d'échanges MCP. Trois colonnes — Agent,
// Protocole (les messages JSON-RPC tels quels), Tool — et un scénario
// scripté en 5 temps, rejouable pas à pas dans les deux sens. Le protocole
// affiché est réel, l'exécution est rejouée (bandeau honnête en tête).

import { useState } from 'react'
import { AnnotatedJson } from '../../components/request/AnnotatedJson'
import { mcpAnnotationFor } from './annotations.fr'
import { SCENARIO, type ScenarioStep } from './scenario'

export function L4() {
  // Index du dernier temps révélé : les étapes 0..step sont visibles.
  const [step, setStep] = useState(0)
  const current = SCENARIO[step]

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Simulation</strong> — le protocole affiché est réel,
        l&apos;exécution est rejouée. Un vrai serveur MCP échangerait
        exactement ces messages ; ici, personne n&apos;exécute vraiment le
        tool.
      </div>

      <p className="text-sm text-slate-600">
        Au niveau 3, la méthode tient dans un fichier. <strong>MCP</strong>{' '}
        (Model Context Protocol) va plus loin : un serveur expose des{' '}
        <strong>tools</strong> que n&apos;importe quel agent peut découvrir
        puis invoquer — le tool « analyse-verbatim » ci-dessous porte le
        contrat de sortie défini au niveau 2.
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            ← Précédent
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(SCENARIO.length - 1, s + 1))}
            disabled={step === SCENARIO.length - 1}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Suivant →
          </button>
          <p className="text-sm text-slate-600">
            Étape <strong>{step + 1}/{SCENARIO.length}</strong> —{' '}
            {current.title}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1.5fr_1fr] gap-x-3 border-t border-slate-100 pt-4">
          <ColumnHeader label="Agent" hint="celui qui décide" />
          <ColumnHeader
            label="Protocole"
            hint="les messages JSON-RPC, tels quels"
          />
          <ColumnHeader label="Tool" hint="celui qui exécute" />

          {SCENARIO.slice(0, step + 1).map((s, i) => (
            <StepRow key={i} step={s} highlighted={i === step} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ColumnHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="border-b border-slate-200 pb-2 text-center">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  )
}

/** Une rangée du déroulé : chaque temps remplit la ou les colonnes concernées. */
function StepRow({
  step,
  highlighted,
}: {
  step: ScenarioStep
  highlighted: boolean
}) {
  // min-w-0 : sans lui, le JSON large étendrait la colonne Protocole au lieu
  // de défiler, en écrasant les colonnes Agent et Tool.
  const cellClass = `mt-3 min-w-0 ${highlighted ? '' : 'opacity-60'}`
  return (
    <>
      <div className={cellClass}>
        {step.agent && (
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-relaxed text-sky-900">
            {step.agent}
          </div>
        )}
      </div>
      <div className={cellClass}>
        {step.message && (
          <div
            className={`rounded-md border p-2 ${
              highlighted ? 'border-indigo-300' : 'border-slate-200'
            }`}
          >
            <p className="mb-1 text-center font-mono text-xs text-slate-500">
              {step.message.direction === 'agent_to_server'
                ? 'Agent ⟶ Serveur MCP'
                : 'Serveur MCP ⟶ Agent'}
            </p>
            <AnnotatedJson
              body={step.message.payload}
              annotations={mcpAnnotationFor}
            />
          </div>
        )}
      </div>
      <div className={cellClass}>
        {step.tool && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
            {step.tool}
          </div>
        )}
      </div>
    </>
  )
}
