import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { ExportResolution, ExportQuality, ExportFrameRate, ExportFormat } from '../stores/clipStore'

interface TranscodeOptions {
  resolution: ExportResolution
  quality: ExportQuality
  frameRate: ExportFrameRate
  format: ExportFormat
}

const RESOLUTION_MAP: Record<ExportResolution, string> = {
  'hd': '1280:720',
  '1080p': '1920:1080',
  '4k': '3840:2160',
}

const QUALITY_CRF: Record<ExportQuality, number> = {
  'low': 35,
  'medium': 28,
  'high': 20,
}

export function useVideoTranscode() {
  const [isTranscoding, setIsTranscoding] = useState(false)
  const [progress, setProgress] = useState(0)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    const ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100))
    })

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegRef.current = ffmpeg
    return ffmpeg
  }, [])

  const transcode = useCallback(async (
    inputBlob: Blob,
    options: TranscodeOptions
  ): Promise<Blob> => {
    setIsTranscoding(true)
    setProgress(0)

    const inputName = 'input.webm'
    const outputExt = options.format === 'mov' ? 'mov' : options.format
    const outputName = `output.${outputExt}`

    try {
      const ffmpeg = await loadFFmpeg()

      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob))

      const args = [
        '-i', inputName,
        '-vf', `scale=${RESOLUTION_MAP[options.resolution]}`,
        '-r', String(options.frameRate),
        '-crf', String(QUALITY_CRF[options.quality]),
      ]

      // Codec selection based on format
      if (options.format === 'mp4' || options.format === 'mov') {
        args.push('-c:v', 'libx264', '-preset', 'medium')
      } else {
        args.push('-c:v', 'libvpx-vp9')
      }

      args.push('-y', outputName)

      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName) as Uint8Array
      const mimeType = options.format === 'webm'
        ? 'video/webm'
        : options.format === 'mov'
          ? 'video/quicktime'
          : 'video/mp4'

      // Create a new Uint8Array to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
      const outputData = new Uint8Array(data)
      return new Blob([outputData], { type: mimeType })
    } finally {
      // Cleanup FFmpeg virtual filesystem to prevent memory accumulation
      const ffmpeg = ffmpegRef.current
      if (ffmpeg) {
        try {
          await ffmpeg.deleteFile(inputName)
        } catch {
          // File may not exist if error occurred before write
        }
        try {
          await ffmpeg.deleteFile(outputName)
        } catch {
          // File may not exist if error occurred before transcode
        }
      }
      setIsTranscoding(false)
    }
  }, [loadFFmpeg])

  const cancel = useCallback(() => {
    // Actually terminate FFmpeg to stop the transcoding process
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate()
      ffmpegRef.current = null // Force reload on next use
    }
    setIsTranscoding(false)
    setProgress(0)
  }, [])

  return { transcode, isTranscoding, progress, cancel }
}
