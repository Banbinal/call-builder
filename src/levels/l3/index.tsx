// Niveau 3 (T7) : la config du niveau 2 « se replie » dans une skill. Le
// geste pédagogique est le repli lui-même — la carte de config se condense,
// le formulaire pré-rempli se déplie. Ensuite : aperçu SKILL.md en direct,
// linter pédagogique, export .md et .zip.

import { useMemo, useState } from 'react'
import { toJsonSchema } from '../../schema/model'
import { useL2Config } from '../../state/L2ConfigContext'
import type { L2Config } from '../l2/config'
import { lintSkill } from './lint'
import {
  generateSkillMd,
  skillFormFromL2Config,
  toKebabCase,
  type SkillExample,
  type SkillForm,
} from './skill'
import { createZip } from './zip'

const FOLD_DURATION_MS = 700

/**
 * Kebab-case « en cours de frappe » : la forme canonique supprime les tirets
 * de fin, ce qui empêcherait de taper un nom en plusieurs mots — on garde
 * donc un tiret en suspens tant que la saisie se termine par un séparateur.
 */
function kebabDraft(raw: string): string {
  const kebab = toKebabCase(raw)
  return kebab && /[^a-zA-Z0-9]$/.test(raw) ? `${kebab}-` : kebab
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function L3() {
  const { config } = useL2Config()
  const [form, setForm] = useState<SkillForm | null>(null)
  const [folding, setFolding] = useState(false)

  function fold() {
    if (folding) return
    setFolding(true)
    window.setTimeout(() => {
      setForm(skillFormFromL2Config(config))
      setFolding(false)
    }, FOLD_DURATION_MS)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Au niveau 2, la configuration vit dans l’outil. Une <strong>skill</strong>{' '}
        la condense dans un fichier <code className="font-mono">SKILL.md</code>{' '}
        réutilisable : le modèle la charge quand la demande correspond à sa
        description.
      </p>

      {form === null ? (
        <FoldCard config={config} folding={folding} onFold={fold} />
      ) : (
        <SkillEditor
          form={form}
          onChange={setForm}
          onRefold={() => {
            setForm(null)
            // Relance le geste : la carte L2 réapparaît, prête à se replier.
          }}
        />
      )}
    </div>
  )
}

/** La config L2 telle qu'elle va se replier : un chip par bloc. */
function FoldCard({
  config,
  folding,
  onFold,
}: {
  config: L2Config
  folding: boolean
  onFold: () => void
}) {
  const chips: { label: string; active: boolean }[] = [
    { label: `Prompt : ${truncate(config.prompt, 60)}`, active: true },
    {
      label: config.system.enabled
        ? `System prompt : ${truncate(config.system.value, 50)}`
        : 'System prompt — non activé (sa valeur sera reprise quand même)',
      active: config.system.enabled,
    },
    {
      label: config.temperature.enabled
        ? `Température : ${config.temperature.value}`
        : 'Température — non activée',
      active: config.temperature.enabled,
    },
    {
      label: config.maxTokens.enabled
        ? `max_tokens : ${config.maxTokens.value}`
        : 'max_tokens — non activé',
      active: config.maxTokens.enabled,
    },
    {
      label: `Schéma de sortie : ${config.schema.value.spec.fields.length} champs (${
        config.schema.value.strict ? 'strict' : 'consigne'
      })${config.schema.enabled ? '' : ' — non activé, repris quand même'}`,
      active: config.schema.enabled,
    },
  ]

  return (
    <section
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-700 ease-in ${
        folding ? 'max-h-0 scale-90 border-transparent opacity-0' : 'max-h-[480px]'
      }`}
    >
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Votre configuration du niveau 2
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Modifiez-la sur l’onglet L2 : c’est elle qui pré-remplit la skill.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className={`rounded-full border px-3 py-1 text-xs ${
                chip.active
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              {chip.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onFold}
          disabled={folding}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300"
        >
          Replier dans une skill ↓
        </button>
      </div>
    </section>
  )
}

function SkillEditor({
  form,
  onChange,
  onRefold,
}: {
  form: SkillForm
  onChange: (next: SkillForm) => void
  onRefold: () => void
}) {
  const markdown = useMemo(() => generateSkillMd(form), [form])
  const alerts = useMemo(() => lintSkill(form), [form])
  const fileBase = form.name || 'skill'

  function downloadMd() {
    download(
      'SKILL.md',
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    )
  }

  function downloadZip() {
    const bytes = createZip([
      { name: `${fileBase}/SKILL.md`, data: new TextEncoder().encode(markdown) },
    ])
    download(`${fileBase}.zip`, new Blob([bytes], { type: 'application/zip' }))
  }

  return (
    <div className="animate-[unfold_0.6s_ease-out] space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-2">
        <span className="text-sm text-indigo-900">
          Configuration L2 repliée dans{' '}
          <code className="font-mono text-xs">{fileBase}/SKILL.md</code>
        </span>
        <button
          type="button"
          onClick={onRefold}
          className="rounded-md border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          Replier à nouveau depuis le niveau 2
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <FormFields form={form} onChange={onChange} />

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Aperçu du SKILL.md
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadMd}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Télécharger SKILL.md
                </button>
                <button
                  type="button"
                  onClick={downloadZip}
                  className="rounded-md border border-indigo-600 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Télécharger le .zip
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-[480px] overflow-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {markdown}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Le .zip contient{' '}
              <code className="font-mono">{fileBase}/SKILL.md</code> — à
              dézipper dans <code className="font-mono">~/.claude/skills/</code>{' '}
              pour l’utiliser dans Claude Code.
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Linter pédagogique
            </h3>
            {alerts.length === 0 ? (
              <p className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Aucune alerte — la skill suit les bonnes pratiques.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {alerts.map((alert) => (
                  <li
                    key={alert.rule}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-amber-800">
                      {alert.label}
                    </span>{' '}
                    <span className="text-amber-700">{alert.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function FormFields({
  form,
  onChange,
}: {
  form: SkillForm
  onChange: (next: SkillForm) => void
}) {
  function updateExample(index: number, next: SkillExample) {
    onChange({
      ...form,
      examples: form.examples.map((e, i) => (i === index ? next : e)),
    })
  }

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Nom
          <span className="ml-2 text-xs font-normal text-slate-400">
            kebab-case forcé — l’identifiant technique de la skill
          </span>
          <input
            type="text"
            value={form.name}
            spellCheck={false}
            onChange={(e) => onChange({ ...form, name: kebabDraft(e.target.value) })}
            onBlur={() => onChange({ ...form, name: toKebabCase(form.name) })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Description
          <span className="ml-2 text-xs font-normal text-slate-400">
            décrivez QUAND l’utiliser, avec les mots qu’emploierait
            l’utilisateur
          </span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <p className="text-right text-xs text-slate-400">
          {form.description.trim().length} caractères
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Instructions
          <span className="ml-2 text-xs font-normal text-slate-400">
            pré-remplies depuis le system prompt du niveau 2
          </span>
          <textarea
            rows={4}
            value={form.instructions}
            onChange={(e) =>
              onChange({ ...form, instructions: e.target.value })
            }
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-700">
          Contrat de sortie
          <span className="ml-2 text-xs font-normal text-slate-400">
            injecté depuis le schéma du niveau 2 — modifiez-le là-bas puis
            « Replier à nouveau »
          </span>
        </h3>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-700">
          {JSON.stringify(toJsonSchema(form.schema), null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-700">
          Exemples
          <span className="ml-2 text-xs font-normal text-slate-400">
            des paires entrée/sortie — au moins un contre-exemple
          </span>
        </h3>
        <div className="mt-2 space-y-3">
          {form.examples.map((example, index) => (
            <ExampleEditor
              key={index}
              example={example}
              onChange={(next) => updateExample(index, next)}
              onRemove={() =>
                onChange({
                  ...form,
                  examples: form.examples.filter((_, i) => i !== index),
                })
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...form,
              examples: [
                ...form.examples,
                { input: '', output: '', counter: false, note: '' },
              ],
            })
          }
          className="mt-3 rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700"
        >
          + Ajouter un exemple
        </button>
      </section>
    </div>
  )
}

function ExampleEditor({
  example,
  onChange,
  onRemove,
}: {
  example: SkillExample
  onChange: (next: SkillExample) => void
  onRemove: () => void
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        example.counter ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={example.counter}
            onChange={(e) => onChange({ ...example, counter: e.target.checked })}
            className="h-4 w-4 accent-rose-500"
          />
          Contre-exemple (sortie à ne pas produire)
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-slate-400 transition-colors hover:text-rose-600"
        >
          Supprimer
        </button>
      </div>
      <textarea
        rows={2}
        value={example.input}
        placeholder="Entrée — le verbatim ou la demande"
        aria-label="Entrée de l'exemple"
        onChange={(e) => onChange({ ...example, input: e.target.value })}
        className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <textarea
        rows={3}
        value={example.output}
        placeholder={
          example.counter
            ? 'Sortie à ne pas produire'
            : 'Sortie attendue (JSON conforme au contrat)'
        }
        aria-label="Sortie de l'exemple"
        spellCheck={false}
        onChange={(e) => onChange({ ...example, output: e.target.value })}
        className="mt-2 w-full rounded-md border border-slate-300 p-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
      />
      {example.counter && (
        <input
          type="text"
          value={example.note}
          placeholder="Pourquoi cette sortie est fausse"
          aria-label="Explication du contre-exemple"
          onChange={(e) => onChange({ ...example, note: e.target.value })}
          className="mt-2 w-full rounded-md border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
        />
      )}
    </div>
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}
