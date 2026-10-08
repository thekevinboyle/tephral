// warp-processor: the audio side of the time warp (AudioWorklet, plain JS).
//
// KEEP IN SYNC WITH src/effects/warp/warpMath.ts (skewPhase, lutAt, warpedY, delayFraction,
// delaySeconds, loopSeconds) and src/effects/warp/warpClock.ts (segments). A worklet cannot import
// TS, so the maths is ported inline below. `layout-check.mjs warpaudio` compares this port's
// effective delay against warpMath for random lines; run it after touching either file.
//
// One deliberate difference: lutAt() here treats a LUT cell whose y changes by more than JUMP
// as a vertical jump (no interpolation across it), so the read position jumps in one sample and
// the click guard crossfades it, instead of a ~2-15 ms high-speed sweep through the buffer.
//
// Messages (port):
//   {type:'lut', lut: Float32Array(1024)}
//   {type:'clock', t0, bpm, lengthBeats, at?, keep?, reset?}   at = time the segment takes effect.
//      keep: phase-preserving change (tempo/length). If it arrives after `at`, it is applied now with
//      t0 re-derived so the phase stays continuous. Without keep (sequencer play) it is a deliberate jump.
//   {type:'dispose'}   drop the rings; process() returns false so the processor can be collected
//   {type:'params', amount, skew, profile, smooth, grain, blend, rate, crunch, mix, active, probe?}
// processorOptions.messages: the same messages, applied in the constructor (initial state).
// probe: test only; channel 1 carries the loop phase instead of audio.
// Posts 'alive' when constructed and 'disposed' after dispose (audioWarp counts live processors).

const MAX_DELAY_SECONDS = 8
const EPS = 1e-5
const JUMP = 0.05

function loopSeconds(lengthBeats, bpm) {
  const v = (lengthBeats * 60) / bpm
  return Number.isFinite(v) && v > 0 ? v : 2
}
function skewPhase(x, skew) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  if (!skew) return x
  return Math.pow(x, Math.pow(2, -1.5 * skew))
}
function lutAt(lut, x) {
  const f = (x < 0 ? 0 : x > 1 ? 1 : x) * (lut.length - 1)
  const i = Math.floor(f)
  if (i >= lut.length - 1) return lut[lut.length - 1]
  const a = lut[i]
  const b = lut[i + 1]
  if (Math.abs(b - a) > JUMP) return f - i < 1 - 1e-9 ? a : b
  return a + (b - a) * (f - i)
}
function delayFraction(xs, y) {
  let f = (xs - y) % 1
  if (f < 0) f += 1
  if (f < EPS || f > 1 - EPS) return 0
  return f
}

class WarpProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const sr = sampleRate
    this.size = Math.ceil((MAX_DELAY_SECONDS + 0.25) * sr) // 8 s + grain/interp margin
    this.ring = [new Float32Array(this.size), new Float32Array(this.size)]
    this.disposed = false
    this.n = 0 // absolute frame index of the next input sample
    this.lut = null
    this.segs = [{ at: -Infinity, t0: 0, bpm: 120, lengthBeats: 4 }]
    this.p = { amount: 1, skew: 0, profile: 'clean', smooth: 0.3, grain: 0.4, blend: 0.5, rate: 0.5, crunch: 0.3, mix: 1, active: true, probe: false }
    this.mixS = 0 // smoothed effective mix; starts dry so an inserted warp fades in
    this.prevP = null // previous read position (may be negative early on: before the first sample)
    // click guard: old voice is a read head (xfOld) or, when retriggered mid-fade, a held value (xfHold)
    this.xfOld = 0
    this.xfHold = null
    this.xfPos = 0
    this.xfLen = 0
    this.lastW = [0, 0] // last wet sample (before degrade)
    // smear grains: each grain keeps its own length until its next restart
    this.gAge = [0, 0]
    this.gStart = [0, 0]
    this.gLen = [0, 0]
    // degrade
    this.hold = [0, 0]
    this.holdCount = 0
    this.port.onmessage = (e) => this.onMsg(e.data)
    // Initial state arrives synchronously so the first block is already right.
    const init = options && options.processorOptions
    if (init && Array.isArray(init.messages)) init.messages.forEach((m) => this.onMsg(m))
    this.port.postMessage('alive')
  }

  phaseAt(t) {
    while (this.segs.length > 1 && this.segs[1].at <= t) this.segs.shift()
    const s = this.segs[0]
    const L = loopSeconds(s.lengthBeats, s.bpm)
    const ph = (t - s.t0) / L
    return ph - Math.floor(ph)
  }

  onMsg(m) {
    if (!m || typeof m !== 'object') return
    if (m.type === 'lut' && m.lut && m.lut.length > 1) this.lut = m.lut instanceof Float32Array ? m.lut : Float32Array.from(m.lut) // already a structured-clone copy
    else if (m.type === 'params') Object.assign(this.p, m)
    else if (m.type === 'dispose') {
      this.disposed = true
      this.ring = null
      this.lut = null
      this.port.postMessage('disposed')
    } else if (m.type === 'clock') {
      const seg = { at: typeof m.at === 'number' ? m.at : -Infinity, t0: m.t0, bpm: m.bpm, lengthBeats: m.lengthBeats }
      if (m.reset) { this.segs = [seg]; return }
      const now = currentTime
      if (m.keep && seg.at < now) {
        // Arrived late: switch now, keeping the phase this processor is already at.
        const ph = this.phaseAt(now)
        seg.at = now
        seg.t0 = now - ph * loopSeconds(seg.lengthBeats, seg.bpm)
      }
      while (this.segs.length && this.segs[this.segs.length - 1].at >= seg.at) this.segs.pop()
      this.segs.push(seg)
    }
  }

  read(ch, pos) {
    if (pos < 0) return 0
    const r = this.ring[ch]
    const i = Math.floor(pos)
    const fr = pos - i
    const a = r[i % this.size]
    if (fr === 0) return a
    return a + (r[(i + 1) % this.size] - a) * fr
  }

  process(inputs, outputs) {
    if (this.disposed) return false
    const input = inputs[0]
    const out = outputs[0]
    const frames = out[0].length
    const sr = sampleRate
    const p = this.p
    const inL = input && input.length ? input[0] : null
    const inR = input && input.length > 1 ? input[1] : inL
    const target = p.active ? p.mix : 0
    const mixK = 1 - Math.exp(-1 / (0.005 * sr))
    const fadeLen = Math.round(p.smooth * 0.03 * sr)
    const jumpSamples = 0.01 * sr
    const grainLen = Math.max(2, Math.round((0.01 + p.grain * 0.11) * sr))
    const holdN = 1 + Math.round(p.rate * 23)
    const half = Math.pow(2, 16 - Math.round(p.crunch * 14)) / 2
    const doWarp = p.active && this.lut

    for (let i = 0; i < frames; i++) {
      const n = this.n
      const xL = inL ? inL[i] : 0
      const xR = inR ? inR[i] : 0
      const w = n % this.size
      this.ring[0][w] = xL
      this.ring[1][w] = xR

      // phase from the shared clock, per sample
      const t = currentTime + i / sr
      const phase = this.phaseAt(t)
      const s = this.segs[0]
      const L = loopSeconds(s.lengthBeats, s.bpm)

      let P = n // read position (absolute frames)
      if (doWarp) {
        const xs = skewPhase(phase, p.skew)
        const y = xs + p.amount * (lutAt(this.lut, xs) - xs)
        const d = Math.min(delayFraction(xs, y) * L, MAX_DELAY_SECONDS)
        P = n - d * sr
      }
      // click guard: a jump in read position > 10 ms crossfades over smooth*30 ms.
      // Mid-fade retriggers fade from the last wet sample (held), so the output never steps.
      if (this.prevP !== null && Math.abs(P - (this.prevP + 1)) > jumpSamples && fadeLen > 0) {
        // smear's output is not a single read head, so it always fades from the held last sample
        if (this.xfPos < this.xfLen || p.profile === 'smear') this.xfHold = [this.lastW[0], this.lastW[1]]
        else { this.xfHold = null; this.xfOld = this.prevP + 1 }
        this.xfPos = 0
        this.xfLen = fadeLen
      }
      this.prevP = P

      let wL, wR
      if (p.profile === 'smear' && doWarp) {
        let gL = 0, gR = 0
        for (let g = 0; g < 2; g++) {
          if (this.gLen[g] === 0) { this.gLen[g] = grainLen; this.gAge[g] = g ? grainLen >> 1 : 0; this.gStart[g] = P - this.gAge[g] }
          if (this.gAge[g] >= this.gLen[g]) { this.gAge[g] = 0; this.gStart[g] = P; this.gLen[g] = grainLen } // re-time only on restart
          const win = Math.sin(Math.PI * (this.gAge[g] / this.gLen[g])) ** 2
          const pos = Math.min(this.gStart[g] + this.gAge[g], n)
          gL += win * this.read(0, pos)
          gR += win * this.read(1, pos)
          this.gAge[g]++
        }
        const dL = this.read(0, P)
        const dR = this.read(1, P)
        wL = dL + (gL - dL) * p.blend
        wR = dR + (gR - dR) * p.blend
      } else {
        wL = this.read(0, P)
        wR = this.read(1, P)
      }
      if (this.xfPos < this.xfLen) {
        const g = this.xfPos / this.xfLen
        let oL, oR
        if (this.xfHold) { oL = this.xfHold[0]; oR = this.xfHold[1] }
        else { const pos = Math.min(this.xfOld, n); oL = this.read(0, pos); oR = this.read(1, pos); this.xfOld++ }
        wL = oL * (1 - g) + wL * g
        wR = oR * (1 - g) + wR * g
        this.xfPos++
      }
      this.lastW[0] = wL
      this.lastW[1] = wR
      if (p.profile === 'degrade' && doWarp) {
        if (this.holdCount <= 0) { this.hold[0] = wL; this.hold[1] = wR; this.holdCount = holdN }
        this.holdCount--
        wL = Math.round(this.hold[0] * half) / half
        wR = Math.round(this.hold[1] * half) / half
      }

      this.mixS += (target - this.mixS) * mixK
      if (Math.abs(target - this.mixS) < 1e-6) this.mixS = target
      const m = this.mixS
      if (m === 0) { out[0][i] = xL; if (out[1]) out[1][i] = xR }
      else if (m === 1) { out[0][i] = wL; if (out[1]) out[1][i] = wR }
      else { out[0][i] = xL + (wL - xL) * m; if (out[1]) out[1][i] = xR + (wR - xR) * m }
      if (p.probe && out[1]) out[1][i] = phase
      this.n++
    }
    return true
  }
}

registerProcessor('warp-processor', WarpProcessor)
