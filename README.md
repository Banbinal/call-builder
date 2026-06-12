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
