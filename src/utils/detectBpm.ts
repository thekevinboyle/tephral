/**
 * Offline BPM detection via onset-envelope autocorrelation.
 *
 * 1. Decode audio to mono float buffer
 * 2. Compute onset-detection function (spectral flux / energy diff)
 * 3. Autocorrelate the onset envelope (normalized)
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
  const onsets = computeOnsetEnvelope(mono)
  if (onsets.length < 64) {
    console.warn('[detectBpm] onset envelope too short:', onsets.length)
    return null
  }

  // Autocorrelate onset envelope
  const { bpm, strength } = autocorrelateBpm(onsets, sampleRate)

  console.log('[detectBpm] best candidate:', bpm, 'BPM, strength:', strength.toFixed(4))

  // Reject only truly flat signals (no periodicity at all)
  if (strength < 0.01) {
    console.warn('[detectBpm] no periodic beat detected, strength:', strength)
    return null
  }

  return bpm
}

/**
 * Decode a blob URL to AudioBuffer, then detect BPM.
 */
export async function detectBpmFromUrl(url: string): Promise<number | null> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    console.log('[detectBpm] fetched audio, size:', arrayBuffer.byteLength)

    const offlineCtx = new OfflineAudioContext(1, 44100, 44100)
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)
    console.log('[detectBpm] decoded audio:', audioBuffer.duration.toFixed(1), 's,', audioBuffer.sampleRate, 'Hz,', audioBuffer.numberOfChannels, 'ch')

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
 * Spectral-flux onset detection with adaptive thresholding.
 * Computes energy difference between consecutive windows,
 * then subtracts a local mean to emphasize transients.
 */
function computeOnsetEnvelope(mono: Float32Array): Float32Array {
  const numFrames = Math.floor((mono.length - WINDOW_SIZE) / HOP_SIZE)
  if (numFrames < 2) return new Float32Array(0)

  const raw = new Float32Array(numFrames)
  let prevEnergy = 0

  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_SIZE
    let energy = 0
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const s = mono[start + i]
      energy += s * s
    }

    // Half-wave rectified difference (only positive increases = onsets)
    raw[f] = Math.max(0, energy - prevEnergy)
    prevEnergy = energy
  }

  // Adaptive threshold: subtract local mean (window of ~0.5s)
  const meanWindow = Math.max(3, Math.round(0.5 * (mono.length / HOP_SIZE / (mono.length / 44100))))
  const envelope = new Float32Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    const lo = Math.max(0, f - meanWindow)
    const hi = Math.min(numFrames, f + meanWindow + 1)
    let localMean = 0
    for (let j = lo; j < hi; j++) localMean += raw[j]
    localMean /= (hi - lo)
    envelope[f] = Math.max(0, raw[f] - localMean)
  }

  // Normalize to [0, 1]
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
 *
 * Uses normalized autocorrelation: R(lag) / R(0) so strength is in [0, 1].
 */
function autocorrelateBpm(
  envelope: Float32Array,
  sampleRate: number,
): { bpm: number; strength: number } {
  const hopsPerSecond = sampleRate / HOP_SIZE
  const N = envelope.length

  // Compute R(0) — the self-energy, for normalization
  let r0 = 0
  for (let i = 0; i < N; i++) {
    r0 += envelope[i] * envelope[i]
  }
  if (r0 === 0) return { bpm: 120, strength: 0 }

  // Convert BPM range to lag range (in onset-envelope frames)
  const minLag = Math.floor((hopsPerSecond * 60) / BPM_MAX)
  const maxLag = Math.ceil((hopsPerSecond * 60) / BPM_MIN)

  let bestLag = minLag
  let bestCorr = -Infinity

  // Compute normalized autocorrelation for each candidate lag
  for (let lag = minLag; lag <= maxLag && lag < N; lag++) {
    let sum = 0
    for (let i = 0; i < N - lag; i++) {
      sum += envelope[i] * envelope[i + lag]
    }
    // Normalize by R(0) for a [0,1] range
    const corr = sum / r0

    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  // Check half-time (double the lag → half the BPM)
  // Prefer faster tempo if correlation is nearly as strong
  const halfLag = Math.round(bestLag / 2)
  if (halfLag >= minLag) {
    let sum = 0
    for (let i = 0; i < N - halfLag; i++) {
      sum += envelope[i] * envelope[i + halfLag]
    }
    const halfCorr = sum / r0
    if (halfCorr > bestCorr * 0.85) {
      bestLag = halfLag
      bestCorr = halfCorr
    }
  }

  // Check double-time (half the lag → double the BPM)
  const doubleLag = bestLag * 2
  if (doubleLag < N && doubleLag <= maxLag) {
    let sum = 0
    for (let i = 0; i < N - doubleLag; i++) {
      sum += envelope[i] * envelope[i + doubleLag]
    }
    const doubleCorr = sum / r0
    if (doubleCorr > bestCorr * 1.15) {
      bestLag = doubleLag
      bestCorr = doubleCorr
    }
  }

  const bpm = Math.round((hopsPerSecond * 60) / bestLag)
  return { bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, bpm)), strength: bestCorr }
}
