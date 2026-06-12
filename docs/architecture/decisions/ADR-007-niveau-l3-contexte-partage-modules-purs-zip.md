# ADR-007 : Niveau L3 — config L2 en contexte partagé, skill/lint/zip en modules purs, export zip sans dépendance

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-004](ADR-004-panneau-requete-corps-unique-codegen-sans-cle.md), [ADR-005](ADR-005-niveau-l2-config-blocs-diff-wire-ab-plafond-global.md), [ADR-006](ADR-006-structured-output-double-mode-validation-ajv.md)

## Contexte

T7 fait « se replier » la configuration du niveau 2 dans un SKILL.md exportable
(formulaire pré-rempli, aperçu en direct, linter pédagogique à 5 règles,
téléchargement en fichier seul et en zip). Trois découpages se posaient : d'où
vient la « config courante » alors que les onglets démontent leurs composants
(l'état L2 était local à son composant, donc perdu au changement de niveau) ;
où vivent la génération du SKILL.md et le linter ; et comment livrer le zip
sans backend ni dépendance (invariant n°5, pas de lib lourde).

## Décision

La config L2 (colonne A) monte dans `L2ConfigContext` (`src/state/`), au-dessus
des onglets : L2 l'édite, L3 la lit pour pré-remplir le formulaire — les
valeurs des blocs sont reprises même éteints (elles survivent à l'extinction,
cf. `BlockState`, ADR-005) — et elle survit aux changements d'onglet. La
génération, le linter et l'archive sont trois modules purs dans `levels/l3/`
(`skill.ts`, `lint.ts`, `zip.ts`), miroir de `l2/config.ts`, testés sans DOM.
Le zip est une archive « store » écrite à la main (~80 lignes, CRC-32, date
DOS fixe — archive reproductible). Le contrat de sortie est en lecture seule
en L3 : il se modifie au niveau 2, « Replier à nouveau » resynchronise (une
seule source de vérité du schéma, dans l'esprit ADR-004). La description du
frontmatter est échappée via `JSON.stringify` — sous-ensemble valide du
scalaire YAML double-quoté, donc YAML valide par construction.

## Alternatives considérées

### Pré-remplir L3 depuis les défauts, sans contexte partagé
- **Résumé** : L3 repart de `defaultL2Config()` au lieu de lire l'état réel.
- **Pourquoi rejetée** : ce ne serait pas « la config courante » exigée par le
  ticket — le geste pédagogique du repli (sa config à soi se condense dans le
  fichier) perdrait son sens.

### jszip (ou autre lib d'archive)
- **Résumé** : dépendance éprouvée pour générer le zip.
- **Pourquoi rejetée** : une dépendance pour un seul usage, contraire à la
  cible légère ; le sous-ensemble « store » du format est trivial (~80 lignes)
  et reste lisible — cohérent avec la finalité pédagogique.

### Éditeur de schéma dupliqué en L3
- **Résumé** : rendre le contrat de sortie éditable dans le formulaire de
  skill, en réutilisant `SchemaEditor`.
- **Pourquoi rejetée** : deux sources de vérité du contrat qui divergent dès
  la première édition ; le renvoi vers le niveau 2 + « Replier à nouveau »
  garde le schéma T6 comme référence unique (alignement T15).

### Génération du SKILL.md dans `src/codegen/`
- **Résumé** : ranger `generateSkillMd` avec les générateurs Python/curl/JS.
- **Pourquoi rejetée** : entrée différente (`SkillForm`, pas `LLMRequest`) —
  le contrat de `src/codegen/` resterait hétérogène et le module serait de
  toute façon couplé au niveau 3 ; le miroir de `l2/config.ts` est plus net.

## Conséquences

- T15 (skill `analyse-verbatim` de référence) part du SKILL.md généré ici —
  même contrat de sortie (schéma T6), même structure de sections.
- Le formulaire L3 reste en état local : les exemples saisis sont perdus au
  changement d'onglet. Dette assumée v0 — à remonter en contexte si gênant en
  atelier.
- Le pattern « état d'un niveau partagé via contexte » est posé : T8/T9
  pourront lire le schéma ou la config courante de la même façon.
- Le linter ne déclenche pas « sans-contre-exemple » quand il n'y a aucun
  exemple (pas de double peine) : chaque règle a un cas de test dédié.
- Zéro dépendance ajoutée ; bundle à 114 Ko gzippés (budget T10 < 500 Ko).

## Implémentation

- Commit T7 — `src/state/L2ConfigContext.tsx`, `src/levels/l3/` (`skill.ts`,
  `lint.ts`, `zip.ts`, `index.tsx`, 28 tests dont snapshot du SKILL.md fil
  rouge), branchement de la colonne A de L2 sur le contexte, animation
  « repli »/« unfold » dans `index.css`, test manuel documenté dans le README.

## Notes de révision

—
