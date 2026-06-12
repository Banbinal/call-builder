# État de l'architecture — Call Builder

> **À jour au** : 2026-06-12
>
> Document le plus consulté : il décrit l'état *courant*, pas l'historique — l'historique
> vit dans `decisions/`. Le garder concis et narratif.

## 1. Vue d'ensemble

Outil pédagogique mono-page pour Product Owners : construire un appel LLM bloc par bloc
sur 4 niveaux (L1 appel nu, L2 structuration, L3 skills, L4 MCP). Front statique pur,
zéro backend, mode BYOK (clé Anthropic en mémoire uniquement). Développé ticket par
ticket depuis `spec.md` ; état actuel : **T4 livré** (en plus du niveau L1 complet de
T3 : panneau « Requête » dans L1 — le JSON exact envoyé à l'API, coloré, annoté clé par
clé au survol, mis à jour en temps réel sans exécution — et export du code équivalent
en Python / curl / JavaScript avec bouton copier, utilisable sans clé en mode
« génération de code seule »).

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
  Depuis T3 : `runBatch` (pool de workers pur, plafond de concurrence, échec local au
  slot) pour les exécutions ×N — cf. ADR-003. Depuis T4 : `buildRequestBody` exporté —
  la même fonction construit le corps envoyé sur le fil, affiché dans le panneau
  requête et exporté par le codegen (source unique de vérité, cf. ADR-004).
- **Codegen** (`src/codegen/`) : fonctions pures `(LLMRequest, CodegenOptions?) →
  string` — Python (SDK anthropic), curl, JavaScript (fetch) — testées par snapshots.
  Les générateurs ne reçoivent jamais la clé API (placeholder `VOTRE_CLE_API` par
  construction, cf. ADR-004). `CodegenOptions.baseUrl` prépare le mode proxy (T12).
- **Panneau requête** (`src/components/request/`) : UI partagée construite dans L1,
  réutilisée par les niveaux suivants — `RequestPanel` (onglets JSON annoté / Python /
  curl / JavaScript), `AnnotatedJson` (JSON coloré, notes au survol dans un encart
  fixe), `annotations.fr.ts` (notes pédagogiques par clé de premier niveau).
- **Config** (`src/config/`) : constantes partagées — liste des modèles du sélecteur
  (`models.ts`, Haiku 4.5 défaut + Sonnet 4.6), URL de base Anthropic, et défauts des
  niveaux (`defaults.ts` : prompt fil rouge, `max_tokens` par défaut).
- **State** (`src/state/`) : contextes React. `ProviderContext` détient la clé API
  (mémoire uniquement, invariant n°4), le modèle choisi, le statut de connexion
  (5 états : non configuré / non testée / test / prêt / erreur) et expose `provider`
  + `canExecute` aux niveaux. Sans clé : mode « génération de code seule ».
- **Fil rouge** : le verbatim client télécom, réutilisé de L1 à L4.

## 4. Décisions marquantes

Journal complet dans [`decisions/`](decisions/README.md). Notables :

- [ADR-001](decisions/ADR-001-fondations-call-builder-v0.md) — fondations v0 : stack,
  arborescence, UI française, modèles Haiku 4.5 (défaut) + Sonnet 4.6.
- [ADR-002](decisions/ADR-002-couche-provider-fetch-brut-resultats-types.md) — couche
  provider : fetch brut (pas de SDK), `LLMResult` en union discriminée, injection
  fetch/horloge, `LLMRequest` au format wire, erreurs françaises dans l'engine.
- [ADR-003](decisions/ADR-003-niveau-l1-runbatch-pur-xn-non-streaming.md) — niveau L1 :
  `runBatch` pur dans l'engine, heuristiques de synthèse dans `levels/l1`, assemblage
  des deltas côté UI (contrat provider intact), ×N en non-streaming.
- [ADR-004](decisions/ADR-004-panneau-requete-corps-unique-codegen-sans-cle.md) —
  panneau requête : `buildRequestBody` source unique de vérité (fil / panneau /
  codegen), générateurs sans clé par construction, annotations en encart fixe.

## 5. Patterns prescriptifs

Voir [`PATTERNS.md`](PATTERNS.md) — catalogue vide pour l'instant.

## 6. Dette technique connue

- **Source d'annotations en dur** : `AnnotatedJson` importe directement
  `annotations.fr.ts`. T8 (simulateur MCP) réutilisera le mécanisme avec d'autres notes
  (JSON-RPC) — il faudra alors passer la source d'annotations en prop (cf. ADR-004).
