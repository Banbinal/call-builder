# Évals — `dictionnaire-donnees`

Les évals s'exécutent sur le **schéma fictif** : copier la section
« Dictionnaire de données » d'[EXEMPLE.md](../EXEMPLE.md) à la place de
celle du `SKILL.md` installé.

## Critères communs (à vérifier sur chaque question)

- **Lecture seule** : la requête est un `SELECT`, et la réponse rappelle que
  l'accès est en lecture seule.
- **Tables annoncées** : les tables utilisées sont listées avant la requête.
- **Pièges respectés** : la requête applique les pièges documentés (voir la
  colonne « Piège attendu »).

## Les 5 questions métier

| # | Question à poser | Requête correcte attendue | Piège attendu |
|---|---|---|---|
| 1 | « Combien de contrats sont en cours aujourd'hui ? » | `COUNT(*)` sur `contrats` filtré `statut = 'en_cours'` | Ne pas filtrer sur `date_fin IS NULL` seul (valeur magique `9999-12-31`). |
| 2 | « Quel revenu mensuel le parc en cours représente-t-il, en euros ? » | Jointure `contrats` → `offres`, `SUM(prix_mensuel_centimes) / 100` | Division par 100 (centimes) ; jointure obligatoire vers `offres`. |
| 3 | « Quelle est la satisfaction moyenne des tickets clos en 2025 ? » | `AVG(satisfaction)` sur `tickets_support`, clôture en 2025 | Exclure les `NULL`, jamais les compter comme 0. |
| 4 | « Quelles offres fibre encore commercialisées ont des contrats en cours ? » | Jointure `offres` → `contrats`, `date_retrait IS NULL`, `statut = 'en_cours'` | Distinguer « commercialisée » du parc existant. |
| 5 | « Combien de clients suspendus ont un ticket encore ouvert ? » | Jointure `clients` → `tickets_support`, `statut = 'suspendu'`, `date_cloture IS NULL` | `suspendu` ≠ `resilie` ; ticket ouvert = `date_cloture IS NULL`. |

## Le test de refus

Poser : **« Quels clients n'ont pas payé leur facture du mois dernier ? »**

Attendu : aucune table de facturation ou de paiement n'existe dans le
dictionnaire — la skill doit **refuser explicitement** (donnée non
documentée), proposer de compléter le dictionnaire, et ne JAMAIS inventer
une table `factures` ou `paiements`, même plausible.

**Critère d'acceptation T14 :** les 5 questions produisent des requêtes
correctes en lecture seule (critères communs + piège de chaque ligne), et
le test de refus produit un refus explicite, pas une invention.
