# État de l'architecture — Call Builder

> **À jour au** : 2026-06-12
>
> Document le plus consulté : il décrit l'état *courant*, pas l'historique — l'historique
> vit dans `decisions/`. Le garder concis et narratif.

## 1. Vue d'ensemble

Outil pédagogique mono-page pour Product Owners : construire un appel LLM bloc par bloc
sur 4 niveaux (L1 appel nu, L2 structuration, L3 skills, L4 MCP). Front statique pur,
zéro backend, mode BYOK (clé Anthropic en mémoire uniquement). Développé ticket par
ticket depuis `spec.md` ; état actuel : **T10 livré** (niveaux L1 à L4 opérationnels,
panneau « Requête » T4 partout : JSON exact annoté + export Python / curl / JS. L2
ajoute les blocs de structuration activables — system prompt, température,
max_tokens, et depuis T6 le schéma de sortie — qui « s'allument » dans le JSON, le
mode A/B en deux colonnes avec diff surligné, l'exécution simultanée et le ×N par
colonne avec synthèses comparées, trois presets pédagogiques sur le fil rouge. Le
bloc schéma a deux modes — strict via `output_config.format`, ou consigne de repli
dans le system prompt (défaut) — avec éditeur visuel/JSON synchronisé, mode test,
validation de chaque réponse et taux de conformité en ×N. L3 « replie » la config
L2 dans une skill : formulaire pré-rempli — instructions depuis le system prompt,
contrat de sortie depuis le schéma T6 —, aperçu SKILL.md en direct, linter
pédagogique à 5 règles, export en fichier seul ou en zip `<nom>/SKILL.md`. L4
simule les échanges MCP : scénario scripté en 5 temps rejouable pas à pas, trois
colonnes Agent / Protocole / Tool, messages JSON-RPC réels annotés au survol,
schéma du tool aligné sur T6. Depuis T9, L2 embarque aussi le mode chaos : un
harness — retry sur non-conformité, fallback de modèle — démontré sur pannes
simulées, timeline horodatée et compteur de coût. Depuis T10, l'app est
déployable : routage hash (`#/l1`…`#/l4`, onglets partageables et rechargeables),
page d'accueil atelier, workflow GitHub Pages sur push `main`, cible o2switch
statique documentée).

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
  Depuis T9 : `runHarness` (retry sur non-conformité avec violations ré-injectées
  dans la conversation, fallback de modèle, étapes horodatées, coût en appels ;
  validateur injecté — l'engine ne connaît pas ajv) et `createChaosProvider`
  (décorateur de pannes simulées : corruption de la 1ʳᵉ réponse, modèle en panne) —
  cf. ADR-009.
- **Codegen** (`src/codegen/`) : fonctions pures `(LLMRequest, CodegenOptions?) →
  string` — Python (SDK anthropic), curl, JavaScript (fetch) — testées par snapshots.
  Les générateurs ne reçoivent jamais la clé API (placeholder `VOTRE_CLE_API` par
  construction, cf. ADR-004). `CodegenOptions.baseUrl` prépare le mode proxy (T12).
- **Panneau requête** (`src/components/request/`) : UI partagée construite dans L1,
  réutilisée par les niveaux suivants — `RequestPanel` (onglets JSON annoté / Python /
  curl / JavaScript, props `title`/`diffKeys`), `AnnotatedJson` (JSON coloré, notes au
  survol dans un encart fixe ; depuis T5 : flash « s'allume » quand une clé apparaît ou
  change, surlignage durable des clés en diff A/B ; depuis T8 : source des notes
  injectable en prop), `annotations.fr.ts` (notes pédagogiques par clé de premier
  niveau).
- **Galerie ×N** (`src/components/batch/`) : UI partagée depuis T5 — `BatchPanel`
  (progression, cartes, modale) et `synthesis.ts` (heuristiques pures
  longueurs/formats). Utilisée par L1 et par chaque colonne du mode A/B de L2.
  Depuis T6 : prop `validate` optionnelle — cartes vertes/rouges et taux de
  conformité dans la synthèse quand un schéma est actif, L1 inchangé.
- **Schéma de sortie** (`src/schema/`) : module pur depuis T6 — `model.ts`
  (champs ↔ JSON Schema aller-retour, sous-ensemble v0 : un niveau d'objet,
  enums de chaînes, rejets explicites) et `validate.ts` (validation ajv, cache de
  compilation, violations typées en français : champ manquant, type faux, valeur
  hors enum, champ non prévu). Réutilisable par le harness T9 — cf. ADR-006.
- **Config L2** (`src/levels/l2/config.ts`) : couche pure — blocs
  `BlockState { enabled, value }` (la valeur survit à l'extinction), `toRequest`
  (projection en `LLMRequest`), `diffRequestKeys`/`describeDiff` (diff au niveau wire
  via `buildRequestBody`, cf. ADR-005). Presets A/B dans `presets.ts` (fabriques).
  Depuis T6 : bloc schéma `{ strict, spec }` — strict → `output_config.format`
  via `extra`, repli (défaut) → consigne ajoutée au system prompt (ADR-006).
- **Simulateur MCP (L4)** (`src/levels/l4/`) : maquette interactive depuis T8 —
  `scenario.ts` (données pures éditables : 5 temps, messages JSON-RPC MCP valides,
  schéma de sortie du tool construit depuis le schéma T6, testé), `annotations.fr.ts`
  (notes JSON-RPC, branchées sur le mécanisme d'annotation T4) et `index.tsx`
  (stepper Précédent/Suivant, trois colonnes Agent / Protocole / Tool, bandeau
  « Simulation » honnête). Aucun vrai serveur — cf. ADR-008.
- **Mode chaos (L2)** (`src/levels/l2/ChaosPanel.tsx`) : depuis T9 — toggles de
  pannes simulées (sortie malformée au 1ᵉʳ essai, provider down), exécution via le
  harness sur la config A (chaîne modèle courant → autre modèle du sélecteur),
  timeline des `HarnessStep` et compteur de coût (« N appels au lieu d'1 »).
  Guardrails d'entrée explicitement « non simulés ici ».
- **Skill (L3)** (`src/levels/l3/`) : trois modules purs depuis T7, miroir de
  `l2/config.ts` — `skill.ts` (formulaire ↔ SKILL.md : kebab-case forcé,
  pré-remplissage depuis la config L2, frontmatter YAML échappé via JSON),
  `lint.ts` (5 règles pédagogiques, une explication par alerte) et `zip.ts`
  (archive « store » CRC-32 écrite à la main, zéro dépendance, reproductible).
  Le contrat de sortie est en lecture seule en L3 : il se modifie au niveau 2,
  « Replier à nouveau » resynchronise — cf. ADR-007.
- **Routeur & accueil** (`src/router.ts`, `src/components/HomePage.tsx`) : depuis
  T10 — la page courante vit dans le fragment d'URL (`parsePageHash`/`pageHash`,
  fonctions pures testées, fragment inconnu → accueil), `App.tsx` s'abonne à
  `hashchange`. L'accueil n'est pas un niveau : cartes des 4 niveaux (phrases
  centralisées dans `levels/index.ts`, champ `summary`) et encart « se
  connecter » (clé ou proxy atelier à venir). Déploiement :
  `.github/workflows/deploy.yml` (test + build + Pages sur push `main`) ;
  o2switch = dépôt du contenu de `dist/` — cf. ADR-010.
- **Config** (`src/config/`) : constantes partagées — liste des modèles du sélecteur
  (`models.ts`, Haiku 4.5 défaut + Sonnet 4.6), URL de base Anthropic, et défauts des
  niveaux (`defaults.ts` : prompt fil rouge, `max_tokens` par défaut).
- **State** (`src/state/`) : contextes React. `ProviderContext` détient la clé API
  (mémoire uniquement, invariant n°4), le modèle choisi, le statut de connexion
  (5 états : non configuré / non testée / test / prêt / erreur) et expose `provider`
  + `canExecute` aux niveaux. Sans clé : mode « génération de code seule ».
  Depuis T7 : `L2ConfigContext` — la config L2 (colonne A) vit au-dessus des
  onglets, L2 l'édite, L3 la « replie » dans la skill, et elle survit aux
  changements de niveau (cf. ADR-007).
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
- [ADR-006](decisions/ADR-006-structured-output-double-mode-validation-ajv.md) —
  structured output : double mode strict (`output_config.format`) / repli prompt
  avec défaut non-strict pédagogique, validation ajv dans `src/schema/` pur,
  prop `validate` optionnelle sur la galerie ×N.
- [ADR-007](decisions/ADR-007-niveau-l3-contexte-partage-modules-purs-zip.md) —
  niveau L3 : config L2 partagée via `L2ConfigContext`, skill/lint/zip en
  modules purs dans `levels/l3/`, zip « store » sans dépendance, contrat de
  sortie en lecture seule (le schéma reste défini au niveau 2).
- [ADR-008](decisions/ADR-008-niveau-l4-scenario-mcp-statique-annotations-injectables.md) —
  niveau L4 : scénario MCP en données statiques (alignement T6 par
  construction, testé), source d'annotations injectable (dette ADR-004
  soldée), pas de vrai serveur.
- [ADR-009](decisions/ADR-009-mode-chaos-harness-pur-validateur-injecte-chaos-decorateur.md) —
  mode chaos : harness pur à validateur injecté dans l'engine, pannes
  simulées en décorateur de provider (le harness ne sait pas qu'il est
  testé), timeline = projection des `HarnessStep`.
- [ADR-010](decisions/ADR-010-deploiement-statique-routeur-hash-accueil-pages-actions.md) —
  déploiement statique : routeur hash maison en fonctions pures (pas de lib),
  accueil hors `levels[]` avec résumés centralisés, déploiement Pages par
  workflow Actions sur `main`, o2switch en dépôt de `dist/`.

## 5. Patterns prescriptifs

Voir [`PATTERNS.md`](PATTERNS.md) — catalogue vide pour l'instant.

## 6. Dette technique connue

- **Formulaire L3 en état local** : la skill en cours d'édition (exemples saisis,
  description retouchée) est perdue au changement d'onglet — seule la config L2 est
  partagée. À remonter en contexte si gênant en atelier (cf. ADR-007).
