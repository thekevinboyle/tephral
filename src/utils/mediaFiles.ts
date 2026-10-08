/** Which source a dropped or picked file feeds: video/image go to the video source, audio to the audio source. */
export type MediaKind = 'video' | 'audio' | 'other'

export function kindOfType(mime: string): MediaKind {
  if (mime.startsWith('video/') || mime.startsWith('image/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
}

/** During dragover only item types are readable (not names); this summarises what a drop would do. */
export function kindsInTransfer(dt: DataTransfer): { video: boolean; audio: boolean; files: boolean } {
  let video = false
  let audio = false
  let files = false
  for (const item of Array.from(dt.items)) {
    if (item.kind !== 'file') continue
    files = true
    const k = kindOfType(item.type)
    if (k === 'video') video = true
    else if (k === 'audio') audio = true
  }
  return { video, audio, files: files || dt.types.includes('Files') }
}

/** First video/image file and first audio file in a drop. */
export function pickMediaFiles(list: FileList): { video: File | null; audio: File | null } {
  const files = Array.from(list)
  return {
    video: files.find((f) => kindOfType(f.type) === 'video') ?? null,
    audio: files.find((f) => kindOfType(f.type) === 'audio') ?? null,
  }
}
