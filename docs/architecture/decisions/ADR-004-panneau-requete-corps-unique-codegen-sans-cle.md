# ADR-004 : Panneau requête T4 — corps de requête source unique, codegen sans clé par construction

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-002](ADR-002-couche-provider-fetch-brut-resultats-types.md), [ADR-003](ADR-003-niveau-l1-runbatch-pur-xn-non-streaming.md)

## Contexte

T4 livre le panneau « Requête » — le JSON exact qui part (ou partirait) vers l'API,
annoté clé par clé, mis à jour en temps réel sans exécution — et trois générateurs de
code équivalent (Python SDK, curl, JavaScript fetch). Trois découpages se posaient :
qui construit le JSON affiché et exporté, comment garantir qu'aucune clé réelle ne peut
apparaître dans le code généré, et comment afficher les notes pédagogiques au survol.

## Décision

`buildRequestBody(LLMRequest, stream)` est exporté de l'engine (`provider.ts`) : la même
fonction construit le corps envoyé sur le fil par `callLLM`, le JSON affiché dans le
panneau et le corps sérialisé dans les trois codes générés — une seule source de vérité,
le panneau ne peut pas mentir. Les générateurs (`src/codegen/`) sont des fonctions pures
`(LLMRequest, CodegenOptions?) → string` qui ne reçoivent jamais la clé API : le
placeholder `VOTRE_CLE_API` est écrit en dur, la garantie « aucune clé réelle dans le
code généré » tient par construction, pas par filtrage. Les annotations
(`components/request/annotations.fr.ts`) s'affichent dans un encart fixe sous le JSON
(le survol d'une clé de premier niveau sélectionne la note), pas en infobulle flottante.

## Alternatives considérées

### Corps de requête dupliqué dans le codegen et le panneau
- **Résumé** : chaque consommateur (UI, générateurs) reconstruit le JSON de son côté.
- **Pourquoi rejetée** : risque de dérive silencieuse entre ce qui est affiché et ce qui
  est réellement envoyé — l'exact opposé de la finalité pédagogique (invariant n°1).

### Passer la clé aux générateurs et la remplacer à la sortie
- **Résumé** : signature recevant `ProviderConfig`, remplacement de la clé par le
  placeholder avant retour.
- **Pourquoi rejetée** : un filtre peut échouer (oubli, nouveau champ) ; une signature
  qui ne reçoit pas le secret ne peut pas le fuiter. Le critère d'acceptation devient
  une propriété du type, vérifiable d'un coup d'œil.

### Infobulle CSS flottante au survol des clés
- **Résumé** : tooltip positionnée en absolu à côté de la clé survolée.
- **Pourquoi rejetée** : rognée par les conteneurs `overflow-x-auto` du `<pre>`,
  inutilisable au tactile, et trop étroite pour des notes de 2–3 phrases. L'encart fixe
  sous le JSON (`aria-live`) évite les trois problèmes sans dépendance.

## Conséquences

- T5 : activer un toggle (system, température) modifie `LLMRequest`, donc le JSON et les
  trois codes « s'allument » sans travail supplémentaire — le panneau dérive entièrement
  de la requête.
- T12 (mode proxy) : `baseUrl` traverse déjà le panneau et le codegen (`CodegenOptions`,
  kwarg `base_url` côté Python) ; l'URL affichée et le code généré suivront la bascule.
- T8 réutilisera le mécanisme d'annotation, mais `AnnotatedJson` importe
  `annotations.fr.ts` en dur — il faudra paramétrer la source des notes (dette notée
  dans STATE §6).
- Le code généré est non-streaming, cohérent avec le ×N (ADR-003) : le streaming se
  montre dans l'app, le code exporté reste le plus simple exécutable.
- `RequestPanel` vit dans `src/components/request/` (UI partagée), construit dans L1 et
  réutilisé tel quel par les niveaux suivants.

## Implémentation

- Commit T4 — `engine/provider.ts` (`buildRequestBody` exporté), `src/codegen/`
  (3 générateurs, 18 tests dont 9 snapshots), `components/request/` (`RequestPanel`,
  `AnnotatedJson`, `annotations.fr.ts`), intégration L1, test manuel documenté dans le
  README.

## Notes de révision

- 2026-06-12 — la dette « source d'annotations en dur » est soldée par
  [ADR-008](ADR-008-niveau-l4-scenario-mcp-statique-annotations-injectables.md) :
  la source des notes d'`AnnotatedJson` est devenue une prop injectable (T8).
