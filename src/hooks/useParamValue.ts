import { useSyncExternalStore } from 'react'
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

function subscribe(cb: () => void) {
  const offs = STORES.map((s) => s.subscribe(cb))
  return () => offs.forEach((off) => off())
}

/** The param's live value; re-renders only when that number changes. */
export function useParamValue(param: LockableParam): number {
  return useSyncExternalStore(subscribe, param.read, param.read)
}
