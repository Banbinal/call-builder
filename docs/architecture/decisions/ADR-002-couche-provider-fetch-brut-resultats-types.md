# ADR-002 : Couche provider T1 — fetch brut, résultats typés, injection

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-001](ADR-001-fondations-call-builder-v0.md)

## Contexte

T1 implémente l'appel `/v1/messages` (streaming et non-streaming) directement depuis le
navigateur en mode BYOK, via le header CORS `anthropic-dangerous-direct-browser-access`.
Le SDK officiel `@anthropic-ai/sdk` était l'option par défaut, mais il encapsule la
requête HTTP et le flux SSE — exactement les mécanismes que l'outil doit rendre visibles
(invariant n°1). Il fallait aussi décider comment les erreurs remontent à l'UI et comment
la couche reste testable et prête pour la bascule proxy (T12).

## Décision

`fetch` brut + parseur SSE incrémental maison (`engine/sse.ts`), aucun SDK. `callLLM`
retourne toujours une union discriminée `LLMResult { ok: true | false }` — jamais
d'exception vers l'UI ; les événements SSE reçus avant un échec sont conservés dans le
résultat. Factory `createProvider(config: ProviderConfig, deps?)` avec `fetch` et horloge
injectables (tests déterministes, fetch mocké). Les clés de `LLMRequest` sont calquées
sur le format wire de l'API (`max_tokens`, pas `maxTokens`). Les messages d'erreur
affichables sont produits en français dans l'engine (`mapApiError`), avec le message brut
de l'API en champ `detail`.

## Alternatives considérées

### SDK officiel `@anthropic-ai/sdk`
- **Résumé** : client TypeScript maintenu par Anthropic, streaming et erreurs typées inclus.
- **Pourquoi rejetée** : il masque la requête et les chunks SSE que L1 doit afficher tels
  quels ; il alourdit le bundle (cible < 500 Ko gzippé en T10) ; le flux brut horodaté
  exigé par T3 imposerait de contourner ses abstractions.

### Exceptions typées catchées dans l'UI
- **Résumé** : `callLLM` lance des classes d'erreur (`AuthError`…), chaque appelant les catche.
- **Pourquoi rejetée** : la spec T1 exige « jamais une exception non catchée dans l'UI » ;
  l'union discriminée force la gestion du cas d'échec à la compilation et permet de
  conserver les événements SSE reçus avant l'échec (valeur pédagogique d'une erreur mi-flux).

### `LLMRequest` en camelCase idiomatique TypeScript
- **Résumé** : `maxTokens`, conversion vers le format wire au moment de l'envoi.
- **Pourquoi rejetée** : le panneau requête (T4) et le codegen doivent montrer « le JSON
  exact qui part » ; une couche de traduction créerait un écart possible entre ce qui est
  affiché et ce qui est envoyé.

### Messages d'erreur traduits côté UI
- **Résumé** : l'engine retourne des codes, l'UI les traduit en français.
- **Pourquoi rejetée** : chaque niveau (L1–L4) ré-implémenterait le mapping ; le message
  pédagogique fait partie du contrat d'erreur (« objet erreur affichable ») et reste
  testable dans l'engine. Le détail brut anglais de l'API reste exposé via `detail`.

## Conséquences

- T4 (panneau requête, codegen) consomme `LLMRequest` tel quel, sans transformation.
- T9 (mode chaos) pourra wrapper le provider (`harness.ts`) sans changer le contrat
  `LLMResult` vu par l'UI.
- T12 (bascule proxy) est un changement de `ProviderConfig { mode, baseUrl }` seulement —
  les headers s'adaptent déjà (pas de header navigateur ni de clé en mode proxy).
- Le parseur SSE maison doit rester conforme au format de l'API (champ `event`/`data`,
  blocs séparés par ligne vide) — testé contre des fixtures réalistes, à revérifier si
  Anthropic change le format wire.

## Implémentation

- Commit T1 `d8e7fa9` — `engine/types.ts`, `engine/sse.ts`, `engine/provider.ts`,
  23 tests Vitest (fetch mocké), test manuel documenté dans le README.

## Notes de révision

—
