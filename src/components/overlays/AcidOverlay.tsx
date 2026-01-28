/**
 * AcidOverlay.tsx
 * Main orchestrator component for all ACID visual effects
 * Reads from source canvas and renders effects on top
 */

import { useRef, useEffect, useCallback } from 'react'
import { useAcidStore } from '../../stores/acidStore'

// Canvas 2D effects
import { renderDots } from './acid/dotsEffect'
import { renderGlyphs } from './acid/glyphEffect'
import { renderIcons } from './acid/iconsEffect'
import { renderContour } from './acid/contourEffect'
import { renderDecomp } from './acid/decompEffect'
import { renderMirror } from './acid/mirrorEffect'
import { renderSlice } from './acid/sliceEffect'
import { renderThGrid } from './acid/thgridEffect'
import { renderLed } from './acid/ledEffect'

// WebGL effects
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

  // WebGL effect instances
  const cloudEffectRef = useRef<CloudEffect | null>(null)
  const slitEffectRef = useRef<SlitEffect | null>(null)
  const voronoiEffectRef = useRef<VoronoiEffect | null>(null)

  // Animation state
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)

  // Store refs for animation loop
  const storeRef = useRef(useAcidStore.getState())
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs
  const store = useAcidStore()
  storeRef.current = store
  sourceCanvasRef.current = sourceCanvas
  sizeRef.current = { width, height }

  // Check if any effect is enabled
  const anyEnabled =
    store.dotsEnabled ||
    store.glyphEnabled ||
    store.iconsEnabled ||
    store.contourEnabled ||
    store.decompEnabled ||
    store.mirrorEnabled ||
    store.sliceEnabled ||
    store.thGridEnabled ||
    store.ledEnabled ||
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
    const { width: currentWidth, height: currentHeight } = sizeRef.current

    // Get source context for reading pixels
    const sourceCtx = source.getContext('2d')
    if (!sourceCtx) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // Handle background based on preserveVideo setting
    if (!currentStore.preserveVideo) {
      // Fill with black background
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, currentWidth, currentHeight)
    } else {
      // Draw source canvas first (preserve video)
      ctx.drawImage(source, 0, 0, currentWidth, currentHeight)
    }

    // Apply Canvas 2D effects in order
    if (currentStore.dotsEnabled) {
      renderDots(sourceCtx, ctx, currentWidth, currentHeight, currentStore.dotsParams)
    }

    if (currentStore.glyphEnabled) {
      renderGlyphs(sourceCtx, ctx, currentWidth, currentHeight, currentStore.glyphParams)
    }

    if (currentStore.iconsEnabled) {
      renderIcons(sourceCtx, ctx, currentWidth, currentHeight, currentStore.iconsParams)
    }

    if (currentStore.contourEnabled) {
      renderContour(sourceCtx, ctx, currentWidth, currentHeight, currentStore.contourParams)
    }

    if (currentStore.decompEnabled) {
      renderDecomp(sourceCtx, ctx, currentWidth, currentHeight, currentStore.decompParams)
    }

    if (currentStore.mirrorEnabled) {
      renderMirror(sourceCtx, ctx, currentWidth, currentHeight, currentStore.mirrorParams)
    }

    if (currentStore.sliceEnabled) {
      renderSlice(sourceCtx, ctx, currentWidth, currentHeight, currentStore.sliceParams)
    }

    if (currentStore.thGridEnabled) {
      renderThGrid(sourceCtx, ctx, currentWidth, currentHeight, currentStore.thGridParams)
    }

    if (currentStore.ledEnabled) {
      renderLed(sourceCtx, ctx, currentWidth, currentHeight, currentStore.ledParams)
    }

    // Render WebGL effects (they render to their own canvases)
    const timeSeconds = time * 0.001

    if (currentStore.cloudEnabled && cloudEffectRef.current) {
      cloudEffectRef.current.render(source, currentStore.cloudParams, timeSeconds)
    }

    if (currentStore.slitEnabled && slitEffectRef.current) {
      slitEffectRef.current.render(source, currentStore.slitParams)
    }

    if (currentStore.voronoiEnabled && voronoiEffectRef.current) {
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

  // Don't render if no effects are enabled
  if (!anyEnabled) return null

  // Check which WebGL effects need canvases
  const needsCloudCanvas = store.cloudEnabled
  const needsSlitCanvas = store.slitEnabled
  const needsVoronoiCanvas = store.voronoiEnabled

  return (
    <>
      {/* Main Canvas 2D effects layer */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 15 }}
      />

      {/* WebGL Cloud effect layer */}
      {needsCloudCanvas && (
        <canvas
          ref={cloudCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 16 }}
        />
      )}

      {/* WebGL Slit-scan effect layer */}
      {needsSlitCanvas && (
        <canvas
          ref={slitCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 17 }}
        />
      )}

      {/* WebGL Voronoi effect layer */}
      {needsVoronoiCanvas && (
        <canvas
          ref={voronoiCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 18 }}
        />
      )}
    </>
  )
}
