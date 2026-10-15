// Ring buffer of recent frame durations. Zero allocation per frame.
const SIZE = 120
const samples = new Float32Array(SIZE)
let index = 0
let count = 0

export const perfMonitor = {
  /** Frames actually rendered since load (the fps cap skips display frames, so rAF counts would overstate it). */
  drawn: 0,
  record(frameMs: number) {
    this.drawn++
    samples[index] = frameMs
    index = (index + 1) % SIZE
    if (count < SIZE) count++
  },
  getStats() {
    if (count === 0) return { avgMs: 0, maxMs: 0, fps: 0 }
    let sum = 0
    let max = 0
    for (let i = 0; i < count; i++) {
      sum += samples[i]
      if (samples[i] > max) max = samples[i]
    }
    const avgMs = sum / count
    return { avgMs, maxMs: max, fps: avgMs > 0 ? 1000 / avgMs : 0 }
  },
}
