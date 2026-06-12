# Skill `dictionnaire-donnees`

Gabarit de couche sémantique SQL : la structure est imposée, le contenu est
à remplir par chaque PO pour SON périmètre. La skill instruit le modèle :
annoncer les tables utilisées, lecture seule systématique, refus explicite
si une table n'est pas documentée (plutôt qu'halluciner un schéma).

## Installation en 3 lignes

1. Copier ce dossier dans `~/.claude/skills/` (Windows :
   `%USERPROFILE%\.claude\skills\`), puis remplir la section « Dictionnaire
   de données » du `SKILL.md` — modèle rempli dans [EXEMPLE.md](EXEMPLE.md),
   vérification via [CHECKLIST.md](CHECKLIST.md).
2. Ouvrir une session Claude Code.
3. Poser une question métier : « combien de clients… », « écris la requête
   SQL pour… » — la skill se déclenche.

Suite d'évals (5 questions + 1 test de refus, sur le schéma fictif) dans
[`evals/`](evals/).
