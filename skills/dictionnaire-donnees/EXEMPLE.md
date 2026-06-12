# Exemple rempli — schéma fictif d'opérateur télécom

Cette section « Dictionnaire de données » remplace celle du
[SKILL.md](SKILL.md). **Schéma entièrement fictif** (4 tables : `clients`,
`contrats`, `offres`, `tickets_support`) — aucune référence à un schéma
interne réel.

## Dictionnaire de données

### Table `clients`

- **Rôle métier** : une ligne par personne ou entreprise titulaire d'au
  moins un contrat, actif ou passé.
- **Colonnes clés** :
  - `id` — identifiant unique du client, cible des jointures.
  - `nom` — nom d'affichage du titulaire.
  - `email` — adresse de contact ; vide (`NULL`) pour les dossiers ouverts
    en boutique avant 2018.
  - `date_inscription` — date d'entrée en relation, pas la date du premier
    contrat.
  - `statut` — relation globale : `actif`, `suspendu` (impayé en cours,
    PAS résilié), `resilie`.
  - `canal_acquisition` — `web`, `boutique` ou `telephone`.
- **Pièges connus** : `suspendu` n'est pas une résiliation ; `email` peut
  être `NULL` ; le « parc » (contrats en cours) se compte dans `contrats`,
  pas via `clients.statut` — un client `actif` peut n'avoir aucun contrat
  en cours.
- **Questions métier → requête attendue** :
  1. « Combien de clients nous ont rejoints en 2025 ? »
     ```sql
     SELECT COUNT(*) FROM clients
     WHERE date_inscription >= '2025-01-01' AND date_inscription < '2026-01-01';
     ```
  2. « Quelle part de nos clients vient de la boutique ? »
     ```sql
     SELECT canal_acquisition, COUNT(*) FROM clients GROUP BY canal_acquisition;
     ```
  3. « Combien de clients sont suspendus pour impayé ? »
     ```sql
     SELECT COUNT(*) FROM clients WHERE statut = 'suspendu';
     ```

### Table `contrats`

- **Rôle métier** : une ligne par souscription d'une offre par un client ;
  l'historique complet est conservé.
- **Colonnes clés** :
  - `id` — identifiant du contrat.
  - `client_id` — le titulaire (jointure `clients.id`).
  - `offre_id` — l'offre souscrite (jointure `offres.id`, obligatoire pour
    tout montant : les prix ne sont jamais dans `contrats`).
  - `date_debut` — date de souscription.
  - `date_fin` — `NULL` = en cours ; **valeur magique** : les contrats
    migrés de l'ancien SI portent `9999-12-31`, à traiter comme en cours.
  - `statut` — `en_cours`, `resilie` ou `migre` (remplacé par un autre
    contrat, ne compte ni comme actif ni comme résilié).
- **Pièges connus** : « en cours » fiable = `statut = 'en_cours'` (la seule
  condition qui absorbe la valeur magique de `date_fin`) ; un client peut
  avoir plusieurs contrats simultanés ; jointure `offres` obligatoire pour
  tout chiffre d'affaires.
- **Questions métier → requête attendue** :
  1. « Combien de contrats sont en cours aujourd'hui ? »
     ```sql
     SELECT COUNT(*) FROM contrats WHERE statut = 'en_cours';
     ```
  2. « Combien de contrats ont été signés en 2025 ? »
     ```sql
     SELECT COUNT(*) FROM contrats
     WHERE date_debut >= '2025-01-01' AND date_debut < '2026-01-01';
     ```
  3. « Quels clients ont résilié un contrat au premier trimestre 2026 ? »
     ```sql
     SELECT DISTINCT cl.id, cl.nom
     FROM contrats co JOIN clients cl ON cl.id = co.client_id
     WHERE co.statut = 'resilie'
       AND co.date_fin >= '2026-01-01' AND co.date_fin < '2026-04-01';
     ```

### Table `offres`

- **Rôle métier** : le catalogue commercial, y compris les offres retirées
  de la vente.
- **Colonnes clés** :
  - `id` — identifiant de l'offre.
  - `nom` — nom commercial.
  - `gamme` — `mobile`, `fibre` ou `box_4g`.
  - `prix_mensuel_centimes` — prix mensuel **en centimes d'euro** : diviser
    par 100 pour des euros.
  - `date_retrait` — `NULL` = encore commercialisée ; une offre retirée
    peut garder des contrats en cours.
  - `code_legacy` — **dépréciée**, doublons connus : ne plus utiliser.
- **Pièges connus** : les prix sont en centimes ; `code_legacy` est
  dépréciée ; « commercialisée » (`date_retrait IS NULL`) ne dit rien du
  parc existant.
- **Questions métier → requête attendue** :
  1. « Quelles offres fibre sont encore commercialisées ? »
     ```sql
     SELECT nom FROM offres WHERE gamme = 'fibre' AND date_retrait IS NULL;
     ```
  2. « Quel est le prix moyen en euros des offres mobiles ? »
     ```sql
     SELECT AVG(prix_mensuel_centimes) / 100.0 FROM offres WHERE gamme = 'mobile';
     ```
  3. « Quel revenu mensuel représente le parc de contrats en cours, en euros ? »
     ```sql
     SELECT SUM(o.prix_mensuel_centimes) / 100.0
     FROM contrats c JOIN offres o ON o.id = c.offre_id
     WHERE c.statut = 'en_cours';
     ```

### Table `tickets_support`

- **Rôle métier** : une ligne par demande d'un client au support, tous
  canaux confondus.
- **Colonnes clés** :
  - `id` — identifiant du ticket.
  - `client_id` — le demandeur (jointure `clients.id`).
  - `date_ouverture` / `date_cloture` — `date_cloture` `NULL` = ticket
    encore ouvert.
  - `canal` — `telephone`, `chat`, `email` ou `boutique`.
  - `motif` — texte libre saisi par les conseillers, **non normalisé** :
    filtrer par `LIKE` avec prudence, jamais par égalité stricte.
  - `satisfaction` — note 1 à 5 donnée après clôture ; `NULL` = client n'a
    pas répondu.
- **Pièges connus** : exclure les `NULL` d'une moyenne de satisfaction (ne
  jamais les compter comme 0) ; `motif` non normalisé.
- **Questions métier → requête attendue** :
  1. « Combien de tickets sont encore ouverts ? »
     ```sql
     SELECT COUNT(*) FROM tickets_support WHERE date_cloture IS NULL;
     ```
  2. « Quelle est la satisfaction moyenne des tickets clos en 2025 ? »
     ```sql
     SELECT AVG(satisfaction) FROM tickets_support
     WHERE satisfaction IS NOT NULL
       AND date_cloture >= '2025-01-01' AND date_cloture < '2026-01-01';
     ```
  3. « Quels clients ont ouvert plus de trois tickets en 2026 ? »
     ```sql
     SELECT client_id, COUNT(*) AS nb
     FROM tickets_support
     WHERE date_ouverture >= '2026-01-01'
     GROUP BY client_id HAVING COUNT(*) > 3;
     ```
