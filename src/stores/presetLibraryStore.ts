import { create } from 'zustand'
import type { BankSnapshot } from './bankStore'
import { useGlitchEngineStore } from './glitchEngineStore'
import { useAsciiRenderStore } from './asciiRenderStore'
import { useStippleStore } from './stippleStore'
import { useBlobDetectStore } from './blobDetectStore'
import { useLandmarksStore } from './landmarksStore'
import { useRoutingStore } from './routingStore'

// Database constants
const DB_NAME = 'tephral-presets'
const DB_VERSION = 1
const PRESETS_STORE = 'presets'
const FOLDERS_STORE = 'folders'
const METADATA_STORE = 'metadata'

// Default folder IDs
const DEFAULT_FOLDERS = {
  MY_PRESETS: 'folder_my_presets',
  FAVORITES: 'folder_favorites',
  IMPORTED: 'folder_imported',
}

/**
 * Preset data model - stores effect configurations
 */
export interface Preset {
  id: string
  name: string
  folderId: string | null  // null = root level
  thumbnail: string | null // base64 data URL (64x64 JPEG)
  createdAt: number
  updatedAt: number
  effects: BankSnapshot
}

/**
 * Folder for organizing presets
 */
export interface Folder {
  id: string
  name: string
  parentId: string | null  // Nested folders supported
  order: number            // Sort order within parent
}

interface PresetLibraryState {
  presets: Preset[]
  folders: Folder[]
  selectedFolderId: string | null
  isLoading: boolean
  searchQuery: string
  collapsedFolders: Set<string>

  // Preset actions
  loadFromDB: () => Promise<void>
  createPreset: (name: string, folderId?: string | null, thumbnail?: string | null) => Promise<Preset>
  loadPreset: (id: string) => void
  deletePreset: (id: string) => Promise<void>
  renamePreset: (id: string, name: string) => Promise<void>
  movePreset: (id: string, folderId: string | null) => Promise<void>
  updatePresetThumbnail: (id: string, thumbnail: string) => Promise<void>

  // Folder actions
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>
  deleteFolder: (id: string) => Promise<void>
  renameFolder: (id: string, name: string) => Promise<void>
  toggleFolderCollapse: (id: string) => void

  // UI actions
  setSelectedFolder: (id: string | null) => void
  setSearchQuery: (query: string) => void

  // Helpers
  getPresetsInFolder: (folderId: string | null) => Preset[]
  getFilteredPresets: () => Preset[]
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Presets store
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        const presetsStore = db.createObjectStore(PRESETS_STORE, { keyPath: 'id' })
        presetsStore.createIndex('folderId', 'folderId', { unique: false })
        presetsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // Folders store
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        const foldersStore = db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' })
        foldersStore.createIndex('parentId', 'parentId', { unique: false })
        foldersStore.createIndex('order', 'order', { unique: false })
      }

      // Metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
      }
    }
  })
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    tx.oncomplete = () => db.close()
  })
}

async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(item)

    request.onerror = () => reject(request.error)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
  })
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
  })
}

// Generate UUID
function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Capture current effect state as a BankSnapshot
function captureCurrentEffects(): BankSnapshot {
  const glitchState = useGlitchEngineStore.getState()
  const asciiState = useAsciiRenderStore.getState()
  const stippleState = useStippleStore.getState()
  const blobDetectState = useBlobDetectStore.getState()
  const landmarksState = useLandmarksStore.getState()
  const routingState = useRoutingStore.getState()

  return {
    glitch: {
      rgbSplitEnabled: glitchState.rgbSplitEnabled,
      rgbSplit: { ...glitchState.rgbSplit },
      blockDisplaceEnabled: glitchState.blockDisplaceEnabled,
      blockDisplace: { ...glitchState.blockDisplace },
      scanLinesEnabled: glitchState.scanLinesEnabled,
      scanLines: { ...glitchState.scanLines },
      noiseEnabled: glitchState.noiseEnabled,
      noise: { ...glitchState.noise },
      pixelateEnabled: glitchState.pixelateEnabled,
      pixelate: { ...glitchState.pixelate },
      edgeDetectionEnabled: glitchState.edgeDetectionEnabled,
      edgeDetection: { ...glitchState.edgeDetection },
      chromaticAberrationEnabled: glitchState.chromaticAberrationEnabled,
      chromaticAberration: { ...glitchState.chromaticAberration },
      vhsTrackingEnabled: glitchState.vhsTrackingEnabled,
      vhsTracking: { ...glitchState.vhsTracking },
      lensDistortionEnabled: glitchState.lensDistortionEnabled,
      lensDistortion: { ...glitchState.lensDistortion },
      ditherEnabled: glitchState.ditherEnabled,
      dither: { ...glitchState.dither },
      posterizeEnabled: glitchState.posterizeEnabled,
      posterize: { ...glitchState.posterize },
      staticDisplacementEnabled: glitchState.staticDisplacementEnabled,
      staticDisplacement: { ...glitchState.staticDisplacement },
      colorGradeEnabled: glitchState.colorGradeEnabled,
      colorGrade: { ...glitchState.colorGrade },
      feedbackLoopEnabled: glitchState.feedbackLoopEnabled,
      feedbackLoop: { ...glitchState.feedbackLoop },
    },
    ascii: {
      enabled: asciiState.enabled,
      params: { ...asciiState.params },
    },
    stipple: {
      enabled: stippleState.enabled,
      params: { ...stippleState.params },
    },
    blobDetect: {
      enabled: blobDetectState.enabled,
      params: { ...blobDetectState.params },
    },
    landmarks: {
      enabled: landmarksState.enabled,
      mode: landmarksState.currentMode,
    },
    effectOrder: [...routingState.effectOrder],
    savedAt: Date.now(),
  }
}

// Apply effects from a preset
function applyEffects(effects: BankSnapshot): void {
  const currentState = useGlitchEngineStore.getState()
  useGlitchEngineStore.setState({
    rgbSplitEnabled: effects.glitch.rgbSplitEnabled,
    rgbSplit: { ...effects.glitch.rgbSplit },
    blockDisplaceEnabled: effects.glitch.blockDisplaceEnabled,
    blockDisplace: { ...effects.glitch.blockDisplace },
    scanLinesEnabled: effects.glitch.scanLinesEnabled,
    scanLines: { ...effects.glitch.scanLines },
    noiseEnabled: effects.glitch.noiseEnabled,
    noise: { ...effects.glitch.noise },
    pixelateEnabled: effects.glitch.pixelateEnabled,
    pixelate: { ...effects.glitch.pixelate },
    edgeDetectionEnabled: effects.glitch.edgeDetectionEnabled,
    edgeDetection: { ...effects.glitch.edgeDetection },
    chromaticAberrationEnabled: effects.glitch.chromaticAberrationEnabled ?? false,
    chromaticAberration: effects.glitch.chromaticAberration ? { ...effects.glitch.chromaticAberration } : currentState.chromaticAberration,
    vhsTrackingEnabled: effects.glitch.vhsTrackingEnabled ?? false,
    vhsTracking: effects.glitch.vhsTracking ? { ...effects.glitch.vhsTracking } : currentState.vhsTracking,
    lensDistortionEnabled: effects.glitch.lensDistortionEnabled ?? false,
    lensDistortion: effects.glitch.lensDistortion ? { ...effects.glitch.lensDistortion } : currentState.lensDistortion,
    ditherEnabled: effects.glitch.ditherEnabled ?? false,
    dither: effects.glitch.dither ? { ...effects.glitch.dither } : currentState.dither,
    posterizeEnabled: effects.glitch.posterizeEnabled ?? false,
    posterize: effects.glitch.posterize ? { ...effects.glitch.posterize } : currentState.posterize,
    staticDisplacementEnabled: effects.glitch.staticDisplacementEnabled ?? false,
    staticDisplacement: effects.glitch.staticDisplacement ? { ...effects.glitch.staticDisplacement } : currentState.staticDisplacement,
    colorGradeEnabled: effects.glitch.colorGradeEnabled ?? false,
    colorGrade: effects.glitch.colorGrade ? { ...effects.glitch.colorGrade } : currentState.colorGrade,
    feedbackLoopEnabled: effects.glitch.feedbackLoopEnabled ?? false,
    feedbackLoop: effects.glitch.feedbackLoop ? { ...effects.glitch.feedbackLoop } : currentState.feedbackLoop,
  })

  useAsciiRenderStore.setState({
    enabled: effects.ascii.enabled,
    params: { ...effects.ascii.params },
  })

  useStippleStore.setState({
    enabled: effects.stipple.enabled,
    params: { ...effects.stipple.params },
  })

  useBlobDetectStore.setState({
    enabled: effects.blobDetect.enabled,
    params: { ...effects.blobDetect.params },
  })

  useLandmarksStore.setState({
    enabled: effects.landmarks.enabled,
    currentMode: effects.landmarks.mode,
  })

  useRoutingStore.setState({
    effectOrder: [...effects.effectOrder],
  })
}

// Create default folders
function createDefaultFolders(): Folder[] {
  return [
    { id: DEFAULT_FOLDERS.MY_PRESETS, name: 'My Presets', parentId: null, order: 0 },
    { id: DEFAULT_FOLDERS.FAVORITES, name: 'Favorites', parentId: null, order: 1 },
    { id: DEFAULT_FOLDERS.IMPORTED, name: 'Imported', parentId: null, order: 2 },
  ]
}

export const usePresetLibraryStore = create<PresetLibraryState>((set, get) => ({
  presets: [],
  folders: [],
  selectedFolderId: null,
  isLoading: true,
  searchQuery: '',
  collapsedFolders: new Set(),

  loadFromDB: async () => {
    set({ isLoading: true })

    try {
      const [presets, folders] = await Promise.all([
        getAllFromStore<Preset>(PRESETS_STORE),
        getAllFromStore<Folder>(FOLDERS_STORE),
      ])

      // Create default folders if none exist
      let finalFolders = folders
      if (folders.length === 0) {
        finalFolders = createDefaultFolders()
        for (const folder of finalFolders) {
          await putInStore(FOLDERS_STORE, folder)
        }
      }

      set({
        presets: presets.sort((a, b) => b.updatedAt - a.updatedAt),
        folders: finalFolders.sort((a, b) => a.order - b.order),
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to load preset library:', err)
      set({ isLoading: false })
    }
  },

  createPreset: async (name, folderId = DEFAULT_FOLDERS.MY_PRESETS, thumbnail = null) => {
    const now = Date.now()
    const preset: Preset = {
      id: generateId(),
      name,
      folderId: folderId ?? DEFAULT_FOLDERS.MY_PRESETS,
      thumbnail,
      createdAt: now,
      updatedAt: now,
      effects: captureCurrentEffects(),
    }

    await putInStore(PRESETS_STORE, preset)

    set((state) => ({
      presets: [preset, ...state.presets],
    }))

    return preset
  },

  loadPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id)
    if (preset) {
      applyEffects(preset.effects)
    }
  },

  deletePreset: async (id) => {
    await deleteFromStore(PRESETS_STORE, id)
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id),
    }))
  },

  renamePreset: async (id, name) => {
    const { presets } = get()
    const preset = presets.find((p) => p.id === id)
    if (!preset) return

    const updated = { ...preset, name, updatedAt: Date.now() }
    await putInStore(PRESETS_STORE, updated)

    set((state) => ({
      presets: state.presets.map((p) => (p.id === id ? updated : p)),
    }))
  },

  movePreset: async (id, folderId) => {
    const { presets } = get()
    const preset = presets.find((p) => p.id === id)
    if (!preset) return

    const updated = { ...preset, folderId, updatedAt: Date.now() }
    await putInStore(PRESETS_STORE, updated)

    set((state) => ({
      presets: state.presets.map((p) => (p.id === id ? updated : p)),
    }))
  },

  updatePresetThumbnail: async (id, thumbnail) => {
    const { presets } = get()
    const preset = presets.find((p) => p.id === id)
    if (!preset) return

    const updated = { ...preset, thumbnail, updatedAt: Date.now() }
    await putInStore(PRESETS_STORE, updated)

    set((state) => ({
      presets: state.presets.map((p) => (p.id === id ? updated : p)),
    }))
  },

  createFolder: async (name, parentId = null) => {
    const { folders } = get()
    const siblingFolders = folders.filter((f) => f.parentId === parentId)
    const maxOrder = siblingFolders.length > 0
      ? Math.max(...siblingFolders.map((f) => f.order))
      : -1

    const folder: Folder = {
      id: generateFolderId(),
      name,
      parentId,
      order: maxOrder + 1,
    }

    await putInStore(FOLDERS_STORE, folder)

    set((state) => ({
      folders: [...state.folders, folder].sort((a, b) => a.order - b.order),
    }))

    return folder
  },

  deleteFolder: async (id) => {
    // Don't delete default folders
    if (Object.values(DEFAULT_FOLDERS).includes(id)) return

    const { presets, folders } = get()

    // Move presets from deleted folder to root
    const presetsToMove = presets.filter((p) => p.folderId === id)
    for (const preset of presetsToMove) {
      const updated = { ...preset, folderId: DEFAULT_FOLDERS.MY_PRESETS }
      await putInStore(PRESETS_STORE, updated)
    }

    // Delete child folders recursively
    const childFolders = folders.filter((f) => f.parentId === id)
    for (const child of childFolders) {
      await get().deleteFolder(child.id)
    }

    await deleteFromStore(FOLDERS_STORE, id)

    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      presets: state.presets.map((p) =>
        p.folderId === id ? { ...p, folderId: DEFAULT_FOLDERS.MY_PRESETS } : p
      ),
    }))
  },

  renameFolder: async (id, name) => {
    const { folders } = get()
    const folder = folders.find((f) => f.id === id)
    if (!folder) return

    const updated = { ...folder, name }
    await putInStore(FOLDERS_STORE, updated)

    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? updated : f)),
    }))
  },

  toggleFolderCollapse: (id) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedFolders)
      if (newCollapsed.has(id)) {
        newCollapsed.delete(id)
      } else {
        newCollapsed.add(id)
      }
      return { collapsedFolders: newCollapsed }
    })
  },

  setSelectedFolder: (id) => set({ selectedFolderId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  getPresetsInFolder: (folderId) => {
    return get().presets.filter((p) => p.folderId === folderId)
  },

  getFilteredPresets: () => {
    const { presets, searchQuery } = get()
    if (!searchQuery.trim()) return presets

    const query = searchQuery.toLowerCase()
    return presets.filter((p) => p.name.toLowerCase().includes(query))
  },
}))

export { DEFAULT_FOLDERS }
