import { useCallback, useState } from 'react'
import type { Preset } from '../../stores/presetLibraryStore'

interface PresetRowProps {
  preset: Preset
  onLoad: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function PresetRow({ preset, onLoad, onContextMenu }: PresetRowProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = useCallback(() => {
    onLoad()
  }, [onLoad])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onContextMenu(e)
    },
    [onContextMenu]
  )

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors rounded"
      style={{
        backgroundColor: isHovered ? '#f0f0f0' : 'transparent',
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 rounded overflow-hidden"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#e0e0e0',
        }}
      >
        {preset.thumbnail ? (
          <img
            src={preset.thumbnail}
            alt={preset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: '#999999' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className="flex-1 text-[14px] truncate"
        style={{ color: '#333333' }}
      >
        {preset.name}
      </span>

      {/* Hover actions */}
      {isHovered && (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onContextMenu(e)
            }}
            className="p-1 rounded hover:bg-gray-200"
            title="More options"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
