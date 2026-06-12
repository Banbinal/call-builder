# ADR-011 : Proxy atelier T11 — repo séparé, garde-fous faits main, passthrough SSE brut

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-002](ADR-002-couche-provider-fetch-brut-resultats-types.md) (contrat SSE
  côté client que le passthrough préserve), [ADR-001](ADR-001-fondations-call-builder-v0.md)
  (invariant n°5 : zéro backend dans le repo Call Builder)

## Contexte

Le mode atelier (épic 2) repose sur une clé Anthropic partagée détenue côté serveur, pour
éviter le setup individuel des participants. L'invariant n°5 interdit tout backend dans le
repo Call Builder : le proxy doit vivre ailleurs. La cible d'hébergement est o2switch
(CloudLinux + Phusion Passenger sur LiteSpeed), dont les contraintes sont connues via la
skill interne `o2switch-nodejs-deploy` : Passenger charge l'entrée via `require()` — un
module ESM avec await top-level produit une page blanche sans log. Enfin, le ticket T11
exige un code « lui-même support pédagogique » : minimal, auditable, commenté en français.

## Décision

Le proxy est un projet séparé, `call-builder-proxy` (repo frère du Call Builder), en
CommonJS sans étape de build, avec Express pour seule dépendance ; l'entrée `server.js`
suit le motif `async main()` compatible Passenger. Les garde-fous sont écrits à la main —
CORS restreint par liste d'origines, token d'atelier optionnel, rate limit par IP en
fenêtre glissante mémoire, allowlist de modèles, plafond `max_tokens` forcé — et
l'application est une fabrique `createApp(config)` à injection (fetch, horloge), miroir du
pattern de l'engine, testée sans réseau contre un vrai serveur HTTP éphémère. Le streaming
est un passthrough SSE octet par octet sans retraitement ; les logs sont une ligne JSON de
métadonnées par requête (IP tronquée, modèle, tokens, statut) — jamais le contenu des
prompts, jamais la clé.

## Alternatives considérées

### Middlewares tiers (`cors`, `express-rate-limit`)
- **Résumé** : déléguer CORS et rate limit à des paquets éprouvés.
- **Pourquoi rejetée** : le code du proxy est un support pédagogique — un rate limit en
  quinze lignes lisibles montre le mécanisme qu'un middleware masque ; et chaque dépendance
  ajoute de la surface d'audit pour un service qui détient une clé payante.

### TypeScript + étape de build
- **Résumé** : aligner le proxy sur la stack TS stricte du Call Builder.
- **Pourquoi rejetée** : Passenger charge le JavaScript directement ; zéro build = le code
  déployé est exactement le code lu et audité, et le déploiement cPanel se réduit à
  `npm install --omit=dev`.

### Sous-dossier du repo Call Builder
- **Résumé** : un dossier `proxy/` dans le repo existant, déployé séparément.
- **Pourquoi rejetée** : violerait l'invariant n°5 (« zéro backend dans ce repo ») et
  mélangerait deux cibles de déploiement aux cycles de vie distincts.

### SDK Anthropic côté proxy
- **Résumé** : relayer via `@anthropic-ai/sdk` plutôt qu'en fetch brut.
- **Pourquoi rejetée** : le passthrough brut garantit par construction que le client reçoit
  exactement les mêmes événements SSE qu'en mode direct (le critère d'acceptation central
  de T11) — cohérent avec le choix fetch brut de l'ADR-002 ; un SDK retraiterait le flux.

## Conséquences

- T12 (bascule direct/proxy côté client) peut démarrer : le proxy expose la même route
  `POST /v1/messages` que l'API directe, l'engine n'aura qu'à changer de `baseUrl` — ce que
  `ProviderConfig.mode` et `CodegenOptions.baseUrl` préparent depuis T1/T4.
- Limite connue et documentée : le rate limit est en mémoire, par processus Passenger — si
  plusieurs processus tournent, la limite effective est multipliée d'autant. Acceptable
  pour un atelier.
- Le déploiement réel sur o2switch reste à faire (clé, séquence cPanel documentée dans le
  README du proxy) ; le test streaming contre l'API réelle est documenté mais non exécuté.
- Sécurité vérifiable : `.env` gitignoré, vérification gitleaks documentée, les réponses
  d'erreur sont des JSON contrôlés (jamais de stack trace susceptible d'exposer un secret).

## Implémentation

- Repo `call-builder-proxy` (frère du Call Builder), commit initial `6a1eb6f` — app,
  config, entrée Passenger, 15 tests Vitest, README de déploiement.
- Backlog : `spec.md` (T11).

## Notes de révision

*(aucune)*
