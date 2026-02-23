import { useEffect, useState, useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'

export function HeaderBar() {
  const { source } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)
  const appMode = useUIStore((s) => s.appMode)
  const setAppMode = useUIStore((s) => s.setAppMode)

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
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
      }}
    >
      {/* Brand */}
      <span
        className="text-[12px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        SEG_F4ULT
      </span>

      {/* Divider — dual-tone */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          SRC
        </span>
        <SourceSelector variant="compact" />
      </div>

      {/* Divider — dual-tone */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          MODE
        </span>
        {(['single', 'timeline'] as const).map((mode) => {
          const isActive = appMode === mode
          const label = mode === 'single' ? 'FX' : 'SEQ'
          const statusKey = mode === 'single' ? 'modeSingle' : 'modeTimeline'
          return (
            <button
              key={mode}
              onClick={() => setAppMode(mode)}
              onMouseEnter={() => setStatusText(getUIStatusText(statusKey))}
              onMouseLeave={() => setStatusText(null)}
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{
                padding: '2px 8px',
                borderRadius: 3,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                color: isActive ? 'var(--bg-deep)' : 'var(--text-ghost)',
                boxShadow: isActive ? '0 0 6px var(--accent-dim)' : 'var(--shadow-inset)',
              }}
            >
              {label}
            </button>
          )
        })}
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
          style={{
            color: 'var(--text-ghost)',
            cursor: 'default',
            padding: '1px 6px',
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.3)',
            boxShadow: 'var(--shadow-inset)',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('fps'))}
          onMouseLeave={() => setStatusText(null)}
        >
          {fps} FPS
        </span>
      </div>
    </div>
  )
}
