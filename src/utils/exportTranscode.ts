import type { ExportResolution, ExportFormat } from '../stores/clipStore'

// Long-side cap per export setting. The setting is a ceiling, not a target:
// clips keep their own aspect ratio and are never upscaled.
const LONG_SIDE: Record<ExportResolution, number> = {
  'hd': 1280,
  '1080p': 1920,
  '4k': 3840,
}

/**
 * ffmpeg -vf chain: cap the long side at the chosen resolution (keeping
 * aspect, never upscaling), then round both sides down to even numbers
 * (libx264 4:2:0 requires it) and reset the sample aspect ratio.
 */
export function buildScaleFilter(resolution: ExportResolution): string {
  const L = LONG_SIDE[resolution]
  return [
    `scale='if(gte(iw,ih),min(iw,${L}),-1)':'if(gte(iw,ih),-1,min(ih,${L}))'`,
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    'setsar=1',
  ].join(',')
}

/**
 * Seconds encoded so far, parsed from an ffmpeg stats line
 * ("frame= 12 ... time=00:00:01.23 ..."). Returns null for lines without a
 * time or with a negative one (ffmpeg prints those before the first frame).
 */
export function parseFfmpegTime(line: string): number | null {
  const m = line.match(/time=(-?)(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m || m[1] === '-') return null
  return Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])
}

/**
 * Whole-number percent of `durationSec` covered by `encodedSec`, clamped to
 * 0–99 while encoding (100 is reported only when the encode actually ends).
 * Browser-recorded WebM has no duration header, so ffmpeg's own progress
 * event is meaningless; the clip's known duration is used instead.
 */
export function progressPercent(encodedSec: number, durationSec: number): number {
  if (!(durationSec > 0) || !(encodedSec > 0)) return 0
  return Math.min(99, Math.max(0, Math.floor((encodedSec / durationSec) * 100)))
}

// Minimal File System Access API surface (not in TS's lib.dom yet)
interface SaveWritable {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}
export interface SaveTarget {
  createWritable(): Promise<SaveWritable>
}
type SaveFilePicker = (options: {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<SaveTarget>

const MIME: Record<ExportFormat, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

export class SaveCancelledError extends Error {
  constructor() { super('Save cancelled') }
}

/**
 * Ask where to save, if the browser supports it (Chromium). Must be called
 * directly from the click handler — the picker needs user activation, which
 * would be gone after a long transcode. Returns null when unsupported (the
 * caller falls back to a regular download). Throws SaveCancelledError if the
 * user dismisses the dialog.
 */
export async function pickSaveTarget(fileName: string, format: ExportFormat): Promise<SaveTarget | null> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (!picker) return null
  try {
    return await picker({
      suggestedName: fileName,
      types: [{ description: `${format.toUpperCase()} video`, accept: { [MIME[format]]: [`.${format}`] } }],
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new SaveCancelledError()
    throw err
  }
}

/** Write to the picked file, or fall back to a browser download. */
export async function saveBlob(blob: Blob, fileName: string, target: SaveTarget | null): Promise<void> {
  if (target) {
    const writable = await target.createWritable()
    await writable.write(blob)
    await writable.close()
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
