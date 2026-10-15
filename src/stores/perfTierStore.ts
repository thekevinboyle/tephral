import { create } from 'zustand'

export type PerfTier = 'full' | 'mobile'

/** What each tier allows. Mobile keeps a phone inside its memory and heat budget (iOS kills a WebKit page that uses too much). */
export const TIER_LIMITS: Record<PerfTier, {
  /** Longest side of the rendered canvas, in device pixels (Infinity = the screen's own, up to 2x). */
  renderLongSide: number
  /** Frames a second the renderer draws (0 = every display frame). */
  fps: number
  /** Time warp ring: frame long side and most frames kept. */
  warpLongSide: number
  warpMaxFrames: number
  /** Slicer ring. */
  slicerLongSide: number
  slicerMaxFrames: number
  /** Vision on the main thread: ms between person/face detections, extra face searches in people's heads, ms between person-mask updates. */
  detectMs: number
  headPasses: number
  segMs: number
  /** While recording, the drawing buffer's long side is at least this (720p), however small the stage is on screen. */
  recordLongSide: number
}> = {
  full: { renderLongSide: Infinity, fps: 0, warpLongSide: 512, warpMaxFrames: 240, slicerLongSide: 768, slicerMaxFrames: 300, detectMs: 66, headPasses: 3, segMs: 33, recordLongSide: 1280 },
  mobile: { renderLongSide: 720, fps: 30, warpLongSide: 384, warpMaxFrames: 120, slicerLongSide: 480, slicerMaxFrames: 150, detectMs: 200, headPasses: 1, segMs: 100, recordLongSide: 1280 },
}

const KEY = 'seg.tier'

/** iPhone, iPad (which reports itself as a Mac with touch), or another phone/tablet. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod|Android/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function initialTier(): PerfTier {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'full' || saved === 'mobile') return saved
  } catch { /* storage blocked: fall through to detection */ }
  return isMobileDevice() ? 'mobile' : 'full'
}

interface PerfTierState {
  tier: PerfTier
  setTier: (t: PerfTier) => void
  /** Recording (the app's REC or the device test): the canvas draws at recordLongSide while true. */
  recording: boolean
  setRecording: (v: boolean) => void
}

/** Render quality tier: Full on computers, Mobile on phones and tablets by default; the footer switches it. A per-device preference (localStorage), never in banks or presets. */
export const usePerfTierStore = create<PerfTierState>((set) => ({
  tier: initialTier(),
  setTier: (tier) => {
    try { localStorage.setItem(KEY, tier) } catch { /* the choice lasts for this session */ }
    set({ tier })
  },
  recording: false,
  setRecording: (recording) => set({ recording }),
}))

export const tierLimits = () => TIER_LIMITS[usePerfTierStore.getState().tier]
