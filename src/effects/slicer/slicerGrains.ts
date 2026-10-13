// The slicer's grain scheduler: which buffer positions are on screen, and how strongly, at each frame.
// Pure (no GL, no stores), so the harness can drive it with a fixed clock and random source.

export type SliceSequenceMode = 'forward' | 'reverse' | 'pendulum' | 'random'
export type GrainDirection = 'forward' | 'reverse' | 'random'

export interface GrainSettings {
  sliceCount: number
  sliceSequenceMode: SliceSequenceMode
  /** Grain length, ms. */
  grainSize: number
  /** Grains started on each trigger. */
  density: number
  /** Random start offset, as a share of the whole buffer. */
  spray: number
  /** Random start delay of each grain, as a share of one trigger step. */
  jitter: number
  /** Read speed through the buffer (1 = real time). */
  rate: number
  direction: GrainDirection
  reverseProb: number
  /** Share of each grain (0..100 %) spent fading in and out. 0 = hard cuts. */
  envelope: number
  /** Chance that a trigger plays at all. */
  sliceProb: number
  syncToBpm: boolean
  /** Triggers per second when not synced. */
  triggerRate: number
  freeze: boolean
}

/** Grains drawn at once (plus the hold frame). The blend shader has one texture slot per voice. */
export const MAX_VOICES = 8
const MAX_GRAINS = 32

interface Grain { start: number; dir: 1 | -1; born: number; dur: number; span: number }
export interface Voice { pos: number; weight: number }

const wrap = (v: number) => v - Math.floor(v)

/**
 * Each trigger plays the current slice and then steps it on (sequence mode). A grain starts at
 * (slice + scan) / sliceCount plus spray, and reads `rate × grainSize` of the buffer. Grains fade
 * in and out over `envelope`; while their weights add up to less than 1, the frame that was last on
 * screen (the hold) fills the rest, so envelopes crossfade from one grain into the next.
 */
export class GrainScheduler {
  private grains: Grain[] = []
  private lastTrigger = -Infinity
  private lastStep = NaN
  private sliceDir: 1 | -1 = 1
  /** The slice the next trigger plays. */
  slice = 0
  /** Position (0..1 of the buffer) the hold frame shows; NaN until something has played. */
  holdPos = NaN
  holdWeight = 0
  readonly voices: Voice[] = Array.from({ length: MAX_VOICES }, () => ({ pos: 0, weight: 0 }))
  voiceCount = 0
  /** Position of the newest grain on screen (the hold when none). */
  playhead = 0

  reset(slice = 0) {
    this.grains.length = 0
    this.lastTrigger = -Infinity
    this.lastStep = NaN
    this.sliceDir = 1
    this.slice = slice
    this.holdPos = NaN
    this.holdWeight = 0
    this.voiceCount = 0
  }

  /** Play `slice` on the next frame (a click on the strip). */
  retrigger(slice: number) {
    this.slice = slice
    this.lastTrigger = -Infinity
    this.lastStep = NaN
  }

  /** Show one fixed position (stopped, scrubbing or looping a slice). */
  show(pos: number) {
    this.grains.length = 0
    this.voiceCount = 0
    this.holdPos = wrap(pos)
    this.holdWeight = 1
    this.playhead = this.holdPos
  }

  private advance(s: GrainSettings, rng: () => number) {
    const n = Math.max(1, s.sliceCount)
    switch (s.sliceSequenceMode) {
      case 'reverse': this.slice = (this.slice - 1 + n) % n; break
      case 'pendulum': {
        if (n === 1) { this.slice = 0; break }
        let next = this.slice + this.sliceDir
        if (next > n - 1 || next < 0) { this.sliceDir = this.sliceDir === 1 ? -1 : 1; next = this.slice + this.sliceDir }
        this.slice = next
        break
      }
      case 'random': this.slice = Math.floor(rng() * n) % n; break
      default: this.slice = (this.slice + 1) % n
    }
  }

  /**
   * Advance to `now` (ms). `beats` is the transport's beat count while it plays (null when stopped):
   * synced triggers then land on its 16ths; otherwise they run free at the BPM or the trigger rate.
   */
  step(now: number, s: GrainSettings, scan: number, bpm: number, bufferSeconds: number, beats: number | null, rng: () => number = Math.random) {
    const n = Math.max(1, s.sliceCount)
    if (this.slice >= n) this.slice = this.slice % n
    if (Number.isNaN(this.holdPos)) this.holdPos = wrap((this.slice + scan) / n)
    if (s.freeze) return // the picture holds: no new grains, nothing advances

    const interval = s.syncToBpm ? 15000 / Math.max(1, bpm) : 1000 / Math.max(0.1, s.triggerRate)
    let fire = false
    if (s.syncToBpm && beats !== null) {
      const st = Math.floor(beats * 4)
      if (st !== this.lastStep) { this.lastStep = st; fire = true }
      this.lastTrigger = now
    } else {
      this.lastStep = NaN
      const since = now - this.lastTrigger
      if (since >= interval) {
        fire = true
        // Keep the grid when a frame is a little late; restart it after a stall
        this.lastTrigger = since < interval * 2 ? this.lastTrigger + interval : now
      }
    }

    if (fire) {
      const slice = this.slice
      this.advance(s, rng)
      if (rng() <= s.sliceProb) {
        const span = (s.grainSize * s.rate) / (Math.max(0.001, bufferSeconds) * 1000)
        const count = Math.max(1, Math.min(MAX_VOICES, Math.round(s.density)))
        for (let i = 0; i < count; i++) {
          const start = wrap((slice + scan) / n + (rng() - 0.5) * s.spray)
          const flip = rng() < s.reverseProb
          const dir: 1 | -1 = s.direction === 'random'
            ? (rng() < 0.5 ? 1 : -1)
            : (s.direction === 'reverse') !== flip ? -1 : 1
          this.grains.push({ start, dir, born: now + rng() * s.jitter * interval, dur: Math.max(1, s.grainSize), span })
        }
        if (this.grains.length > MAX_GRAINS) this.grains.splice(0, this.grains.length - MAX_GRAINS)
      }
    }

    // Expired grains leave their last frame as the hold
    let w = 0
    for (let i = 0; i < this.grains.length; i++) {
      const g = this.grains[i]
      if (now - g.born >= g.dur) this.holdPos = wrap(g.start + g.dir * g.span)
      else this.grains[w++] = g
    }
    this.grains.length = w

    const env = Math.max(0, Math.min(100, s.envelope)) / 200 // fade-in share = fade-out share
    let count = 0
    let total = 0
    // Newest grains first, so the voice slots hold the most recent ones
    for (let i = this.grains.length - 1; i >= 0 && count < MAX_VOICES; i--) {
      const g = this.grains[i]
      if (g.born > now) continue // jittered, not started yet
      const p = (now - g.born) / g.dur
      const weight = env > 0 ? Math.max(0, Math.min(1, p / env, (1 - p) / env)) : 1
      const v = this.voices[count++]
      v.pos = wrap(g.start + g.dir * p * g.span)
      v.weight = weight
      total += weight
    }
    this.voiceCount = count
    if (total >= 1) {
      for (let i = 0; i < count; i++) this.voices[i].weight /= total
      this.holdWeight = 0
    } else {
      this.holdWeight = 1 - total
    }
    this.playhead = count > 0 ? this.voices[0].pos : this.holdPos
  }
}
