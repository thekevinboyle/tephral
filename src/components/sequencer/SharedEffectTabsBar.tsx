import { useCallback, useEffect, useMemo } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { EffectTabsBar } from './EffectTabsBar'

export function SharedEffectTabsBar() {
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const { sortedEffects } = useActiveEffects()
  const ensureTrack = useEffectSequencerStore((s) => s.ensureTrack)

  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  useEffect(() => {
    for (const id of activeEffectIds) {
      ensureTrack(id)
    }
  }, [activeEffectIds, ensureTrack])

  useEffect(() => {
    if (selectedEffectId && !activeEffectIds.includes(selectedEffectId)) {
      setSelectedEffect(activeEffectIds.length > 0 ? activeEffectIds[0] : null)
    } else if (!selectedEffectId && activeEffectIds.length > 0) {
      setSelectedEffect(activeEffectIds[0])
    }
  }, [activeEffectIds, selectedEffectId, setSelectedEffect])

  const handleSelect = useCallback(
    (effectId: string) => {
      setSelectedEffect(effectId)
    },
    [setSelectedEffect],
  )

  return (
    <EffectTabsBar
      activeEffectIds={activeEffectIds}
      selectedEffectId={selectedEffectId}
      onSelect={handleSelect}
    />
  )
}
