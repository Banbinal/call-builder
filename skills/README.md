# Skills du workshop (épic 3)

Trois skills Claude Code distribuées aux participants du workshop. Elles sont
indépendantes de l'application Call Builder (rien ici n'entre dans le bundle),
mais `analyse-verbatim` est alignée par construction sur le schéma T6 — un
test Vitest (`src/levels/l3/reference-skill.test.ts`) casse si elles divergent.

| Skill | Rôle | Ticket |
|---|---|---|
| [`reecriture-ticket`](reecriture-ticket/) | Transformer un ticket flou en ticket exécutable à sections fixes. | T13 |
| [`dictionnaire-donnees`](dictionnaire-donnees/) | Gabarit de couche sémantique SQL, à remplir par chaque PO pour son périmètre. | T14 |
| [`analyse-verbatim`](analyse-verbatim/) | Le fil rouge du workshop, version de référence soignée (schéma T6). | T15 |

## Installation (commune aux trois)

1. Récupérer ce dossier (clone du repo ou téléchargement).
2. Copier le dossier de la skill dans `~/.claude/skills/` (Windows :
   `%USERPROFILE%\.claude\skills\`).
3. Ouvrir une session Claude Code et employer une des formulations citées
   dans la description de la skill — elle se déclenche toute seule.

Chaque skill embarque sa suite d'évals dans son sous-dossier `evals/`
(protocole et critères binaires inclus).
