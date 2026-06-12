# Évals — `reecriture-ticket`

Cinq tickets flous de référence (domaine télécom générique), trois critères
binaires chacun. Un critère se note Oui ou Non, sans demi-mesure.

## Protocole

1. Installer la skill (cf. [README](../README.md)), ouvrir Claude Code.
2. Pour chaque fichier `ticket-0N-*.md` : coller le ticket d'origine précédé
   de « Réécris ce ticket : ».
3. Noter les trois critères du fichier sur la réponse obtenue. L'éval passe
   si les trois sont à Oui.

**Critère d'acceptation T13 :** les 5 évals passent leurs 3 critères sur une
exécution de référence, et aucune exigence inventée n'apparaît sans marquage
`[HYPOTHÈSE]`.

## Test manuel de déclenchement

La skill doit se déclencher (sans la nommer) sur ces 5 phrasés :

1. « Réécris ce ticket : … »
2. « Rends ce ticket exécutable : … »
3. « Prépare ce ticket pour Claude Code : … »
4. « Clarifie cette user story : … »
5. « Transforme ça en ticket prêt pour le sprint : … »
