/**
 * AcidOverlay.tsx
 * Main orchestrator component for the remaining ACID visual effects that
 * are NOT part of the main GPU postprocessing chain:
 *   - decomp (recursive variance quad-tree — stays CPU by design, see
 *     Phase 3's DISCOVERY/shared-context: not fragment-shader shaped)
 *   - cloud / slit / voronoi (already independent WebGL effects, each
 *     rendering into its own <canvas> layer straight from the source
 *     canvas — never routed through the CPU pixel-readback path, so
 *     Phase 3's GPU port didn't touch them)
 *
 * Every other ACID effect (mirror, ripple, scan, slice, thgrid, contour,
 * glyph, halftone, hex, icons, led) was ported to a GPU pass in
 * EffectPipeline during Phase 3 and removed from here — see
 * src/effects/glitch-engine/Acid*.ts.
 */

import { useRef, useEffect, useCallback } from 'react'
import { useAcidStore } from '../../stores/acidStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { getSharedFrame } from './sharedReadback'
import { renderDecomp } from './acid/decompEffect'

// WebGL effects (already GPU, independent of the pixel-readback path above)
import { CloudEffect } from './acid/cloudEffect'
import { SlitEffect } from './acid/slitEffect'
import { VoronoiEffect } from './acid/voronoiEffect'

interface AcidOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}

export function AcidOverlay({ sourceCanvas, width, height }: AcidOverlayProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null)
  const slitCanvasRef = useRef<HTMLCanvasElement>(null)
  const voronoiCanvasRef = useRef<HTMLCanvasElement>(null)

  // Offscreen canvas for reading WebGL pixels (can't use getContext('2d') on WebGL canvas)
  // — only needed while decomp is enabled (the only remaining CPU pixel-read effect).
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  // WebGL effect instances
  const cloudEffectRef = useRef<CloudEffect | null>(null)
  const slitEffectRef = useRef<SlitEffect | null>(null)
  const voronoiEffectRef = useRef<VoronoiEffect | null>(null)

  // Animation state
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)

  // Store refs for animation loop
  const storeRef = useRef(useAcidStore.getState())
  const glitchStoreRef = useRef<{ effectBypassed: Record<string, boolean>; bypassActive: boolean }>({ effectBypassed: {}, bypassActive: false })
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs
  const store = useAcidStore()
  const { effectBypassed, bypassActive } = useGlitchEngineStore()
  storeRef.current = store
  glitchStoreRef.current = { effectBypassed, bypassActive }
  sourceCanvasRef.current = sourceCanvas
  sizeRef.current = { width, height }

  // Check if any effect is enabled AND not bypassed
  const anyActiveEffect =
    (store.decompEnabled && !effectBypassed['acid_decomp']) ||
    (store.cloudEnabled && !effectBypassed['acid_cloud']) ||
    (store.slitEnabled && !effectBypassed['acid_slit']) ||
    (store.voronoiEnabled && !effectBypassed['acid_voronoi'])

  // Check if any effect is enabled (for WebGL lifecycle)
  const anyEnabled =
    store.decompEnabled ||
    store.cloudEnabled ||
    store.slitEnabled ||
    store.voronoiEnabled

  // WebGL effect initialization/disposal
  useEffect(() => {
    const currentStore = storeRef.current

    // Cloud effect
    if (currentStore.cloudEnabled && !cloudEffectRef.current && cloudCanvasRef.current) {
      cloudEffectRef.current = new CloudEffect()
      cloudEffectRef.current.init(cloudCanvasRef.current)
    } else if (!currentStore.cloudEnabled && cloudEffectRef.current) {
      cloudEffectRef.current.dispose()
      cloudEffectRef.current = null
    }

    // Slit effect
    if (currentStore.slitEnabled && !slitEffectRef.current && slitCanvasRef.current) {
      slitEffectRef.current = new SlitEffect()
      slitEffectRef.current.init(slitCanvasRef.current, width, height)
    } else if (!currentStore.slitEnabled && slitEffectRef.current) {
      slitEffectRef.current.dispose()
      slitEffectRef.current = null
    }

    // Voronoi effect
    if (currentStore.voronoiEnabled && !voronoiEffectRef.current && voronoiCanvasRef.current) {
      voronoiEffectRef.current = new VoronoiEffect()
      voronoiEffectRef.current.init(voronoiCanvasRef.current)
    } else if (!currentStore.voronoiEnabled && voronoiEffectRef.current) {
      voronoiEffectRef.current.dispose()
      voronoiEffectRef.current = null
    }
  }, [
    store.cloudEnabled,
    store.slitEnabled,
    store.voronoiEnabled,
    width,
    height,
  ])

  // Render frame callback
  const renderFrame = useCallback((time: number) => {
    if (!isRunningRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const source = sourceCanvasRef.current

    if (!canvas || !ctx || !source) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const currentStore = storeRef.current
    const { effectBypassed: bypassed, bypassActive: globalBypass } = glitchStoreRef.current
    const { width: currentWidth, height: currentHeight } = sizeRef.current

    // If global bypass is active, skip all acid effects
    if (globalBypass) {
      ctx.clearRect(0, 0, currentWidth, currentHeight)
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const decompActive = currentStore.decompEnabled && !bypassed['acid_decomp']

    if (decompActive) {
      // Create or resize offscreen canvas for reading WebGL pixels — only
      // needed while decomp (the only remaining CPU pixel-read effect) is
      // active, so cloud/slit/voronoi-only sessions never pay this readback.
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas')
        offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d')
      }

      const offscreenCanvas = offscreenCanvasRef.current
      const sourceCtx = offscreenCtxRef.current

      if (!sourceCtx) {
        frameIdRef.current = requestAnimationFrame(renderFrame)
        return
      }

      // Resize offscreen canvas if needed
      if (offscreenCanvas.width !== currentWidth || offscreenCanvas.height !== currentHeight) {
        offscreenCanvas.width = currentWidth
        offscreenCanvas.height = currentHeight
      }

      // Copy WebGL canvas to offscreen 2D canvas for pixel reading
      const sharedFrame = getSharedFrame(source)
      sourceCtx.drawImage(sharedFrame ?? source, 0, 0, currentWidth, currentHeight)

      // Handle background based on preserveVideo setting
      if (!currentStore.preserveVideo) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, currentWidth, currentHeight)
      } else {
        ctx.drawImage(sharedFrame ?? source, 0, 0, currentWidth, currentHeight)
      }

      renderDecomp(sourceCtx, ctx, currentWidth, currentHeight, currentStore.decompParams)
    } else {
      // No CPU pixel-read effect active — clear any stale content from a
      // previous decomp-enabled frame instead of paying the readback.
      ctx.clearRect(0, 0, currentWidth, currentHeight)
    }

    // Render WebGL effects (they render to their own canvases, straight
    // from the source canvas — no readback involved).
    const timeSeconds = time * 0.001

    if (currentStore.cloudEnabled && cloudEffectRef.current && !bypassed['acid_cloud']) {
      cloudEffectRef.current.render(source, currentStore.cloudParams, timeSeconds)
    }

    if (currentStore.slitEnabled && slitEffectRef.current && !bypassed['acid_slit']) {
      slitEffectRef.current.render(source, currentStore.slitParams)
    }

    if (currentStore.voronoiEnabled && voronoiEffectRef.current && !bypassed['acid_voronoi']) {
      voronoiEffectRef.current.render(source, currentStore.voronoiParams)
    }

    frameIdRef.current = requestAnimationFrame(renderFrame)
  }, [])

  // Animation loop
  useEffect(() => {
    if (!anyEnabled) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true
    frameIdRef.current = requestAnimationFrame(renderFrame)

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [anyEnabled, renderFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }

      // Dispose WebGL resources
      if (cloudEffectRef.current) {
        cloudEffectRef.current.dispose()
        cloudEffectRef.current = null
      }
      if (slitEffectRef.current) {
        slitEffectRef.current.dispose()
        slitEffectRef.current = null
      }
      if (voronoiEffectRef.current) {
        voronoiEffectRef.current.dispose()
        voronoiEffectRef.current = null
      }
    }
  }, [])

  // Don't render if no effects are active (enabled and not bypassed)
  if (!anyActiveEffect) return null

  // Check which WebGL effects need canvases
  const needsCloudCanvas = store.cloudEnabled
  const needsSlitCanvas = store.slitEnabled
  const needsVoronoiCanvas = store.voronoiEnabled

  return (
    <>
      {/* Main Canvas 2D effects layer (decomp only) */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 15, width, height }}
      />

      {/* WebGL Cloud effect layer */}
      {needsCloudCanvas && (
        <canvas
          ref={cloudCanvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 16, width, height }}
        />
      )}

      {/* WebGL Slit-scan effect layer */}
      {needsSlitCanvas && (
        <canvas
          ref={slitCanvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 17, width, height }}
        />
      )}

      {/* WebGL Voronoi effect layer */}
      {needsVoronoiCanvas && (
        <canvas
          ref={voronoiCanvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 18, width, height }}
        />
      )}
    </>
  )
}
