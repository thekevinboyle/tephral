/**
 * StrandOverlay.tsx
 * Main orchestrator component for Death Stranding-inspired visual effects
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStrandStore } from '../../stores/strandStore'
import { getSharedFrame } from './sharedReadback'

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
    // strand_handprints is GPU-ported (StrandHandprintsEffect) — no longer
    // part of the CPU overlay's render loop; store.handprintsEnabled
    // intentionally excluded here, same as timefall/voidOut above.
    // strand_tar is GPU-ported (StrandTarEffect) — store.tarSpreadEnabled
    // intentionally excluded here, same as voidOut/beach/cloud above.
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
    // strand_path is GPU-ported (StrandChiralPathEffect) — the LAST STRAND
    // CPU dispatch; store.chiralPathEnabled intentionally excluded here,
    // same as every other id above. anyEnabled is now unconditionally false
    // (kept as an explicit `false` literal, not deleted, so the component
    // still compiles/renders its "no-op" branch — StrandOverlay itself is
    // NOT deleted here, that's Task 15's teardown).
    // strand_umbilical is GPU-ported (StrandUmbilicalEffect) —
    // store.umbilicalEnabled intentionally excluded here, same as timefall
    // above.
    // strand_odradek is GPU-ported (StrandOdradekEffect) —
    // store.odradekEnabled intentionally excluded here, same as timefall
    // above.
    // strand_chiralium is GPU-ported (StrandChiraliumEffect) —
    // store.chiraliumEnabled intentionally excluded here, same as
    // handprints/timefall/voidOut above.
    // strand_beach is GPU-ported (StrandBeachEffect) — store.beachStaticEnabled
    // intentionally excluded here, same as voidOut above.
    // strand_dooms is GPU-ported (StrandDoomsEffect) — store.doomsEnabled
    // intentionally excluded here, same as voidOut above.
    // strand_cloud is GPU-ported (StrandCloudEffect) — store.chiralCloudEnabled
    // intentionally excluded here, same as beach/voidOut above.
    // strand_bbpod is GPU-ported (StrandBbpodEffect) — store.bbPodEnabled
    // intentionally excluded here, same as handprints/chiralium above.
    // strand_seam is GPU-ported (StrandSeamEffect) — store.seamEnabled
    // intentionally excluded here, same as beach/voidOut/cloud above.
    // strand_extinction is GPU-ported (StrandExtinctionEffect) —
    // store.extinctionEnabled intentionally excluded here, same as
    // tar/voidOut/beach/cloud above.
    false

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

      lastTimeRef.current = timeSeconds

      // strand_handprints is GPU-ported (StrandHandprintsEffect in
      // EffectPipeline) — its CPU dispatch is removed; see paramSync.ts
      // pushStrandPorts().

      // strand_tar is GPU-ported (StrandTarEffect in EffectPipeline) — its
      // CPU dispatch is removed; see paramSync.ts pushStrandPorts().

      // strand_timefall, strand_beach, strand_voidout, strand_web,
      // strand_bridge, and strand_dooms are GPU-ported (StrandTimefallEffect
      // / StrandBeachEffect / StrandVoidoutEffect / StrandWebEffect /
      // StrandBridgeEffect / StrandDoomsEffect in EffectPipeline) — their CPU
      // dispatch is removed; see paramSync.ts pushStrandPorts().

      // strand_path is GPU-ported (StrandChiralPathEffect in EffectPipeline)
      // — its CPU dispatch is removed; see paramSync.ts pushStrandPorts().

      // strand_chiralium is GPU-ported (StrandChiraliumEffect in
      // EffectPipeline) — its CPU dispatch is removed; see paramSync.ts
      // pushStrandPorts().

      // strand_odradek is GPU-ported (StrandOdradekEffect in
      // EffectPipeline) — its CPU dispatch is removed; see paramSync.ts
      // pushStrandPorts().

      // strand_cloud and strand_seam are GPU-ported (StrandCloudEffect /
      // StrandSeamEffect in EffectPipeline) — their CPU dispatch is
      // removed; see paramSync.ts pushStrandPorts().

      // strand_extinction is GPU-ported (StrandExtinctionEffect in
      // EffectPipeline) — its CPU dispatch is removed; see paramSync.ts
      // pushStrandPorts().

      // strand_bbpod is GPU-ported (StrandBbpodEffect in EffectPipeline) —
      // its CPU dispatch is removed; see paramSync.ts pushStrandPorts().
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
