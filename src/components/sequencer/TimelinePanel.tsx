import { useState, useCallback, useRef, useEffect } from 'react'
import { PlayIcon, StopIcon, LoopIcon } from '../ui/DotMatrixIcons'
import { useTimelineStore, type TimelineTriggerMode } from '../../stores/timelineStore'
import { useClipStore } from '../../stores/clipStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { extractFramesFromClip } from '../../utils/clipFrameExtractor'

/**
 * Get the duration of a video from its URL.
 * Reuses the same pattern as ClipBin.
 */
async function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'metadata'
    video.src = url

    video.onloadedmetadata = () => {
      resolve(video.duration)
      video.remove()
    }

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
      video.remove()
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger mode labels
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGER_LABELS: Record<TimelineTriggerMode, string> = {
  kickDetection: 'Kick',
  audioThreshold: 'Thresh',
  manual: 'Manual',
  timed: 'Timed',
}

const TRIGGER_MODES: TimelineTriggerMode[] = ['kickDetection', 'audioThreshold', 'timed', 'manual']

// ═══════════════════════════════════════════════════════════════════════════
// Transport Row
// ═══════════════════════════════════════════════════════════════════════════

function TimelineTransportRow() {
  const {
    isPlaying, isActive, isLooping, defaultTriggerMode, defaultThreshold,
    play, stop, activate, deactivate, setLooping, setDefaultTriggerMode, setDefaultThreshold,
    clips,
  } = useTimelineStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  const handlePlayStop = () => {
    if (isPlaying) {
      stop()
    } else {
      if (!isActive) activate()
      play()
    }
  }

  const handleDeactivate = () => {
    stop()
    deactivate()
  }

  return (
    <div
      className="px-3 py-1.5 flex items-center gap-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Play/Stop */}
      <button
        onClick={handlePlayStop}
        disabled={clips.length === 0}
        className="w-6 h-6 flex items-center justify-center rounded-sm"
        style={{
          backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-surface)',
          border: isPlaying ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: isPlaying ? '0 0 6px var(--accent-glow)' : 'none',
          opacity: clips.length === 0 ? 0.4 : 1,
        }}
        onMouseEnter={() => setStatusText(getUIStatusText('seqPlayStop'))}
        onMouseLeave={() => setStatusText(null)}
      >
        {isPlaying ? (
          <StopIcon size={10} color="var(--text-primary)" />
        ) : (
          <PlayIcon size={10} color="var(--text-muted)" />
        )}
      </button>

      {/* Loop */}
      <button
        onClick={() => setLooping(!isLooping)}
        className="w-6 h-6 flex items-center justify-center rounded-sm"
        style={{
          backgroundColor: isLooping ? 'var(--accent)' : 'var(--bg-surface)',
          border: isLooping ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: isLooping ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: isLooping ? '0 0 4px var(--accent-glow)' : 'none',
        }}
        title="Loop"
      >
        <LoopIcon size={10} color={isLooping ? 'var(--text-primary)' : 'var(--text-muted)'} />
      </button>

      {/* Active indicator */}
      {isActive && (
        <button
          onClick={handleDeactivate}
          className="h-6 px-1.5 text-[10px] font-medium rounded-sm"
          style={{
            backgroundColor: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            boxShadow: '0 0 4px var(--accent-glow)',
          }}
          title="Click to deactivate timeline"
        >
          Active
        </button>
      )}

      <div className="flex-1" />

      {/* Default trigger mode */}
      <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
        Trigger
      </span>
      <select
        value={defaultTriggerMode}
        onChange={(e) => setDefaultTriggerMode(e.target.value as TimelineTriggerMode)}
        className="h-6 px-1 text-[10px] rounded-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          outline: 'none',
        }}
      >
        {TRIGGER_MODES.map((mode) => (
          <option key={mode} value={mode}>{TRIGGER_LABELS[mode]}</option>
        ))}
      </select>

      {/* Default threshold */}
      {defaultTriggerMode === 'audioThreshold' && (
        <>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            Thr
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={defaultThreshold}
            onChange={(e) => setDefaultThreshold(parseFloat(e.target.value))}
            className="w-12"
            style={{ accentColor: '#FF0055' }}
          />
          <span className="text-[10px] tabular-nums w-6 text-right" style={{ color: 'var(--text-muted)' }}>
            {(defaultThreshold * 100).toFixed(0)}
          </span>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Drag constants
// ═══════════════════════════════════════════════════════════════════════════

const CLIP_WIDTH = 80
const TRANSITION_WIDTH = 16
const GAP = 4 // gap-1 = 0.25rem = 4px
const DRAG_THRESHOLD_PX = 4

// ═══════════════════════════════════════════════════════════════════════════
// Timeline Clip Block
// ═══════════════════════════════════════════════════════════════════════════

function TimelineClipBlock({
  clip,
  index,
  isActive,
  isSelected,
  isDragging,
  onSelect,
  onRemove,
  onDragStart,
  blockRef,
}: {
  clip: ReturnType<typeof useTimelineStore.getState>['clips'][0]
  index: number
  isActive: boolean
  isSelected: boolean
  isDragging: boolean
  onSelect: () => void
  onRemove: () => void
  onDragStart: (e: React.MouseEvent) => void
  blockRef: (el: HTMLDivElement | null) => void
}) {
  const storeClips = useClipStore((s) => s.clips)
  const sourceClip = storeClips.find((c) => c.id === clip.clipId)

  return (
    <div
      ref={blockRef}
      className="flex-shrink-0 flex flex-col items-center relative group"
      onMouseDown={onDragStart}
      onClick={onSelect}
      style={{
        width: CLIP_WIDTH,
        opacity: isDragging ? 0.4 : sourceClip ? 1 : 0.4,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'opacity 0.15s ease',
        userSelect: 'none',
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-full rounded-sm overflow-hidden relative"
        style={{
          height: 45,
          border: isDragging
            ? '2px dashed var(--text-muted)'
            : isActive
              ? '2px solid var(--accent)'
              : isSelected
                ? '2px solid var(--text-muted)'
                : '1px solid var(--border)',
          boxShadow: isActive && !isDragging ? '0 0 8px var(--accent-glow)' : 'none',
        }}
      >
        {sourceClip ? (
          <img
            src={sourceClip.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            style={{ backgroundColor: '#000', pointerEvents: 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#111' }}>
            <span className="text-[8px]" style={{ color: 'var(--text-ghost)' }}>?</span>
          </div>
        )}

        {/* Active playhead indicator */}
        {isActive && !isDragging && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}

        {/* Remove button (on hover, hidden while dragging) */}
        {!isDragging && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'var(--text-muted)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            x
          </button>
        )}
      </div>

      {/* Clip info */}
      <div className="flex items-center gap-0.5 mt-0.5">
        <span className="text-[8px] tabular-nums" style={{ color: 'var(--text-ghost)' }}>
          {index + 1}
        </span>
        <span className="text-[8px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Trigger mode indicator */}
      <span className="text-[7px] uppercase" style={{ color: 'var(--text-ghost)' }}>
        {TRIGGER_LABELS[clip.triggerMode]}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Drop insertion indicator
// ═══════════════════════════════════════════════════════════════════════════

function InsertionIndicator() {
  return (
    <div
      className="flex-shrink-0"
      style={{
        width: 3,
        alignSelf: 'stretch',
        backgroundColor: 'var(--accent)',
        borderRadius: 2,
        boxShadow: '0 0 6px var(--accent-glow)',
        margin: '4px 0',
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Timeline Track (horizontal scrollable clip strip)
// ═══════════════════════════════════════════════════════════════════════════

function TimelineTrack() {
  const {
    clips, currentClipIndex, isPlaying, selectedTimelineClipId,
    selectTimelineClip, removeClipFromTimeline, addClipToTimeline, reorderClip,
  } = useTimelineStore()
  const storeClips = useClipStore((s) => s.clips)
  const addClip = useClipStore((s) => s.addClip)

  // ── File import state ─────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importProgress, setImportProgress] = useState<number | null>(null)
  const isImporting = importProgress !== null

  // Import a video file: add to clipStore, then auto-add to timeline
  const importVideoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      console.warn('[Timeline] Only video files supported, got:', file.type)
      return
    }

    console.log('[Timeline] importing file:', file.name)
    setImportProgress(0)

    const url = URL.createObjectURL(file)
    try {
      const duration = await getVideoDuration(url)

      const frames = await extractFramesFromClip(url, duration, (progress) => {
        setImportProgress(Math.round(progress * 100))
      })

      await addClip(file, duration, frames)

      // addClip appends to the end — grab the newest clip and add it to timeline
      const allClips = useClipStore.getState().clips
      const newClip = allClips[allClips.length - 1]
      if (newClip) {
        addClipToTimeline(newClip.id, newClip.duration)
        console.log('[Timeline] file imported and added to timeline:', newClip.id)
      }
    } catch (error) {
      console.error('[Timeline] Failed to import file:', error)
    } finally {
      setImportProgress(null)
      URL.revokeObjectURL(url)
    }
  }, [addClip, addClipToTimeline])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const videoFiles = Array.from(files).filter((f) => f.type.startsWith('video/'))
      ;(async () => {
        for (const file of videoFiles) {
          await importVideoFile(file)
        }
      })()
    }
    e.target.value = ''
  }, [importVideoFile])

  // ── External drop (files from filesystem OR clips from ClipBin) ───────
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragType, setDragType] = useState<'file' | 'clip' | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const hasClipId = e.dataTransfer.types.includes('application/x-clip-id')
    const hasFiles = e.dataTransfer.types.includes('Files')

    if (hasClipId) {
      e.dataTransfer.dropEffect = 'copy'
      setDragType('clip')
      setIsDragOver(true)
    } else if (hasFiles) {
      e.dataTransfer.dropEffect = 'copy'
      setDragType('file')
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
    setDragType(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragType(null)

    // 1. Clip from ClipBin
    const clipId = e.dataTransfer.getData('application/x-clip-id')
    if (clipId) {
      const clip = storeClips.find((c) => c.id === clipId)
      if (clip) {
        addClipToTimeline(clipId, clip.duration)
        console.log('[Timeline] clip dropped from bin:', clipId)
      }
      return
    }

    // 2. Video files from filesystem
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const videoFiles = Array.from(files).filter((f) => f.type.startsWith('video/'))
      // Process sequentially so each clip appends in order
      ;(async () => {
        for (const file of videoFiles) {
          await importVideoFile(file)
        }
      })()
    }
  }, [storeClips, addClipToTimeline, importVideoFile])

  // ── Internal reorder drag (mouse-based) ───────────────────────────────
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null)
  const [isDraggingInternal, setIsDraggingInternal] = useState(false)

  const mouseStartRef = useRef<{ x: number; index: number } | null>(null)
  const dragTargetRef = useRef<number | null>(null)
  const clipElementsRef = useRef<(HTMLDivElement | null)[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync with state so mouseup handler can read latest value
  dragTargetRef.current = dragTargetIndex

  const setClipRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      clipElementsRef.current[index] = el
    }
  }, [])

  // Compute target drop index from cursor X position
  const computeTargetIndex = useCallback((clientX: number): number => {
    const elements = clipElementsRef.current
    let target = 0

    for (let i = 0; i < clips.length; i++) {
      const el = elements[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      if (clientX > center) {
        target = i + 1
      }
    }

    return Math.max(0, Math.min(clips.length, target))
  }, [clips.length])

  // Start tracking potential drag on mousedown
  const handleClipMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    // Don't start drag from buttons
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()

    mouseStartRef.current = { x: e.clientX, index }
    console.log('[Timeline] mousedown on clip', index)
  }, [])

  // Window-level mouse handlers for drag tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const start = mouseStartRef.current
      if (!start) return

      const dx = Math.abs(e.clientX - start.x)

      // Haven't passed threshold yet — wait for enough movement
      if (!isDraggingInternal && dx < DRAG_THRESHOLD_PX) return

      // Enter drag mode
      if (!isDraggingInternal) {
        console.log('[Timeline] drag started, source index:', start.index)
        setDragSourceIndex(start.index)
        setIsDraggingInternal(true)
        document.body.style.cursor = 'grabbing'
      }

      // Compute target position from mouse X
      const target = computeTargetIndex(e.clientX)
      if (target !== dragTargetRef.current) {
        console.log('[Timeline] drag target:', target)
        setDragTargetIndex(target)
      }
    }

    const handleMouseUp = () => {
      const start = mouseStartRef.current
      if (!start) return

      if (isDraggingInternal && dragTargetRef.current !== null) {
        const from = start.index
        let to = dragTargetRef.current

        // Adjust: when dragging right, removing source shifts indices left
        if (to > from) to -= 1

        if (to !== from) {
          console.log('[Timeline] reorder:', from, '->', to)
          reorderClip(from, to)
        } else {
          console.log('[Timeline] drag ended at same position, no reorder')
        }
      } else if (!isDraggingInternal) {
        // Was just a click (didn't pass threshold), selection handled by onClick
        console.log('[Timeline] click (no drag)')
      }

      // Clean up
      mouseStartRef.current = null
      setDragSourceIndex(null)
      setDragTargetIndex(null)
      setIsDraggingInternal(false)
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isDraggingInternal, computeTargetIndex, reorderClip])

  // Auto-scroll to active clip during playback
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return
    const container = scrollRef.current
    const slotWidth = CLIP_WIDTH + GAP + TRANSITION_WIDTH + GAP
    const targetScroll = currentClipIndex * slotWidth - container.clientWidth / 2 + CLIP_WIDTH / 2
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }, [currentClipIndex, isPlaying])

  // ── Render helpers ────────────────────────────────────────────────────

  const dragOverlayText = dragType === 'file' ? 'Drop video file to import' : 'Drop to add'

  // Hidden file input for "Add Clip" button
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*"
      multiple
      onChange={handleFileInputChange}
      className="hidden"
    />
  )

  // Import progress indicator (inline in the track)
  const importIndicator = isImporting && (
    <div
      className="flex-shrink-0 flex flex-col items-center justify-center rounded-sm"
      style={{
        width: CLIP_WIDTH,
        height: 45,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--accent)',
        boxShadow: '0 0 8px var(--accent-glow)',
      }}
    >
      <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
        Import
      </span>
      <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent)' }}>
        {importProgress}%
      </span>
      <div
        className="mt-0.5 rounded-sm overflow-hidden"
        style={{ width: 50, height: 2, backgroundColor: 'var(--border)' }}
      >
        <div
          className="h-full transition-all duration-150"
          style={{ width: `${importProgress}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>
    </div>
  )

  // "Add Clip" button at the end of the track
  const addClipButton = !isImporting && (
    <button
      onClick={() => fileInputRef.current?.click()}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex-shrink-0 flex items-center justify-center rounded-sm transition-all hover:scale-105"
      style={{
        width: CLIP_WIDTH,
        height: 45,
        backgroundColor: 'var(--bg-surface)',
        border: '1px dashed var(--border)',
        cursor: 'pointer',
      }}
      title="Add video clip"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-ghost)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )

  // ── Render ────────────────────────────────────────────────────────────

  if (clips.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2"
        style={{
          border: isDragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          backgroundColor: isDragOver ? 'rgba(255, 0, 85, 0.08)' : 'transparent',
          borderRadius: '4px',
          margin: '8px',
          transition: 'all 0.15s ease',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fileInput}
        {isImporting ? (
          importIndicator
        ) : (
          <>
            <span
              className="text-[11px]"
              style={{ color: isDragOver ? 'var(--accent)' : 'var(--text-ghost)' }}
            >
              {isDragOver ? dragOverlayText : 'Drop video files or clips here'}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-6 px-3 text-[10px] font-medium rounded-sm transition-colors hover:brightness-125"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Add Clip
            </button>
          </>
        )}
      </div>
    )
  }

  // Build rendered items: clips with optional insertion indicator between them
  const showIndicatorAt = isDraggingInternal && dragSourceIndex !== null && dragTargetIndex !== null
    // Don't show indicator immediately adjacent to the source (would be a no-op drop)
    ? (dragTargetIndex !== dragSourceIndex && dragTargetIndex !== dragSourceIndex + 1
      ? dragTargetIndex
      : null)
    : null

  return (
    <div
      className="flex-1 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {fileInput}

      {/* External drag overlay (files or ClipBin clips) */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: 'rgba(255, 0, 85, 0.1)',
            border: '2px dashed var(--accent)',
          }}
        >
          <span className="text-[11px]" style={{ color: 'var(--accent)' }}>
            {dragOverlayText}
          </span>
        </div>
      )}

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 h-full px-3 overflow-x-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        {clips.map((clip, index) => (
          <div key={clip.id} className="flex items-center gap-1">
            {/* Insertion indicator BEFORE this clip */}
            {showIndicatorAt === index && <InsertionIndicator />}

            <TimelineClipBlock
              clip={clip}
              index={index}
              isActive={isPlaying && currentClipIndex === index}
              isSelected={selectedTimelineClipId === clip.id}
              isDragging={isDraggingInternal && dragSourceIndex === index}
              onSelect={() => {
                if (!isDraggingInternal) selectTimelineClip(clip.id)
              }}
              onRemove={() => removeClipFromTimeline(clip.id)}
              onDragStart={(e) => handleClipMouseDown(index, e)}
              blockRef={setClipRef(index)}
            />

            {/* Transition indicator between clips */}
            {index < clips.length - 1 && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: TRANSITION_WIDTH }}
              >
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-ghost)' }}
                  title="Audio-reactive transition"
                >
                  &#x26A1;
                </span>
              </div>
            )}

            {/* Insertion indicator AFTER the last clip */}
            {index === clips.length - 1 && showIndicatorAt === clips.length && <InsertionIndicator />}
          </div>
        ))}

        {/* Import progress OR add button at the end */}
        {importIndicator}
        {addClipButton}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Timeline Clip Detail (selected clip settings)
// ═══════════════════════════════════════════════════════════════════════════

function TimelineClipDetail() {
  const {
    clips, selectedTimelineClipId,
    setClipTriggerMode, setClipThreshold, setClipEffects,
  } = useTimelineStore()

  const selectedClip = clips.find((c) => c.id === selectedTimelineClipId)

  if (!selectedClip) {
    return (
      <div
        className="px-3 py-2 flex items-center justify-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
          Select a clip to edit
        </span>
      </div>
    )
  }

  // Get available effects from registry
  const availableEffects = Object.keys(EFFECT_PARAM_REGISTRY)

  const toggleEffect = (effectId: string) => {
    const current = selectedClip.individualEffects[effectId]
    const newEffects = { ...selectedClip.individualEffects }
    if (current === undefined) {
      // First toggle: set to enabled
      newEffects[effectId] = true
    } else {
      // Remove the override
      delete newEffects[effectId]
    }
    setClipEffects(selectedClip.id, newEffects)
  }

  return (
    <div
      className="px-3 py-2 flex flex-col gap-1.5"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* Trigger mode */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider w-12" style={{ color: 'var(--text-ghost)' }}>
          Trigger
        </span>
        <div className="flex gap-0.5">
          {TRIGGER_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setClipTriggerMode(selectedClip.id, mode)}
              className="h-5 px-1.5 text-[9px] rounded-sm"
              style={{
                backgroundColor: selectedClip.triggerMode === mode ? 'var(--accent)' : 'var(--bg-surface)',
                border: selectedClip.triggerMode === mode ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: selectedClip.triggerMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {TRIGGER_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Threshold (only for audioThreshold mode) */}
      {selectedClip.triggerMode === 'audioThreshold' && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider w-12" style={{ color: 'var(--text-ghost)' }}>
            Thresh
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={selectedClip.threshold}
            onChange={(e) => setClipThreshold(selectedClip.id, parseFloat(e.target.value))}
            className="flex-1"
            style={{ accentColor: '#FF0055' }}
          />
          <span className="text-[10px] tabular-nums w-6 text-right" style={{ color: 'var(--text-muted)' }}>
            {(selectedClip.threshold * 100).toFixed(0)}
          </span>
        </div>
      )}

      {/* Per-clip effect overrides */}
      {Object.keys(selectedClip.individualEffects).length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            FX
          </span>
          {Object.entries(selectedClip.individualEffects).map(([effectId, enabled]) => (
            <button
              key={effectId}
              onClick={() => toggleEffect(effectId)}
              className="h-4 px-1 text-[8px] rounded-sm"
              style={{
                backgroundColor: enabled ? 'var(--accent)' : 'var(--bg-surface)',
                border: enabled ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: enabled ? 'var(--text-primary)' : 'var(--text-ghost)',
              }}
            >
              {effectId.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Add effect override dropdown */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
          +FX
        </span>
        <select
          value=""
          onChange={(e) => {
            if (!e.target.value) return
            const newEffects = { ...selectedClip.individualEffects, [e.target.value]: true }
            setClipEffects(selectedClip.id, newEffects)
          }}
          className="h-5 px-1 text-[9px] rounded-sm flex-1"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            outline: 'none',
          }}
        >
          <option value="">Add effect override...</option>
          {availableEffects
            .filter((id) => !(id in selectedClip.individualEffects))
            .map((id) => (
              <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
            ))}
        </select>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Timeline Panel
// ═══════════════════════════════════════════════════════════════════════════

export function TimelinePanel() {
  const { isActive, clips } = useTimelineStore()

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: isActive ? 'rgba(255, 0, 85, 0.08)' : 'transparent',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{
            backgroundColor: isActive ? 'var(--accent)' : 'var(--text-ghost)',
            boxShadow: isActive ? '0 0 6px var(--accent-glow)' : 'none',
          }}
        />
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: isActive ? 'var(--accent)' : 'var(--text-ghost)' }}
        >
          Timeline
        </span>
        <div className="flex-1" />
        <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-ghost)' }}>
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transport */}
      <TimelineTransportRow />

      {/* Track */}
      <div
        className="flex-1 min-h-0"
        style={{ borderBottom: clips.length > 0 ? '1px solid var(--border)' : 'none' }}
      >
        <TimelineTrack />
      </div>

      {/* Detail */}
      <TimelineClipDetail />
    </div>
  )
}
