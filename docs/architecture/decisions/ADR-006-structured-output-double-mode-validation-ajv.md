# ADR-006 : Structured output T6 — double mode strict/repli, validation ajv dans un module pur

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-004](ADR-004-panneau-requete-corps-unique-codegen-sans-cle.md), [ADR-005](ADR-005-niveau-l2-config-blocs-diff-wire-ab-plafond-global.md)

## Contexte

T6 livre le contrat de sortie : un éditeur de schéma JSON deux modes (visuel et
JSON brut, synchronisés), l'injection du schéma dans l'appel, la validation
visuelle de chaque réponse et le taux de conformité en ×N — la statistique
pédagogique clé du niveau 2. Trois découpages se posaient : comment injecter le
schéma (la spec laissait le choix entre le mode strict et un repli dans le
system prompt, et mentionnait `output_format`, déprécié depuis côté API au
profit d'`output_config.format`), où vit la logique de validation, et comment
la galerie ×N partagée affiche la conformité sans coupler L1 au schéma.

## Décision

Le bloc schéma de `L2Config` porte un toggle « strict » : strict →
`output_config.format` (`type: "json_schema"`, structured outputs GA sur
Haiku 4.5 et Sonnet 4.6, conformité garantie par l'API) ; repli (**défaut**) →
consigne « réponds uniquement avec un objet JSON conforme à ce schéma » dans le
system prompt. Le défaut non-strict est pédagogique : le taux de conformité n'a
quelque chose à montrer que si la conformité n'est pas garantie — le parcours
attendu est « constater la déviation en repli, passer en strict, constater le
20/20 ». Le preset A/B « Schéma : consigne vs strict » fait la comparaison en
deux clics. La validation (ajv, violations traduites en français : champ
manquant, type faux, valeur hors enum, champ non prévu) vit dans `src/schema/`,
module pur sans React ni DOM — réutilisable par le harness T9 (retry sur
non-conformité). `BatchPanel` reçoit une prop `validate` optionnelle : L1 reste
inchangé, le taux de conformité s'ajoute à la synthèse quand elle est fournie.

## Alternatives considérées

### Mode strict seul (output_config sans repli)
- **Résumé** : toujours imposer le schéma via l'API, pas de mode prompt.
- **Pourquoi rejetée** : le taux de conformité serait toujours 20/20 — la
  statistique clé du niveau ne montrerait rien ; l'écart entre *demander* et
  *contraindre* est précisément le mécanisme à rendre visible (invariant n°1).

### Validateur maison (sous-ensemble plat)
- **Résumé** : ~60 lignes pures validant le sous-ensemble v0 sans dépendance.
- **Pourquoi rejetée** : la spec T6 impose ajv ou zod ; ajv valide directement
  le JSON Schema injecté dans la requête — une seule représentation du contrat,
  pas de double implémentation à faire dériver.

### zod
- **Résumé** : construire dynamiquement un schéma zod depuis l'éditeur.
- **Pourquoi rejetée** : exigerait une conversion parallèle champs → zod en
  plus de champs → JSON Schema ; ajv consomme tel quel le JSON Schema affiché
  dans le panneau T4, y compris édité à la main dans l'onglet JSON brut.

### Clé wire `output_format` (telle que dans la spec)
- **Résumé** : injecter le schéma sous la clé `output_format` prévue par spec.md
  et ADR-005.
- **Pourquoi rejetée** : paramètre déprécié côté API au profit
  d'`output_config.format` ; le panneau requête doit montrer le JSON exact et
  correct qui part sur le fil (invariant n°1, ADR-004) — le code généré copié
  tel quel doit rester exécutable.

## Conséquences

- T9 (mode chaos) branchera son retry sur `src/schema/validate.ts` tel quel :
  les violations typées sont prêtes à être ré-injectées dans le message de
  retry.
- T7 (export SKILL.md) injectera le contrat de sortie depuis `SchemaSpec`.
- Le sous-ensemble v0 (un niveau d'objet, types string/number/boolean, enums de
  chaînes) est verrouillé par `fromJsonSchema` avec erreurs explicites — les
  schémas imbriqués restent hors scope, conformément au ticket.
- ajv ajoute ~35 Ko gzippés au bundle (110 Ko au total — budget T10 < 500 Ko
  respecté).
- La validation tourne dans les deux modes : en strict elle confirme la
  garantie de l'API, en repli elle mesure la déviation.

## Implémentation

- Commit T6 — `src/schema/` (`model.ts`, `validate.ts`, 23 tests),
  `levels/l2/` (bloc schéma dans `config.ts` + tests, `SchemaEditor.tsx`,
  preset « consigne vs strict »), `components/validation/ValidationCard.tsx`,
  prop `validate` dans `components/batch/BatchPanel.tsx`, annotation
  `output_config` dans `annotations.fr.ts`, choix d'implémentation et test
  manuel documentés dans le README.

## Notes de révision

—
