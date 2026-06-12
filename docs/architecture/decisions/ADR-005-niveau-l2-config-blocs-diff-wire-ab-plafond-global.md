# ADR-005 : Niveau L2 — config par blocs, diff au niveau wire, A/B sous plafond global

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-003](ADR-003-niveau-l1-runbatch-pur-xn-non-streaming.md), [ADR-004](ADR-004-panneau-requete-corps-unique-codegen-sans-cle.md)

## Contexte

T5 livre le niveau 2 : trois blocs de structuration activables individuellement (system
prompt, température, max_tokens) qui « s'allument » dans le panneau requête, un mode A/B
qui duplique la configuration en deux colonnes avec diff mis en évidence, et le ×N de T3
par colonne avec synthèses comparées. Quatre découpages se posaient : où vivent la
galerie ×N et la synthèse désormais partagées entre L1 et L2, comment représenter les
blocs activables, sur quoi calculer le diff A/B, et comment répartir la concurrence
quand deux lots s'exécutent simultanément.

## Décision

`BatchPanel` et `synthesis` déménagent dans `src/components/batch/` (UI partagée) : les
niveaux restent frères, aucun import inter-niveaux. La configuration L2 est une couche
pure (`levels/l2/config.ts`) : chaque bloc est un `BlockState { enabled, value }` — la
valeur survit à l'extinction du bloc — et `toRequest` projette la config en `LLMRequest`
(`max_tokens` éteint retombe sur le défaut, obligatoire côté API). Le diff A/B est
calculé au niveau wire via `buildRequestBody` (la source unique de vérité d'ADR-004) :
le surlignage correspond exactement au JSON affiché. En mode A/B, le plafond global de
4 appels simultanés (T3) est réparti 2/2 entre les colonnes ; tous les runs L2 sont
non-streaming. L'effet « s'allume » est un remount keyé par version de clé + keyframe
CSS, sans bibliothèque d'animation.

## Alternatives considérées

### Importer BatchPanel/synthesis depuis `levels/l1` dans L2
- **Résumé** : laisser les fichiers en place et créer un import l2 → l1.
- **Pourquoi rejetée** : couple deux niveaux frères ; la convention du projet place
  l'UI partagée dans `src/components/`. ADR-003 anticipait déjà cette réutilisation.

### Diff calculé sur les champs de `L2Config`
- **Résumé** : comparer les blocs (enabled/value) côté configuration.
- **Pourquoi rejetée** : peut diverger de ce que l'utilisateur voit (un prompt modifié
  doit surligner `messages` dans le JSON, pas un champ interne `prompt`) ; passer par
  `buildRequestBody` garantit l'alignement avec le panneau T4 par construction.

### 4 appels simultanés par colonne en A/B
- **Résumé** : garder la concurrence de T3 dans chaque colonne (8 au total).
- **Pourquoi rejetée** : double la pression sur l'API et contredit le critère T3
  « un ×20 se termine sans saturer l'API » ; 2 par colonne garde le plafond global.

### Runs A/B en streaming
- **Résumé** : streamer les exécutions simultanées des deux colonnes.
- **Pourquoi rejetée** : le streaming est le geste pédagogique de L1 ; L2 compare des
  résultats finaux (contenu, longueur, dispersion). Cohérent avec le ×N non-streaming
  d'ADR-003.

## Conséquences

- T6 ajoutera le schéma de sortie comme un bloc de plus : un `BlockState` dans
  `L2Config`, une clé `output_format` qui « s'allume », et le taux de conformité dans
  la synthèse partagée de `components/batch/`.
- Le critère « temp 0 vs 1 en ×10 en deux clics » est tenu : preset puis
  « Exécuter ×10 sur A et B ».
- `AnnotatedJson` porte désormais le flash (versions de clés) et le surlignage diff
  (`diffKeys`) — la dette « source d'annotations en dur » (STATE §6) reste inchangée.
- `RequestPanel` accepte `title` et `diffKeys` : prêt pour toute vue multi-requêtes
  future sans nouveau paramétrage.

## Implémentation

- Commit T5 — `components/batch/` (déplacement git de `BatchPanel`, `synthesis` et son
  test), `levels/l2/` (`config.ts` + 10 tests, `presets.ts`, `ConfigPanel.tsx`,
  `index.tsx`), flash + `diffKeys` dans `components/request/`, keyframe `key-flash`
  dans `index.css`, test manuel documenté dans le README.

## Notes de révision

—
