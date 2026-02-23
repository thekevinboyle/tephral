import { useEffect, useRef, useCallback } from 'react'
import { useTimelineStore } from '../stores/timelineStore'
import { useClipStore } from '../stores/clipStore'
import { useMediaStore } from '../stores/mediaStore'
import { EFFECT_PARAM_REGISTRY } from '../config/effectParams'
import { useTimelineAudioTrigger } from './useTimelineAudioTrigger'

export function useTimelinePlayback() {
  const isActive = useTimelineStore((s) => s.isActive)
  const isPlaying = useTimelineStore((s) => s.isPlaying)
  const currentClipIndex = useTimelineStore((s) => s.currentClipIndex)

  // Video element pool: clipId -> HTMLVideoElement
  const videoPoolRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  // Saved effect states for restore on deactivate
  const savedEffectStatesRef = useRef<Record<string, boolean>>({})
  // Track current active video to pause on switch
  const activeVideoRef = useRef<HTMLVideoElement | null>(null)
  // Timed mode: track when clip started playing
  const clipStartTimeRef = useRef(0)
  const timedRafRef = useRef<number | null>(null)

  // Audio trigger hook — runs its own RAF loop
  useTimelineAudioTrigger()

  // Build video pool from timeline clips
  const buildVideoPool = useCallback(() => {
    const pool = videoPoolRef.current
    const timelineClips = useTimelineStore.getState().clips
    const storeClips = useClipStore.getState().clips

    // Determine which clipIds are needed
    const neededClipIds = new Set(timelineClips.map((tc) => tc.clipId))

    // Remove videos no longer needed
    for (const [clipId, video] of pool.entries()) {
      if (!neededClipIds.has(clipId)) {
        video.pause()
        video.src = ''
        pool.delete(clipId)
      }
    }

    // Create videos for new clips
    for (const clipId of neededClipIds) {
      if (pool.has(clipId)) continue

      const clip = storeClips.find((c) => c.id === clipId)
      if (!clip) continue

      const video = document.createElement('video')
      video.src = clip.url
      video.muted = true
      video.playsInline = true
      video.loop = false
      video.preload = 'auto'
      pool.set(clipId, video)
    }
  }, [])

  // Apply per-clip effect overrides
  const applyClipEffects = useCallback((effects: Record<string, boolean>) => {
    // Save current states and apply overrides
    for (const [effectId, enabled] of Object.entries(effects)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue

      // Save current state only if not already saved
      if (!(effectId in savedEffectStatesRef.current)) {
        savedEffectStatesRef.current[effectId] = entry.getEnabled()
      }

      entry.setEnabled(enabled)
    }
  }, [])

  // Restore saved effect states
  const restoreEffectStates = useCallback(() => {
    for (const [effectId, wasEnabled] of Object.entries(savedEffectStatesRef.current)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (entry) {
        entry.setEnabled(wasEnabled)
      }
    }
    savedEffectStatesRef.current = {}
  }, [])

  // Switch to a specific clip
  const switchToClip = useCallback((index: number) => {
    const timeline = useTimelineStore.getState()
    const clip = timeline.clips[index]
    if (!clip) return

    // Pause current video
    if (activeVideoRef.current) {
      activeVideoRef.current.pause()
    }

    // Get new clip's video from pool
    const video = videoPoolRef.current.get(clip.clipId)
    if (!video) return

    video.currentTime = 0
    video.play().catch(() => {})
    activeVideoRef.current = video

    // Push to media store — triggers useVideoTexture automatically
    useMediaStore.getState().setVideoElement(video)

    // Apply per-clip effect overrides
    if (Object.keys(clip.individualEffects).length > 0) {
      applyClipEffects(clip.individualEffects)
    }

    // Track clip start time for timed mode
    clipStartTimeRef.current = performance.now()
  }, [applyClipEffects])

  // Handle activation/deactivation
  useEffect(() => {
    if (isActive) {
      // Stash current source
      useMediaStore.getState().stashCurrentSource()
      // Build video pool
      buildVideoPool()
    } else {
      // Pause all pool videos
      for (const video of videoPoolRef.current.values()) {
        video.pause()
        video.src = ''
      }
      videoPoolRef.current.clear()
      activeVideoRef.current = null

      // Restore effect states
      restoreEffectStates()

      // Restore original source
      useMediaStore.getState().restoreStashedSource()
    }
  }, [isActive, buildVideoPool, restoreEffectStates])

  // Handle clip changes during playback
  useEffect(() => {
    if (!isActive || !isPlaying) return
    switchToClip(currentClipIndex)
  }, [isActive, isPlaying, currentClipIndex, switchToClip])

  // Timed mode: RAF loop to check elapsed duration
  useEffect(() => {
    if (!isActive || !isPlaying) {
      if (timedRafRef.current !== null) {
        cancelAnimationFrame(timedRafRef.current)
        timedRafRef.current = null
      }
      return
    }

    let cancelled = false

    function timedLoop() {
      if (cancelled) return

      const timeline = useTimelineStore.getState()
      if (!timeline.isPlaying || !timeline.isActive) {
        timedRafRef.current = requestAnimationFrame(timedLoop)
        return
      }

      const clip = timeline.clips[timeline.currentClipIndex]
      if (clip && clip.triggerMode === 'timed') {
        const elapsed = (performance.now() - clipStartTimeRef.current) / 1000
        if (elapsed >= clip.duration) {
          clipStartTimeRef.current = performance.now()
          timeline.advanceToNextClip()
        }
      }

      timedRafRef.current = requestAnimationFrame(timedLoop)
    }

    timedRafRef.current = requestAnimationFrame(timedLoop)

    return () => {
      cancelled = true
      if (timedRafRef.current !== null) {
        cancelAnimationFrame(timedRafRef.current)
      }
    }
  }, [isActive, isPlaying])

  // Rebuild pool when timeline clips change
  useEffect(() => {
    if (isActive) {
      buildVideoPool()
    }
  }, [isActive, buildVideoPool])
}
