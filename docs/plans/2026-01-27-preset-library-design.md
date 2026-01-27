# Preset Library Design

## Overview

A preset library system for Tephral that stores effect configurations in IndexedDB with import/export support via `.tephral` files.

## Data Model

### Preset

```typescript
interface Preset {
  id: string              // UUID
  name: string
  folderId: string | null // null = root level
  thumbnail: Blob | null  // Canvas snapshot (64x64 JPEG)
  createdAt: number
  updatedAt: number

  effects: {
    glitch: {
      rgbSplitEnabled: boolean
      rgbSplit: RGBSplitParams
      blockDisplaceEnabled: boolean
      blockDisplace: BlockDisplaceParams
      scanLinesEnabled: boolean
      scanLines: ScanLinesParams
      noiseEnabled: boolean
      noise: NoiseParams
      pixelateEnabled: boolean
      pixelate: PixelateParams
      edgeDetectionEnabled: boolean
      edgeDetection: EdgeDetectionParams
    }
    ascii: { enabled: boolean; params: AsciiRenderParams }
    stipple: { enabled: boolean; params: StippleParams }
    blobDetect: { enabled: boolean; params: BlobDetectParams }
    landmarks: { enabled: boolean; mode: LandmarkMode }
    effectOrder: string[]
  }
}
```

### Folder

```typescript
interface Folder {
  id: string
  name: string
  parentId: string | null  // Nested folders supported
  order: number            // Sort order within parent
}
```

### Default Folders

- "My Presets" - User-created presets
- "Favorites" - Quick access
- "Imported" - Auto-created when importing

### Future-Proofing

The `effects` field is isolated so a future `Session` type can include `effects` + `sequencer` + `source` without changing the preset format.

## Storage Layer

### IndexedDB Schema

- **Database:** `tephral-presets`
- **Object stores:**
  - `presets` - All preset objects, indexed by `id` and `folderId`
  - `folders` - Folder hierarchy, indexed by `id` and `parentId`
  - `metadata` - App-level data (last selected folder, sort preferences)

### Store Interface

```typescript
// src/stores/presetLibraryStore.ts
interface PresetLibraryState {
  presets: Preset[]
  folders: Folder[]
  selectedFolderId: string | null
  isLoading: boolean

  // Preset actions
  loadFromDB: () => Promise<void>
  createPreset: (name: string, folderId?: string) => Promise<void>
  loadPreset: (id: string) => void
  deletePreset: (id: string) => Promise<void>
  renamePreset: (id: string, name: string) => Promise<void>
  movePreset: (id: string, folderId: string | null) => Promise<void>

  // Folder actions
  createFolder: (name: string, parentId?: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  // Import/export
  exportPreset: (id: string) => Promise<void>
  exportPack: (ids: string[]) => Promise<void>
  importFile: (file: File) => Promise<void>
}
```

## UI Components

### Panel Layout

```
┌─────────────────────────┐
│ PRESETS            [+]  │  ← Header with "New Preset" button
├─────────────────────────┤
│ 🔍 Search...            │  ← Filter presets by name
├─────────────────────────┤
│ ▼ My Presets            │  ← Collapsible folder
│   [thumb] Glitch Burst  │
│   [thumb] Subtle RGB    │
│ ▼ Favorites             │
│   [thumb] Main Look     │
│ ▶ Imported              │  ← Collapsed folder
├─────────────────────────┤
│ [Import]    [Export All]│  ← Bottom actions
└─────────────────────────┘
```

### Components

- `PresetLibraryPanel` - Main container (replaces "Timeline" placeholder)
- `PresetFolderTree` - Collapsible folder list
- `PresetRow` - Single preset with 32x32 thumbnail, name, hover actions
- `PresetContextMenu` - Right-click menu: Rename, Move, Delete, Export

### Interactions

- **Click preset** → Load immediately
- **Right-click preset** → Context menu
- **Drag preset** → Move to different folder
- **Click [+]** → Save current state as new preset (prompts for name)
- **Double-click folder** → Rename inline

### Panel Sizing

- Default width: 280px
- Resizable up to 400px via drag handle

## Import/Export Format

### File Extension

`.tephral` files containing JSON data.

### Single Preset

```json
{
  "version": 1,
  "type": "preset",
  "preset": {
    "name": "Glitch Burst",
    "thumbnail": "data:image/jpeg;base64,...",
    "effects": { }
  }
}
```

### Preset Pack

```json
{
  "version": 1,
  "type": "pack",
  "name": "My Glitch Collection",
  "presets": [
    { "name": "...", "thumbnail": "...", "effects": { } },
    { "name": "...", "thumbnail": "...", "effects": { } }
  ]
}
```

### Export Flow

1. Click "Export" on preset → Downloads `preset-name.tephral`
2. Select multiple + "Export Pack" → Prompts for pack name → Downloads `pack-name.tephral`

### Import Flow

1. Click "Import" → File picker (accepts `.tephral`, `.json`)
2. Parse file, detect type (single vs pack)
3. Single: Add to "Imported" folder (or current folder)
4. Pack: Create subfolder in "Imported" with pack name, add all presets

### Validation

Check `version` field for compatibility. Reject if version > current supported.

## Integration

### Relationship with A/B/C/D Banks

- Banks remain as quick-access performance slots (bottom panel)
- Preset library is for long-term storage and organization
- Right-click bank → "Save to Library" option
- Drag preset from library → Drop on bank slot

### Thumbnail Capture

```typescript
const captureThumbnail = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const thumbnail = document.createElement('canvas')
  thumbnail.width = 64
  thumbnail.height = 64
  const ctx = thumbnail.getContext('2d')
  ctx.drawImage(canvas, 0, 0, 64, 64)
  return new Promise(resolve => thumbnail.toBlob(resolve, 'image/jpeg', 0.7))
}
```

### App Initialization

1. On mount, `presetLibraryStore.loadFromDB()` loads IndexedDB data
2. Creates default folders if first run
3. Panel displays loading state until ready

## Files to Create/Modify

**New files:**
- `src/stores/presetLibraryStore.ts` - Zustand store with IndexedDB persistence
- `src/components/presets/PresetLibraryPanel.tsx` - Main panel component
- `src/components/presets/PresetFolderTree.tsx` - Folder tree with collapse
- `src/components/presets/PresetRow.tsx` - Single preset item
- `src/components/presets/PresetContextMenu.tsx` - Right-click menu
- `src/utils/presetIO.ts` - Import/export utilities

**Modified files:**
- `src/components/performance/PerformanceLayout.tsx` - Replace Timeline placeholder with PresetLibraryPanel
- `src/components/performance/BankButton.tsx` - Add "Save to Library" context menu option
