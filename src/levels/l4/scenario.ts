// Scénario du simulateur MCP (T8) : un agent découvre le tool
// « analyse-verbatim » et l'invoque sur le verbatim fil rouge. Les messages
// JSON-RPC sont réels (syntaxe MCP valide), l'exécution est rejouée — fichier
// de données éditable pour adapter le contenu avant le workshop.
// Module pur, testé : le schéma du tool est construit depuis le schéma T6.

import { FIL_ROUGE_VERBATIM } from '../../config/defaults'
import { defaultSchemaSpec, toJsonSchema } from '../../schema/model'

export type Direction = 'agent_to_server' | 'server_to_agent'

export interface ProtocolMessage {
  direction: Direction
  /** Le message JSON-RPC, affiché tel quel dans la colonne Protocole. */
  payload: Record<string, unknown>
}

export interface ScenarioStep {
  /** Titre court affiché dans le stepper. */
  title: string
  /** Ce que « pense » ou fait l'agent à cette étape (colonne Agent). */
  agent?: string
  /** Ce qui se passe côté serveur/tool à cette étape (colonne Tool). */
  tool?: string
  /** Message JSON-RPC échangé à cette étape (colonne Protocole). */
  message?: ProtocolMessage
}

/** Le contrat de sortie du tool : exactement le schéma défini au niveau 2 (T6). */
export const TOOL_OUTPUT_SCHEMA = toJsonSchema(defaultSchemaSpec())

/** Résultat structuré rejoué — conforme à TOOL_OUTPUT_SCHEMA (vérifié en test). */
const TOOL_RESULT = {
  irritant: 'Impossibilité de joindre le service client malgré des tentatives répétées',
  gravite: 'critique',
  theme: 'service client',
  verbatim_resume:
    'Client injoignable par le support depuis 3 jours, envisage de résilier.',
}

export const SCENARIO: ScenarioStep[] = [
  {
    title: 'Découverte',
    agent:
      'Je viens de me connecter au serveur MCP. Avant toute chose : quels ' +
      'tools propose-t-il ? Je n\'en sais rien — je demande la liste.',
    message: {
      direction: 'agent_to_server',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      },
    },
  },
  {
    title: 'Le serveur se décrit',
    tool:
      'Le serveur répond avec son catalogue : pour chaque tool, un nom, une ' +
      'description (c\'est elle que l\'agent lira pour choisir) et les ' +
      'schémas d\'entrée et de sortie — le contrat de sortie est celui ' +
      'défini au niveau 2.',
    message: {
      direction: 'server_to_agent',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: [
            {
              name: 'analyse-verbatim',
              description:
                'Analyse un verbatim client télécom : identifie ' +
                'l\'irritant principal, sa gravité et son thème, et renvoie ' +
                'un résultat structuré.',
              inputSchema: {
                type: 'object',
                properties: {
                  verbatim: {
                    type: 'string',
                    description: 'Le verbatim client à analyser',
                  },
                },
                required: ['verbatim'],
                additionalProperties: false,
              },
              outputSchema: TOOL_OUTPUT_SCHEMA,
            },
          ],
        },
      },
    },
  },
  {
    title: 'Décision de l\'agent',
    agent:
      'La demande de l\'utilisateur porte sur un verbatim client. La ' +
      'description du tool « analyse-verbatim » correspond exactement : je ' +
      'l\'invoque, avec le verbatim comme argument — au format exigé par son ' +
      'schéma d\'entrée. Je ne l\'exécute pas moi-même : je le demande.',
  },
  {
    title: 'Invocation',
    agent: 'J\'envoie la demande d\'exécution au serveur.',
    message: {
      direction: 'agent_to_server',
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'analyse-verbatim',
          arguments: {
            verbatim: FIL_ROUGE_VERBATIM,
          },
        },
      },
    },
  },
  {
    title: 'Résultat structuré',
    tool:
      'Le tool a exécuté l\'analyse (rejouée ici) et renvoie le résultat — ' +
      'structuré, conforme au schéma de sortie annoncé à la découverte. ' +
      'L\'agent peut maintenant s\'en servir tel quel.',
    message: {
      direction: 'server_to_agent',
      payload: {
        jsonrpc: '2.0',
        id: 2,
        result: {
          content: [{ type: 'text', text: JSON.stringify(TOOL_RESULT) }],
          structuredContent: TOOL_RESULT,
          isError: false,
        },
      },
    },
  },
]
