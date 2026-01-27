import type { Preset } from '../stores/presetLibraryStore'
import { usePresetLibraryStore, DEFAULT_FOLDERS } from '../stores/presetLibraryStore'

// Current file format version
const FORMAT_VERSION = 1

/**
 * Single preset export format
 */
interface SinglePresetFile {
  version: number
  type: 'preset'
  preset: {
    name: string
    thumbnail: string | null
    effects: Preset['effects']
  }
}

/**
 * Preset pack export format
 */
interface PresetPackFile {
  version: number
  type: 'pack'
  name: string
  presets: Array<{
    name: string
    thumbnail: string | null
    effects: Preset['effects']
  }>
}

type TephralFile = SinglePresetFile | PresetPackFile

/**
 * Export a single preset as a .tephral file
 */
export async function exportPreset(presetId: string): Promise<void> {
  const { presets } = usePresetLibraryStore.getState()
  const preset = presets.find((p) => p.id === presetId)

  if (!preset) {
    throw new Error('Preset not found')
  }

  const fileData: SinglePresetFile = {
    version: FORMAT_VERSION,
    type: 'preset',
    preset: {
      name: preset.name,
      thumbnail: preset.thumbnail,
      effects: preset.effects,
    },
  }

  const json = JSON.stringify(fileData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = sanitizeFilename(preset.name) + '.tephral'

  downloadBlob(blob, filename)
}

/**
 * Export multiple presets as a pack .tephral file
 */
export async function exportPack(presetIds: string[], packName: string): Promise<void> {
  const { presets } = usePresetLibraryStore.getState()
  const selectedPresets = presets.filter((p) => presetIds.includes(p.id))

  if (selectedPresets.length === 0) {
    throw new Error('No presets selected')
  }

  const fileData: PresetPackFile = {
    version: FORMAT_VERSION,
    type: 'pack',
    name: packName,
    presets: selectedPresets.map((preset) => ({
      name: preset.name,
      thumbnail: preset.thumbnail,
      effects: preset.effects,
    })),
  }

  const json = JSON.stringify(fileData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = sanitizeFilename(packName) + '.tephral'

  downloadBlob(blob, filename)
}

/**
 * Import presets from a .tephral or .json file
 */
export async function importFile(file: File): Promise<{ imported: number; type: 'preset' | 'pack' }> {
  const text = await file.text()
  let data: TephralFile

  try {
    data = JSON.parse(text) as TephralFile
  } catch {
    throw new Error('Invalid file format: not valid JSON')
  }

  // Validate version
  if (typeof data.version !== 'number' || data.version > FORMAT_VERSION) {
    throw new Error(`Unsupported file version: ${data.version}. Please update Tephral.`)
  }

  const store = usePresetLibraryStore.getState()

  if (data.type === 'preset') {
    // Single preset import
    const { preset } = data
    await store.createPreset(
      preset.name,
      DEFAULT_FOLDERS.IMPORTED,
      preset.thumbnail
    )
    return { imported: 1, type: 'preset' }
  } else if (data.type === 'pack') {
    // Pack import - create subfolder with pack name
    const packFolder = await store.createFolder(data.name, DEFAULT_FOLDERS.IMPORTED)

    for (const preset of data.presets) {
      await store.createPreset(
        preset.name,
        packFolder.id,
        preset.thumbnail
      )
    }

    return { imported: data.presets.length, type: 'pack' }
  }

  throw new Error('Invalid file type')
}

/**
 * Trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename - remove special characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50)
}

/**
 * Capture thumbnail from canvas
 */
export async function captureThumbnail(canvas: HTMLCanvasElement): Promise<string> {
  const thumbnail = document.createElement('canvas')
  thumbnail.width = 64
  thumbnail.height = 64
  const ctx = thumbnail.getContext('2d')

  if (!ctx) {
    throw new Error('Could not create canvas context')
  }

  // Calculate aspect-fit dimensions
  const sourceAspect = canvas.width / canvas.height
  const targetAspect = 64 / 64

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height

  if (sourceAspect > targetAspect) {
    // Source is wider - crop sides
    sw = canvas.height * targetAspect
    sx = (canvas.width - sw) / 2
  } else {
    // Source is taller - crop top/bottom
    sh = canvas.width / targetAspect
    sy = (canvas.height - sh) / 2
  }

  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, 64, 64)

  return thumbnail.toDataURL('image/jpeg', 0.7)
}

/**
 * Open file picker for import
 */
export function openImportDialog(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.tephral,.json'

    input.onchange = () => {
      const file = input.files?.[0] ?? null
      resolve(file)
    }

    input.oncancel = () => {
      resolve(null)
    }

    input.click()
  })
}
