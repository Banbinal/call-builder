# Checklist de remplissage — dictionnaire de données

À cocher avant de considérer votre dictionnaire utilisable. Dix points,
tous obligatoires.

1. [ ] Chaque table a un **rôle métier en une phrase**, compréhensible par
   quelqu'un qui ne connaît pas le SI.
2. [ ] Chaque colonne documentée décrit **le sens métier**, pas le type SQL
   (« date d'entrée en relation », pas « DATETIME »).
3. [ ] Les **valeurs magiques** sont listées : codes, dates sentinelles
   (`9999-12-31`…), `NULL` signifiants.
4. [ ] Les **colonnes dépréciées** sont marquées « ne plus utiliser », avec
   la raison.
5. [ ] Les **jointures obligatoires** sont documentées (« tout montant passe
   par la table offres »).
6. [ ] Les **unités** sont précisées partout où elles comptent (centimes ou
   euros, Mo ou Go, TTC ou HT).
7. [ ] Chaque table a **au moins 3 exemples** question métier → requête
   attendue.
8. [ ] Au moins un exemple **traverse plusieurs tables** (jointure réelle du
   quotidien).
9. [ ] **Aucune donnée réelle** dans les exemples : pas de nom de client,
   pas de requête copiée de la prod.
10. [ ] Testé en conditions réelles : une question sur une table absente du
    dictionnaire produit un **refus explicite**, pas une invention.
