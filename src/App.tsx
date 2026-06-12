import { useState } from 'react'
import { levels, type LevelId } from './levels'
import { ProviderBar } from './components/ProviderBar'
import { ProviderProvider } from './state/ProviderContext'
import { L2ConfigProvider } from './state/L2ConfigContext'

export default function App() {
  const [active, setActive] = useState<LevelId>('L1')
  const level = levels.find((l) => l.id === active)!

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
              className="mx-auto flex max-w-5xl gap-1 px-6"
              aria-label="Niveaux"
            >
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActive(l.id)}
                  aria-current={l.id === active ? 'page' : undefined}
                  className={`rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    l.id === active
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {l.id} — {l.title}
                </button>
              ))}
            </nav>
          </header>
          <ProviderBar />
          <main className="mx-auto max-w-5xl px-6 py-8">
            <level.Component />
          </main>
        </div>
      </L2ConfigProvider>
    </ProviderProvider>
  )
}
