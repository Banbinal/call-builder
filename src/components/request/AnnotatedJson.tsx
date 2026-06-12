// Rendu JSON coloré et annoté (T4) : chaque clé de premier niveau est
// survolable et affiche sa note pédagogique dans l'encart sous le JSON
// (plutôt qu'une infobulle flottante, qui serait rognée par le défilement).
// Depuis T5 : une ligne « s'allume » (flash) quand sa clé apparaît ou change
// de valeur, et `diffKeys` surligne durablement les clés qui diffèrent entre
// les colonnes A et B. Depuis T8 : la source des notes est injectable —
// le simulateur MCP (L4) réutilise le composant avec des notes JSON-RPC.

import { useRef, useState, type ReactNode } from 'react'
import { annotationFor, type KeyAnnotation } from './annotations.fr'

export function AnnotatedJson({
  body,
  diffKeys,
  annotations = annotationFor,
}: {
  body: Record<string, unknown>
  /** Clés de premier niveau à surligner durablement (diff A/B, T5). */
  diffKeys?: ReadonlySet<string>
  /** Source des notes pédagogiques — par défaut, celles du corps /v1/messages. */
  annotations?: (key: string) => KeyAnnotation
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const entries = Object.entries(body)
  const annotation = hoveredKey !== null ? annotations(hoveredKey) : null
  const versions = useKeyVersions(body)

  return (
    <div>
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-300">
        <span className="text-slate-500">{'{'}</span>
        {entries.map(([key, value], i) => (
          <span
            // Changer de version remonte le span : l'animation flash rejoue.
            key={`${key}:${versions.get(key) ?? 0}`}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
            style={
              (versions.get(key) ?? 0) > 0
                ? { animation: 'key-flash 1.2s ease-out' }
                : undefined
            }
            className={`block cursor-help rounded transition-colors ${
              hoveredKey === key
                ? 'bg-slate-700/60'
                : diffKeys?.has(key)
                  ? 'bg-amber-400/15'
                  : ''
            }`}
          >
            {'  '}
            <span className="text-sky-300 underline decoration-sky-500/60 decoration-dotted underline-offset-2">
              &quot;{key}&quot;
            </span>
            <span className="text-slate-500">: </span>
            <JsonValue value={value} indent={1} />
            {i < entries.length - 1 && <span className="text-slate-500">,</span>}
          </span>
        ))}
        <span className="text-slate-500">{'}'}</span>
      </pre>
      <div
        aria-live="polite"
        className="mt-2 min-h-16 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm"
      >
        {annotation ? (
          <>
            <p className="font-medium text-indigo-900">{annotation.title}</p>
            <p className="mt-0.5 text-indigo-800">{annotation.note}</p>
          </>
        ) : (
          <p className="text-indigo-400">
            Survolez une clé du JSON pour comprendre son rôle dans l&apos;appel.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Numéro de version par clé de premier niveau : incrémenté quand la clé
 * apparaît ou que sa valeur change (comparaison sérialisée). Version 0 au
 * premier rendu du composant — pas de flash à l'ouverture du panneau.
 */
function useKeyVersions(body: Record<string, unknown>): Map<string, number> {
  const serialized = useRef<Map<string, string>>(new Map())
  const versions = useRef<Map<string, number>>(new Map())
  const first = serialized.current.size === 0 && versions.current.size === 0

  const seen = new Set<string>()
  for (const [key, value] of Object.entries(body)) {
    seen.add(key)
    const json = JSON.stringify(value)
    if (serialized.current.get(key) !== json) {
      serialized.current.set(key, json)
      if (!first) {
        versions.current.set(key, (versions.current.get(key) ?? 0) + 1)
      } else {
        versions.current.set(key, 0)
      }
    }
  }
  for (const key of [...serialized.current.keys()]) {
    if (!seen.has(key)) {
      serialized.current.delete(key)
      versions.current.delete(key)
    }
  }
  return versions.current
}

/** Valeur JSON colorée, indentée comme JSON.stringify(…, null, 2). */
function JsonValue({ value, indent }: { value: unknown; indent: number }): ReactNode {
  if (value === null) return <span className="text-purple-300">null</span>
  if (typeof value === 'boolean') {
    return <span className="text-purple-300">{String(value)}</span>
  }
  if (typeof value === 'number') {
    return <span className="text-amber-300">{String(value)}</span>
  }
  if (typeof value === 'string') {
    return <span className="text-emerald-300">{JSON.stringify(value)}</span>
  }
  const pad = '  '.repeat(indent)
  const innerPad = '  '.repeat(indent + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-500">[]</span>
    return (
      <>
        <span className="text-slate-500">[</span>
        {value.map((item, i) => (
          <span key={i}>
            {'\n'}
            {innerPad}
            <JsonValue value={item} indent={indent + 1} />
            {i < value.length - 1 && <span className="text-slate-500">,</span>}
          </span>
        ))}
        {'\n'}
        {pad}
        <span className="text-slate-500">]</span>
      </>
    )
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return <span className="text-slate-500">{'{}'}</span>
  return (
    <>
      <span className="text-slate-500">{'{'}</span>
      {entries.map(([key, item], i) => (
        <span key={key}>
          {'\n'}
          {innerPad}
          <span className="text-sky-300">&quot;{key}&quot;</span>
          <span className="text-slate-500">: </span>
          <JsonValue value={item} indent={indent + 1} />
          {i < entries.length - 1 && <span className="text-slate-500">,</span>}
        </span>
      ))}
      {'\n'}
      {pad}
      <span className="text-slate-500">{'}'}</span>
    </>
  )
}
