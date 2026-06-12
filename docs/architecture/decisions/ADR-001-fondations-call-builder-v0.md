# ADR-001 : Fondations du Call Builder v0

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : —

## Contexte

Le Call Builder est un outil pédagogique mono-page destiné à des Product Owners
francophones : comprendre un appel LLM en le construisant bloc par bloc, sur 4 niveaux
(L1–L4). Il est développé ticket par ticket avec Claude Code (`spec.md`, un ticket = une
session). Le ticket T0 fixe la stack, l'arborescence et les invariants qui cadrent toutes
les sessions suivantes ; ces choix de fondation méritent d'être consignés avant que le
développement ne s'appuie dessus.

## Décision

Front statique pur : Vite + React + TypeScript strict + Tailwind CSS v4, zéro backend
dans ce repo, build avec `base: './'` pour fonctionner en `file://`, GitHub Pages ou
o2switch. Arborescence imposée : `src/engine/` (logique d'appel pure, sans React, testée
avec Vitest), `src/components/`, `src/levels/l<n>/` (un dossier par niveau, composant
`L<n>`), `src/codegen/` (fonctions pures). UI entièrement en français (code et
identifiants en anglais) ; sélecteur de modèles limité à `claude-haiku-4-5-20251001`
(défaut, économique pour les exécutions ×N) et `claude-sonnet-4-6`, liste centralisée
dans un fichier de config. Les 5 invariants (pédagogie « rendre visible », engine pur,
nommage L1–L4, clé API en mémoire seulement, cible statique) sont encodés dans
`CLAUDE.md`.

## Alternatives considérées

### Next.js (ou autre méta-framework SSR)
- **Résumé** : framework full-stack avec rendu serveur et routage intégré.
- **Pourquoi rejetée** : la cible est un bundle statique servable en `file://` ; le SSR
  n'apporte rien et contredit l'invariant « zéro backend ». Le proxy atelier (épic 2)
  est un projet séparé.

### Kit UI lourd (MUI, AntD)
- **Résumé** : composants riches prêts à l'emploi pour accélérer l'UI.
- **Pourquoi rejetée** : explicitement interdit par le spec (T0) — alourdit le bundle
  (< 500 Ko gzippé visé en T10) et masque les mécanismes que l'outil doit précisément
  rendre visibles.

### UI en anglais, annotations en français
- **Résumé** : interface anglaise, seules les notes pédagogiques en français.
- **Pourquoi rejetée** : le public est PO francophone ; la cohérence de ton entre UI,
  annotations et contenu du workshop prime.

### Trois tiers de modèles (Haiku + Sonnet + Opus)
- **Résumé** : exposer aussi Opus pour montrer l'écart de latence/coût entre tiers.
- **Pourquoi rejetée** : deux modèles suffisent pour la comparaison pédagogique du v0 ;
  Opus renchérit les ×20 du workshop. La liste est extensible via la config.

## Conséquences

- Toutes les sessions suivantes (T1–T10) héritent de ces invariants via `CLAUDE.md` ;
  toute dérogation passera par un nouvel ADR.
- L'engine pur (sans React, fetch mocké) rend la logique d'appel testable hors
  navigateur — prérequis des tests exigés en T1, T4, T9.
- Le choix `base: './'` impose un routage hash (ou équivalent) en T10 pour éviter les
  404 au rechargement.
- TypeScript 6 exige `src/vite-env.d.ts` (types client Vite) pour les imports CSS —
  résolu en T0, à ne pas supprimer.
- Git local seulement pour l'instant ; le dépôt GitHub sera créé en T10 (GitHub Pages).

## Implémentation

- Commit T0 `ae557a6` — scaffold complet, `CLAUDE.md`, test fumigène, shell 4 onglets.
- Backlog : `spec.md` (T0 ; les modèles s'appliquent à partir de T2).

## Notes de révision

—
