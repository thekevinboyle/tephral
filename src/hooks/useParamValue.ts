import { useCallback, useSyncExternalStore } from 'react'
import type { LockableParam } from '../config/effectParams'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useContourStore } from '../stores/contourStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useTrendStore } from '../stores/trendStore'
import { useSegStore } from '../stores/segStore'

// Every store an EFFECT_PARAM_REGISTRY read() can touch (see the getters at the top of effectParams.ts)
const STORES = [
  useGlitchEngineStore, useAcidStore, useAsciiRenderStore, useStippleStore, useContourStore,
  useLandmarksStore, useVisionTrackingStore, useTextureOverlayStore, useDataOverlayStore,
  useStrandStore, useMotionStore, useDestructionStore, useMorphStore, useTrendStore, useSegStore,
]

// One shared fan-out: a single subscription per store, created on the first listener and torn down when none remain
const listeners = new Set<() => void>()
let offs: Array<() => void> | null = null
const notify = () => listeners.forEach((l) => l())

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!offs) offs = STORES.map((s) => s.subscribe(notify))
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && offs) {
      offs.forEach((off) => off())
      offs = null
    }
  }
}

/** The param's live value (always finite); re-renders only when that number changes. */
export function useParamValue(param: LockableParam): number {
  const getSnapshot = useCallback(() => {
    const v = param.read()
    return Number.isFinite(v) ? v : param.min
  }, [param])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
