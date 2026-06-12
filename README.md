# Call Builder

Outil pédagogique mono-page pour Product Owners : comprendre un appel LLM en le
construisant bloc par bloc, sur 4 niveaux (L1 appel nu → L2 structuration →
L3 skills → L4 MCP). Front statique, zéro backend, mode BYOK (la clé API n'est
jamais stockée).

## Démarrer

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests Vitest
npm run build    # bundle statique dans dist/ (fonctionne en file://)
```

Le backlog complet est dans [spec.md](spec.md), les conventions du projet dans
[CLAUDE.md](CLAUDE.md).

## Déploiement (T10)

Le build est entièrement statique (`base: './'` dans Vite, routage par hash
`#/l1`…`#/l4`) : il fonctionne tel quel en `file://`, sous un sous-chemin
GitHub Pages, ou sur n'importe quel hébergement statique. Aucune réécriture
d'URL côté serveur n'est nécessaire — le rechargement d'un onglet ne peut pas
produire de 404, le serveur ne voit jamais le fragment.

### Cible 1 — GitHub Pages (par défaut)

Le workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
teste, builde et publie `dist/` à chaque push sur `main`. Mise en place, une
seule fois :

1. Créer le dépôt GitHub et pousser la branche `main` :

   ```bash
   gh repo create call-builder --public --source . --push
   ```

2. Dans **Settings → Pages**, choisir **Source : GitHub Actions**.
3. Pousser (ou relancer le workflow via **Actions → deploy-pages → Run
   workflow**). L'app est servie sur
   `https://<compte>.github.io/<repo>/`.

### Cible 2 — o2switch (hébergement statique)

Pas de Node ni de Passenger nécessaires ici : seuls les fichiers de `dist/`
sont déposés.

1. `npm run build` en local.
2. Via le gestionnaire de fichiers cPanel (ou FTP/SFTP), copier **le contenu**
   de `dist/` dans le dossier cible — `public_html/` pour la racine du
   domaine, ou n'importe quel sous-dossier (`public_html/call-builder/`) :
   les chemins relatifs du build s'accommodent des deux.
3. C'est tout — l'app est servie à l'URL correspondante. En cas de mise à
   jour, re-déposer le contenu de `dist/` (les noms de fichiers hashés
   évitent tout problème de cache).

## Test manuel de la couche provider (T1)

La couche d'appel (`src/engine/provider.ts`) s'appelle directement depuis la
console du navigateur, sans UI. Lancer `npm run dev`, ouvrir l'app, puis dans
la console DevTools :

```js
const { createProvider } = await import('/src/engine/index.ts')
const provider = createProvider({
  mode: 'direct',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-…', // votre clé — collée ici, jamais stockée
})

const request = {
  model: 'claude-haiku-4-5-20251001',
  messages: [{ role: 'user', content: 'Dis bonjour en une phrase.' }],
  max_tokens: 100,
}

// Appel non-streaming
await provider.callLLM(request, { stream: false })

// Appel streaming : chaque événement SSE est loggé à l'arrivée
await provider.callLLM(request, { stream: true, onEvent: (e) => console.log(e.event, e) })
```

Vérifications attendues :

- les deux appels retournent `{ ok: true, text, usage, totalLatencyMs, … }` ;
- en streaming, `events` contient les événements SSE bruts dans l'ordre de
  réception (`message_start` → `content_block_delta`… → `message_stop`) et
  `firstTokenLatencyMs < totalLatencyMs` ;
- avec une clé invalide, le résultat est `{ ok: false, error: { type: 'auth',
  message: 'Clé API invalide…' } }` — message explicite, aucun crash.

## Vérifier que la clé n'est jamais stockée (T2)

La clé saisie dans la barre d'état vit uniquement dans un contexte React en
mémoire. Pour le vérifier via DevTools après avoir collé une clé et testé la
connexion :

- **Application → Local Storage / Session Storage** : aucune entrée ;
- **barre d'adresse** : la clé n'apparaît dans aucune URL ;
- **rechargement de la page** : la clé est perdue, l'indicateur repasse à
  « non configuré » — c'est le comportement voulu.

## Test manuel du niveau 1 (T3)

Avec une clé valide configurée, sur l'onglet **L1 — L'appel nu** (prompt fil
rouge pré-rempli) :

1. **Run unique** — cliquer « Exécuter » : le texte s'assemble en direct dans
   le panneau Réponse ; le panneau repliable « Flux brut » liste chaque
   événement SSE horodaté (`message_start` → `content_block_delta`… →
   `message_stop`) ; les métriques (premier token, latence totale, tokens
   entrée/sortie) s'affichent à la fin.
2. **×20** — sélectionner 20 puis « Exécuter ×20 » : la barre de progression
   avance, jamais plus de 4 appels simultanés (visible dans l'onglet Réseau
   des DevTools), et la grille montre des réponses visiblement différentes.
   La ligne de synthèse donne longueurs min/médiane/max et le nombre de
   formats distincts. Un clic sur une carte ouvre la réponse complète.
3. **Erreur isolée** — couper le réseau pendant un ×N : les runs en échec
   affichent leur carte d'erreur rouge, les autres se terminent normalement.

## Test manuel du panneau requête et du code généré (T4)

Sur l'onglet **L1**, sans clé configurée (le panneau fonctionne en mode
« génération de code seule ») :

1. **Temps réel** — modifier le prompt ou le modèle : l'onglet « JSON annoté »
   et les trois onglets de code se mettent à jour immédiatement, sans
   exécution.
2. **Annotations** — survoler chaque clé de premier niveau du JSON (`model`,
   `max_tokens`, `messages`) : la note pédagogique correspondante s'affiche
   dans l'encart sous le JSON.
3. **Python exécutable tel quel** — onglet « Python », bouton « Copier »,
   puis :

   ```bash
   pip install anthropic
   export ANTHROPIC_API_KEY=sk-ant-…   # ou remplacer VOTRE_CLE_API dans le code
   python le_code_copie.py
   ```

   Le script doit imprimer la réponse du modèle sans aucune modification autre
   que la clé. Vérifié avec la config par défaut (Haiku, prompt fil rouge) et
   avec un prompt contenant apostrophes et guillemets.
4. **Aucune clé réelle dans le code** — coller une clé valide dans la barre
   d'état puis rouvrir les onglets de code : ils affichent toujours
   `VOTRE_CLE_API` (les générateurs ne reçoivent jamais la clé).

## Test manuel du niveau 2 (T5)

Sur l'onglet **L2 — Structurer l'appel** :

1. **Le bloc « s'allume »** — sans clé ni exécution, cocher « System prompt » :
   la clé `system` apparaît dans le JSON du panneau Requête avec un flash.
   Même chose pour la température (slider 0–1) et `max_tokens`.
2. **Preset « Température 0 vs 1 » en deux clics** (clé valide requise) —
   cliquer le preset, puis « Exécuter ×10 sur A et B » : les deux galeries se
   remplissent simultanément (4 appels en parallèle au total, répartis), et
   les deux lignes de synthèse montrent des distributions de longueurs
   visiblement différentes (temp 1 disperse plus que temp 0).
3. **Diff A/B** — la ligne « Différences A → B » liste exactement le paramètre
   modifié ; le bloc et la ligne JSON concernés sont surlignés en ambre dans
   les deux colonnes. Modifier un second paramètre sur B l'ajoute au diff.
4. **Preset « Sans / avec system prompt »** — exécuter A et B : la réponse B
   (cadrée par le system prompt) est nettement plus courte et se termine par
   une action recommandée.

## Structured output : choix d'implémentation (T6)

Le bloc « Schéma de sortie » de L2 injecte le schéma de deux façons, au choix
(toggle « Mode strict ») :

- **Mode strict** — le schéma part dans `output_config.format`
  (`type: "json_schema"`), la fonctionnalité *structured outputs* de l'API
  Anthropic (GA sur Haiku 4.5 et Sonnet 4.6, sans header beta ; l'ancien
  paramètre `output_format` est déprécié). La conformité est **garantie par
  l'API**.
- **Mode repli (défaut)** — le schéma est **demandé** dans le system prompt
  (consigne « réponds uniquement avec un objet JSON conforme à ce schéma »),
  ajouté après le system prompt utilisateur s'il est actif. Le modèle peut
  dévier — c'est voulu.

Le défaut est le mode repli pour une raison pédagogique : le taux de
conformité du ×N (« 17/20 conformes ») n'a quelque chose à montrer que si la
conformité n'est pas garantie. Le parcours attendu du workshop : constater la
déviation en repli, passer en strict, constater le 20/20 — c'est la différence
entre *demander* et *contraindre*. Le preset A/B « Schéma : consigne vs
strict » fait cette comparaison en deux clics.

La validation à réception (lib **ajv**, module pur `src/schema/`) tourne dans
les deux modes : en strict elle confirme la garantie, en repli elle mesure la
déviation. Une réponse non parsable en JSON (texte autour, bloc de code) est
comptée non conforme : le contrat demandait du JSON seul.

## Test manuel du structured output (T6)

Sur l'onglet **L2**, sans clé (sauf étape 4) :

1. **Le bloc « s'allume »** — cocher « Schéma de sortie » : la consigne
   apparaît dans `system` (mode repli). Cocher « Mode strict » : `system`
   disparaît et `output_config` s'allume dans le JSON, avec sa note au survol.
2. **Synchronisation des deux éditeurs** — ajouter un champ dans l'éditeur
   visuel puis ouvrir « JSON brut » : il y figure. Modifier le JSON brut
   (renommer un champ, ajouter une valeur d'enum) puis revenir au visuel :
   la modification y est. Un JSON hors sous-ensemble (objet imbriqué) affiche
   une erreur explicite sans casser l'éditeur.
3. **Mode test** — ouvrir « Mode test — altérer une réponse à la main » :
   l'exemple pré-rempli est vert. Supprimer un champ, mettre un nombre dans
   `irritant`, mettre `gravite: "haute"` : chaque violation est listée
   précisément (champ manquant, type faux, valeur hors enum).
4. **Taux de conformité** (clé valide requise) — preset « Schéma : consigne
   vs strict », « Exécuter ×20 sur A et B » : cartes vertes/rouges, et les
   synthèses affichent les deux taux — B (strict) doit être à 20/20.

## Skills du workshop (T13–T15)

Les trois skills distribuées aux participants vivent dans [skills/](skills/)
(hors bundle — contenu statique uniquement) : `reecriture-ticket` (T13),
`dictionnaire-donnees` (T14) et `analyse-verbatim` (T15, le fil rouge en
version de référence). Chaque skill embarque son README d'installation en
3 lignes et sa suite d'évals avec protocole et critères binaires dans son
sous-dossier `evals/`.

L'alignement de `analyse-verbatim` sur le Call Builder est vérifié à chaque
`npm test` (`src/levels/l3/reference-skill.test.ts`) : schéma du contrat
strictement égal au schéma T6, structure de sections de l'export L3 (T7),
zéro alerte du linter pédagogique, vérités terrain des évals conformes au
schéma.

## Test manuel du niveau 3 (T7)

Sur l'onglet **L3 — Skills**, sans clé (tout fonctionne hors exécution) :

1. **Le repli** — sur L2, activer le system prompt et le modifier, puis passer
   sur L3 : la carte « Votre configuration du niveau 2 » liste les blocs
   (actifs en indigo). Cliquer « Replier dans une skill ↓ » : la carte se
   condense et le formulaire pré-rempli se déplie — nom `analyse-verbatim`,
   instructions reprenant le system prompt L2, contrat de sortie reprenant le
   schéma T6, un exemple et un contre-exemple sur le fil rouge.
2. **Le linter** — le formulaire pré-rempli est sans alerte. Déclencher chaque
   règle : nom avec majuscules ou espaces (le champ force le kebab-case à la
   saisie — coller `Analyse Verbatim` donne `analyse-verbatim`), description
   raccourcie sous 80 caractères, description sans guillemets ni « quand »,
   suppression de tous les exemples, puis du seul contre-exemple. Chaque
   alerte affiche son explication d'une phrase.
3. **L'aperçu et l'export** — toute modification du formulaire met à jour
   l'aperçu immédiatement. « Télécharger SKILL.md » donne le fichier seul ;
   « Télécharger le .zip » donne `analyse-verbatim.zip` contenant
   `analyse-verbatim/SKILL.md` (archive sans compression, générée sans
   dépendance — lisible par tout extracteur).
4. **Skill utilisable telle quelle dans Claude Code** — dézipper dans
   `~/.claude/skills/`, ouvrir une session Claude Code et demander
   « analyse ce verbatim : "…" » : la skill se déclenche (frontmatter
   `name`/`description` conforme) et la réponse respecte le contrat JSON du
   schéma T6. Vérifié avec le SKILL.md par défaut du fil rouge.
