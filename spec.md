# Backlog — Call Builder & outillage Workshop IA

**Comment utiliser ce backlog avec Claude Code :** un ticket = une session. Exécuter T0 en premier (il crée le CLAUDE.md qui cadre toutes les sessions suivantes), puis suivre l'ordre. Chaque ticket est autoporteur : contexte, hypothèses explicites, spec, critères d'acceptation testables, hors-scope. Les dépendances sont indiquées.

**Ordre critique pour le v0 workshop :** T0 → T1 → T2 → T3 → T4 → T5 → T6 → T10. Les tickets T7–T9 et les épics 2–3 peuvent suivre.

---

## ÉPIC 1 — Call Builder v0 (front statique)

### T0 — Initialisation du repo et CLAUDE.md

**Contexte.** Le Call Builder est un outil pédagogique mono-page destiné à des Product Owners. Il sera développé ticket par ticket avec Claude Code ; un CLAUDE.md de qualité conditionne toutes les sessions suivantes.

**Objectif.** Un repo initialisé avec la stack, les conventions, et un CLAUDE.md qui encode les invariants du projet.

**Spécifications.**
- Stack : Vite + React + TypeScript. Zéro backend. Tailwind pour le style. Aucune dépendance UI lourde (pas de MUI/AntD).
- Arborescence : `src/engine/` (logique d'appel LLM, pure, testable), `src/components/` (UI), `src/levels/` (un dossier par niveau pédagogique), `src/codegen/` (génération de code).
- CLAUDE.md contenant : la finalité pédagogique (« chaque fonctionnalité doit rendre visible un mécanisme, pas le masquer »), la règle « engine sans dépendance React, testé avec Vitest », la convention de nommage des niveaux (L1–L4), l'interdiction de stocker la clé API ailleurs qu'en mémoire (jamais localStorage), et la cible de déploiement statique.
- Vitest configuré, un test fumigène qui passe.

**Critères d'acceptation.**
- `npm run dev` sert l'app avec une page « shell » affichant 4 onglets vides L1–L4.
- `npm run build` produit un bundle statique fonctionnel ouvert en `file://` ou serveur statique.
- `npm test` passe.
- CLAUDE.md présent et contenant les 5 invariants listés ci-dessus.

**Hors scope.** Tout contenu des niveaux. Toute logique d'appel.

---

### T1 — Couche provider : appel Anthropic direct (BYOK)

**Contexte.** L'outil exécute de vrais appels LLM depuis le navigateur. L'API Anthropic autorise les appels CORS navigateur via le header `anthropic-dangerous-direct-browser-access: true`. Une bascule vers un proxy interne arrivera plus tard (épic 2) : la couche doit être conçue pour ça dès maintenant.

**Objectif.** Un module `engine/provider.ts` qui exécute un appel `/v1/messages` (streaming et non-streaming) et expose une interface stable.

**Spécifications.**
- Interface : `callLLM(request: LLMRequest, opts: { stream: boolean, onEvent?: (e: SSEEvent) => void }): Promise<LLMResult>`.
- `LLMRequest` couvre : model, system (optionnel), messages, temperature, max_tokens, et un champ libre `extra` pour les options futures (tools, output_format).
- `LLMResult` expose : texte assemblé, usage (tokens in/out), latence totale (ms), latence au premier token (ms), stop_reason, et la liste brute des événements SSE reçus.
- La clé API est passée par injection (jamais lue d'un storage). Configuration provider via un objet `ProviderConfig { mode: 'direct' | 'proxy', baseUrl, apiKey? }`.
- Gestion d'erreurs typée : erreur réseau, 401, 429, 4xx de validation — chaque cas retourne un objet erreur affichable, jamais une exception non catchée dans l'UI.
- Tests Vitest avec fetch mocké : assemblage du streaming, calcul des latences, mapping des erreurs.

**Critères d'acceptation.**
- Un appel non-streaming et un appel streaming réussissent contre l'API réelle avec une clé valide (test manuel documenté dans le README).
- Les événements SSE bruts sont accessibles dans le résultat, dans l'ordre de réception.
- Une clé invalide produit un message d'erreur explicite dans la console de l'app, sans crash.
- Aucune occurrence de `localStorage`/`sessionStorage` dans `src/engine/`.

**Hors scope.** UI. Proxy. Retries/fallback (ça viendra au mode chaos, T9).

---

### T2 — Saisie de clé et barre d'état provider

**Contexte.** Mode BYOK : l'utilisateur colle sa clé en début de session.

**Objectif.** Un composant de configuration : champ clé (masqué), choix du modèle dans une liste courte, indicateur d'état (non configuré / prêt / erreur), bouton « tester la connexion ».

**Spécifications.**
- La clé vit dans un contexte React en mémoire uniquement. Un rechargement de page la perd : c'est voulu, l'afficher comme tel (« votre clé n'est jamais stockée »).
- « Tester la connexion » envoie un appel minimal (max_tokens: 1) et affiche latence + modèle confirmé.
- L'app reste utilisable sans clé : tous les niveaux fonctionnent en mode « génération de code seule », les boutons d'exécution sont désactivés avec un tooltip explicite.

**Critères d'acceptation.**
- Sans clé : l'UI le signale, rien ne crashe, la génération de code (T4) reste active.
- Avec clé valide : l'indicateur passe au vert après test.
- La clé n'apparaît dans aucun storage navigateur ni dans aucune URL (vérifiable via DevTools).

**Hors scope.** Multi-providers. Persistance de configuration.

---

### T3 — Niveau 1 : l'appel nu, le streaming brut et le bouton ×N

**Contexte.** Moment pédagogique central du workshop : faire constater la stochasticité. Dépend de T1–T2.

**Objectif.** L'onglet L1 : un textarea de prompt, un bouton « Exécuter », un panneau streaming, et un bouton « ×N » qui exécute le même prompt N fois et affiche la galerie des résultats.

**Spécifications.**
- Panneau « réponse » : le texte s'assemble en direct pendant le streaming.
- Panneau « flux brut » (repliable) : chaque événement SSE affiché tel quel, horodaté, dans l'ordre — l'utilisateur doit littéralement voir les chunks arriver.
- Métriques affichées après chaque run : latence premier token, latence totale, tokens in/out.
- Bouton ×N : N réglable (5/10/20), exécutions lancées en parallèle avec un plafond de concurrence de 4, barre de progression. Résultats en grille de cartes : extrait du texte, longueur, latence. Un clic ouvre la réponse complète.
- Sous la grille, une ligne de synthèse : « N réponses — longueur min/max/médiane — X formats distincts » (heuristique simple : présence de listes, de JSON, de titres).
- Prompt pré-rempli par défaut : « Analyse ce verbatim client : "Impossible de joindre le service client depuis 3 jours, le chat coupe à chaque fois, je songe à résilier." » (le fil rouge du workshop).

**Critères d'acceptation.**
- Un run unique affiche streaming, flux brut et métriques.
- Un ×20 se termine sans saturer l'API (concurrence plafonnée), et la grille montre des réponses visiblement différentes.
- Une erreur sur un run du lot n'interrompt pas les autres ; la carte concernée affiche l'erreur.

**Hors scope.** System prompt, température, schémas (tout ça est L2).

---

### T4 — Panneau requête annotée + génération de code

**Contexte.** L'outil doit fonctionner aussi comme générateur : on lit la requête au lieu de subir une magie. Transversal aux niveaux, construit dans L1 puis réutilisé.

**Objectif.** Un panneau « Requête » affichant le JSON exact qui part (ou partirait) vers l'API, annoté bloc par bloc, plus un export du code équivalent.

**Spécifications.**
- Le JSON est rendu avec coloration ; chaque clé de premier niveau (model, system, messages, temperature, max_tokens, output_format…) est survolable et affiche une note pédagogique de 2–3 phrases (contenu des notes : rédiger en français, ton accessible PO, stockées dans un fichier `annotations.fr.ts`).
- Le panneau se met à jour en temps réel quand la configuration change, même sans exécuter.
- Export : trois onglets de code généré — Python (SDK anthropic), curl, JavaScript (fetch) — avec bouton copier. Le code généré reflète exactement la configuration courante, la clé remplacée par `VOTRE_CLE_API`.
- Génération implémentée dans `src/codegen/` en fonctions pures testées (entrée : LLMRequest ; sortie : string).

**Critères d'acceptation.**
- Toute modification de la config met à jour JSON et code générés sans exécution.
- Le code Python généré pour une config de test est copié-collé exécutable tel quel (test manuel documenté).
- Les snapshots Vitest des trois générateurs passent.
- Aucune clé réelle ne peut apparaître dans le code généré.

**Hors scope.** Génération LiteLLM (peut venir plus tard en 4e onglet).

---

### T5 — Niveau 2 : structuration de l'appel et comparateur A/B

**Contexte.** On ajoute les blocs un par un et on observe l'effet. Dépend de T3–T4.

**Objectif.** L'onglet L2 : les toggles de structuration, et un mode A/B qui exécute deux configurations côte à côte.

**Spécifications.**
- Toggles/champs activables individuellement : system prompt (textarea), température (slider 0–1 avec valeur affichée), max_tokens. Chaque activation modifie visiblement le panneau requête (T4) — l'ajout du bloc doit « s'allumer » dans le JSON.
- Mode A/B : duplique la configuration en deux colonnes, l'utilisateur modifie un seul paramètre sur B (l'UI met en évidence le diff), exécution simultanée, réponses côte à côte.
- Le ×N de T3 est disponible dans chaque colonne : « 10 runs à température 0 vs 10 runs à température 1 » doit être réalisable en deux clics, avec les deux synthèses comparées.
- Presets pédagogiques chargeables en un clic : « sans/avec system prompt », « temp 0 vs 1 », sur le verbatim fil rouge.

**Critères d'acceptation.**
- Activer le system prompt change le JSON affiché avant toute exécution.
- Le preset « temp 0 vs 1 » en ×10 montre deux distributions de longueurs visiblement différentes dans les synthèses.
- Le diff de configuration entre A et B est mis en évidence et correct.

**Hors scope.** Structured output (T6). Sauvegarde de presets utilisateur.

---

### T6 — Structured output : éditeur de schéma et validation live

**Contexte.** Le contrat de sortie, pivot du niveau 2 et prérequis conceptuel du harness. Dépend de T5.

**Objectif.** Un éditeur de schéma JSON simple, l'injection du schéma dans l'appel, et la validation visuelle de chaque réponse.

**Spécifications.**
- Éditeur deux modes : visuel (liste de champs : nom, type string/number/boolean/enum, requis ou non, description) et JSON brut, synchronisés.
- Schéma par défaut pour le fil rouge : `{ irritant: string, gravite: enum[faible,moyenne,critique], theme: string, verbatim_resume: string }`.
- Le schéma actif est injecté dans la requête (visible dans le panneau T4) et dans le system prompt de repli si le mode strict n'est pas utilisé — documenter le choix d'implémentation retenu dans le README.
- Validation à réception : la réponse est parsée et validée (lib : ajv ou zod). Carte verte si conforme ; rouge avec la liste des violations (champ manquant, type faux, valeur hors enum) sinon.
- En ×N : la synthèse affiche le taux de conformité (« 19/20 conformes ») — c'est la statistique pédagogique clé du niveau 2.

**Critères d'acceptation.**
- Une réponse conforme passe au vert, une réponse altérée à la main (mode test) liste précisément ses violations.
- Le ×20 avec schéma affiche un taux de conformité.
- L'éditeur visuel et le JSON brut restent synchronisés dans les deux sens.

**Hors scope.** Schémas imbriqués profonds (un niveau d'objet suffit pour le v0). Retry automatique sur non-conformité (T9).

---

### T7 — Niveau 3 : export SKILL.md et linter pédagogique

**Contexte.** Montrer la configuration du niveau 2 « se replier » dans une skill. Dépend de T6.

**Objectif.** L'onglet L3 : un formulaire de skill pré-rempli depuis la config courante, un aperçu du SKILL.md généré, un export, et un linter.

**Spécifications.**
- Champs : nom (kebab-case forcé), description (avec aide : « décrivez QUAND l'utiliser, avec les mots qu'emploierait l'utilisateur »), instructions (pré-remplies depuis le system prompt L2), contrat de sortie (injecté depuis le schéma T6), exemples (paires entrée/sortie, dont au moins un contre-exemple encouragé).
- Génération du SKILL.md avec frontmatter YAML conforme, aperçu en direct, téléchargement (fichier seul et zip).
- Linter pédagogique (règles pures, testées) : description sans mot déclencheur détectable, instructions sans exemple, absence de contre-exemple, description de moins de 80 caractères, nom non kebab-case. Chaque alerte avec une explication d'une phrase.
- Animation ou transition visuelle « repli » : la config L2 se condense dans le fichier (simple mais visible — c'est le geste pédagogique du niveau).

**Critères d'acceptation.**
- Une config L2 complète produit un SKILL.md valide téléchargeable.
- Le linter déclenche chacune de ses 5 règles sur des cas de test dédiés.
- Le SKILL.md généré pour le fil rouge verbatim est utilisable tel quel dans Claude Code (test manuel documenté).

**Hors scope.** Exécution de la skill dans l'outil. Bibliothèque de skills partagée.

---

### T8 — Niveau 4 : simulateur d'échanges MCP (maquette interactive)

**Contexte.** Pour le v0, le niveau 4 est une simulation visuelle fidèle, pas un vrai serveur. L'objectif est de rendre lisibles les échanges agent ⇄ MCP ⇄ tool.

**Objectif.** L'onglet L4 : un scénario rejouable pas à pas montrant un agent qui découvre le tool « analyse-verbatim » et l'invoque.

**Spécifications.**
- Trois colonnes : Agent, Protocole (les messages JSON-RPC affichés tels quels), Tool.
- Scénario scripté en 5 temps, avancement par clic : (1) `tools/list` — découverte, (2) la réponse avec le schéma du tool (celui du T6), (3) la décision de l'agent (texte court expliquant pourquoi il choisit ce tool), (4) `tools/call` avec les arguments, (5) le résultat structuré qui remonte.
- Chaque message JSON-RPC est annoté au survol (réutiliser le mécanisme T4).
- Données du scénario dans un fichier `scenario.ts` éditable, pour pouvoir adapter le contenu avant le workshop.
- Bandeau honnête : « Simulation — le protocole affiché est réel, l'exécution est rejouée ».

**Critères d'acceptation.**
- Le scénario se déroule pas à pas, dans les deux sens (précédent/suivant).
- Les messages affichés sont du JSON-RPC MCP syntaxiquement valide.
- Le schéma du tool affiché correspond au schéma défini en T6.

**Hors scope.** Vrai client/serveur MCP. Connexion à un agent réel.

---

### T9 — Mode chaos : retry et fallback rendus visibles

**Contexte.** Le harness démontré dans l'outil plutôt que sur un slide. Dépend de T6.

**Objectif.** Un panneau « chaos » dans L2 : injecter des pannes simulées et voir le harness réagir, événement par événement.

**Spécifications.**
- Wrapper `engine/harness.ts` autour du provider : retry sur non-conformité de schéma (max 2, avec ré-injection des violations dans le message de retry) et fallback de modèle sur erreur provider (chaîne configurable de 2 modèles). Implémentation pure, testée avec provider mocké.
- Toggles de chaos : « forcer une sortie malformée au 1er essai » (interception de la réponse et corruption contrôlée), « simuler provider down » (échec forcé du 1er modèle).
- Timeline visuelle de l'exécution : tentative 1 (rouge, violations listées) → retry (l'écart envoyé au modèle visible) → tentative 2 (verte) ; ou modèle A en échec → bascule modèle B. Chaque étape horodatée.
- Compteur de coût pédagogique : « cette exécution fiabilisée a coûté 2 appels au lieu d'1 » — le trade-off du harness affiché.

**Critères d'acceptation.**
- Chaos « sortie malformée » : la timeline montre échec → retry → succès, sans intervention.
- Chaos « provider down » : la timeline montre la bascule de modèle.
- Les tests unitaires du harness couvrent : succès direct, succès après retry, épuisement des retries, fallback, échec total.

**Hors scope.** Guardrails d'entrée (injection) — mentionné dans l'UI comme « non simulé ici ». Circuit breaker.

---

### T10 — Build, déploiement statique et page d'accueil atelier

**Contexte.** L'outil doit être en ligne avant la session, à une URL simple.

**Objectif.** Déploiement statique reproductible (GitHub Pages en cible par défaut, compatible hébergement statique o2switch), et une page d'accueil qui oriente.

**Spécifications.**
- `npm run build` + workflow GitHub Actions de déploiement Pages sur push main. Documentation parallèle dans le README pour un dépôt des fichiers statiques sur o2switch.
- Page d'accueil : les 4 niveaux présentés en une phrase chacun, lien vers chaque onglet, encart « configurer sa clé » ou « demander l'accès au proxy interne ».
- Vérifier le routage statique (pas de 404 sur rechargement : hash router ou équivalent).
- Lighthouse : pas d'erreur console au chargement, bundle < 500 Ko gzippé hors fonts.

**Critères d'acceptation.**
- L'URL publique sert l'app, tous les onglets fonctionnent après rechargement de page.
- Le README documente les deux cibles de déploiement.

**Hors scope.** Domaine personnalisé. Analytics.

---

## ÉPIC 2 — Proxy o2switch (mode atelier sans clé individuelle)

### T11 — Proxy Express : clé serveur, rate limit, streaming

**Contexte.** Pour le workshop, une clé partagée détenue côté serveur évite le setup individuel. Hébergement : o2switch, application Node.js (suivre la skill interne de déploiement o2switch documentée par ailleurs).

**Objectif.** Un proxy minimal et auditable (~100 lignes hors config) relayant vers l'API Anthropic.

**Spécifications.**
- Express. Une route `POST /v1/messages` qui relaie corps et streaming (passthrough SSE) vers Anthropic en ajoutant la clé serveur (variable d'environnement, jamais en dur).
- Garde-fous : allowlist de modèles (variable d'env), plafond `max_tokens` forcé (ex. 2000), rate limit par IP (ex. 30 req/10 min), CORS restreint à l'origine du Call Builder (variable d'env), petit token d'atelier optionnel en header `x-workshop-token`.
- Logs : timestamp, IP tronquée, modèle, tokens consommés, statut. Jamais le contenu des prompts.
- Endpoint `GET /health`.
- Le code est lui-même un support pédagogique : commenté en français, section par section (« pourquoi la clé ne va jamais côté client »).

**Critères d'acceptation.**
- Un appel streaming via le proxy se comporte exactement comme l'appel direct (mêmes événements SSE côté client).
- Un modèle hors allowlist est rejeté en 403 avec message explicite.
- Le rate limit déclenche en 429 après dépassement (test scripté fourni).
- Aucun secret dans le repo (vérification type gitleaks documentée).

**Hors scope.** Comptes utilisateurs. Facturation par participant. Persistance des logs au-delà du fichier.

---

### T12 — Bascule client direct/proxy

**Contexte.** Dépend de T1 (l'interface ProviderConfig l'a prévu) et T11.

**Objectif.** Dans la barre d'état (T2), un sélecteur de mode : « Ma clé (BYOK) » / « Proxy atelier (URL + token) », avec dégradation gracieuse.

**Spécifications.**
- Mode proxy : champ URL pré-rempli (variable de build), champ token optionnel. Le test de connexion (T2) fonctionne dans les deux modes.
- Si le proxy répond 429/403, message clair non technique (« quota atelier atteint, réessayez dans quelques minutes »).
- Le panneau requête (T4) reflète le mode : l'URL cible change, et une annotation explique la différence (« en mode proxy, la clé vit côté serveur — voilà pourquoi »).

**Critères d'acceptation.**
- Les niveaux L1–L2 fonctionnent intégralement dans les deux modes.
- La bascule en cours de session ne perd pas la configuration des niveaux.

**Hors scope.** Multi-proxys. Découverte automatique.

---

## ÉPIC 3 — Skills du workshop

### T13 — Skill `reecriture-ticket` (ticket flou → ticket exécutable)

**Contexte.** Support de l'exercice final du workshop : chaque PO réécrit un de ses tickets. La skill encode la méthode.

**Objectif.** Une skill Claude Code installable, avec sa suite d'évals.

**Spécifications.**
- SKILL.md : déclencheurs (« réécris ce ticket », « rends ce ticket exécutable », « prépare ce ticket pour Claude Code »…), méthode en étapes : (1) lister les hypothèses implicites du ticket et les expliciter ou les marquer « à trancher », (2) identifier les cas limites absents, (3) réécrire en sections fixes : Contexte / Objectif / Spécifications / Critères d'acceptation testables / Hors scope, (4) signaler en fin de réponse les questions restées ouvertes plutôt que d'inventer des réponses.
- Contrainte explicite dans la skill : ne jamais inventer une exigence métier non déductible du ticket d'origine — toute hypothèse ajoutée doit être marquée `[HYPOTHÈSE]`.
- Suite d'évals : 5 tickets flous de référence (rédigés dans le ticket, domaine télécom générique) avec, pour chacun, 3 critères binaires (ex. « les hypothèses inventées sont marquées », « les critères d'acceptation sont testables », « le hors-scope est présent »).
- Un README d'installation en 3 lignes pour les POs.

**Critères d'acceptation.**
- La skill se déclenche sur les formulations listées (test manuel sur 5 phrasés).
- Les 5 évals passent leurs critères sur une exécution de référence.
- Aucune exigence inventée non marquée sur les cas de test.

**Hors scope.** Intégration Jira/outil de ticketing.

---

### T14 — Skill `dictionnaire-donnees` (gabarit de couche sémantique SQL)

**Contexte.** Le cas d'usage « parler à sa base SQL » échoue sans sémantique métier des tables. Cette skill est un gabarit que chaque PO remplit pour SON périmètre.

**Objectif.** Une skill-gabarit : structure imposée, contenu à compléter, avec un exemple rempli fictif.

**Spécifications.**
- Structure du dictionnaire par table : nom, rôle métier en une phrase, colonnes clés avec signification métier (pas le type SQL — le sens), pièges connus (valeurs magiques, colonnes dépréciées, jointures obligatoires), exemples de questions métier → requête attendue (3 minimum).
- La skill instruit le modèle : toujours annoncer les tables utilisées, refuser de répondre si une table demandée n'est pas dans le dictionnaire (plutôt qu'halluciner un schéma), toujours préciser que l'accès est en lecture.
- Exemple complet fourni sur un schéma fictif de 4 tables (clients, contrats, offres, tickets_support) — fictif, sans référence à un schéma interne réel.
- Checklist de remplissage pour le PO (10 points).

**Critères d'acceptation.**
- Sur le schéma fictif, 5 questions métier de test produisent des requêtes correctes en lecture seule.
- Une question sur une table absente du dictionnaire produit un refus explicite, pas une invention.

**Hors scope.** Le serveur MCP SQL lui-même (projet séparé, hors workshop v0). Connexion à une base réelle.

---

### T15 — Skill `analyse-verbatim` (le fil rouge, version finale)

**Contexte.** C'est la skill que le Call Builder génère en démo (T7). Cette version-ci est la version de référence soignée, distribuée aux participants.

**Objectif.** La skill complète avec sa grille et ses évals, alignée sur le schéma du T6.

**Spécifications.**
- Méthode : identifier l'irritant principal (un seul), classer la gravité (faible/moyenne/critique avec définitions opérationnelles de chaque niveau), identifier le thème dans une liste fermée fournie (8 thèmes télécom génériques), produire la sortie au schéma exact du T6.
- Définitions de gravité rédigées pour être discriminantes (la frontière moyenne/critique est le cas difficile : la documenter avec 2 exemples de chaque côté).
- Évals : 10 verbatims fictifs annotés (vérité terrain dans le ticket), critère binaire par champ, score attendu ≥ 8/10 sur gravité et 10/10 sur conformité de schéma.
- Verbatims fictifs uniquement — aucun verbatim client réel dans le repo.

**Critères d'acceptation.**
- 10/10 de conformité de schéma sur la suite d'évals.
- ≥ 8/10 d'accord avec la vérité terrain sur la gravité.
- La sortie est strictement identique en structure à celle du Call Builder T6.

**Hors scope.** Branchement sur un flux réel de verbatims. Multi-langue.

---

## Dépendances en un coup d'œil

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 ─┬→ T7 → (T15 aligné sur T6)
                                   ├→ T8
                                   ├→ T9
                                   └→ T10 (déployable dès T6)
T11 → T12 (nécessite T1)
T13, T14 : indépendants, à tout moment
```

**Chemin critique workshop : T0–T6 + T10.** Tout le reste est de l'enrichissement.
