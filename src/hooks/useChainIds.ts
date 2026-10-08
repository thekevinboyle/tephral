import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useRoutingStore } from '../stores/routingStore'
import { useEnabledEffectIds } from './useEffectToggle'

/**
 * Active effect ids in signal order (routingStore.effectOrder; enabled ids missing from the order go last,
 * as useActiveEffects sorts them). Re-renders only when an effect is switched on/off or the order changes,
 * never on parameter ticks, and the returned array is referentially stable until the list itself changes.
 */
export function useChainIds(): string[] {
  const enabled = useEnabledEffectIds()
  const order = useRoutingStore(useShallow((s) => s.effectOrder))
  const key = useMemo(() => {
    const inOrder = order.filter((id) => enabled.has(id))
    const seen = new Set(inOrder)
    const rest = [...enabled].filter((id) => !seen.has(id))
    return [...inOrder, ...rest].join('|')
  }, [order, enabled])
  return useMemo(() => (key ? key.split('|') : []), [key])
}
