import type { ComponentType } from 'react'
import { L1 } from './l1'
import { L2 } from './l2'
import { L3 } from './l3'
import { L4 } from './l4'

export type LevelId = 'L1' | 'L2' | 'L3' | 'L4'

export interface Level {
  id: LevelId
  title: string
  Component: ComponentType
}

export const levels: Level[] = [
  { id: 'L1', title: "L'appel nu", Component: L1 },
  { id: 'L2', title: "Structurer l'appel", Component: L2 },
  { id: 'L3', title: 'Skills', Component: L3 },
  { id: 'L4', title: 'MCP', Component: L4 },
]
