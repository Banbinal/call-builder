# État de l'architecture — Call Builder

> **À jour au** : 2026-06-12
>
> Document le plus consulté : il décrit l'état *courant*, pas l'historique — l'historique
> vit dans `decisions/`. Le garder concis et narratif.

## 1. Vue d'ensemble

Outil pédagogique mono-page pour Product Owners : construire un appel LLM bloc par bloc
sur 4 niveaux (L1 appel nu, L2 structuration, L3 skills, L4 MCP). Front statique pur,
zéro backend, mode BYOK (clé Anthropic en mémoire uniquement). Développé ticket par
ticket depuis `spec.md` ; état actuel : **T5 livré** (niveaux L1 et L2 opérationnels,
panneau « Requête » T4 partout : JSON exact annoté + export Python / curl / JS. L2
ajoute les blocs de structuration activables — system prompt, température,
max_tokens — qui « s'allument » dans le JSON, le mode A/B en deux colonnes avec diff
surligné, l'exécution simultanée et le ×N par colonne avec synthèses comparées, plus
deux presets pédagogiques sur le fil rouge).

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
  curl / JavaScript, props `title`/`diffKeys`), `AnnotatedJson` (JSON coloré, notes au
  survol dans un encart fixe ; depuis T5 : flash « s'allume » quand une clé apparaît ou
  change, surlignage durable des clés en diff A/B), `annotations.fr.ts` (notes
  pédagogiques par clé de premier niveau).
- **Galerie ×N** (`src/components/batch/`) : UI partagée depuis T5 — `BatchPanel`
  (progression, cartes, modale) et `synthesis.ts` (heuristiques pures
  longueurs/formats). Utilisée par L1 et par chaque colonne du mode A/B de L2.
- **Config L2** (`src/levels/l2/config.ts`) : couche pure — blocs
  `BlockState { enabled, value }` (la valeur survit à l'extinction), `toRequest`
  (projection en `LLMRequest`), `diffRequestKeys`/`describeDiff` (diff au niveau wire
  via `buildRequestBody`, cf. ADR-005). Presets A/B dans `presets.ts` (fabriques).
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
- [ADR-005](decisions/ADR-005-niveau-l2-config-blocs-diff-wire-ab-plafond-global.md) —
  niveau L2 : galerie ×N partagée dans `components/batch/`, config par blocs pure,
  diff A/B au niveau wire, plafond global de 4 appels réparti entre colonnes,
  runs L2 non-streaming.

## 5. Patterns prescriptifs

Voir [`PATTERNS.md`](PATTERNS.md) — catalogue vide pour l'instant.

## 6. Dette technique connue

- **Source d'annotations en dur** : `AnnotatedJson` importe directement
  `annotations.fr.ts`. T8 (simulateur MCP) réutilisera le mécanisme avec d'autres notes
  (JSON-RPC) — il faudra alors passer la source d'annotations en prop (cf. ADR-004).
