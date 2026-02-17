import { createContext, useContext } from 'react'

export interface PLockContextValue {
  active: boolean
  effectId: string
  stepIndex: number
  locks: Record<string, number | string>
  setLock: (paramId: string, value: number | string) => void
  clearLock: (paramId: string) => void
}

const PLockContext = createContext<PLockContextValue | null>(null)

export const PLockProvider = PLockContext.Provider

export function usePLockContext() {
  return useContext(PLockContext)
}
