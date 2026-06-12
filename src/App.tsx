import { useEffect, useState } from 'react'
import { levels } from './levels'
import { HomePage } from './components/HomePage'
import { ProviderBar } from './components/ProviderBar'
import { ProviderProvider } from './state/ProviderContext'
import { L2ConfigProvider } from './state/L2ConfigContext'
import { pageHash, parsePageHash, type PageId } from './router'

// La page courante vit dans le fragment d'URL (#/l1…) : un onglet se partage
// par lien et survit au rechargement, y compris servi en statique (cf. router.ts).
function useHashPage(): PageId {
  const [page, setPage] = useState<PageId>(() => parsePageHash(window.location.hash))
  useEffect(() => {
    const onHashChange = () => setPage(parsePageHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return page
}

const tabs: { id: PageId; label: string }[] = [
  { id: 'accueil', label: 'Accueil' },
  ...levels.map((l) => ({ id: l.id, label: `${l.id} — ${l.title}` })),
]

export default function App() {
  const page = useHashPage()
  const level = levels.find((l) => l.id === page)

  return (
    <ProviderProvider>
      <L2ConfigProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-6 py-4">
              <h1 className="text-xl font-semibold">Call Builder</h1>
              <p className="text-sm text-slate-500">
                Comprendre un appel LLM en le construisant, bloc par bloc.
              </p>
            </div>
            <nav
              className="mx-auto flex max-w-5xl flex-wrap gap-1 px-6"
              aria-label="Niveaux"
            >
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={pageHash(tab.id)}
                  aria-current={tab.id === page ? 'page' : undefined}
                  className={`rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    tab.id === page
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </a>
              ))}
            </nav>
          </header>
          <ProviderBar />
          <main className="mx-auto max-w-5xl px-6 py-8">
            {level ? <level.Component /> : <HomePage />}
          </main>
        </div>
      </L2ConfigProvider>
    </ProviderProvider>
  )
}
