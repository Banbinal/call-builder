# ADR-003 : Niveau L1 — runBatch pur, synthèse côté niveau, ×N non-streaming

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-002](ADR-002-couche-provider-fetch-brut-resultats-types.md)

## Contexte

T3 livre le premier niveau exécutable (L1) : un prompt, le streaming visible chunk par
chunk (réponse assemblée en direct + flux SSE brut horodaté), et le bouton ×N (5/10/20,
concurrence plafonnée à 4) pour faire constater la stochasticité. Quatre choix de
découpage se posaient : où vit la logique de lot, où vivent les heuristiques de synthèse
de la galerie, comment l'UI assemble le texte en direct, et si les runs ×N streament.

## Décision

`runBatch` vit dans l'engine (`engine/batch.ts`) : pool de workers pur, générique sur
`(index) => Promise<LLMResult>`, résultats rendus dans l'ordre des slots, toute exception
convertie en `LLMResult { ok: false }` local au slot — un échec n'interrompt jamais le
lot. Les heuristiques de synthèse (longueurs min/médiane/max, formats distincts) sont des
fonctions pures dans `levels/l1/synthesis.ts` : de l'analyse de présentation, pas de la
logique d'appel. L'UI assemble le texte en extrayant les `text_delta` depuis `onEvent`,
sans élargir le contrat provider. Les runs ×N sont exécutés en non-streaming ; le
streaming se montre sur le run unique.

## Alternatives considérées

### Pool de concurrence dans le composant React L1
- **Résumé** : gérer le plafond de 4 appels directement dans l'état du composant.
- **Pourquoi rejetée** : non testable hors DOM (l'invariant « engine pur » existe pour
  ça), et T5 réutilise le ×N par colonne — la logique doit être partageable.

### Heuristiques de synthèse dans l'engine
- **Résumé** : placer `detectFormat`/`summarizeTexts` à côté de `runBatch`.
- **Pourquoi rejetée** : l'engine est la logique d'appel LLM ; la détection de format est
  de la présentation pédagogique propre à la galerie. Les fonctions restent pures et
  testées dans `levels/l1/`, et T6 étendra la synthèse (taux de conformité) sans toucher
  à l'engine.

### Callback `onText` ajouté à `CallOptions`
- **Résumé** : l'engine pousse les deltas de texte assemblés, l'UI n'analyse rien.
- **Pourquoi rejetée** : élargit le contrat T1 pour épargner quatre lignes à l'UI, et
  masque le mécanisme — lire le `content_block_delta` brut est précisément le geste
  pédagogique de L1 (invariant n°1).

### ×N en streaming
- **Résumé** : streamer les 20 runs simultanément.
- **Pourquoi rejetée** : 20 flux SSE concurrents n'apportent rien pédagogiquement et
  compliquent l'UI (20 textes qui s'assemblent en même temps) ; la latence par carte
  vient de `totalLatencyMs`, disponible dans les deux modes.

## Conséquences

- T5 (comparateur A/B) réutilise `runBatch` et `summarizeTexts` tels quels, une instance
  par colonne ; les deux synthèses comparées sont déjà calculables.
- T6 branchera le taux de conformité de schéma sur la même ligne de synthèse — la
  statistique clé du niveau 2 s'ajoute sans refactor.
- Le plafond de concurrence est une constante UI (`BATCH_CONCURRENCY = 4` dans
  `levels/l1/index.tsx`), facile à exposer ou centraliser si un autre niveau en a besoin.
- Le filet anti-exception de `runBatch` double le contrat « jamais d'exception » du
  provider (ADR-002) : même un bug d'un run laisse le reste du lot se terminer.

## Implémentation

- Commit T3 `463d19c` — `engine/batch.ts` (5 tests Vitest), `levels/l1/`
  (`synthesis.ts` 7 tests, `RawStreamPanel.tsx`, `BatchPanel.tsx`, `index.tsx`),
  `config/defaults.ts` (prompt fil rouge, `max_tokens` par défaut), test manuel L1
  documenté dans le README.

## Notes de révision

—
