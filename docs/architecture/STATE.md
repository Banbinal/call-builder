# État de l'architecture — Call Builder

> **À jour au** : 2026-06-12
>
> Document le plus consulté : il décrit l'état *courant*, pas l'historique — l'historique
> vit dans `decisions/`. Le garder concis et narratif.

## 1. Vue d'ensemble

Outil pédagogique mono-page pour Product Owners : construire un appel LLM bloc par bloc
sur 4 niveaux (L1 appel nu, L2 structuration, L3 skills, L4 MCP). Front statique pur,
zéro backend, mode BYOK (clé Anthropic en mémoire uniquement). Développé ticket par
ticket depuis `spec.md` ; état actuel : **T1 livré** (couche provider : appel direct
Anthropic streaming/non-streaming, erreurs typées affichables, 23 tests engine).

## 2. Stack

- Vite 8 + React 19 + TypeScript 6 (strict) + Tailwind CSS v4
- Vitest 4 (tests de l'engine en environnement Node, sans DOM)
- Build statique `base: './'` — servable en `file://`, GitHub Pages, o2switch
- Aucune dépendance UI lourde (interdit par spec)

## 3. Concepts du domaine

- **Niveau (L1–L4)** : un onglet pédagogique = un dossier `src/levels/l<n>/` exportant
  un composant `L<n>`.
- **Engine** (`src/engine/`) : logique d'appel LLM pure, sans React ni storage. En
  place depuis T1 : `createProvider(ProviderConfig)` → `callLLM(LLMRequest, { stream,
  onEvent })` → `LLMResult` (union `ok: true | false`, événements SSE bruts horodatés,
  latences, erreurs affichables en français). Fetch brut, pas de SDK — cf. ADR-002.
- **Codegen** (`src/codegen/`) : fonctions pures `LLMRequest → string` (Python, curl,
  JS fetch — à venir en T4).
- **Fil rouge** : le verbatim client télécom, réutilisé de L1 à L4.

## 4. Décisions marquantes

Journal complet dans [`decisions/`](decisions/README.md). Notables :

- [ADR-001](decisions/ADR-001-fondations-call-builder-v0.md) — fondations v0 : stack,
  arborescence, UI française, modèles Haiku 4.5 (défaut) + Sonnet 4.6.
- [ADR-002](decisions/ADR-002-couche-provider-fetch-brut-resultats-types.md) — couche
  provider : fetch brut (pas de SDK), `LLMResult` en union discriminée, injection
  fetch/horloge, `LLMRequest` au format wire, erreurs françaises dans l'engine.

## 5. Patterns prescriptifs

Voir [`PATTERNS.md`](PATTERNS.md) — catalogue vide pour l'instant.

## 6. Dette technique connue

Aucune dette nommée à ce stade.
