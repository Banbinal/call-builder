# ADR-008 : Niveau L4 — scénario MCP scripté en données statiques, annotations injectables, schéma du tool aligné T6 par construction

- **Statut** : acceptée
- **Date** : 2026-06-12
- **Décideurs** : Benjamin Julia
- **Liens** : [ADR-004](ADR-004-panneau-requete-corps-unique-codegen-sans-cle.md), [ADR-006](ADR-006-structured-output-double-mode-validation-ajv.md), [ADR-007](ADR-007-niveau-l3-contexte-partage-modules-purs-zip.md)

## Contexte

T8 demande une simulation fidèle des échanges agent ⇄ MCP ⇄ tool — trois
colonnes, un scénario en 5 temps rejouable pas à pas — sans vrai serveur.
Trois découpages se posaient : d'où vient le scénario (données statiques ou
état courant du niveau 2) ; comment annoter du JSON-RPC en réutilisant le
mécanisme T4, alors qu'`AnnotatedJson` importait ses notes en dur (dette
notée à l'ADR-004 et dans STATE §6) ; et comment garantir le critère
d'acceptation « le schéma du tool affiché correspond au schéma défini en T6 ».

## Décision

Le scénario est un fichier de données statique `levels/l4/scenario.ts`
(5 temps, éditable avant l'atelier), dont le `outputSchema` du tool est
construit par `toJsonSchema(defaultSchemaSpec())` — l'alignement T6 est
obtenu par construction et verrouillé par les tests (JSON-RPC 2.0 valide,
paires requête/réponse appariées par id, résultat rejoué conforme au schéma
annoncé, arguments conformes au schéma d'entrée). La source des notes
d'`AnnotatedJson` devient une prop injectable (`annotations`, défaut : les
notes du corps `/v1/messages`) — la dette ADR-004 est soldée ; les notes
JSON-RPC vivent dans `levels/l4/annotations.fr.ts`, miroir de
`annotations.fr.ts` du panneau requête.

## Alternatives considérées

### Lire le schéma courant via `L2ConfigContext`
- **Résumé** : construire le scénario depuis le schéma réel du niveau 2
  (pattern « état partagé » posé par l'ADR-007), pour que l'édition du schéma
  se reflète dans le tool affiché.
- **Pourquoi rejetée** : le résultat rejoué est écrit à la main pour être
  vivant sur le fil rouge ; il cesserait d'être conforme dès la première
  édition du schéma. Le scénario est un script rejoué — la prévisibilité en
  atelier prime, et le bandeau « Simulation » l'assume.

### Dupliquer `AnnotatedJson` pour le JSON-RPC
- **Résumé** : un composant de rendu dédié au niveau 4, avec ses propres notes.
- **Pourquoi rejetée** : deux rendus annotés qui divergent à la première
  évolution ; la dette notée à l'ADR-004 consistait précisément à paramétrer
  la source des notes — c'était le moment de la payer.

### Vrai client/serveur MCP embarqué
- **Résumé** : exécuter réellement le protocole (serveur in-page ou distant).
- **Pourquoi rejetée** : hors scope explicite du ticket pour le v0 ; la
  valeur pédagogique est dans la lisibilité des messages, pas dans leur
  transport réel.

## Conséquences

- La dette « source d'annotations en dur » (STATE §6) est soldée — tout JSON
  annoté peut désormais recevoir son propre jeu de notes.
- `scenario.ts` est la seule chose à éditer pour adapter le contenu avant le
  workshop ; les tests rattrapent une édition qui casserait le JSON-RPC ou la
  conformité du résultat rejoué.
- Si le schéma est édité au niveau 2, le L4 continue d'afficher le schéma T6
  par défaut — écart assumé v0, cohérent avec le statut de simulation.
- Le verbatim fil rouge est extrait en constante (`FIL_ROUGE_VERBATIM`) :
  prompt L1–L2 et argument du `tools/call` partagent la même source.

## Implémentation

- Commit T8 — `src/levels/l4/` (`scenario.ts`, `annotations.fr.ts`,
  `index.tsx`, 7 tests), prop `annotations` sur `AnnotatedJson`,
  `FIL_ROUGE_VERBATIM` dans `config/defaults.ts`.

## Notes de révision

—
