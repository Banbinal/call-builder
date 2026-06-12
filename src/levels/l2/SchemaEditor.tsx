// Éditeur de schéma de sortie (T6), deux modes synchronisés : visuel (liste
// de champs nom / type / requis / description) et JSON brut (le JSON Schema
// exact injecté dans la requête). Inclut le « mode test » : une réponse
// exemple altérable à la main, validée en direct — utilisable sans clé API.

import { useMemo, useState } from 'react'
import { ValidationCard } from '../../components/validation/ValidationCard'
import {
  fromJsonSchema,
  sampleResponse,
  toJsonSchema,
  type FieldType,
  type SchemaField,
  type SchemaSpec,
} from '../../schema/model'
import { validateResponse } from '../../schema/validate'

const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'string', label: 'string (texte)' },
  { value: 'number', label: 'number (nombre)' },
  { value: 'boolean', label: 'boolean (vrai/faux)' },
  { value: 'enum', label: 'enum (liste fermée)' },
]

export function SchemaEditor({
  spec,
  onChange,
  disabled = false,
}: {
  spec: SchemaSpec
  onChange: (next: SchemaSpec) => void
  disabled?: boolean
}) {
  const [tab, setTab] = useState<'visual' | 'json'>('visual')
  // Brouillon de l'onglet JSON : conservé tel que tapé tant qu'on y reste,
  // pour ne pas reformater sous les doigts de l'utilisateur.
  const [rawDraft, setRawDraft] = useState<string | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)

  const prettyJson = useMemo(
    () => JSON.stringify(toJsonSchema(spec), null, 2),
    [spec],
  )

  function openTab(next: 'visual' | 'json') {
    setTab(next)
    setRawDraft(null)
    setRawError(null)
  }

  function onRawChange(text: string) {
    setRawDraft(text)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setRawError('JSON invalide — corrigez la syntaxe pour synchroniser.')
      return
    }
    const result = fromJsonSchema(parsed)
    if (result.ok) {
      setRawError(null)
      onChange(result.spec)
    } else {
      setRawError(result.error)
    }
  }

  function updateField(index: number, patch: Partial<SchemaField>) {
    onChange({
      fields: spec.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    })
  }

  function removeField(index: number) {
    onChange({ fields: spec.fields.filter((_, i) => i !== index) })
  }

  function addField() {
    onChange({
      fields: [
        ...spec.fields,
        { name: `champ_${spec.fields.length + 1}`, type: 'string', required: true, description: '' },
      ],
    })
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div
        role="tablist"
        aria-label="Modes de l'éditeur de schéma"
        className="flex gap-1 border-b border-slate-200"
      >
        {(
          [
            { id: 'visual', label: 'Éditeur visuel' },
            { id: 'json', label: 'JSON brut' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => openTab(t.id)}
            className={`rounded-t-md border-b-2 px-3 py-1 text-xs font-medium transition-colors ${
              t.id === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'visual' ? (
        <div className="mt-3 space-y-2">
          {spec.fields.map((field, index) => (
            <FieldRow
              key={index}
              field={field}
              disabled={disabled}
              onChange={(patch) => updateField(index, patch)}
              onRemove={() => removeField(index)}
            />
          ))}
          <button
            type="button"
            onClick={addField}
            disabled={disabled}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            + Ajouter un champ
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            rows={12}
            value={rawDraft ?? prettyJson}
            disabled={disabled}
            spellCheck={false}
            aria-label="JSON Schema brut"
            onChange={(e) => onRawChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
          />
          {rawError ? (
            <p className="mt-1 text-xs text-red-600">{rawError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Synchronisé avec l&apos;éditeur visuel — un niveau d&apos;objet,
              types string / number / boolean / enum de chaînes.
            </p>
          )}
        </div>
      )}

      <TestMode spec={spec} />
    </div>
  )
}

function FieldRow({
  field,
  disabled,
  onChange,
  onRemove,
}: {
  field: SchemaField
  disabled: boolean
  onChange: (patch: Partial<SchemaField>) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={field.name}
          disabled={disabled}
          aria-label="Nom du champ"
          spellCheck={false}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-36 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
        />
        <select
          value={field.type}
          disabled={disabled}
          aria-label="Type du champ"
          onChange={(e) => {
            const type = e.target.value as FieldType
            onChange(
              type === 'enum'
                ? { type, enumValues: field.enumValues ?? ['valeur_1', 'valeur_2'] }
                : { type, enumValues: undefined },
            )
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={field.required}
            disabled={disabled}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          requis
        </label>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          title="Supprimer ce champ"
          className="ml-auto text-xs text-slate-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed"
        >
          Supprimer
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          type="text"
          value={field.description}
          disabled={disabled}
          placeholder="Description (guide le modèle)"
          aria-label="Description du champ"
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
        />
        {field.type === 'enum' && (
          <input
            type="text"
            value={(field.enumValues ?? []).join(', ')}
            disabled={disabled}
            placeholder="valeurs, séparées, par, des, virgules"
            aria-label="Valeurs autorisées de l'enum"
            spellCheck={false}
            onChange={(e) =>
              onChange({
                enumValues: e.target.value.split(',').map((v) => v.trim()),
              })
            }
            className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
          />
        )}
      </div>
    </div>
  )
}

/**
 * Mode test : une réponse exemple conforme, altérable à la main — la carte de
 * validation réagit en direct. Fonctionne sans clé API ni exécution.
 */
function TestMode({ spec }: { spec: SchemaSpec }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  const seed = useMemo(
    () => JSON.stringify(sampleResponse(spec), null, 2),
    [spec],
  )
  const text = draft ?? seed
  const schema = useMemo(() => toJsonSchema(spec), [spec])
  const result = useMemo(
    () => (open ? validateResponse(text, schema) : null),
    [open, text, schema],
  )

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="text-xs font-medium text-indigo-700 hover:underline"
      >
        {open ? '▾' : '▸'} Mode test — altérer une réponse à la main
      </button>
      {open && (
        <div className="mt-2">
          <p className="text-xs text-slate-500">
            Modifiez cette réponse exemple (supprimez un champ, changez un
            type, sortez de l&apos;enum…) et observez les violations.
          </p>
          <textarea
            rows={8}
            value={text}
            spellCheck={false}
            aria-label="Réponse de test à valider"
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 flex items-start gap-2">
            <div className="flex-1">{result && <ValidationCard result={result} />}</div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
