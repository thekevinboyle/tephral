/**
 * StrandOverlay.tsx
 * Main orchestrator component for Death Stranding-inspired visual effects
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStrandStore } from '../../stores/strandStore'
import { renderBeachStatic } from './strand/beachStaticEffect'
import { renderHandprints } from './strand/handprintsEffect'

interface StrandOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}

export function StrandOverlay({ sourceCanvas, width, height }: StrandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const lastTimeRef = useRef<number>(0)
  const storeRef = useRef(useStrandStore.getState())
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  const store = useStrandStore()
  storeRef.current = store
  sourceCanvasRef.current = sourceCanvas
  sizeRef.current = { width, height }

  const anyEnabled =
    store.handprintsEnabled ||
    store.tarSpreadEnabled ||
    store.timefallEnabled ||
    store.voidOutEnabled ||
    store.strandWebEnabled ||
    store.bridgeLinkEnabled ||
    store.chiralPathEnabled ||
    store.umbilicalEnabled ||
    store.odradekEnabled ||
    store.chiraliumEnabled ||
    store.beachStaticEnabled ||
    store.doomsEnabled ||
    store.chiralCloudEnabled ||
    store.bbPodEnabled ||
    store.seamEnabled ||
    store.extinctionEnabled

  const renderFrame = useCallback((time: number) => {
    if (!isRunningRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const source = sourceCanvasRef.current

    if (!canvas || !ctx || !source) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const { width: w, height: h } = sizeRef.current
    const currentStore = storeRef.current
    const timeSeconds = time * 0.001

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // Create offscreen canvas for reading source
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas')
      offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d')
    }
    const offscreen = offscreenCanvasRef.current
    const sourceCtx = offscreenCtxRef.current

    if (offscreen && sourceCtx) {
      if (offscreen.width !== w || offscreen.height !== h) {
        offscreen.width = w
        offscreen.height = h
      }
      sourceCtx.drawImage(source, 0, 0, w, h)

      const deltaTime = lastTimeRef.current ? timeSeconds - lastTimeRef.current : 0.016
      lastTimeRef.current = timeSeconds

      if (currentStore.handprintsEnabled) {
        renderHandprints(ctx, w, h, currentStore.handprintsParams, timeSeconds, deltaTime)
      }

      if (currentStore.beachStaticEnabled) {
        renderBeachStatic(sourceCtx, ctx, w, h, currentStore.beachStaticParams, timeSeconds)
      }
    }

    frameIdRef.current = requestAnimationFrame(renderFrame)
  }, [])

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

  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  if (!anyEnabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    />
  )
}
