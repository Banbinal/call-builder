// Panneau « Requête » (T4) : le JSON exact qui part (ou partirait) vers
// l'API, annoté clé par clé, plus le code équivalent en Python / curl /
// JavaScript. Se met à jour à chaque changement de configuration, sans
// exécution — c'est le mode « génération de code seule », utilisable sans clé.
// Construit dans L1, réutilisé par les niveaux suivants.

import { useMemo, useState } from 'react'
import {
  generateCurl,
  generateJavaScript,
  generatePython,
  type CodegenOptions,
} from '../../codegen'
import { buildRequestBody, type LLMRequest } from '../../engine'
import { ANTHROPIC_BASE_URL } from '../../config/models'
import { AnnotatedJson } from './AnnotatedJson'

type TabId = 'json' | 'python' | 'curl' | 'javascript'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'json', label: 'JSON annoté' },
  { id: 'python', label: 'Python' },
  { id: 'curl', label: 'curl' },
  { id: 'javascript', label: 'JavaScript' },
]

export function RequestPanel({
  request,
  baseUrl = ANTHROPIC_BASE_URL,
  diffKeys,
  title = 'Requête',
}: {
  request: LLMRequest
  /** Changera en mode proxy (T12) ; l'URL affichée et le code suivent. */
  baseUrl?: string
  /** Clés de premier niveau à surligner (diff A/B, T5). */
  diffKeys?: ReadonlySet<string>
  /** Titre de la section (« Requête A » / « Requête B » en mode A/B). */
  title?: string
}) {
  const [tab, setTab] = useState<TabId>('json')

  const body = useMemo(() => buildRequestBody(request, false), [request])
  const code = useMemo(() => {
    const opts: CodegenOptions = { baseUrl }
    return {
      python: generatePython(request, opts),
      curl: generateCurl(request, opts),
      javascript: generateJavaScript(request, opts),
    }
  }, [request, baseUrl])

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <p className="font-mono text-xs text-slate-400">
          POST {baseUrl}/v1/messages
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Ce qui part réellement vers l&apos;API avec la configuration courante —
        aucune magie, juste ce JSON.
      </p>

      <div
        role="tablist"
        aria-label="Formats de la requête"
        className="mt-3 flex gap-1 border-b border-slate-200"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              t.id === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === 'json' ? (
          <AnnotatedJson body={body} diffKeys={diffKeys} />
        ) : (
          <CodeBlock code={code[tab]} />
        )}
      </div>
    </section>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void copy()}
        className="absolute right-2 top-2 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
      >
        {copied ? 'Copié !' : 'Copier'}
      </button>
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
        {code}
      </pre>
      <p className="mt-2 text-xs text-slate-400">
        La clé est remplacée par <code className="font-mono">VOTRE_CLE_API</code>{' '}
        — votre clé réelle n&apos;apparaît jamais dans le code généré.
      </p>
    </div>
  )
}
