import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

interface PresetDropdownBarProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
}

export function PresetDropdownBar({ canvasRef }: PresetDropdownBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

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

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
  }, [isOpen])

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        // Don't close if clicking on context menu or rename modal
        const target = e.target as HTMLElement
        if (target.closest('[data-preset-context-menu]') || target.closest('[data-rename-modal]')) {
          return
        }
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !renameState) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, renameState])

  const handlePresetLoad = useCallback(
    (preset: Preset) => {
      loadPreset(preset.id)
      setIsOpen(false)
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

  const displayPresets = searchQuery ? getFilteredPresets() : presets

  return (
    <>
      {/* Trigger bar */}
      <div
        className="h-10 flex items-center px-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
          style={{
            backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
            color: 'var(--text-primary)',
          }}
        >
          <span className="text-[13px] font-medium">Presets</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" />
          </svg>
        </button>
      </div>

      {/* Dropdown portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: '300px',
              maxHeight: '400px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Loading...
                </span>
              </div>
            ) : (
              <div className="flex flex-col" style={{ maxHeight: '400px' }}>
                {/* Header */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Presets
                  </span>
                  <button
                    onClick={handleNewPreset}
                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                    title="Save current state as preset"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 text-[13px] bg-transparent outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="hover:bg-white/10 rounded p-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset list */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
                  {searchQuery ? (
                    <div className="py-1">
                      {displayPresets.length === 0 ? (
                        <div className="text-center text-[13px] py-4" style={{ color: 'var(--text-muted)' }}>
                          No presets found
                        </div>
                      ) : (
                        displayPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5"
                            onClick={() => handlePresetLoad(preset)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              handlePresetContextMenu(preset, e)
                            }}
                          >
                            <div
                              className="flex-shrink-0 rounded overflow-hidden"
                              style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-elevated)' }}
                            >
                              {preset.thumbnail ? (
                                <img src={preset.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                              {preset.name}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <PresetFolderTree
                      folders={folders}
                      presets={presets}
                      onPresetLoad={handlePresetLoad}
                      onPresetContextMenu={handlePresetContextMenu}
                      onFolderContextMenu={handleFolderContextMenu}
                    />
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center gap-2 px-2 py-2"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <button
                    onClick={handleImport}
                    className="flex-1 h-7 text-[12px] font-medium rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Import
                  </button>
                  <button
                    onClick={handleExportAll}
                    disabled={presets.length === 0}
                    className="flex-1 h-7 text-[12px] font-medium rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      opacity: presets.length === 0 ? 0.5 : 1,
                    }}
                  >
                    Export All
                  </button>
                </div>

                {/* Info Panel */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <InfoPanel />
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

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
          data-rename-modal
          className="fixed inset-0 flex items-center justify-center z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setRenameState(null)}
        >
          <div
            className="p-4 rounded-lg shadow-lg"
            style={{ backgroundColor: 'var(--bg-surface)', minWidth: '240px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
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
              className="w-full px-2 py-1.5 text-[13px] rounded outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setRenameState(null)}
                className="flex-1 h-7 text-[12px] rounded"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 h-7 text-[12px] rounded"
                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
