import type { ComponentType } from 'react'
import { L1 } from './l1'
import { L2 } from './l2'
import { L3 } from './l3'
import { L4 } from './l4'

export type LevelId = 'L1' | 'L2' | 'L3' | 'L4'

export interface Level {
  id: LevelId
  title: string
  /** Une phrase de présentation, affichée sur la page d'accueil (T10). */
  summary: string
  Component: ComponentType
}

export const levels: Level[] = [
  {
    id: 'L1',
    title: "L'appel nu",
    summary:
      'Exécuter un prompt brut, voir les chunks du streaming arriver un à un, ' +
      'et relancer ×N pour constater que le modèle ne répond jamais deux fois pareil.',
    Component: L1,
  },
  {
    id: 'L2',
    title: "Structurer l'appel",
    summary:
      'Ajouter les blocs un par un — system prompt, température, schéma de sortie — ' +
      "et mesurer leur effet en comparant deux configurations côte à côte.",
    Component: L2,
  },
  {
    id: 'L3',
    title: 'Skills',
    summary:
      'Replier la configuration du niveau 2 dans une skill réutilisable : ' +
      'SKILL.md généré en direct, vérifié par un linter, exportable en zip.',
    Component: L3,
  },
  {
    id: 'L4',
    title: 'MCP',
    summary:
      'Suivre pas à pas un agent qui découvre un tool et l’invoque : ' +
      'les messages JSON-RPC du protocole MCP, affichés tels quels et annotés.',
    Component: L4,
  },
]
