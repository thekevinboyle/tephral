import { useClipStore } from '../../stores/clipStore'

/**
 * Formats duration in seconds to "M:SS" string format.
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ClipBin() {
  const clips = useClipStore((state) => state.clips)
  const selectedClipId = useClipStore((state) => state.selectedClipId)
  const selectClip = useClipStore((state) => state.selectClip)
  const removeClip = useClipStore((state) => state.removeClip)
  const clearAllClips = useClipStore((state) => state.clearAllClips)

  // Empty state
  if (clips.length === 0) {
    return (
      <div
        className="absolute bottom-3 left-3 right-3 h-16 rounded-lg flex items-center justify-center z-20"
        style={{
          backgroundColor: 'rgba(26, 26, 26, 0.6)',
          border: '1px solid rgba(51, 51, 51, 0.5)',
        }}
      >
        <span className="text-gray-500 text-xs">Record to create clips</span>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-3 left-3 right-3 rounded-lg overflow-hidden z-20"
      style={{
        backgroundColor: 'rgba(26, 26, 26, 0.85)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Horizontal scrolling container */}
      <div className="flex items-center gap-2 p-2 overflow-x-auto">
        {clips.map((clip) => (
          <div
            key={clip.id}
            role="button"
            tabIndex={0}
            className="relative flex-shrink-0 group cursor-pointer rounded-md overflow-hidden"
            style={{
              width: 80,
              height: 60,
              border: selectedClipId === clip.id ? '2px solid #3b82f6' : '2px solid transparent',
            }}
            onClick={() => selectClip(clip.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selectClip(clip.id)
              }
            }}
          >
            {/* Thumbnail */}
            <img
              src={clip.thumbnailUrl}
              alt="Clip thumbnail"
              className="w-full h-full object-cover"
              draggable={false}
            />

            {/* Duration badge - bottom right */}
            <div
              className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] tabular-nums"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'var(--bg-surface)',
              }}
            >
              {formatDuration(clip.duration)}
            </div>

            {/* Delete button - top right, appears on hover */}
            <button
              aria-label="Delete clip"
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
              }}
              onClick={(e) => {
                e.stopPropagation()
                removeClip(clip.id)
              }}
            >
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Clear All button */}
        <button
          className="flex-shrink-0 px-3 py-2 rounded-md text-xs transition-colors bg-white/10 text-gray-500 hover:bg-white/15 hover:text-gray-400"
          onClick={clearAllClips}
        >
          Clear All
        </button>
      </div>
    </div>
  )
}
