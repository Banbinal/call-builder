// Notes pédagogiques du simulateur MCP (T8) : une note par clé de premier
// niveau des messages JSON-RPC affichés dans la colonne « Protocole ».
// Même mécanisme que les notes du panneau requête (T4), autre contenu.

import type { KeyAnnotation } from '../../components/request/annotations.fr'

export const MCP_ANNOTATIONS: Record<string, KeyAnnotation> = {
  jsonrpc: {
    title: 'jsonrpc — la langue commune',
    note:
      'MCP s\'appuie sur JSON-RPC 2.0, un format d\'échange minimal : chaque ' +
      'message déclare sa version. C\'est ce socle partagé qui permet à ' +
      'n\'importe quel agent de parler à n\'importe quel serveur MCP.',
  },
  id: {
    title: 'id — l\'accusé de réception',
    note:
      'Chaque requête porte un identifiant ; la réponse reprend le même. ' +
      'C\'est ainsi que l\'agent relie une réponse à sa question, même quand ' +
      'plusieurs échanges sont en cours.',
  },
  method: {
    title: 'method — ce qui est demandé',
    note:
      'Le nom de l\'opération demandée au serveur. Deux méthodes suffisent ' +
      'ici : "tools/list" (quels outils proposes-tu ?) puis "tools/call" ' +
      '(exécute celui-ci avec ces arguments).',
  },
  params: {
    title: 'params — les détails de la demande',
    note:
      'Les paramètres de la méthode. Pour "tools/call" : le nom du tool ' +
      'choisi et ses arguments — qui doivent respecter le schéma d\'entrée ' +
      'annoncé par le serveur lors de la découverte.',
  },
  result: {
    title: 'result — la réponse du serveur',
    note:
      'La charge utile renvoyée par le serveur pour la requête du même id. ' +
      'À la découverte : la liste des tools et leurs schémas. À l\'appel : ' +
      'le résultat du tool, ici structuré selon le contrat de sortie.',
  },
}

/** Note de repli pour une clé JSON-RPC sans annotation dédiée. */
const UNKNOWN_MCP_ANNOTATION: KeyAnnotation = {
  title: 'Champ du protocole',
  note:
    'Un champ JSON-RPC / MCP sans note dédiée dans cet outil. La ' +
    'spécification de référence : https://modelcontextprotocol.io',
}

export function mcpAnnotationFor(key: string): KeyAnnotation {
  return MCP_ANNOTATIONS[key] ?? UNKNOWN_MCP_ANNOTATION
}
