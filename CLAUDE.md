# Call Builder — CLAUDE.md

Outil pédagogique mono-page pour Product Owners : comprendre un appel LLM en le
construisant bloc par bloc, sur 4 niveaux progressifs. Backlog complet dans
`spec.md` (un ticket = une session de travail).

## Les 5 invariants du projet

1. **Finalité pédagogique.** Chaque fonctionnalité doit rendre visible un
   mécanisme, pas le masquer. Si un choix d'implémentation cache ce qui se
   passe (requête, streaming, erreurs, retries), c'est le mauvais choix.
2. **Engine pur.** `src/engine/` ne dépend jamais de React, du DOM ou d'un
   storage navigateur. Logique d'appel pure, testée avec Vitest (fetch mocké).
3. **Niveaux L1–L4.** Un niveau pédagogique = un dossier `src/levels/l<n>/`
   exportant un composant `L<n>`. Les identifiants affichés et référencés sont
   toujours `L1`…`L4` (L1 appel nu, L2 structuration, L3 skills, L4 MCP).
4. **Clé API en mémoire uniquement.** La clé vit dans un contexte React, jamais
   dans `localStorage`/`sessionStorage`, jamais dans une URL, jamais en dur.
   Elle est passée à l'engine par injection (`ProviderConfig`).
5. **Cible statique.** Zéro backend dans ce repo : `npm run build` produit un
   bundle servable en `file://`, GitHub Pages ou o2switch (`base: './'` dans
   Vite, routage hash si besoin). Le proxy atelier est un projet séparé (épic 2).

## Stack et conventions

- Vite + React + TypeScript strict + Tailwind CSS v4. Pas de dépendance UI
  lourde (pas de MUI/AntD).
- Arborescence : `src/engine/` (appels LLM), `src/components/` (UI partagée),
  `src/levels/` (un dossier par niveau), `src/codegen/` (génération de code,
  fonctions pures).
- Langue : UI et contenus pédagogiques entièrement en français ; code,
  identifiants et messages de commit en anglais.
- Modèles proposés dans le sélecteur : `claude-haiku-4-5-20251001` (défaut) et
  `claude-sonnet-4-6`, liste centralisée dans un fichier de config.

## Commandes

- `npm run dev` — serveur de développement
- `npm test` — Vitest (run unique) ; `npm run test:watch` en continu
- `npm run build` — type-check (`tsc -b`) puis bundle statique dans `dist/`

## Workflow de session

Un ticket de `spec.md` par session, dans l'ordre des dépendances. En fin de
session, consigner les décisions structurantes via la skill
`architecture-decisions` (ADR) — proposer, ne jamais écrire silencieusement.
