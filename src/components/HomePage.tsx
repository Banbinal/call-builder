// Page d'accueil atelier (T10) : oriente le participant — les 4 niveaux en
// une phrase chacun, et comment se connecter (clé personnelle ou proxy
// atelier à venir).

import { levels } from '../levels'
import { pageHash } from '../router'

export function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-800">
          Comprendre un appel LLM en le construisant
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Quatre niveaux progressifs, du prompt nu au protocole MCP. À chaque
          niveau, l'outil montre exactement ce qui part vers l'API — le JSON
          annoté, le code équivalent — et ce qui en revient, événement par
          événement. Le même cas fil rouge (un verbatim client télécom)
          traverse les quatre niveaux.
        </p>
      </section>

      <section aria-label="Les quatre niveaux" className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => (
          <a
            key={level.id}
            href={pageHash(level.id)}
            className="group rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-400"
          >
            <h3 className="font-semibold text-slate-800">
              <span className="text-indigo-600">{level.id}</span> — {level.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {level.summary}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-indigo-600 group-hover:underline">
              Ouvrir {level.id} →
            </span>
          </a>
        ))}
      </section>

      <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h3 className="font-semibold text-indigo-900">Se connecter à un modèle</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-indigo-900/80">
          Collez votre clé API Anthropic dans la barre en haut de page, puis
          « Tester la connexion ». Votre clé vit uniquement en mémoire : elle
          n'est jamais stockée et disparaît au rechargement. Pas de clé ? Vous
          pouvez demander l'accès au proxy de l'atelier (clé partagée côté
          serveur, bientôt disponible) — et en attendant, tout l'outil reste
          utilisable sans clé en mode « génération de code seule ».
        </p>
      </section>
    </div>
  )
}
