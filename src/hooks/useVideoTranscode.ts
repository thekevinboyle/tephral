import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
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
  const [isLoading, setIsLoading] = useState(false) // FFmpeg loading state
  const [progress, setProgress] = useState(0)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const cancelledRef = useRef(false) // Track if operation was cancelled
  const abortControllerRef = useRef<AbortController | null>(null) // For cancelling fetches

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    setIsLoading(true)
    cancelledRef.current = false
    console.log('[FFmpeg] Starting to load...')

    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    ffmpeg.on('progress', ({ progress }) => {
      console.log('[FFmpeg] Progress:', progress)
      setProgress(Math.round(progress * 100))
    })

    // Create abort controller for this load operation
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    // Helper to fetch with timeout
    const fetchWithTimeout = async (url: string, type: string, timeoutMs = 60000) => {
      const timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          abortControllerRef.current?.abort()
        }
      }, timeoutMs)

      try {
        console.log(`[FFmpeg] Fetching ${url}...`)
        const response = await fetch(url, { signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        clearTimeout(timeoutId)
        return URL.createObjectURL(new Blob([blob], { type }))
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          if (cancelledRef.current) {
            throw new Error('Operation cancelled')
          }
          throw new Error('FFmpeg download timed out. Please try again.')
        }
        throw error
      }
    }

    try {
      // Use jsDelivr as primary CDN (often faster/more reliable than unpkg)
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
      console.log('[FFmpeg] Fetching core files from jsdelivr...')

      const [coreURL, wasmURL] = await Promise.all([
        fetchWithTimeout(`${baseURL}/ffmpeg-core.js`, 'text/javascript', 30000),
        fetchWithTimeout(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm', 120000),
      ])

      await ffmpeg.load({ coreURL, wasmURL })
      console.log('[FFmpeg] Loaded successfully')
    } catch (error) {
      console.error('[FFmpeg] Failed to load:', error)
      setIsLoading(false)
      throw error
    }

    // Check if cancelled during loading
    if (cancelledRef.current) {
      console.log('[FFmpeg] Operation cancelled during load')
      setIsLoading(false)
      throw new Error('Operation cancelled')
    }

    setIsLoading(false)
    ffmpegRef.current = ffmpeg
    return ffmpeg
  }, [])

  const transcode = useCallback(async (
    inputBlob: Blob,
    options: TranscodeOptions
  ): Promise<Blob> => {
    // For webm output, just return the original blob (it's already webm)
    // This avoids the slow FFmpeg load for the common case
    if (options.format === 'webm') {
      console.log('[Transcode] WebM format selected, returning original blob')
      return inputBlob
    }

    cancelledRef.current = false
    setIsTranscoding(true)
    setProgress(0)

    const inputName = 'input.webm'
    const outputExt = options.format === 'mov' ? 'mov' : options.format
    const outputName = `output.${outputExt}`

    try {
      console.log('[Transcode] Starting transcode to', options.format)
      const ffmpeg = await loadFFmpeg()

      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob))

      const args = [
        '-i', inputName,
        '-vf', `scale=${RESOLUTION_MAP[options.resolution]}`,
        '-r', String(options.frameRate),
        '-crf', String(QUALITY_CRF[options.quality]),
      ]

      // Codec selection - mp4/mov use libx264 (webm returns early above)
      args.push('-c:v', 'libx264', '-preset', 'medium')

      args.push('-y', outputName)

      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName) as Uint8Array
      // At this point format is either 'mp4' or 'mov' (webm returns early)
      const mimeType = options.format === 'mov' ? 'video/quicktime' : 'video/mp4'

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
    console.log('[FFmpeg] Cancel requested')
    cancelledRef.current = true

    // Abort any ongoing fetch operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Terminate FFmpeg if it exists
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate()
      ffmpegRef.current = null // Force reload on next use
    }

    // Reset all states
    setIsLoading(false)
    setIsTranscoding(false)
    setProgress(0)
  }, [])

  return { transcode, isTranscoding, isLoading, progress, cancel }
}
