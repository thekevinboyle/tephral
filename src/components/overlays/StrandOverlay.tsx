/**
 * StrandOverlay.tsx
 * Main orchestrator component for Death Stranding-inspired visual effects
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStrandStore } from '../../stores/strandStore'
import { getSharedFrame } from './sharedReadback'
import { renderChiralium } from './strand/chiraliumEffect'
import { renderChiralPath } from './strand/chiralPathEffect'
import { renderExtinction } from './strand/extinctionEffect'
import { renderHandprints } from './strand/handprintsEffect'
import { renderOdradek } from './strand/odradekEffect'
import { renderTarSpread } from './strand/tarSpreadEffect'
import { renderBBPod } from './strand/bbPodEffect'

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
    // strand_timefall is GPU-ported (StrandTimefallEffect) — no longer part
    // of the CPU overlay's render loop; store.timefallEnabled intentionally
    // excluded here.
    // strand_voidout is GPU-ported (StrandVoidoutEffect) — no longer part of
    // the CPU overlay's render loop; store.voidOutEnabled intentionally
    // excluded here.
    // strand_web is GPU-ported (StrandWebEffect) — store.strandWebEnabled
    // intentionally excluded here, same as voidOut above.
    // strand_bridge is GPU-ported (StrandBridgeEffect) — store.bridgeLinkEnabled
    // intentionally excluded here, same as voidOut above.
    store.chiralPathEnabled ||
    // strand_umbilical is GPU-ported (StrandUmbilicalEffect) —
    // store.umbilicalEnabled intentionally excluded here, same as timefall
    // above.
    store.odradekEnabled ||
    store.chiraliumEnabled ||
    // strand_beach is GPU-ported (StrandBeachEffect) — store.beachStaticEnabled
    // intentionally excluded here, same as voidOut above.
    // strand_dooms is GPU-ported (StrandDoomsEffect) — store.doomsEnabled
    // intentionally excluded here, same as voidOut above.
    // strand_cloud is GPU-ported (StrandCloudEffect) — store.chiralCloudEnabled
    // intentionally excluded here, same as beach/voidOut above.
    store.bbPodEnabled ||
    // strand_seam is GPU-ported (StrandSeamEffect) — store.seamEnabled
    // intentionally excluded here, same as beach/voidOut/cloud above.
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
      const shared = getSharedFrame(source)
      sourceCtx.drawImage(shared ?? source, 0, 0, w, h)

      const deltaTime = lastTimeRef.current ? timeSeconds - lastTimeRef.current : 0.016
      lastTimeRef.current = timeSeconds

      if (currentStore.handprintsEnabled) {
        renderHandprints(ctx, w, h, currentStore.handprintsParams, timeSeconds, deltaTime)
      }

      if (currentStore.tarSpreadEnabled) {
        renderTarSpread(sourceCtx, ctx, w, h, currentStore.tarSpreadParams, deltaTime)
      }

      // strand_timefall, strand_beach, strand_voidout, strand_web,
      // strand_bridge, and strand_dooms are GPU-ported (StrandTimefallEffect
      // / StrandBeachEffect / StrandVoidoutEffect / StrandWebEffect /
      // StrandBridgeEffect / StrandDoomsEffect in EffectPipeline) — their CPU
      // dispatch is removed; see paramSync.ts pushStrandPorts().

      if (currentStore.chiralPathEnabled) {
        renderChiralPath(sourceCtx, ctx, w, h, currentStore.chiralPathParams, deltaTime)
      }

      if (currentStore.chiraliumEnabled) {
        renderChiralium(sourceCtx, ctx, w, h, currentStore.chiraliumParams, timeSeconds)
      }

      if (currentStore.odradekEnabled) {
        renderOdradek(sourceCtx, ctx, w, h, currentStore.odradekParams, timeSeconds, deltaTime)
      }

      // strand_cloud and strand_seam are GPU-ported (StrandCloudEffect /
      // StrandSeamEffect in EffectPipeline) — their CPU dispatch is
      // removed; see paramSync.ts pushStrandPorts().

      if (currentStore.extinctionEnabled) {
        renderExtinction(sourceCtx, ctx, w, h, currentStore.extinctionParams, deltaTime)
      }

      if (currentStore.bbPodEnabled) {
        renderBBPod(ctx, w, h, currentStore.bbPodParams, timeSeconds)
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
