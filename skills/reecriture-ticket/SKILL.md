---
name: reecriture-ticket
description: "À utiliser quand l'utilisateur demande de retravailler un ticket flou — « réécris ce ticket », « rends ce ticket exécutable », « prépare ce ticket pour Claude Code », « clarifie cette user story » — pour produire un ticket autoporteur à sections fixes et critères d'acceptation testables."
---

# reecriture-ticket

## Instructions

Tu transformes un ticket flou en ticket exécutable : un ticket qu'un
développeur — humain ou agent — peut traiter sans revenir vers son auteur.
Méthode, dans l'ordre :

1. **Lister les hypothèses implicites.** Tout ce que le ticket suppose sans
   le dire : périmètre, utilisateurs concernés, comportement attendu, données
   disponibles, canaux. Pour chacune : soit elle est déductible du ticket
   d'origine et tu l'explicites, soit elle ne l'est pas et tu la marques
   « à trancher ».

2. **Identifier les cas limites absents.** Erreurs et indisponibilités,
   états vides ou partiels, annulation en cours de route, droits et rôles,
   volumes inhabituels, première utilisation. Ne retiens que ceux qui
   s'appliquent réellement à ce ticket — un cas limite générique sans lien
   avec le sujet est du bruit.

3. **Réécrire en sections fixes**, toujours les cinq, toujours dans cet
   ordre :
   - **Contexte** — pourquoi ce ticket existe, en 2–3 phrases.
   - **Objectif** — le résultat attendu, une phrase.
   - **Spécifications** — le comportement détaillé, cas limites inclus.
   - **Critères d'acceptation testables** — chaque critère décrit une
     action et un résultat observable (« quand X, alors Y »). « Rapide »,
     « simple », « mieux » ne sont pas testables : les traduire en seuil
     chiffré ou en condition vérifiable.
   - **Hors scope** — ce que le ticket ne couvre volontairement pas.

4. **Terminer par les questions ouvertes.** Les points « à trancher » sont
   rassemblés en fin de réponse sous un titre « Questions ouvertes »,
   formulés pour que l'auteur du ticket puisse répondre en une phrase.
   Ne jamais inventer une réponse à leur place.

## Contrainte absolue

Ne jamais inventer une exigence métier non déductible du ticket d'origine.
Toute hypothèse ajoutée dans le ticket réécrit est marquée `[HYPOTHÈSE]` à
l'endroit exact où elle apparaît — le lecteur doit pouvoir distinguer d'un
coup d'œil ce qui vient du ticket d'origine de ce qui a été ajouté.

## Exemple

**Entrée :** « L'espace client est trop lent, il faut l'optimiser. »

**Extrait de sortie attendue (un critère d'acceptation) :**

> - Quand un client ouvre la page d'accueil de l'espace client, elle
>   s'affiche en moins de 2 secondes `[HYPOTHÈSE : seuil à valider]` sur
>   une connexion mobile standard.

## Contre-exemple

**Entrée :** la même.

**Sortie à ne pas produire :**

> - La page d'accueil s'affiche en moins de 2 secondes, conformément à
>   notre charte de performance.

_Pourquoi :_ la « charte de performance » n'existe pas dans le ticket
d'origine — c'est une exigence inventée présentée comme un fait, sans
marquage `[HYPOTHÈSE]`.
