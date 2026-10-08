import { useEffect, useRef } from 'react'
import { useMediaStore } from '../stores/mediaStore'

export const NO_TIME = '--:--.--'

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/** Returns a ref for a span whose text follows the media element's currentTime, written per frame without re-rendering. */
export function useMediaTimecode() {
  const videoElement = useMediaStore((s) => s.videoElement)
  const timeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (!document.hidden && timeRef.current) {
        const t = videoElement ? fmtTime(videoElement.currentTime) : NO_TIME
        if (timeRef.current.textContent !== t) timeRef.current.textContent = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoElement])
  return timeRef
}
