# Skill `analyse-verbatim`

Le fil rouge du workshop, version de référence : c'est la skill que le Call
Builder fait générer en démo au niveau 3 (T7), ici soignée et distribuée aux
participants. Sortie strictement alignée sur le schéma du niveau 2 (T6) —
l'alignement est verrouillé par un test
(`src/levels/l3/reference-skill.test.ts`).

## Installation en 3 lignes

1. Copier ce dossier dans `~/.claude/skills/` (Windows :
   `%USERPROFILE%\.claude\skills\`).
2. Ouvrir une session Claude Code.
3. Coller un retour client avec « analyse ce verbatim : … » — la skill se
   déclenche et répond en JSON conforme au schéma.

Suite d'évals (10 verbatims fictifs annotés, vérité terrain incluse) dans
[`evals/`](evals/).
