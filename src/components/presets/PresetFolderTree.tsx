import { useCallback } from 'react'
import type { Folder, Preset } from '../../stores/presetLibraryStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'
import { PresetRow } from './PresetRow'
import { ChevronDownIcon, FolderIcon } from '../ui/DotMatrixIcons'

interface PresetFolderTreeProps {
  folders: Folder[]
  presets: Preset[]
  onPresetLoad: (preset: Preset) => void
  onPresetContextMenu: (preset: Preset, e: React.MouseEvent) => void
  onFolderContextMenu: (folder: Folder, e: React.MouseEvent) => void
}

interface FolderNodeProps {
  folder: Folder
  folders: Folder[]
  presets: Preset[]
  depth: number
  onPresetLoad: (preset: Preset) => void
  onPresetContextMenu: (preset: Preset, e: React.MouseEvent) => void
  onFolderContextMenu: (folder: Folder, e: React.MouseEvent) => void
}

function FolderNode({
  folder,
  folders,
  presets,
  depth,
  onPresetLoad,
  onPresetContextMenu,
  onFolderContextMenu,
}: FolderNodeProps) {
  const { collapsedFolders, toggleFolderCollapse } = usePresetLibraryStore()
  const isCollapsed = collapsedFolders.has(folder.id)

  // Get child folders and presets
  const childFolders = folders
    .filter((f) => f.parentId === folder.id)
    .sort((a, b) => a.order - b.order)
  const folderPresets = presets
    .filter((p) => p.folderId === folder.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const handleToggle = useCallback(() => {
    toggleFolderCollapse(folder.id)
  }, [folder.id, toggleFolderCollapse])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onFolderContextMenu(folder, e)
    },
    [folder, onFolderContextMenu]
  )

  return (
    <div style={{ paddingLeft: depth > 0 ? '12px' : '0' }}>
      {/* Folder header */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded transition-colors hover:bg-gray-100"
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
      >
        {/* Collapse indicator */}
        <div
          className="w-4 h-4 flex items-center justify-center transition-transform"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDownIcon size={10} color="var(--text-muted)" />
        </div>

        {/* Folder icon */}
        <FolderIcon size={14} color="var(--text-muted)" />

        {/* Folder name */}
        <span
          className="flex-1 text-[14px] font-medium truncate"
          style={{ color: 'var(--text-muted)' }}
        >
          {folder.name}
        </span>

        {/* Preset count */}
        <span
          className="text-[13px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {folderPresets.length}
        </span>
      </div>

      {/* Contents (only if not collapsed) */}
      {!isCollapsed && (
        <div>
          {/* Child folders first */}
          {childFolders.map((childFolder) => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              folders={folders}
              presets={presets}
              depth={depth + 1}
              onPresetLoad={onPresetLoad}
              onPresetContextMenu={onPresetContextMenu}
              onFolderContextMenu={onFolderContextMenu}
            />
          ))}

          {/* Then presets */}
          <div style={{ paddingLeft: '16px' }}>
            {folderPresets.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                onLoad={() => onPresetLoad(preset)}
                onContextMenu={(e) => onPresetContextMenu(preset, e)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PresetFolderTree({
  folders,
  presets,
  onPresetLoad,
  onPresetContextMenu,
  onFolderContextMenu,
}: PresetFolderTreeProps) {
  // Get root folders (parentId === null)
  const rootFolders = folders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="py-1">
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          presets={presets}
          depth={0}
          onPresetLoad={onPresetLoad}
          onPresetContextMenu={onPresetContextMenu}
          onFolderContextMenu={onFolderContextMenu}
        />
      ))}
    </div>
  )
}
