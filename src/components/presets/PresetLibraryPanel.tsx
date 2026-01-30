import { useEffect, useState, useCallback, useRef } from 'react'
import { usePresetLibraryStore, DEFAULT_FOLDERS } from '../../stores/presetLibraryStore'
import type { Preset, Folder } from '../../stores/presetLibraryStore'
import { PresetFolderTree } from './PresetFolderTree'
import { PresetContextMenu, FolderContextMenu } from './PresetContextMenu'
import { importFile, openImportDialog, exportPack, captureThumbnail } from '../../utils/presetIO'
import { InfoPanel } from '../panels/InfoPanel'

interface ContextMenuState {
  type: 'preset' | 'folder'
  id: string
  name: string
  position: { x: number; y: number }
}

interface PresetLibraryPanelProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
}

export function PresetLibraryPanel({ canvasRef }: PresetLibraryPanelProps) {
  const {
    presets,
    folders,
    isLoading,
    searchQuery,
    loadFromDB,
    createPreset,
    loadPreset,
    renamePreset,
    renameFolder,
    setSearchQuery,
    getFilteredPresets,
  } = usePresetLibraryStore()

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameState, setRenameState] = useState<{ id: string; type: 'preset' | 'folder'; name: string } | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Load presets on mount
  useEffect(() => {
    loadFromDB()
  }, [loadFromDB])

  // Focus rename input when showing
  useEffect(() => {
    if (renameState && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameState])

  const handlePresetLoad = useCallback(
    (preset: Preset) => {
      loadPreset(preset.id)
    },
    [loadPreset]
  )

  const handlePresetContextMenu = useCallback((preset: Preset, e: React.MouseEvent) => {
    setContextMenu({
      type: 'preset',
      id: preset.id,
      name: preset.name,
      position: { x: e.clientX, y: e.clientY },
    })
  }, [])

  const handleFolderContextMenu = useCallback((folder: Folder, e: React.MouseEvent) => {
    setContextMenu({
      type: 'folder',
      id: folder.id,
      name: folder.name,
      position: { x: e.clientX, y: e.clientY },
    })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleStartRename = useCallback(() => {
    if (contextMenu) {
      setRenameState({
        id: contextMenu.id,
        type: contextMenu.type,
        name: contextMenu.name,
      })
    }
  }, [contextMenu])

  const handleRenameSubmit = useCallback(async () => {
    if (!renameState) return

    const trimmedName = renameState.name.trim()
    if (!trimmedName) return

    if (renameState.type === 'preset') {
      await renamePreset(renameState.id, trimmedName)
    } else {
      await renameFolder(renameState.id, trimmedName)
    }

    setRenameState(null)
  }, [renameState, renamePreset, renameFolder])

  const handleNewPreset = useCallback(async () => {
    const name = prompt('Preset name:')
    if (!name?.trim()) return

    // Capture thumbnail if canvas is available
    let thumbnail: string | null = null
    if (canvasRef?.current) {
      try {
        thumbnail = await captureThumbnail(canvasRef.current)
      } catch (err) {
        console.error('Failed to capture thumbnail:', err)
      }
    }

    await createPreset(name.trim(), DEFAULT_FOLDERS.MY_PRESETS, thumbnail)
  }, [createPreset, canvasRef])

  const handleImport = useCallback(async () => {
    try {
      const file = await openImportDialog()
      if (file) {
        const result = await importFile(file)
        console.log(`Imported ${result.imported} preset(s)`)
      }
    } catch (err) {
      console.error('Import failed:', err)
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const handleExportAll = useCallback(async () => {
    const packName = prompt('Pack name:', 'My Presets')
    if (!packName?.trim()) return

    try {
      const allIds = presets.map((p) => p.id)
      await exportPack(allIds, packName.trim())
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [presets])

  // Filter presets based on search
  const displayPresets = searchQuery ? getFilteredPresets() : presets

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <span className="text-[14px]" style={{ color: '#999999' }}>
          Loading presets...
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
        style={{ borderBottom: isCollapsed ? 'none' : '1px solid #d0d0d0' }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: '#999999' }}
        >
          Presets
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="#999"
          strokeWidth="1.5"
          className="transition-transform"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </div>

      {!isCollapsed && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-2 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div
          className="flex items-center gap-2 px-2 py-1 rounded"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d0d0d0' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 text-[14px] bg-transparent outline-none"
            style={{ color: '#333333' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="hover:bg-gray-100 rounded p-0.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-1">
        {searchQuery ? (
          // Search results (flat list)
          <div className="py-2">
            {displayPresets.length === 0 ? (
              <div className="text-center text-[14px] py-4" style={{ color: '#999999' }}>
                No presets found
              </div>
            ) : (
              displayPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100"
                  onClick={() => handlePresetLoad(preset)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    handlePresetContextMenu(preset, e)
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 rounded overflow-hidden"
                    style={{ width: '32px', height: '32px', backgroundColor: '#e0e0e0' }}
                  >
                    {preset.thumbnail ? (
                      <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#999' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-[14px] truncate" style={{ color: '#333' }}>
                    {preset.name}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          // Folder tree view
          <PresetFolderTree
            folders={folders}
            presets={presets}
            onPresetLoad={handlePresetLoad}
            onPresetContextMenu={handlePresetContextMenu}
            onFolderContextMenu={handleFolderContextMenu}
          />
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="flex items-center gap-2 px-2 py-2"
        style={{ borderTop: '1px solid #d0d0d0' }}
      >
        <button
          onClick={handleNewPreset}
          className="flex-1 h-7 text-[13px] font-medium rounded transition-colors"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#666666',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          Save
        </button>
        <button
          onClick={handleImport}
          className="flex-1 h-7 text-[13px] font-medium rounded transition-colors"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#666666',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          Import
        </button>
        <button
          onClick={handleExportAll}
          disabled={presets.length === 0}
          className="flex-1 h-7 text-[13px] font-medium rounded transition-colors"
          style={{
            backgroundColor: presets.length > 0 ? '#ffffff' : '#f5f5f5',
            border: '1px solid #d0d0d0',
            color: presets.length > 0 ? '#666666' : '#c0c0c0',
            cursor: presets.length > 0 ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => presets.length > 0 && (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseLeave={(e) => presets.length > 0 && (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          Export All
        </button>
      </div>

        </div>
      )}

      {/* Info Panel */}
      <InfoPanel />

      {/* Context menus */}
      {contextMenu?.type === 'preset' && (
        <PresetContextMenu
          presetId={contextMenu.id}
          presetName={contextMenu.name}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onRename={handleStartRename}
        />
      )}
      {contextMenu?.type === 'folder' && (
        <FolderContextMenu
          folderId={contextMenu.id}
          folderName={contextMenu.name}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onRename={handleStartRename}
        />
      )}

      {/* Rename modal */}
      {renameState && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={() => setRenameState(null)}
        >
          <div
            className="p-4 rounded-lg shadow-lg"
            style={{ backgroundColor: '#ffffff', minWidth: '240px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[14px] font-medium mb-2" style={{ color: '#333' }}>
              Rename {renameState.type === 'preset' ? 'Preset' : 'Folder'}
            </div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameState.name}
              onChange={(e) => setRenameState({ ...renameState, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setRenameState(null)
              }}
              className="w-full px-2 py-1.5 text-[14px] rounded outline-none"
              style={{ border: '1px solid #d0d0d0', color: '#333' }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setRenameState(null)}
                className="flex-1 h-7 text-[13px] rounded"
                style={{ backgroundColor: '#f5f5f5', color: '#666' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 h-7 text-[13px] rounded"
                style={{ backgroundColor: '#333', color: '#fff' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
