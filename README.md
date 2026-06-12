# Call Builder

Outil pédagogique mono-page pour Product Owners : comprendre un appel LLM en le
construisant bloc par bloc, sur 4 niveaux (L1 appel nu → L2 structuration →
L3 skills → L4 MCP). Front statique, zéro backend, mode BYOK (la clé API n'est
jamais stockée).

## Démarrer

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests Vitest
npm run build    # bundle statique dans dist/ (fonctionne en file://)
```

Le backlog complet est dans [spec.md](spec.md), les conventions du projet dans
[CLAUDE.md](CLAUDE.md).

## Test manuel de la couche provider (T1)

La couche d'appel (`src/engine/provider.ts`) s'appelle directement depuis la
console du navigateur, sans UI. Lancer `npm run dev`, ouvrir l'app, puis dans
la console DevTools :

```js
const { createProvider } = await import('/src/engine/index.ts')
const provider = createProvider({
  mode: 'direct',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-…', // votre clé — collée ici, jamais stockée
})

const request = {
  model: 'claude-haiku-4-5-20251001',
  messages: [{ role: 'user', content: 'Dis bonjour en une phrase.' }],
  max_tokens: 100,
}

// Appel non-streaming
await provider.callLLM(request, { stream: false })

// Appel streaming : chaque événement SSE est loggé à l'arrivée
await provider.callLLM(request, { stream: true, onEvent: (e) => console.log(e.event, e) })
```

Vérifications attendues :

- les deux appels retournent `{ ok: true, text, usage, totalLatencyMs, … }` ;
- en streaming, `events` contient les événements SSE bruts dans l'ordre de
  réception (`message_start` → `content_block_delta`… → `message_stop`) et
  `firstTokenLatencyMs < totalLatencyMs` ;
- avec une clé invalide, le résultat est `{ ok: false, error: { type: 'auth',
  message: 'Clé API invalide…' } }` — message explicite, aucun crash.

## Vérifier que la clé n'est jamais stockée (T2)

La clé saisie dans la barre d'état vit uniquement dans un contexte React en
mémoire. Pour le vérifier via DevTools après avoir collé une clé et testé la
connexion :

- **Application → Local Storage / Session Storage** : aucune entrée ;
- **barre d'adresse** : la clé n'apparaît dans aucune URL ;
- **rechargement de la page** : la clé est perdue, l'indicateur repasse à
  « non configuré » — c'est le comportement voulu.

## Test manuel du niveau 1 (T3)

Avec une clé valide configurée, sur l'onglet **L1 — L'appel nu** (prompt fil
rouge pré-rempli) :

1. **Run unique** — cliquer « Exécuter » : le texte s'assemble en direct dans
   le panneau Réponse ; le panneau repliable « Flux brut » liste chaque
   événement SSE horodaté (`message_start` → `content_block_delta`… →
   `message_stop`) ; les métriques (premier token, latence totale, tokens
   entrée/sortie) s'affichent à la fin.
2. **×20** — sélectionner 20 puis « Exécuter ×20 » : la barre de progression
   avance, jamais plus de 4 appels simultanés (visible dans l'onglet Réseau
   des DevTools), et la grille montre des réponses visiblement différentes.
   La ligne de synthèse donne longueurs min/médiane/max et le nombre de
   formats distincts. Un clic sur une carte ouvre la réponse complète.
3. **Erreur isolée** — couper le réseau pendant un ×N : les runs en échec
   affichent leur carte d'erreur rouge, les autres se terminent normalement.
