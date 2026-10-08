// warp-processor: the audio side of the time warp (AudioWorklet, plain JS).
//
// KEEP IN SYNC WITH src/effects/warp/warpMath.ts (skewPhase, lutAt, warpedY, delaySeconds,
// loopSeconds) and src/effects/warp/warpClock.ts (segments). A worklet cannot import TS, so the maths
// is ported inline below (warpDelay = delaySeconds). `layout-check.mjs warpmath` compares warpDelay
// with delaySeconds directly and `warpaudio` compares the rendered delay; run both after touching either.
//
// Time model (v2): y = how far back, as a fraction of the loop (0 = live). delay = amount * f(x') * L,
// clamped to 8 s, no modulo.
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
//   {type:'params', amount, skew, mix, active, profile, knobs:[4], output:{low,high,levelDb}, lengthBeats?, smooth?, probe?}
//      profile: 'clean' | 'flange' | 'degrade' | 'filterspam' | 'harmonicer' | 'fauxcoder' | 'lofizzly'
//      ('smear' is read as 'flange'). knobs are that profile's 4 knobs, 0..1 (spec §3).
//      output: low cut 20..2000 Hz, high cut 500..20000 Hz (12 dB/oct, wet only), level -24..+6 dB.
//      lengthBeats is informational: the clock messages are authoritative for the loop.
//      smooth: click-guard fade, 0..1 of 30 ms (default .5 = 15 ms). Not sent by the app; tests use it.
// processorOptions.messages: the same messages, applied in the constructor (initial state, no ramps).
// probe: test only; channel 1 carries the loop phase instead of audio.
// Posts 'alive' when constructed and 'disposed' after dispose (audioWarp counts live processors).
//
// Signal path per sample:
//   ring write -> read position P = n - delay -> click guard (v1) -> profile render (pre) -> profile post
//   -> Output (HP, LP, gain; wet only) -> mix.
// Neutral rule: at a profile's neutral knobs every stage below is skipped exactly, so with a flat line at
// the top the wet signal is the v1 plain read of the ring, which is the input itself.
// Knob and Output changes ramp linearly over 20 ms; a profile switch crossfades both profiles over 20 ms.
// Nothing in process() allocates: all voices, filter states and buffers are made in the constructor.

const MAX_DELAY_SECONDS = 8
const JUMP = 0.05
const RAMP_SECONDS = 0.02 // knob / Output / profile-switch smoothing
const CTRL = 16 // control-rate period (samples) for coefficient updates
const TAU = 2 * Math.PI
const PROFILES = ['clean', 'flange', 'degrade', 'filterspam', 'harmonicer', 'fauxcoder', 'lofizzly']
const NK = 4 // knobs per profile
const R_LOW = PROFILES.length * NK // ramp slots after the knobs: Output low (log2 Hz), high (log2 Hz), gain
const R_HIGH = R_LOW + 1
const R_GAIN = R_LOW + 2
const N_RAMPS = R_LOW + 3
/** Neutral knobs per profile (spec §3; "any" knobs are 0 here). The processor starts neutral until told otherwise. */
const NEUTRAL = [[0, 0, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
const LOW_OPEN = 20
const HIGH_OPEN = 20000
const LOG_LOW_OPEN = Math.log2(LOW_OPEN)
const LOG_HIGH_OPEN = Math.log2(HIGH_OPEN)

function loopSeconds(lengthBeats, bpm) {
  const v = (lengthBeats * 60) / bpm
  return Number.isFinite(v) && v > 0 ? v : 2
}
function skewPhase(x, skew) {
  if (!(x > 0)) return 0 // also NaN
  if (x >= 1) return 1
  if (!skew || !Number.isFinite(skew)) return x
  return Math.pow(x, Math.pow(2, -1.5 * skew))
}
function lutAt(lut, x) {
  const f = (x > 0 ? (x < 1 ? x : 1) : 0) * (lut.length - 1) // NaN reads x = 0
  const i = Math.floor(f)
  if (i >= lut.length - 1) return lut[lut.length - 1]
  const a = lut[i]
  const b = lut[i + 1]
  if (Math.abs(b - a) > JUMP) return f - i < 1 - 1e-9 ? a : b
  return a + (b - a) * (f - i)
}
/** delaySeconds: y' = amount * f(x'), delay = y' * L, clamped to 8 s. Non-finite (NaN) gives 0, never 8 s. */
function warpDelay(lut, phase, amount, skew, L) {
  const d = amount * lutAt(lut, skewPhase(phase, skew)) * L
  return d > 0 ? (d < MAX_DELAY_SECONDS ? d : MAX_DELAY_SECONDS) : 0
}
/** A LUT from the main thread, with non-finite cells set to 0 (live) and cells clamped to 0..1. */
function cleanLut(src) {
  const lut = src instanceof Float32Array ? src : Float32Array.from(src)
  for (let i = 0; i < lut.length; i++) { const v = lut[i]; lut[i] = v > 0 ? (v < 1 ? v : 1) : 0 }
  return lut
}

// ---------------------------------------------------------------- shared DSP helpers

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Catmull-Rom read of ring r (size sz) at absolute position pos; samples after nMax are not written yet. */
function cubic(r, sz, nMax, pos) {
  if (pos < 1) return 0
  const i = Math.floor(pos)
  const f = pos - i
  const x1 = r[i % sz]
  if (f === 0) return x1
  const x0 = r[(i - 1) % sz]
  const x2 = r[(i + 1) % sz]
  const x3 = i + 2 <= nMax ? r[(i + 2) % sz] : x2
  return x1 + 0.5 * f * (x2 - x0 + f * (2 * x0 - 5 * x1 + 4 * x2 - x3 + f * (3 * (x1 - x2) + x3 - x0)))
}

// RBJ biquads, coefficients [b0, b1, b2, a1, a2] at offset o; transposed direct form II, 2 states per channel.
function bqFreq(f) { const hi = 0.45 * sampleRate; return f < 10 ? 10 : f > hi ? hi : f }
function setLP(c, o, f, q) {
  const w = (TAU * bqFreq(f)) / sampleRate, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al
  c[o] = (1 - cs) / 2 / a0; c[o + 1] = (1 - cs) / a0; c[o + 2] = c[o]; c[o + 3] = (-2 * cs) / a0; c[o + 4] = (1 - al) / a0
}
function setHP(c, o, f, q) {
  const w = (TAU * bqFreq(f)) / sampleRate, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al
  c[o] = (1 + cs) / 2 / a0; c[o + 1] = -(1 + cs) / a0; c[o + 2] = c[o]; c[o + 3] = (-2 * cs) / a0; c[o + 4] = (1 - al) / a0
}
/** Band-pass, 0 dB peak. */
function setBP(c, o, f, q) {
  const w = (TAU * bqFreq(f)) / sampleRate, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al
  c[o] = al / a0; c[o + 1] = 0; c[o + 2] = -al / a0; c[o + 3] = (-2 * cs) / a0; c[o + 4] = (1 - al) / a0
}
const DENORMAL = 1e-20
function bq(c, o, z, zo, x) {
  const y = c[o] * x + z[zo]
  let z0 = c[o + 1] * x - c[o + 3] * y + z[zo + 1]
  let z1 = c[o + 2] * x - c[o + 4] * y
  // flush tiny states to 0 so a decaying filter never runs on denormals
  if (z0 < DENORMAL && z0 > -DENORMAL) z0 = 0
  if (z1 < DENORMAL && z1 > -DENORMAL) z1 = 0
  z[zo] = z0
  z[zo + 1] = z1
  return y
}

/** Linear 0..1 engagement ramp over RAMP_SECONDS. Returns the new value. */
function engage(v, on, step) {
  if (on) return v + step >= 1 ? 1 : v + step
  return v - step <= 0 ? 0 : v - step
}

// ---------------------------------------------------------------- grain engine
// Two Hann-windowed streams, half a grain apart, reading the ring with cubic interpolation.
// Stream position: base(a) - delta(a), a = age in samples.
//   base(a) = phys * P(now) + (1 - phys) * (P(start) + a)   phys 1 = tape (follows the line), 0 = pitch held
//   delta(a) = c + k * a; forward: k = 1 - r, c = max(0, (r - 1) * len); reverse: k = 1 + r, c = 0
// so the grain plays at rate r relative to the read point and never reads ahead of the write head.
// When a stream restarts its length is pulled halfway between the partner's remaining time x 2 and the
// wanted length, keeping the streams near half a grain apart; the overlap-add is normalized by the
// window sum so the level stays constant while lengths change.

class Grains {
  constructor() {
    this.active = false
    this.age = new Float64Array(2)
    this.len = new Float64Array(2)
    this.start = new Float64Array(2)
    this.k = new Float64Array(2)
    this.c = new Float64Array(2)
    this.rate = new Float64Array(2)
    this.rev = new Uint8Array(2)
    this.cf = new Float64Array(10) // per-stream biquad coefficients (owners that filter per grain)
    this.z = new Float64Array(8) // per-stream, per-channel biquad state
    this.fw = 0 // per-grain filter weight; 0 = no filter
    this.L = 0
    this.R = 0
  }

  init(P, len) {
    for (let g = 0; g < 2; g++) {
      this.len[g] = len
      this.age[g] = g ? len / 2 : 0
      this.start[g] = P - this.age[g]
      this.k[g] = 0; this.c[g] = 0; this.rate[g] = 1; this.rev[g] = 0
    }
    this.z.fill(0)
    this.active = true
  }

  /**
   * One sample. ring/sz/nMax: the buffer read from. P: read point now. want: wanted grain length (samples).
   * phys: tape (1) vs pitch-held (0). wOff: right-channel time offset as a fraction of the grain length.
   * owner.onGrain(grains, g) sets rate[g], rev[g] (and per-grain filter coefficients) at each restart.
   */
  step(ring, sz, nMax, P, want, phys, wOff, owner) {
    let sw = 0, sL = 0, sR = 0
    const lo = nMax - sz + 4
    for (let g = 0; g < 2; g++) {
      if (this.age[g] >= this.len[g]) {
        const o = 1 - g
        let L = ((this.len[o] - this.age[o]) * 2 + want) / 2
        if (L < want * 0.5) L = want * 0.5
        else if (L > want * 2) L = want * 2
        if (L < 64) L = 64
        this.len[g] = L
        this.age[g] = 0
        this.start[g] = P
        this.rate[g] = 1
        this.rev[g] = 0
        owner.onGrain(this, g)
        const r = this.rate[g]
        if (this.rev[g]) { this.k[g] = 1 + r; this.c[g] = 0 } else { this.k[g] = 1 - r; this.c[g] = this.k[g] < 0 ? -this.k[g] * L : 0 }
      }
      const a = this.age[g]
      const L = this.len[g]
      const s = Math.sin((Math.PI * a) / L)
      const w = s * s
      let pos = phys * P + (1 - phys) * (this.start[g] + a) - (this.c[g] + this.k[g] * a)
      if (pos > nMax) pos = nMax
      if (pos < lo) pos = lo
      let posR = wOff > 0 ? pos - wOff * L : pos
      if (posR < lo) posR = lo
      let xL = cubic(ring[0], sz, nMax, pos)
      let xR = cubic(ring[1], sz, nMax, posR)
      if (this.fw > 0) {
        const o5 = g * 5, zo = g * 4
        const yL = bq(this.cf, o5, this.z, zo, xL)
        const yR = bq(this.cf, o5, this.z, zo + 2, xR)
        xL += (yL - xL) * this.fw
        xR += (yR - xR) * this.fw
      }
      sL += w * xL
      sR += w * xR
      sw += w
      this.age[g] = a + 1
    }
    // normalise by the window sum, floored so a dip in the overlap never boosts the level
    const d = sw > 0.5 ? sw : 0.5
    this.L = sL / d; this.R = sR / d
  }
}

// ---------------------------------------------------------------- profiles
// Each profile: reset(); render(pr, P) -> pr.wL/wR (+ pr.prePlain when it is the exact plain read);
// post(pr, L, R) -> pr.oL/oR. pr.kv(i) reads this profile's smoothed knob i.

/** Clean (neutral 0,0,0,0): Vibrato ±6 ms at 0.5..12 Hz; Echo ⅛ beat, feedback 0..0.85; Circuit-bend chunks 5..40 ms. */
class Clean {
  constructor(sr) {
    this.id = 0
    this.echo = [new Float32Array(Math.ceil(sr)), new Float32Array(Math.ceil(sr))] // ⅛ beat up to 1 s (7.5 BPM)
    this.reset()
  }
  reset() {
    this.ph = 0
    this.echo[0].fill(0); this.echo[1].fill(0)
    this.ew = 0
    // echo tap (samples, fractional while ramping): a BPM change moves it over RAMP_SECONDS, not in one sample
    this.eTap = -1; this.eTgt = -1; this.eStep = 0; this.eLeft = 0
    this.chunkLeft = 0; this.chunkLen = 0; this.bendOn = false; this.bendOff = 0
  }
  render(pr, P) {
    const vib = pr.kv(this.id, 0)
    const f = 0.5 * Math.pow(24, pr.kv(this.id, 1))
    this.ph += f / pr.sr
    if (this.ph >= 1) this.ph -= 1
    if (vib === 0) { pr.wL = pr.read(0, P); pr.wR = pr.read(1, P); pr.prePlain = true; return }
    // 0..12 ms behind = ±6 ms around 6 ms (never ahead of the write head)
    const pos = P - vib * 0.006 * pr.sr * (1 - Math.cos(TAU * this.ph))
    pr.wL = cubic(pr.ring[0], pr.size, pr.n, pos)
    pr.wR = cubic(pr.ring[1], pr.size, pr.n, pos)
    pr.prePlain = false
  }
  post(pr, L, R) {
    const sr = pr.sr
    // circuit-bend: decided per chunk, so turning the knob down never cuts a bent chunk off mid-way
    if (this.chunkLeft <= 0) {
      this.chunkLen = Math.round((0.005 + 0.035 * pr.rand()) * sr)
      this.chunkLeft = this.chunkLen
      const bend = pr.kv(this.id, 3)
      this.bendOn = bend > 0 && pr.rand() < bend * 0.6
      this.bendOff = Math.round((0.02 + 0.38 * pr.rand()) * sr)
    }
    if (this.bendOn) {
      const age = this.chunkLen - this.chunkLeft
      const rmp = 0.0015 * sr
      const env = Math.min(1, age / rmp, this.chunkLeft / rmp)
      const pos = pr.P - this.bendOff
      L += (pr.read(0, pos) - L) * env
      R += (pr.read(1, pos) - R) * env
    }
    this.chunkLeft--
    // echo: feedback echo of the wet signal, ⅛ beat
    const fb = 0.85 * pr.kv(this.id, 2)
    const e0 = this.echo[0], e1 = this.echo[1], es = e0.length
    let E = Math.round((60 / pr.bpm / 8) * sr)
    if (E < 1) E = 1; else if (E > es - 1) E = es - 1
    if (this.eTap < 0) { this.eTap = this.eTgt = E; this.eLeft = 0 }
    else if (E !== this.eTgt) { this.eTgt = E; this.eLeft = Math.max(1, Math.round(RAMP_SECONDS * sr)); this.eStep = (E - this.eTap) / this.eLeft }
    if (this.eLeft > 0) { if (--this.eLeft === 0) this.eTap = this.eTgt; else this.eTap += this.eStep }
    const tp = this.eTap, ti = Math.floor(tp), tf = tp - ti
    const ra = (this.ew - ti + es) % es, rb = (ra - 1 + es) % es // rb is one sample further back
    const yL = fb === 0 ? L : L + fb * (e0[ra] + (e0[rb] - e0[ra]) * tf)
    const yR = fb === 0 ? R : R + fb * (e1[ra] + (e1[rb] - e1[ra]) * tf)
    e0[this.ew] = yL; e1[this.ew] = yR
    this.ew = (this.ew + 1) % es
    pr.oL = yL; pr.oR = yR
  }
}

/** Flange (neutral 0,1,any,0): grains 10..120 ms, ±1 semitone per-grain jitter, Physics tape <-> pitch held, Width ≤ ½ grain. */
class Flange {
  constructor() { this.id = 1; this.g = new Grains(); this.reset() }
  reset() { this.g.active = false; this.e = 0; this.g.fw = 0 }
  onGrain(G, g) {
    const mod = this.mod
    G.rate[g] = Math.pow(2, (mod * (2 * this.pr.rand() - 1)) / 12)
    G.start[g] -= mod * this.pr.rand() * 0.25 * G.len[g] // rate/time jitter: the grain starts a little further back
  }
  render(pr, P) {
    const mod = pr.kv(this.id, 0), phys = pr.kv(this.id, 1), size = pr.kv(this.id, 2), width = pr.kv(this.id, 3)
    const on = mod > 0 || phys < 1 || width > 0 || pr.kt(this.id, 0) > 0 || pr.kt(this.id, 1) < 1 || pr.kt(this.id, 3) > 0
    this.e = engage(this.e, on, pr.engStep)
    const pL = pr.read(0, P), pR = pr.read(1, P)
    if (this.e === 0) { this.g.active = false; pr.wL = pL; pr.wR = pR; pr.prePlain = true; return }
    const want = (0.01 + 0.11 * size) * pr.sr
    if (!this.g.active) this.g.init(P, want)
    this.mod = mod; this.pr = pr
    this.g.step(pr.ring, pr.size, pr.n, P, want, phys, width * 0.5, this)
    pr.wL = pL + (this.g.L - pL) * this.e
    pr.wR = pR + (this.g.R - pR) * this.e
    pr.prePlain = false
  }
  post(pr, L, R) { pr.oL = L; pr.oR = R }
}

/** Sample-and-hold rate reduction state (fractional hold phase). */
class Hold {
  constructor() { this.reset() }
  reset() { this.ph = 1; this.L = 0; this.R = 0 }
  /** rateRatio = target rate / sr (1 = every sample). */
  step(L, R, rateRatio) {
    this.ph += rateRatio
    if (this.ph >= 1) { this.ph -= Math.floor(this.ph); this.L = L; this.R = R }
  }
}

/** Degrade (neutral 0,1,any,0): SR down to 2 kHz + crush to 4 bits; one-pole LP 200 Hz..20 kHz; grains 10..120 ms; Chaos ±7 st. */
class Degrade {
  constructor() { this.id = 2; this.g = new Grains(); this.hold = new Hold(); this.reset() }
  reset() { this.g.active = false; this.e = 0; this.lpL = 0; this.lpR = 0; this.hold.reset() }
  onGrain(G, g) { G.rate[g] = Math.pow(2, (7 * this.chaos * (2 * this.pr.rand() - 1)) / 12) }
  render(pr, P) {
    const chaos = pr.kv(this.id, 3)
    this.e = engage(this.e, chaos > 0 || pr.kt(this.id, 3) > 0, pr.engStep)
    const pL = pr.read(0, P), pR = pr.read(1, P)
    if (this.e === 0) { this.g.active = false; pr.wL = pL; pr.wR = pR; pr.prePlain = true; return }
    const want = (0.01 + 0.11 * pr.kv(this.id, 2)) * pr.sr
    if (!this.g.active) this.g.init(P, want)
    this.chaos = chaos; this.pr = pr
    this.g.step(pr.ring, pr.size, pr.n, P, want, 1, 0, this)
    pr.wL = pL + (this.g.L - pL) * this.e
    pr.wR = pR + (this.g.R - pR) * this.e
    pr.prePlain = false
  }
  post(pr, L, R) {
    const cut = pr.kv(this.id, 1)
    if (cut < 1) {
      // one-pole LP, 200 Hz .. 20 kHz; over the top 5% of the knob it opens fully to a = 1 (the bypass)
      let a = 1 - Math.exp((-TAU * 200 * Math.pow(100, cut)) / pr.sr)
      if (cut > 0.95) a += (1 - a) * ((cut - 0.95) / 0.05)
      this.lpL += (L - this.lpL) * a
      this.lpR += (R - this.lpR) * a
      if (this.lpL < DENORMAL && this.lpL > -DENORMAL) this.lpL = 0
      if (this.lpR < DENORMAL && this.lpR > -DENORMAL) this.lpR = 0
      L = this.lpL; R = this.lpR
    } else { this.lpL = L; this.lpR = R }
    const deg = pr.kv(this.id, 0)
    if (deg > 0) {
      this.hold.step(L, R, Math.pow(2000 / pr.sr, deg))
      const q = Math.pow(2, 15 - 12 * deg) // 16 bits -> 4 bits
      L = Math.round(this.hold.L * q) / q
      R = Math.round(this.hold.R * q) / q
    } else this.hold.reset()
    pr.oL = L; pr.oR = R
  }
}

/** Filter Spam (neutral 1,0,0,0): per-grain biquad LP 200 Hz..18 kHz, Q 0.7..12, randomized per grain; Octaves = P(2× rate). */
class FilterSpam {
  constructor() { this.id = 3; this.g = new Grains(); this.reset() }
  reset() { this.g.active = false; this.e = 0 }
  onGrain(G, g) {
    const pr = this.pr
    const cut = pr.kv(this.id, 0), rnd = pr.kv(this.id, 1), res = pr.kv(this.id, 2), oct = pr.kv(this.id, 3)
    G.rate[g] = pr.rand() < oct ? 2 : 1
    const fc = 200 * Math.pow(90, cut) * Math.pow(2, -rnd * pr.rand() * 5)
    let q = 0.7 * Math.pow(12 / 0.7, res) * Math.pow(2, rnd * (2 * pr.rand() - 1) * 1.5)
    if (q < 0.5) q = 0.5; else if (q > 14) q = 14
    setLP(G.cf, g * 5, fc, q)
    const comp = 1 / Math.sqrt(q > 1 ? q : 1) // tame the resonant peak
    for (let i = 0; i < 3; i++) G.cf[g * 5 + i] *= comp
  }
  render(pr, P) {
    const id = this.id
    const cut = pr.kv(id, 0), rnd = pr.kv(id, 1), res = pr.kv(id, 2), oct = pr.kv(id, 3)
    const on = cut < 1 || rnd > 0 || res > 0 || oct > 0 || pr.kt(id, 0) < 1 || pr.kt(id, 1) > 0 || pr.kt(id, 2) > 0 || pr.kt(id, 3) > 0
    this.e = engage(this.e, on, pr.engStep)
    const pL = pr.read(0, P), pR = pr.read(1, P)
    if (this.e === 0) { this.g.active = false; pr.wL = pL; pr.wR = pR; pr.prePlain = true; return }
    const want = 0.06 * pr.sr
    this.pr = pr
    if (!this.g.active) { this.g.init(P, want); this.onGrain(this.g, 0); this.onGrain(this.g, 1); this.g.rate[0] = this.g.rate[1] = 1 }
    // filter weight: fades the per-grain filter in from the neutral end (cutoff 1, randomness 0, resonance 0)
    this.g.fw = clamp01(Math.max((1 - cut) * 20, rnd * 20, res * 20))
    this.g.step(pr.ring, pr.size, pr.n, P, want, 1, 0, this)
    pr.wL = pL + (this.g.L - pL) * this.e
    pr.wR = pR + (this.g.R - pR) * this.e
    pr.prePlain = false
  }
  post(pr, L, R) { pr.oL = L; pr.oR = R }
}

/** Harmo-nicer (neutral 0,0,any,0): grain voices at 2× and 1.5× with feedback, detune ±30 cents, arpeggio 0.5..8 Hz, reverse probability. */
class Harmonicer {
  constructor(sr) {
    this.id = 4
    this.main = new Grains()
    this.vo = new Grains()
    this.vf = new Grains()
    this.hsz = Math.ceil(0.5 * sr)
    this.hb = [new Float32Array(this.hsz), new Float32Array(this.hsz)]
    this.who = this.vo
    this.reset()
  }
  reset() {
    this.main.active = false; this.vo.active = false; this.vf.active = false
    this.e = 0; this.ph = 0; this.fbL = 0; this.fbR = 0; this.hn = 0
    this.hb[0].fill(0); this.hb[1].fill(0)
  }
  onGrain(G, g) {
    const pr = this.pr
    const det = (30 * pr.kv(this.id, 1)) / 1200
    G.rate[g] = G === this.vo ? 2 * Math.pow(2, det) : G === this.vf ? 1.5 * Math.pow(2, -det) : 1
    G.rev[g] = pr.rand() < pr.kv(this.id, 3) ? 1 : 0
  }
  render(pr, P) {
    const id = this.id
    const harm = pr.kv(id, 0), rev = pr.kv(id, 3)
    this.pr = pr
    // main voice: plain read unless Reverse asks for grains
    this.e = engage(this.e, rev > 0 || pr.kt(id, 3) > 0, pr.engStep)
    let mL = pr.read(0, P), mR = pr.read(1, P)
    if (this.e > 0) {
      const want = 0.08 * pr.sr
      if (!this.main.active) this.main.init(P, want)
      this.main.step(pr.ring, pr.size, pr.n, P, want, 1, 0, this)
      mL += (this.main.L - mL) * this.e
      mR += (this.main.R - mR) * this.e
    } else this.main.active = false
    // harmony ring: the main voice plus the voices' feedback; the voices pitch-shift it
    const hn = this.hn, hs = this.hsz
    const fb = 0.35 * harm
    this.hb[0][hn % hs] = mL + fb * this.fbL
    this.hb[1][hn % hs] = mR + fb * this.fbR
    if (harm === 0) {
      this.vo.active = false; this.vf.active = false; this.fbL = 0; this.fbR = 0
      pr.wL = mL; pr.wR = mR; pr.prePlain = this.e === 0
      this.hn = hn + 1
      return
    }
    const want = 0.07 * pr.sr
    if (!this.vo.active) { this.vo.init(hn, want); this.vf.init(hn, want) }
    this.vo.step(this.hb, hs, hn, hn, want, 1, 0, this)
    this.vf.step(this.hb, hs, hn, hn, want, 1, 0, this)
    this.ph += (0.5 * Math.pow(16, pr.kv(id, 2))) / pr.sr
    if (this.ph >= 1) this.ph -= 1
    const a = clamp01(0.5 + 1.5 * Math.cos(TAU * this.ph)) // octave <-> fifth, a soft square
    const vL = a * this.vo.L + (1 - a) * this.vf.L
    const vR = a * this.vo.R + (1 - a) * this.vf.R
    this.fbL = vL; this.fbR = vR
    pr.wL = mL + harm * 0.8 * vL
    pr.wR = mR + harm * 0.8 * vR
    pr.prePlain = false
    this.hn = hn + 1
  }
  post(pr, L, R) { pr.oL = L; pr.oR = R }
}

/** Fauxcoder (neutral 0,0,any,0): 8 band-passes on the harmonics of 80..800 Hz; Squelch 4..40 Hz; Magic random-walks it. */
class Fauxcoder {
  constructor() {
    this.id = 5; this.cf = new Float64Array(8 * 5); this.z = new Float64Array(8 * 4); this.live = new Uint8Array(8)
    this.gt = new Float64Array(8) // per-band gain target: fades to 0 as the band nears 0.45 sr
    this.gc = new Float64Array(8) // per-band gain, smoothed per sample
    this.reset()
  }
  reset() { this.z.fill(0); this.gt.fill(0); this.gc.fill(0); this.live.fill(0); this.ph = 0; this.rw = 0; this.ctr = 0; this.on = false }
  post(pr, L, R) {
    const id = this.id
    const amt = pr.kv(id, 0)
    if (amt === 0) { if (this.on) this.reset(); pr.oL = L; pr.oR = R; return }
    this.on = true
    if (this.ctr-- <= 0) {
      this.ctr = CTRL - 1
      const sq = pr.kv(id, 1), magic = pr.kv(id, 3)
      this.ph += ((4 * Math.pow(10, sq)) * CTRL / pr.sr) * (1 + magic * (pr.rand() - 0.5))
      this.ph -= Math.floor(this.ph)
      this.rw = this.rw * 0.995 + (pr.rand() - 0.5) * magic * 0.15
      const octs = sq * (0.6 * Math.sin(TAU * this.ph) + 0.8 * magic * this.rw)
      const base = 80 * Math.pow(10, pr.kv(id, 2)) * Math.pow(2, octs)
      const top = 0.45 * pr.sr, fade = 0.1 * pr.sr
      for (let k = 0; k < 8; k++) {
        const f = base * (k + 1)
        const on = f < top ? 1 : 0
        if (on && !this.live[k]) { const z = this.z, o = k * 4; z[o] = z[o + 1] = z[o + 2] = z[o + 3] = 0; this.gc[k] = 0 } // re-entering: start clean
        this.live[k] = on
        this.gt[k] = on ? Math.min(1, (top - f) / fade) : 0
        if (on) setBP(this.cf, k * 5, f, 6)
      }
    }
    let bL = 0, bR = 0
    const gk = 1 / CTRL
    for (let k = 0; k < 8; k++) {
      if (!this.live[k]) continue
      const g = (this.gc[k] += (this.gt[k] - this.gc[k]) * gk)
      bL += g * bq(this.cf, k * 5, this.z, k * 4, L)
      bR += g * bq(this.cf, k * 5, this.z, k * 4 + 2, R)
    }
    pr.oL = L + (3 * bL - L) * amt
    pr.oR = R + (3 * bR - R) * amt
  }
  render(pr, P) { pr.wL = pr.read(0, P); pr.wR = pr.read(1, P); pr.prePlain = true }
}

/** Lo-fizzly (neutral 0,0,0,any): SR reduction wobbled by an LFO at 0.2..30 Hz; Dirt noise + random level per 30 ms grain; Radio band 300 Hz..3 kHz. */
class Lofizzly {
  constructor() { this.id = 6; this.hold = new Hold(); this.cf = new Float64Array(10); this.z = new Float64Array(8); this.reset() }
  reset() {
    this.hold.reset(); this.ph = 0; this.ratio = 1; this.ctr = 0
    this.lvl = 1; this.lvlTgt = 1; this.segLeft = 0
    this.z.fill(0); this.radioOn = false
    setHP(this.cf, 0, 300, 0.9); setLP(this.cf, 5, 3000, 2)
  }
  render(pr, P) { pr.wL = pr.read(0, P); pr.wR = pr.read(1, P); pr.prePlain = true }
  post(pr, L, R) {
    const id = this.id
    const deg = pr.kv(id, 0), dirt = pr.kv(id, 1), radio = pr.kv(id, 2)
    this.ph += (0.2 * Math.pow(150, pr.kv(id, 3))) / pr.sr
    if (this.ph >= 1) this.ph -= 1
    if (deg > 0) {
      if (this.ctr-- <= 0) { this.ctr = CTRL - 1; this.ratio = Math.pow(2000 / pr.sr, deg * (0.65 + 0.35 * Math.sin(TAU * this.ph))) }
      this.hold.step(L, R, this.ratio)
      L = this.hold.L; R = this.hold.R
    } else { this.hold.reset(); this.ctr = 0 }
    // dirt: each 30 ms grain glides to a new random level; white noise on top
    if (dirt > 0 || this.lvl !== 1 || this.segLeft > 0) {
      if (this.segLeft <= 0) { this.segLeft = Math.round(0.03 * pr.sr); this.lvlTgt = 1 - dirt * 0.6 * pr.rand() }
      this.lvl += (this.lvlTgt - this.lvl) / this.segLeft
      this.segLeft--
      if (this.segLeft === 0) this.lvl = this.lvlTgt
      const nz = dirt * 0.06
      L = L * this.lvl + nz * (2 * pr.rand() - 1)
      R = R * this.lvl + nz * (2 * pr.rand() - 1)
    }
    if (radio > 0) {
      if (!this.radioOn) { this.z.fill(0); this.radioOn = true }
      const yL = 1.6 * bq(this.cf, 5, this.z, 4, bq(this.cf, 0, this.z, 0, L))
      const yR = 1.6 * bq(this.cf, 5, this.z, 6, bq(this.cf, 0, this.z, 2, R))
      L += (yL - L) * radio
      R += (yR - R) * radio
    } else this.radioOn = false
    pr.oL = L; pr.oR = R
  }
}

// ---------------------------------------------------------------- processor

class WarpProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const sr = sampleRate
    this.sr = sr
    this.size = Math.ceil((MAX_DELAY_SECONDS + 0.5) * sr) // 8 s + grain/interp margin
    this.ring = [new Float32Array(this.size), new Float32Array(this.size)]
    this.disposed = false
    this.n = 0 // absolute frame index of the next input sample
    this.lut = null
    this.segs = [{ at: -Infinity, t0: 0, bpm: 120, lengthBeats: 4 }]
    this.p = { amount: 1, skew: 0, mix: 1, active: true, probe: false, smooth: 0.5 }
    this.mixS = 0 // smoothed effective mix; starts dry so an inserted warp fades in
    this.prevP = null // previous read position (may be negative early on: before the first sample)
    // click guard: old voice is a read head (xfOld) or, when retriggered mid-fade, a held value (xfHold)
    this.xfOld = 0
    this.xfHoldOn = false
    this.xfHoldL = 0
    this.xfHoldR = 0
    this.xfPos = 0
    this.xfLen = 0
    this.lastWL = 0 // last wet sample (before the profiles' post stage)
    this.lastWR = 0
    this.prePlain = true // the current profile's pre stage was the exact plain read last sample
    // PRNG (mulberry32), seeded so offline renders are deterministic
    this.seed = 0x2f6b9e1d | 0
    // smoothed values: 7 x 4 knobs, then Output low/high (log2 Hz) and gain
    this.rc = new Float64Array(N_RAMPS)
    this.rt = new Float64Array(N_RAMPS)
    this.rs = new Float64Array(N_RAMPS)
    this.rl = new Int32Array(N_RAMPS)
    this.rampsOn = 0
    this.rampN = Math.max(1, Math.round(RAMP_SECONDS * sr))
    this.engStep = 1 / this.rampN
    for (let i = 0; i < PROFILES.length; i++) for (let k = 0; k < NK; k++) this.rc[i * NK + k] = this.rt[i * NK + k] = NEUTRAL[i][k]
    this.rc[R_LOW] = this.rt[R_LOW] = LOG_LOW_OPEN
    this.rc[R_HIGH] = this.rt[R_HIGH] = LOG_HIGH_OPEN
    this.rc[R_GAIN] = this.rt[R_GAIN] = 1
    // profiles
    this.profs = [new Clean(sr), new Flange(), new Degrade(), new FilterSpam(), new Harmonicer(sr), new Fauxcoder(), new Lofizzly()]
    this.cur = 0
    this.old = -1 // profile fading out (-2: a held value, when switched again mid-fade)
    this.pxPos = 0
    this.pxHoldL = 0
    this.pxHoldR = 0
    this.lastOL = 0 // last post-stage wet (profile fade hold)
    this.lastOR = 0
    // Output filters: HP then LP (12 dB/oct), always running so engaging them starts from a valid state
    this.ocf = new Float64Array(10)
    this.oz = new Float64Array(8)
    this.octr = 0
    this.oDirty = true
    // per-sample scratch
    this.P = 0
    this.bpm = 120
    this.wL = 0; this.wR = 0; this.oL = 0; this.oR = 0
    this.primed = false
    this.port.onmessage = (e) => this.onMsg(e.data)
    // Initial state arrives synchronously so the first block is already right.
    const init = options && options.processorOptions
    if (init && Array.isArray(init.messages)) init.messages.forEach((m) => this.onMsg(m))
    this.primed = true
    this.port.postMessage('alive')
  }

  rand() {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  /** Smoothed knob k of profile i. */
  kv(i, k) { return this.rc[i * NK + k] }
  /** Target knob k of profile i (engagement decisions look ahead so they fade out with the knob). */
  kt(i, k) { return this.rt[i * NK + k] }

  setRamp(i, v, snap) {
    if (!Number.isFinite(v)) return
    if (snap || this.rc[i] === v) {
      if (this.rl[i] > 0) this.rampsOn--
      this.rc[i] = v; this.rt[i] = v; this.rs[i] = 0; this.rl[i] = 0
      return
    }
    if (this.rl[i] === 0) this.rampsOn++
    this.rt[i] = v
    this.rl[i] = this.rampN
    this.rs[i] = (v - this.rc[i]) / this.rampN
  }

  phaseAt(t) {
    while (this.segs.length > 1 && this.segs[1].at <= t) this.segs.shift()
    const s = this.segs[0]
    const L = loopSeconds(s.lengthBeats, s.bpm)
    const ph = (t - s.t0) / L
    return ph - Math.floor(ph)
  }

  onParams(m) {
    const p = this.p
    for (const k of ['amount', 'skew', 'mix', 'smooth']) if (typeof m[k] === 'number' && Number.isFinite(m[k])) p[k] = m[k]
    p.smooth = clamp01(p.smooth) // test-only click-guard fade: 0..1 of 30 ms
    if (typeof m.active === 'boolean') p.active = m.active
    if (typeof m.probe === 'boolean') p.probe = m.probe
    let id = this.cur
    if (typeof m.profile === 'string') {
      const i = PROFILES.indexOf(m.profile === 'smear' ? 'flange' : m.profile)
      if (i >= 0) id = i
    }
    const snap = !this.primed
    const switched = id !== this.cur
    if (switched) {
      if (snap) this.cur = id
      else {
        // mid-fade: fade out from the last output instead of dropping the profile that was fading out
        if (this.old !== -1) { this.old = -2; this.pxHoldL = this.lastOL; this.pxHoldR = this.lastOR } else this.old = this.cur
        this.cur = id
        this.pxPos = 0
      }
      this.profs[id].reset()
    }
    if (Array.isArray(m.knobs)) for (let k = 0; k < NK; k++) {
      const v = m.knobs[k]
      if (typeof v === 'number') this.setRamp(id * NK + k, clamp01(v), snap || switched)
    } else if (switched) for (let k = 0; k < NK; k++) this.setRamp(id * NK + k, this.rt[id * NK + k], true)
    const o = m.output
    if (o && typeof o === 'object') {
      if (typeof o.low === 'number') this.setRamp(R_LOW, Math.log2(Math.min(2000, Math.max(LOW_OPEN, o.low))), snap)
      if (typeof o.high === 'number') this.setRamp(R_HIGH, Math.log2(Math.min(HIGH_OPEN, Math.max(500, o.high))), snap)
      if (typeof o.levelDb === 'number') this.setRamp(R_GAIN, Math.pow(10, Math.min(6, Math.max(-24, o.levelDb)) / 20), snap)
      this.oDirty = true
    }
  }

  onMsg(m) {
    if (!m || typeof m !== 'object') return
    if (m.type === 'lut' && m.lut && m.lut.length > 1) this.lut = cleanLut(m.lut) // already a structured-clone copy
    else if (m.type === 'params') this.onParams(m)
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

  tickRamps() {
    const rc = this.rc, rl = this.rl
    for (let i = 0; i < N_RAMPS; i++) {
      if (rl[i] === 0) continue
      if (--rl[i] === 0) { rc[i] = this.rt[i]; this.rampsOn-- } else rc[i] += this.rs[i]
      if (i >= R_LOW) this.oDirty = true
    }
  }

  updateOutputCoefs() {
    setHP(this.ocf, 0, Math.pow(2, this.rc[R_LOW]), Math.SQRT1_2)
    setLP(this.ocf, 5, Math.pow(2, this.rc[R_HIGH]), Math.SQRT1_2)
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
    const doWarp = p.active && this.lut
    const profs = this.profs

    for (let i = 0; i < frames; i++) {
      const n = this.n
      const xL = inL ? inL[i] : 0
      const xR = inR ? inR[i] : 0
      const w = n % this.size
      this.ring[0][w] = xL
      this.ring[1][w] = xR
      if (this.rampsOn) this.tickRamps()

      // phase from the shared clock, per sample
      const t = currentTime + i / sr
      const phase = this.phaseAt(t)
      const s = this.segs[0]
      const L = loopSeconds(s.lengthBeats, s.bpm)
      this.bpm = s.bpm > 0 ? s.bpm : 120

      let P = n // read position (absolute frames)
      if (doWarp) {
        P = n - warpDelay(this.lut, phase, p.amount, p.skew, L) * sr
      }
      this.P = P
      // click guard: a jump in read position > 10 ms crossfades over smooth*30 ms.
      // Mid-fade retriggers fade from the last wet sample (held), so the output never steps. A profile whose
      // pre stage is not the plain read (grains, vibrato) or a profile switch in progress also fades from the held sample.
      if (this.prevP !== null && Math.abs(P - (this.prevP + 1)) > jumpSamples && fadeLen > 0) {
        if (this.xfPos < this.xfLen || !this.prePlain || this.old !== -1) { this.xfHoldOn = true; this.xfHoldL = this.lastWL; this.xfHoldR = this.lastWR }
        else { this.xfHoldOn = false; this.xfOld = this.prevP + 1 }
        this.xfPos = 0
        this.xfLen = fadeLen
      }
      this.prevP = P

      // pre stage of the current profile (and of the one fading out)
      const cp = profs[this.cur]
      cp.render(this, P)
      let wL = this.wL, wR = this.wR
      const curPlain = this.prePlain
      let owL = 0, owR = 0
      const op = this.old >= 0 ? profs[this.old] : null
      if (op) { op.render(this, P); owL = this.wL; owR = this.wR }
      this.prePlain = curPlain
      let gOld = 0, oL = 0, oR = 0
      if (this.xfPos < this.xfLen) {
        gOld = 1 - this.xfPos / this.xfLen
        if (this.xfHoldOn) { oL = this.xfHoldL; oR = this.xfHoldR }
        else { const pos = Math.min(this.xfOld, n); oL = this.read(0, pos); oR = this.read(1, pos); this.xfOld++ }
        wL = oL * gOld + wL * (1 - gOld)
        wR = oR * gOld + wR * (1 - gOld)
        if (op) { owL = oL * gOld + owL * (1 - gOld); owR = oR * gOld + owR * (1 - gOld) }
        this.xfPos++
      }

      // post stage, with the profile-switch crossfade
      cp.post(this, wL, wR)
      let yL = this.oL, yR = this.oR
      if (this.old !== -1) {
        const g = this.pxPos / this.rampN
        let hL, hR
        if (op) { op.post(this, owL, owR); hL = this.oL; hR = this.oR } else { hL = this.pxHoldL; hR = this.pxHoldR }
        yL = hL + (yL - hL) * g
        yR = hR + (yR - hR) * g
        wL = owL + (wL - owL) * g
        wR = owR + (wR - owR) * g
        if (++this.pxPos >= this.rampN) this.old = -1
      }
      this.lastWL = wL
      this.lastWR = wR
      this.lastOL = yL
      this.lastOR = yR

      // Output: HP, LP, then gain - wet only. Each filter is bypassed exactly when fully open and blends in
      // over the first half octave from the open end, so opening or closing the band never steps.
      if (this.oDirty && this.octr-- <= 0) { this.octr = CTRL - 1; this.oDirty = this.rampsOn > 0; this.updateOutputCoefs() }
      const ocf = this.ocf, oz = this.oz
      const hpL = bq(ocf, 0, oz, 0, yL), hpR = bq(ocf, 0, oz, 2, yR)
      const wHP = (this.rc[R_LOW] - LOG_LOW_OPEN) * 2
      if (wHP >= 1) { yL = hpL; yR = hpR } else if (wHP > 0) { yL += (hpL - yL) * wHP; yR += (hpR - yR) * wHP }
      const lpL = bq(ocf, 5, oz, 4, yL), lpR = bq(ocf, 5, oz, 6, yR)
      const wLP = (LOG_HIGH_OPEN - this.rc[R_HIGH]) * 2
      if (wLP >= 1) { yL = lpL; yR = lpR } else if (wLP > 0) { yL += (lpL - yL) * wLP; yR += (lpR - yR) * wLP }
      const gain = this.rc[R_GAIN]
      if (gain !== 1) { yL *= gain; yR *= gain }

      this.mixS += (target - this.mixS) * mixK
      if (Math.abs(target - this.mixS) < 1e-6) this.mixS = target
      const m = this.mixS
      if (m === 0) { out[0][i] = xL; if (out[1]) out[1][i] = xR }
      else if (m === 1) { out[0][i] = yL; if (out[1]) out[1][i] = yR }
      else { out[0][i] = xL + (yL - xL) * m; if (out[1]) out[1][i] = xR + (yR - xR) * m }
      if (p.probe && out[1]) out[1][i] = phase
      this.n++
    }
    return true
  }
}

registerProcessor('warp-processor', WarpProcessor)
