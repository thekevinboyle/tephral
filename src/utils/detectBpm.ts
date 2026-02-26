/**
 * Offline BPM detection via onset-envelope autocorrelation.
 *
 * 1. Decode audio to mono float buffer
 * 2. Compute onset-detection function (spectral flux / energy diff)
 * 3. Autocorrelate the onset envelope
 * 4. Find peak in BPM range → detected tempo
 */

const BPM_MIN = 60
const BPM_MAX = 200
const HOP_SIZE = 512   // ~11.6ms at 44100
const WINDOW_SIZE = 1024

/**
 * Detect BPM from an AudioBuffer. Returns the most likely BPM, or null if
 * detection fails (silence, noise, no clear beat).
 */
export function detectBpmFromBuffer(buffer: AudioBuffer): number | null {
  const sampleRate = buffer.sampleRate
  const mono = mixToMono(buffer)

  // Compute onset-detection envelope (energy flux)
  const onsets = computeOnsetEnvelope(mono, sampleRate)
  if (onsets.length < 32) return null

  // Autocorrelate onset envelope
  const { bpm, strength } = autocorrelateBpm(onsets, sampleRate)

  // Reject weak detections
  if (strength < 0.05) return null

  return bpm
}

/**
 * Decode a blob URL to AudioBuffer, then detect BPM.
 */
export async function detectBpmFromUrl(url: string): Promise<number | null> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    const offlineCtx = new OfflineAudioContext(1, 1, 44100)
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)

    return detectBpmFromBuffer(audioBuffer)
  } catch (err) {
    console.warn('[detectBpm] Failed to decode/detect:', err)
    return null
  }
}

// ─── Internals ────────────────────────────────────────────────────────────────

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length
  const mono = new Float32Array(length)

  if (buffer.numberOfChannels === 1) {
    buffer.copyFromChannel(mono, 0)
    return mono
  }

  // Average all channels
  const numCh = buffer.numberOfChannels
  for (let ch = 0; ch < numCh; ch++) {
    const channelData = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i]
    }
  }
  const scale = 1 / numCh
  for (let i = 0; i < length; i++) {
    mono[i] *= scale
  }
  return mono
}

/**
 * Spectral-flux onset detection.
 * For each hop: compute energy in the window, take positive difference
 * from previous window. This highlights transients (drum hits, note onsets).
 */
function computeOnsetEnvelope(mono: Float32Array, _sampleRate: number): Float32Array {
  const numFrames = Math.floor((mono.length - WINDOW_SIZE) / HOP_SIZE)
  if (numFrames < 2) return new Float32Array(0)

  const envelope = new Float32Array(numFrames)
  let prevEnergy = 0

  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_SIZE
    let energy = 0
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const s = mono[start + i]
      energy += s * s
    }

    // Half-wave rectified difference (only positive increases = onsets)
    const flux = Math.max(0, energy - prevEnergy)
    envelope[f] = flux
    prevEnergy = energy
  }

  // Normalize
  let max = 0
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > max) max = envelope[i]
  }
  if (max > 0) {
    for (let i = 0; i < envelope.length; i++) {
      envelope[i] /= max
    }
  }

  return envelope
}

/**
 * Autocorrelate the onset envelope and find the BPM with strongest
 * periodicity in [BPM_MIN, BPM_MAX].
 */
function autocorrelateBpm(
  envelope: Float32Array,
  sampleRate: number,
): { bpm: number; strength: number } {
  const hopsPerSecond = sampleRate / HOP_SIZE

  // Convert BPM range to lag range (in onset-envelope frames)
  const minLag = Math.floor((hopsPerSecond * 60) / BPM_MAX)
  const maxLag = Math.ceil((hopsPerSecond * 60) / BPM_MIN)
  const N = envelope.length

  let bestLag = minLag
  let bestCorr = -Infinity

  // Compute normalized autocorrelation for each candidate lag
  for (let lag = minLag; lag <= maxLag && lag < N; lag++) {
    let sum = 0
    let count = 0
    for (let i = 0; i < N - lag; i++) {
      sum += envelope[i] * envelope[i + lag]
      count++
    }
    const corr = count > 0 ? sum / count : 0

    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  // Also check if double-time or half-time is stronger
  // (common ambiguity: 70 BPM vs 140 BPM)
  const halfLag = Math.round(bestLag / 2)
  const doubleLag = bestLag * 2

  if (halfLag >= minLag) {
    let sum = 0, count = 0
    for (let i = 0; i < N - halfLag; i++) {
      sum += envelope[i] * envelope[i + halfLag]
      count++
    }
    const halfCorr = count > 0 ? sum / count : 0
    // Prefer the faster tempo if correlation is within 90%
    if (halfCorr > bestCorr * 0.9) {
      bestLag = halfLag
      bestCorr = halfCorr
    }
  }

  if (doubleLag < N && doubleLag <= maxLag) {
    let sum = 0, count = 0
    for (let i = 0; i < N - doubleLag; i++) {
      sum += envelope[i] * envelope[i + doubleLag]
      count++
    }
    const doubleCorr = count > 0 ? sum / count : 0
    if (doubleCorr > bestCorr * 1.1) {
      bestLag = doubleLag
      bestCorr = doubleCorr
    }
  }

  const bpm = Math.round((hopsPerSecond * 60) / bestLag)
  return { bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, bpm)), strength: bestCorr }
}
