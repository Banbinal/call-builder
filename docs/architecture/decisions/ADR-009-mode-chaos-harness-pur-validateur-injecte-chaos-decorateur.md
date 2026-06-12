# ADR-009 : Mode chaos — harness pur à validateur injecté, pannes simulées en décorateur de provider

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-002](ADR-002-couche-provider-fetch-brut-resultats-types.md), [ADR-006](ADR-006-structured-output-double-mode-validation-ajv.md), [ADR-007](ADR-007-niveau-l3-contexte-partage-modules-purs-zip.md)

## Contexte

T9 démontre le harness dans l'outil : retry sur non-conformité au schéma
(max 2, violations ré-injectées dans le message de retry), fallback de modèle
sur erreur provider, le tout visible en timeline avec un compteur de coût.
Deux questions structurantes : comment le harness valide les réponses sans
coupler l'engine à ajv (la validation vit dans `src/schema/`, cf. ADR-006) ;
et où vivent les pannes simulées — dans le harness lui-même ou autour de lui.

## Décision

`engine/harness.ts` est pur : `runHarness` reçoit un validateur injecté
`(text) => string[]` (même pattern d'injection que fetch et l'horloge,
ADR-002), ré-injecte la réponse fautive et le message correctif dans la
conversation (`buildRetryMessage` exporté — l'écart envoyé au modèle est
montrable tel quel), bascule de modèle sur erreur provider le long d'une
chaîne `models`, émet chaque étape horodatée via `onStep` et compte le coût
en appels. Les pannes sont un **décorateur de provider**
(`engine/chaos.ts`, à usage unique par exécution) : corruption contrôlée de
la première réponse (préfixe texte qui casse le contrat « JSON seul ») et
panne ciblée par modèle. Le harness ne sait pas qu'il est testé — c'est le
monde autour de lui qui est truqué. L'UI (`ChaosPanel` dans L2) lit la
config A via `L2ConfigContext` (pattern ADR-007) et rend la timeline depuis
les étapes émises, sans logique propre.

## Alternatives considérées

### Le harness importe `src/schema` directement
- **Résumé** : `runHarness` appelle `validateResponse` lui-même, sans
  injection.
- **Pourquoi rejetée** : couple l'engine à ajv et au format de violations du
  module schéma ; le validateur injecté garde l'engine autonome et le harness
  réutilisable avec n'importe quel contrat (proxy T12, schémas futurs).

### Chaos en options du harness
- **Résumé** : `runHarness({ corruptFirstAttempt, failFirstModel })` — les
  pannes simulées comme paramètres de la logique de fiabilisation.
- **Pourquoi rejetée** : mélange ce qui réagit (le harness) et ce qui tombe
  en panne (le monde) dans le même module ; le décorateur reproduit la
  frontière réelle et reste honnête pédagogiquement — le harness exécuté en
  démo est exactement celui qui tournerait sans chaos.

### Budget de retries remis à zéro au fallback
- **Résumé** : après une bascule de modèle, repartir avec 2 retries neufs.
- **Pourquoi rejetée** : le comptage global (2 retries pour toute
  l'exécution) garde le compteur de coût lisible — « N appels au lieu d'1 »
  reste borné et racontable ; rien n'empêche d'affiner plus tard.

## Conséquences

- Le harness est réutilisable hors mode chaos : la bascule proxy (T12) ou un
  futur usage « fiabiliser le ×N » pourront l'envelopper tel quel.
- La timeline de l'UI est une projection directe des `HarnessStep` — toute
  évolution du harness (nouvelle étape) apparaît dans l'UI en ajoutant un
  rendu, sans toucher la logique.
- Couverture engine : succès direct, succès après retry (avec vérification
  des messages ré-injectés), épuisement des retries, fallback, échec total,
  absence de validateur, horodatage — 10 tests (`harness.test.ts`,
  `chaos.test.ts`).
- Les guardrails d'entrée (injection de prompt) sont mentionnés « non
  simulés ici » dans l'UI, conformément au hors-scope du ticket.
- Le toggle « sortie malformée » est désactivé sans bloc schéma actif : sans
  contrat, le harness n'a rien à vérifier — l'UI l'explique au lieu de
  laisser un chaos sans effet.

## Implémentation

- Commit T9 — `src/engine/harness.ts`, `src/engine/chaos.ts` (+ exports
  `engine/index.ts`), `src/levels/l2/ChaosPanel.tsx` branché sous les
  colonnes de L2, 10 tests engine.

## Notes de révision

—
