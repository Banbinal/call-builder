# ADR-010 : Déploiement statique T10 — routeur hash maison, accueil hors niveaux, Pages via Actions

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-001](ADR-001-fondations-call-builder-v0.md) (base `./`, dette « routage hash en T10 » soldée ici)

## Contexte

T10 met l'outil en ligne avant l'atelier : GitHub Pages en cible par défaut, hébergement
statique o2switch en cible parallèle. Le build `base: './'` choisi en ADR-001 exclut le
routage par chemin (un rechargement sur `/l2` produirait un 404 sur tout serveur statique).
Jusqu'ici les onglets vivaient dans un état React local : onglet perdu au rechargement,
aucun lien profond possible — or la page d'accueil exigée par T10 doit précisément pointer
vers chaque niveau. Enfin, l'accueil oriente le participant mais n'est pas un niveau
pédagogique : il ne doit pas rejoindre la convention `L1`–`L4`.

## Décision

Routeur hash écrit à la main : `src/router.ts` expose deux fonctions pures et testées
(`parsePageHash`, `pageHash`), tout fragment inconnu retombe sur l'accueil, et seul
l'abonnement `hashchange` vit dans `App.tsx` — les onglets deviennent de simples liens
`#/l1`…`#/l4`. L'accueil est une page hors de `levels[]`, rendue par défaut ; les phrases
de présentation des niveaux sont centralisées dans `levels/index.ts` (champ `summary`),
source unique pour les onglets et les cartes de l'accueil. Le déploiement passe par un
workflow GitHub Actions (`.github/workflows/deploy.yml`) — test, build, publication de
`dist/` — déclenché sur push `main` (branche locale renommée `master` → `main`) ; la cible
o2switch est un simple dépôt du contenu de `dist/`, documenté dans le README, sans aucune
réécriture serveur grâce au hash.

## Alternatives considérées

### react-router (ou autre lib de routage)
- **Résumé** : routeur complet avec mode hash intégré.
- **Pourquoi rejetée** : dépendance disproportionnée pour cinq pages statiques ; alourdit
  le bundle et masque un mécanisme (le fragment d'URL) que l'outil peut au contraire
  laisser visible — l'invariant pédagogique prime.

### Conserver les onglets en état React
- **Résumé** : statu quo de T0, aucun routage.
- **Pourquoi rejetée** : onglet perdu à chaque rechargement et aucun lien profond — la
  page d'accueil de T10 ne pourrait pas pointer vers les niveaux, et une URL d'atelier
  « ouvrez L2 » serait impossible.

### Routage par chemin + redirection 404 de GitHub Pages
- **Résumé** : `/l1`…`/l4` réels, avec le hack `404.html` qui redirige vers l'index.
- **Pourquoi rejetée** : spécifique à GitHub Pages — casse `file://` et l'hébergement
  statique o2switch, les deux autres cibles de l'invariant n°5.

### Déploiement par branche `gh-pages` (dist commité)
- **Résumé** : builder en local et pousser `dist/` sur une branche servie par Pages.
- **Pourquoi rejetée** : artefacts de build dans git et risque de divergence entre source
  et bundle ; le workflow Actions garantit au contraire que chaque déploiement sort d'un
  `npm test` + `npm run build` reproductibles.

## Conséquences

- Tout onglet est partageable par URL et survit au rechargement sur les trois cibles
  (`file://`, GitHub Pages, o2switch) — aucun 404 possible, le serveur ne voit jamais le
  fragment.
- `npm test` verrouille chaque déploiement : un test rouge bloque la mise en ligne.
- L'accueil (cartes des niveaux + encart « se connecter ») prépare le terrain de T12 : le
  texte mentionne déjà le proxy atelier comme alternative à la clé personnelle.
- La création du dépôt GitHub et l'activation de Pages (Settings → Pages → Source :
  GitHub Actions) restent une étape manuelle unique, documentée dans le README.
- Le bundle vérifié à T10 : 119,5 Ko gzippé (JS) — large marge sous le plafond de 500 Ko.

## Implémentation

- Commit T10 `67b2916` — routeur, accueil, workflow, doc des deux cibles.
- Commit `9cb3fcf` — consolidation T6–T9 (prérequis à la publication de l'historique).
- Backlog : `spec.md` (T10).

## Notes de révision

—
