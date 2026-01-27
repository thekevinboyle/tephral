import { useEffect, useRef, useCallback } from 'react'
import { usePresetLibraryStore, DEFAULT_FOLDERS } from '../../stores/presetLibraryStore'
import { exportPreset } from '../../utils/presetIO'

interface ContextMenuPosition {
  x: number
  y: number
}

interface PresetContextMenuProps {
  presetId: string
  presetName: string
  position: ContextMenuPosition
  onClose: () => void
  onRename: () => void
}

export function PresetContextMenu({
  presetId,
  presetName,
  position,
  onClose,
  onRename,
}: PresetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { folders, deletePreset, movePreset } = usePresetLibraryStore()

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleRename = useCallback(() => {
    onRename()
    onClose()
  }, [onRename, onClose])

  const handleDelete = useCallback(async () => {
    if (confirm(`Delete "${presetName}"?`)) {
      await deletePreset(presetId)
    }
    onClose()
  }, [presetId, presetName, deletePreset, onClose])

  const handleExport = useCallback(async () => {
    try {
      await exportPreset(presetId)
    } catch (err) {
      console.error('Export failed:', err)
    }
    onClose()
  }, [presetId, onClose])

  const handleMoveTo = useCallback(
    async (folderId: string) => {
      await movePreset(presetId, folderId)
      onClose()
    },
    [presetId, movePreset, onClose]
  )

  // Get moveable folders (exclude the preset's current folder)
  const moveableFolders = folders.filter((f) => f.parentId === null)

  // Adjust position to stay on screen
  const adjustedStyle = {
    left: Math.min(position.x, window.innerWidth - 180),
    top: Math.min(position.y, window.innerHeight - 300),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 py-1 rounded-lg shadow-lg"
      style={{
        ...adjustedStyle,
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
        minWidth: '160px',
      }}
    >
      {/* Rename */}
      <MenuItem onClick={handleRename}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Rename
      </MenuItem>

      {/* Move To submenu */}
      <div className="relative group">
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100"
          style={{ color: '#333333' }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[11px]">Move to</span>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Submenu */}
        <div
          className="absolute left-full top-0 ml-1 py-1 rounded-lg shadow-lg hidden group-hover:block"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            minWidth: '140px',
          }}
        >
          {moveableFolders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100"
              style={{ color: '#333333' }}
              onClick={() => handleMoveTo(folder.id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[11px]">{folder.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t my-1" style={{ borderColor: '#e5e5e5' }} />

      {/* Export */}
      <MenuItem onClick={handleExport}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Export
      </MenuItem>

      <div className="border-t my-1" style={{ borderColor: '#e5e5e5' }} />

      {/* Delete */}
      <MenuItem onClick={handleDelete} danger>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </MenuItem>
    </div>
  )
}

interface MenuItemProps {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}

function MenuItem({ children, onClick, danger }: MenuItemProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100"
      style={{ color: danger ? '#ef4444' : '#333333' }}
      onClick={onClick}
    >
      {children}
      {typeof children === 'string' && <span className="text-[11px]">{children}</span>}
    </div>
  )
}

// Folder context menu (simpler)
interface FolderContextMenuProps {
  folderId: string
  folderName: string
  position: ContextMenuPosition
  onClose: () => void
  onRename: () => void
}

export function FolderContextMenu({
  folderId,
  folderName,
  position,
  onClose,
  onRename,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { deleteFolder, createFolder } = usePresetLibraryStore()

  const isDefaultFolder = Object.values(DEFAULT_FOLDERS).includes(folderId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleRename = useCallback(() => {
    if (!isDefaultFolder) {
      onRename()
    }
    onClose()
  }, [isDefaultFolder, onRename, onClose])

  const handleDelete = useCallback(async () => {
    if (!isDefaultFolder && confirm(`Delete folder "${folderName}" and move presets to My Presets?`)) {
      await deleteFolder(folderId)
    }
    onClose()
  }, [folderId, folderName, isDefaultFolder, deleteFolder, onClose])

  const handleNewSubfolder = useCallback(async () => {
    const name = prompt('New folder name:')
    if (name?.trim()) {
      await createFolder(name.trim(), folderId)
    }
    onClose()
  }, [folderId, createFolder, onClose])

  const adjustedStyle = {
    left: Math.min(position.x, window.innerWidth - 180),
    top: Math.min(position.y, window.innerHeight - 200),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 py-1 rounded-lg shadow-lg"
      style={{
        ...adjustedStyle,
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
        minWidth: '160px',
      }}
    >
      {/* New subfolder */}
      <MenuItem onClick={handleNewSubfolder}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Subfolder
      </MenuItem>

      {!isDefaultFolder && (
        <>
          <MenuItem onClick={handleRename}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Rename
          </MenuItem>

          <div className="border-t my-1" style={{ borderColor: '#e5e5e5' }} />

          <MenuItem onClick={handleDelete} danger>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </MenuItem>
        </>
      )}
    </div>
  )
}
