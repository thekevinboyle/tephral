import { memo, useCallback, useRef, useState, type ReactNode } from 'react'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useAudioFileDrop } from '../../hooks/useAudioFileDrop'
import { useUIStore } from '../../stores/uiStore'
import { kindsInTransfer, pickMediaFiles } from '../../utils/mediaFiles'

type DragState = null | { message: string; ok: boolean }

/**
 * Drop files from the desktop onto the output. Video/image becomes the video source, audio becomes the
 * audio source; both at once work. Only reacts to external files, so in-app drags (modulators, device
 * cards, clips) pass straight through. The clip bin keeps its own drop (it stops propagation).
 */
export const StageDropZone = memo(function StageDropZone({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const { activateFile, switchCheck } = useMediaSource()
  const loadAudio = useAudioFileDrop()
  const [drag, setDrag] = useState<DragState>(null)
  const depth = useRef(0)

  const describe = useCallback((dt: DataTransfer): DragState => {
    const k = kindsInTransfer(dt)
    if (!k.files) return null
    if (k.video && !switchCheck().allowed) return { message: "Can't change the video while recording", ok: false }
    if (k.video && k.audio) return { message: 'Drop to load video and audio', ok: true }
    if (k.video) return { message: 'Drop to load video', ok: true }
    if (k.audio) return { message: 'Drop to use as audio', ok: true }
    return { message: "Can't use this file", ok: false }
  }, [switchCheck])

  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    depth.current += 1
    setDrag(describe(e.dataTransfer))
  }
  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    const d = describe(e.dataTransfer)
    e.dataTransfer.dropEffect = d?.ok ? 'copy' : 'none'
  }
  const onDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setDrag(null)
  }
  const onDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    depth.current = 0
    setDrag(null)
    const { video, audio } = pickMediaFiles(e.dataTransfer.files)
    const status = useUIStore.getState().setStatusText
    if (!video && !audio) { status("Can't use this file: drop a video, image or audio file"); return }
    if (video) {
      if (switchCheck().allowed) activateFile(video)
      else status("Can't change the video while recording")
    }
    if (audio) loadAudio(audio)
  }

  return (
    <div
      className={className}
      style={{ ...style, position: 'relative' }}
      data-stage-drop
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {drag && (
        <div className="seg-stage-drop" data-ok={drag.ok || undefined} aria-live="polite">
          <span>{drag.message}</span>
        </div>
      )}
    </div>
  )
})
