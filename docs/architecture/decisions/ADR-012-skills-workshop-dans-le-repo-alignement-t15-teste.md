# ADR-012 : Skills du workshop T13–T15 — dans le repo, évals en données, alignement T15 verrouillé par test

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-006](ADR-006-structured-output-double-mode-validation-ajv.md), [ADR-007](ADR-007-niveau-l3-contexte-partage-modules-purs-zip.md), [ADR-008](ADR-008-niveau-l4-scenario-mcp-statique-annotations-injectables.md), [ADR-011](ADR-011-proxy-atelier-repo-separe-garde-fous-faits-main.md)

## Contexte

T13–T15 livrent les trois skills du workshop (épic 3) : `reecriture-ticket`
(ticket flou → ticket exécutable), `dictionnaire-donnees` (gabarit de couche
sémantique SQL) et `analyse-verbatim` (le fil rouge, version de référence).
Trois découpages se posaient : où vivent ces skills, alors que le proxy de
l'épic 2 est parti en repo frère (ADR-011) ; comment garantir que
`analyse-verbatim` reste strictement alignée sur le schéma T6 et sur la
structure d'export du niveau 3 — l'exigence centrale de T15 (« la sortie est
strictement identique en structure à celle du Call Builder T6 ») ; et comment
livrer des suites d'évals alors que le repo n'exécute aucun appel LLM en CI.

## Décision

Les skills vivent dans `skills/` à la racine du repo : contenu statique pur
(markdown + JSON), hors `src/`, donc hors bundle — l'invariant n°5 reste
intact et `tsc -b` ne les voit pas. L'alignement de `analyse-verbatim` est
verrouillé par construction : un test Vitest
(`src/levels/l3/reference-skill.test.ts`) lit le SKILL.md et les évals via
les imports `?raw` de Vite et les confronte à
`toJsonSchema(defaultSchemaSpec())` (schéma du contrat strictement égal),
à la structure de sections de `generateSkillMd` (T7), au linter pédagogique
T7 (zéro alerte) et au schéma T6 pour les 10 vérités terrain. Les évals sont
des données plus un protocole à critères binaires (exécution de référence
manuelle, documentée dans le README comme les tests manuels des tickets
précédents) ; seules les vérités terrain de T15 sont validées
automatiquement.

## Alternatives considérées

### Repo frère (comme le proxy T11)

- **Résumé** : un repo `call-builder-skills` séparé, distribué tel quel aux
  participants.
- **Pourquoi rejetée** : le proxy est un déployable Node séparé avec son
  cycle de vie propre ; les skills sont du markdown pur sans build, et le
  test d'alignement T15 doit importer `src/schema/` — même repo obligatoire
  pour un alignement testé à chaque `npm test`.

### `@types/node` + `node:fs` dans le test d'alignement

- **Résumé** : lire les fichiers de `skills/` avec `readFileSync` dans le
  test.
- **Pourquoi rejetée** : `tsc -b` type-checke aussi les tests ; installer
  `@types/node` rendrait les globals Node ambiants dans tout le code
  applicatif. Les imports `?raw` sont déjà typés par `vite-env.d.ts` et
  résolus par le bundler — zéro dépendance ajoutée.

### Runner d'évals LLM automatisé

- **Résumé** : un script qui exécute les évals contre l'API et calcule les
  scores (8/10 gravité, 10/10 conformité).
- **Pourquoi rejetée** : exigerait une clé et des appels réels en CI, hors
  scope v0 ; le protocole manuel à critères binaires suit la convention des
  tests manuels documentés des tickets précédents, et la partie
  automatisable sans appel (conformité des vérités terrain au schéma) l'est.

## Conséquences

- Le pattern « alignement par construction, testé » (ADR-008 pour le
  scénario L4) est réutilisé : toute dérive du schéma T6, de la structure
  d'export L3 ou des règles du linter casse le build au premier
  `npm test` — la skill de référence ne peut pas diverger silencieusement.
- Les imports `?raw` font des fichiers de `skills/` des entrées de test :
  le contenu pédagogique distribué est sous le même filet que le code.
- Le test normalise les CRLF (`core.autocrlf` sur le poste Windows) : le
  verdict ne dépend pas de la configuration git locale.
- La frontière moyenne/critique de la gravité est documentée dans la skill
  avec 2 exemples de chaque côté, et 3 des 10 verbatims d'éval la testent
  explicitement (cas 2, 3 et 6, justification incluse dans la vérité
  terrain).
- Les évals de T13/T14 restent purement manuelles — si un proxy atelier
  finit déployé (T12), un runner branché dessus redeviendra envisageable.

## Implémentation

- Commits T13, T14, T15 — `skills/reecriture-ticket/` (SKILL.md, README,
  5 évals à 3 critères binaires), `skills/dictionnaire-donnees/` (gabarit,
  EXEMPLE.md 4 tables fictives, CHECKLIST.md 10 points, évals 5 questions +
  refus), `skills/analyse-verbatim/` (SKILL.md aligné T6, évals
  `verbatims.json` 10 cas annotés), `src/levels/l3/reference-skill.test.ts`
  (5 tests), section « Skills du workshop » dans le README.

## Notes de révision

—
