import { useEffect, useState, useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'

export function HeaderBar() {
  const { source } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  // FPS counter
  const [fps, setFps] = useState(0)
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() })

  useEffect(() => {
    let rafId: number
    const tick = () => {
      fpsRef.current.frames++
      const now = performance.now()
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frames)
        fpsRef.current.frames = 0
        fpsRef.current.lastTime = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const hasSource = source !== 'none'
  const sourceLabel = source === 'none' ? 'NO SRC' : source === 'webcam' ? 'CAM' : 'FILE'

  return (
    <div
      className="flex items-center"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <span
        className="text-[11px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        SEG_F4ULT
      </span>

      {/* Divider */}
      <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* Source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          SRC
        </span>
        <SourceSelector variant="compact" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status badges */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: hasSource ? 'var(--accent-dim)' : 'var(--text-ghost)' }}
        >
          {sourceLabel}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: 'var(--text-ghost)', cursor: 'default' }}
          onMouseEnter={() => setStatusText(getUIStatusText('fps'))}
          onMouseLeave={() => setStatusText(null)}
        >
          {fps} FPS
        </span>
      </div>
    </div>
  )
}
