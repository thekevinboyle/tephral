/**
 * StrandOverlay.tsx
 * Main orchestrator component for Death Stranding-inspired visual effects
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStrandStore } from '../../stores/strandStore'

interface StrandOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}

export function StrandOverlay({ sourceCanvas, width, height }: StrandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
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

  const renderFrame = useCallback((_time: number) => {
    if (!isRunningRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const source = sourceCanvasRef.current

    if (!canvas || !ctx || !source) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const { width: w, height: h } = sizeRef.current

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // TODO: Render effects here - will be implemented in Task 5+

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
