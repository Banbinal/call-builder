# Évals — `analyse-verbatim`

Dix verbatims **fictifs** annotés, vérité terrain dans
[verbatims.json](verbatims.json) (champ `attendu`, avec la `justification`
de chaque gravité). Les cas 2, 3 et 6 testent la frontière moyenne/critique
documentée dans la skill.

## Protocole

1. Installer la skill (cf. [README](../README.md)), ouvrir Claude Code.
2. Pour chaque verbatim : « Analyse ce verbatim : "…" ».
3. Noter chaque champ de la réponse en binaire :

| Champ | Critère binaire |
|---|---|
| Conformité de schéma | La réponse est un objet JSON seul, valide contre le schéma du contrat (4 champs requis, `gravite` dans l'enum, aucun champ en plus). |
| `gravite` | Égale à la vérité terrain. |
| `theme` | Égal à la vérité terrain (intitulé exact de la liste fermée). |
| `irritant` | Désigne le même problème que la vérité terrain (jugement humain, reformulation acceptée). |
| `verbatim_resume` | Une phrase, factuelle, fidèle au verbatim. |

## Scores attendus (critères d'acceptation T15)

- **Conformité de schéma : 10/10** — vérifiable automatiquement (le schéma
  du contrat est exactement celui du Call Builder T6 ; coller chaque réponse
  dans le « mode test » du niveau 2 donne le verdict).
- **Gravité : ≥ 8/10** d'accord avec la vérité terrain.

La structure de sortie est strictement identique à celle du Call Builder T6 :
le test `src/levels/l3/reference-skill.test.ts` vérifie l'alignement du
schéma et la validité des 10 vérités terrain à chaque `npm test`.
