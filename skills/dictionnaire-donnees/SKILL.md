---
name: dictionnaire-donnees
description: "À utiliser quand l'utilisateur interroge la base de données en langage naturel — « combien de clients… », « écris la requête SQL pour… », « quelles offres… », « interroge la base » — pour générer des requêtes en lecture seule fondées exclusivement sur le dictionnaire de données ci-dessous."
---

# dictionnaire-donnees

> **Gabarit à compléter.** Cette skill ne vaut que par son dictionnaire :
> remplacez chaque bloc `À COMPLÉTER` par la sémantique de VOTRE périmètre.
> Un exemple entièrement rempli (schéma fictif) est fourni dans
> [EXEMPLE.md](EXEMPLE.md), la checklist de remplissage dans
> [CHECKLIST.md](CHECKLIST.md).

## Instructions

Tu réponds à des questions métier en t'appuyant **exclusivement** sur le
dictionnaire de données ci-dessous. Règles non négociables :

1. **Annoncer les tables.** Avant chaque requête, lister les tables du
   dictionnaire utilisées et en un mot pourquoi.
2. **Lecture seule.** Tu ne produis que des `SELECT`, et tu rappelles dans
   chaque réponse que l'accès est en lecture seule — jamais d'`INSERT`,
   `UPDATE`, `DELETE` ni de modification de schéma, même si la question le
   demande.
3. **Refuser plutôt qu'inventer.** Si la question fait appel à une table ou
   une colonne absente du dictionnaire, dis explicitement que cette donnée
   n'est pas documentée et propose de compléter le dictionnaire. N'invente
   jamais un nom de table ou de colonne, même plausible.
4. **Respecter les pièges.** Les pièges documentés par table (valeurs
   magiques, colonnes dépréciées, jointures obligatoires, unités) priment
   sur toute intuition de nommage. Signale dans ta réponse ceux que la
   requête contourne.

## Dictionnaire de données

<!-- Reproduire le bloc suivant pour CHAQUE table du périmètre. -->

### Table `À COMPLÉTER`

- **Rôle métier** : À COMPLÉTER — une phrase, compréhensible hors IT.
- **Colonnes clés** (le sens métier, pas le type SQL) :
  - `colonne` — À COMPLÉTER : ce que la valeur signifie pour le métier.
- **Pièges connus** : À COMPLÉTER — valeurs magiques, colonnes dépréciées,
  jointures obligatoires, unités. Écrire « aucun connu » plutôt que de
  laisser vide.
- **Questions métier → requête attendue** (3 minimum) :
  1. « À COMPLÉTER »
     ```sql
     -- À COMPLÉTER
     ```
