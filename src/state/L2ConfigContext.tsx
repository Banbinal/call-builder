// Config du niveau 2 (colonne A) partagée entre niveaux : L2 l'édite, L3 la
// « replie » dans une skill (T7). Elle vit au-dessus des onglets — changer de
// niveau ne la perd plus — mais reste en mémoire React uniquement, aucune
// persistance navigateur.

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { defaultL2Config, type L2Config } from '../levels/l2/config'

interface L2ConfigContextValue {
  config: L2Config
  setConfig: Dispatch<SetStateAction<L2Config>>
}

const L2ConfigContext = createContext<L2ConfigContextValue | null>(null)

export function L2ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<L2Config>(defaultL2Config)
  return (
    <L2ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </L2ConfigContext.Provider>
  )
}

export function useL2Config(): L2ConfigContextValue {
  const ctx = useContext(L2ConfigContext)
  if (!ctx) {
    throw new Error('useL2Config doit être appelé sous <L2ConfigProvider>')
  }
  return ctx
}
