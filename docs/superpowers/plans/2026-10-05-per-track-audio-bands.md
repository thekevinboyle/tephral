# Per-Track Audio Bands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each effect-sequencer track's audio reactivity listens to its own frequency window, which gates its steps and can continuously modulate one of its effect params.

**Architecture:** The existing shared reactive FFT (raised to 4096) is read once per frame in `useAudioReactive`. For each audio-reactive track it averages the bins inside the track's `band`, runs them through the same auto-normalise and envelope logic as the global bands, and publishes `trackBands[effectId]`. The playback gate reads that value instead of the fixed sub/mid/high. A small per-frame step in the modulation loop pushes `base + band × amount × range` into the track's chosen param through `EFFECT_PARAM_REGISTRY`.

**Tech Stack:** TypeScript, React 19, zustand 5, Web Audio API (AnalyserNode), Vite 7. Verification uses puppeteer scripts under `.superpowers/sdd/` (gitignored), `npm run build` (tsc), and eslint on changed files.

**Spec:** `docs/superpowers/specs/2026-10-05-per-track-audio-bands-design.md`

## Global Constraints

- Band presets (Hz): KICK 40–100, BASS 60–250, SNARE 150–2500, HATS 6000–14000, VOX 300–3000, FULL 20–20000.
- Minimum band width is 1/3 octave. Bands clamp to 20 ≤ low < high ≤ Nyquist and always cover ≥ 1 FFT bin.
- New-track defaults: `band = KICK`, `mod = { param: null, amount: 0.5 }`. `mod.amount` ranges −1..1.
- `reactiveAnalyser.fftSize` is 4096 at both creation sites in `useUnifiedAudioAnalysis.ts`. The global sub/mid/high band edges (20/200/2000 Hz) keep their meaning.
- `trackBands` is published in the same per-frame store write as the global bands.
- With no audio source, or with global audio reactive off, every `trackBands` value is 0. Gates don't fire and modulation rests.
- No new React re-render per frame: `BandSpectrum` draws on rAF from `getState()`.
- UI accent is `#FF3355`. Reuse the existing `Knob` and `ParamSection`.
- Lint gate: new files lint clean, and modified files gain no new eslint problems compared with their count at the task base. Repo-wide lint is already red on master.
- Commits end with the session attribution trailers after a blank line. Stage only named files; never `git add -A`.

## Spec refinements made while planning (read before Task 1)

1. **There is no legacy migration to do.** `effectSequencerStore`'s `persist` saves only `bpm`, `resolution` and `swing`, and banks and presets don't capture sequencer tracks. Every track is created at runtime by `createDefaultTrack`, so it gets `band`/`mod` from the new defaults. `legacySourceToBand` is still provided. It is used when a track's `band` is null, so the panel can show the window that a `kick`/`low`/`mid`/`high` source corresponds to. Spec test 5 (legacy bank) becomes: "a track whose `band` is null and whose `source` is `rms`/`peak`/`silence` gates exactly as before."
2. **Modulation goes through `EFFECT_PARAM_REGISTRY`, not `applyModulation`.** `applyModulation` maps 0–1 onto absolute ranges through a hand-written switch that doesn't cover every param. The registry exposes `min/max/read/apply` for every effect's params. Base-tracking keeps the user's own setting: if `read()` differs from the last value written, the user moved the knob, and that value becomes the new base.

## Review Focus

1. **The same effect toggled audio-reactive off and on, or removed and re-added.** Per-track normaliser state must reset; no stale peak may hold the level down. → Task 2 Step 6.
2. **A band entirely above Nyquist** (e.g. HATS on a 22.05 kHz-capped stream). It must clamp and still yield a number, never NaN. → Task 1 Step 1 (`clampBand` at 32 kHz sample rate).
3. **Mod param changed while modulating** (picking a different param, or turning mod off). The old param must return to its base, not stay at its last modulated value. → Task 4 Step 6.
4. **The user turns the modulated param's knob mid-modulation.** Their new value becomes the base and is not fought every frame. → Task 4 Step 6.
5. **Dragging the band window past the other edge or off the strip.** The window must clamp to the 1/3-octave minimum and the strip bounds. → Task 5 Step 6.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/audioBands.ts` (create) | Pure band maths: presets, clamping, Hz↔bins, log-frequency mapping, legacy source mapping |
| `src/stores/effectSequencerStore.ts` | `band` + `mod` on `TrackAudioReactiveConfig`; defaults; `setTrackAudioBand`, `setTrackAudioMod` |
| `src/stores/audioReactiveStore.ts` | `trackBands` field; `updateBands(…, trackBands)` |
| `src/hooks/useUnifiedAudioAnalysis.ts` | reactive `fftSize` 2048 → 4096 at both sites |
| `src/hooks/useAudioReactive.ts` | per-track band computation |
| `src/hooks/useEffectSequencerPlayback.ts` | gate reads the track's band |
| `src/effects/trackBandModulation.ts` (create) | per-frame band→param modulation with base tracking |
| `src/hooks/useContinuousModulation.ts` | calls the track-band modulation step each frame |
| `src/components/sequencer/BandSpectrum.tsx` (create) | live spectrum + draggable band window |
| `src/components/sequencer/TrackAudioReactivePanel.tsx` | band row (spectrum, presets, meter) + gate/mod row |
| `.superpowers/sdd/bands-check.mjs` (create, gitignored) | puppeteer verification harness, one mode per task |

---

### Task 1: Band maths module

**Files:**
- Create: `src/utils/audioBands.ts`
- Create: `.superpowers/sdd/bands-check.mjs`

**Interfaces:**
- Produces:
  ```ts
  export interface AudioBand { lowHz: number; highHz: number }
  export type BandPresetName = 'KICK' | 'BASS' | 'SNARE' | 'HATS' | 'VOX' | 'FULL'
  export const BAND_PRESETS: Record<BandPresetName, AudioBand>
  export const MIN_BAND_OCTAVES: number                 // 1/3
  export function clampBand(band: AudioBand, nyquist: number): AudioBand
  export function bandToBins(band: AudioBand, sampleRate: number, fftSize: number): [number, number]
  export function bandAverage(data: Uint8Array, first: number, last: number): number  // 0–1
  export function hzToLogX(hz: number): number          // 20 Hz→0, 20 kHz→1
  export function logXToHz(x: number): number           // inverse
  export function legacySourceToBand(source: string): AudioBand | null
  ```

- [ ] **Step 1: Write the failing check**

Create `.superpowers/sdd/bands-check.mjs`:

```js
// Usage: node .superpowers/sdd/bands-check.mjs <mode>   (fresh dev server on :5173)
import puppeteer from 'puppeteer'

const MODE = process.argv[2]
const errors = []
const b = await puppeteer.launch({ headless: process.env.HEADED ? false : 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 1600, height: 1000 })
p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error' && !/listener indicated|key.*prop/.test(m.text())) errors.push(m.text().slice(0, 200)) })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1200))

let pass = true
const say = (k, ok) => { console.log(`${k}: ${ok ? 'OK' : 'FAIL'}`); if (!ok) pass = false }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

if (MODE === 'math') {
  const r = await p.evaluate(async () => {
    const m = await import('/src/utils/audioBands.ts')
    const near = (a, b, e = 0.01) => Math.abs(a - b) <= e
    const out = {}
    out.presets = JSON.stringify(m.BAND_PRESETS)
    // 40–100 Hz: 48k/4096 (11.72 Hz bins) → [3,8] ; 44.1k/4096 (10.77 Hz bins) → [3,9]
    out.bins48 = m.bandToBins({ lowHz: 40, highHz: 100 }, 48000, 4096)
    out.bins44 = m.bandToBins({ lowHz: 40, highHz: 100 }, 44100, 4096)
    // a window narrower than one bin still yields ≥1 bin
    const tiny = m.bandToBins({ lowHz: 1000, highHz: 1001 }, 48000, 4096)
    out.tinyOk = tiny[1] >= tiny[0]
    // above-Nyquist band clamps (sampleRate 32k → nyquist 16k) and stays finite
    const c = m.clampBand({ lowHz: 18000, highHz: 22000 }, 16000)
    out.clampAboveNyq = c.highHz <= 16000 && c.lowHz < c.highHz && Math.log2(c.highHz / c.lowHz) >= 1 / 3 - 1e-9
    // inverted / collapsed band clamps to ≥ 1/3 octave
    const inv = m.clampBand({ lowHz: 500, highHz: 450 }, 24000)
    out.clampInverted = inv.lowHz < inv.highHz && Math.log2(inv.highHz / inv.lowHz) >= 1 / 3 - 1e-9
    // low floor
    out.clampLow = m.clampBand({ lowHz: 5, highHz: 60 }, 24000).lowHz >= 20
    out.average = m.bandAverage(new Uint8Array([0, 255, 255, 0]), 1, 2)
    out.log = near(m.hzToLogX(20), 0) && near(m.hzToLogX(20000), 1) && near(m.logXToHz(m.hzToLogX(1234)), 1234, 0.5)
    out.legacy = JSON.stringify([m.legacySourceToBand('kick'), m.legacySourceToBand('mid'), m.legacySourceToBand('high'), m.legacySourceToBand('rms')])
    return out
  })
  console.log(JSON.stringify(r))
  say('presets', r.presets === JSON.stringify({ KICK: { lowHz: 40, highHz: 100 }, BASS: { lowHz: 60, highHz: 250 }, SNARE: { lowHz: 150, highHz: 2500 }, HATS: { lowHz: 6000, highHz: 14000 }, VOX: { lowHz: 300, highHz: 3000 }, FULL: { lowHz: 20, highHz: 20000 } }))
  say('bins @48k', JSON.stringify(r.bins48) === '[3,8]')
  say('bins @44.1k', JSON.stringify(r.bins44) === '[3,9]')
  say('sub-bin window still ≥1 bin', r.tinyOk)
  say('above-Nyquist band clamps', r.clampAboveNyq)
  say('inverted band clamps to ≥1/3 oct', r.clampInverted)
  say('low floor 20 Hz', r.clampLow)
  say('bandAverage', r.average === 1)
  say('log mapping round-trips', r.log)
  say('legacy mapping', r.legacy === JSON.stringify([{ lowHz: 20, highHz: 200 }, { lowHz: 200, highHz: 2000 }, { lowHz: 2000, highHz: 16000 }, null]))
}

// (later tasks add modes here, above this line)

say('no page errors', errors.length === 0)
errors.slice(0, 5).forEach((e) => console.log(' ERR:', e))
await b.close()
console.log(pass ? `BANDS ${MODE} CHECK: PASS` : `BANDS ${MODE} CHECK: FAIL`)
process.exit(pass ? 0 : 1)
```

Bin arithmetic behind the expectations (Step 3 uses `floor` on both ends): `first = floor(low / binHz)`, `last = max(first, floor(high / binHz))`.
- 48 kHz / 4096 → `binHz` 11.71875 → `floor(3.41) = 3`, `floor(8.53) = 8` → `[3,8]`
- 44.1 kHz / 4096 → `binHz` 10.7666 → `floor(3.72) = 3`, `floor(9.29) = 9` → `[3,9]`

- [ ] **Step 2: Run it to verify it fails**

Start a fresh dev server (`lsof -ti:5173 | xargs kill; npm run dev &`, then wait about 6 s), then run `node .superpowers/sdd/bands-check.mjs math`.
Expected: FAIL. The module import throws because `audioBands.ts` doesn't exist.

- [ ] **Step 3: Implement `src/utils/audioBands.ts`**

```ts
// Pure helpers for per-track audio-reactive frequency bands.

export interface AudioBand { lowHz: number; highHz: number }
export type BandPresetName = 'KICK' | 'BASS' | 'SNARE' | 'HATS' | 'VOX' | 'FULL'

export const BAND_PRESETS: Record<BandPresetName, AudioBand> = {
  KICK: { lowHz: 40, highHz: 100 },
  BASS: { lowHz: 60, highHz: 250 },
  SNARE: { lowHz: 150, highHz: 2500 },
  HATS: { lowHz: 6000, highHz: 14000 },
  VOX: { lowHz: 300, highHz: 3000 },
  FULL: { lowHz: 20, highHz: 20000 },
}

export const MIN_BAND_OCTAVES = 1 / 3
const MIN_HZ = 20
const MAX_HZ = 20000
const MIN_RATIO = Math.pow(2, MIN_BAND_OCTAVES)

/**
 * Keep a band inside [20 Hz, min(nyquist, 20 kHz)] with low < high and a
 * width of at least 1/3 octave. When the window would collapse, it widens
 * around its geometric centre, then shifts to stay in range.
 */
export function clampBand(band: AudioBand, nyquist: number): AudioBand {
  const top = Math.max(MIN_HZ * MIN_RATIO, Math.min(MAX_HZ, nyquist))
  let lo = Math.max(MIN_HZ, Math.min(band.lowHz, band.highHz))
  let hi = Math.min(top, Math.max(band.lowHz, band.highHz))
  if (hi / lo < MIN_RATIO) {
    const centre = Math.sqrt(Math.max(lo, MIN_HZ) * Math.max(hi, MIN_HZ))
    lo = centre / Math.sqrt(MIN_RATIO)
    hi = centre * Math.sqrt(MIN_RATIO)
  }
  if (hi > top) { lo = top / (hi / lo); hi = top }
  if (lo < MIN_HZ) { hi = MIN_HZ * (hi / lo); lo = MIN_HZ }
  return { lowHz: lo, highHz: Math.min(hi, top) }
}

/** Inclusive FFT bin range for a band; always at least one bin, never past the last bin. */
export function bandToBins(band: AudioBand, sampleRate: number, fftSize: number): [number, number] {
  const binHz = sampleRate / fftSize
  const lastBin = fftSize / 2 - 1
  const first = Math.min(lastBin, Math.max(0, Math.floor(band.lowHz / binHz)))
  const last = Math.min(lastBin, Math.max(first, Math.floor(band.highHz / binHz)))
  return [first, last]
}

/** Mean of byte FFT magnitudes over [first, last], scaled to 0–1. */
export function bandAverage(data: Uint8Array, first: number, last: number): number {
  let sum = 0
  for (let i = first; i <= last; i++) sum += data[i]
  return last >= first ? sum / (last - first + 1) / 255 : 0
}

const LOG_MIN = Math.log10(MIN_HZ)
const LOG_SPAN = Math.log10(MAX_HZ) - LOG_MIN

/** 20 Hz → 0, 20 kHz → 1 on a log axis (for the spectrum strip). */
export function hzToLogX(hz: number): number {
  return (Math.log10(Math.max(MIN_HZ, Math.min(MAX_HZ, hz))) - LOG_MIN) / LOG_SPAN
}

export function logXToHz(x: number): number {
  return Math.pow(10, LOG_MIN + Math.max(0, Math.min(1, x)) * LOG_SPAN)
}

/** The window an old fixed `source` corresponds to; null for non-band sources. */
export function legacySourceToBand(source: string): AudioBand | null {
  switch (source) {
    case 'kick':
    case 'low': return { lowHz: 20, highHz: 200 }
    case 'mid': return { lowHz: 200, highHz: 2000 }
    case 'high': return { lowHz: 2000, highHz: 16000 }
    default: return null
  }
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run `node .superpowers/sdd/bands-check.mjs math`. Expected: `BANDS math CHECK: PASS`.

- [ ] **Step 5: Build and lint**

Run `npm run build && npx eslint src/utils/audioBands.ts`. Both must exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/utils/audioBands.ts
git commit -m "feat: per-track audio band maths"
```

---

### Task 2: Track band config + per-track band levels

**Files:**
- Modify: `src/stores/effectSequencerStore.ts:20-30` (config + defaults), the actions block near `setTrackAudioReactive` (~line 336), and the `EffectSequencerState` interface (~line 109)
- Modify: `src/stores/audioReactiveStore.ts`
- Modify: `src/hooks/useUnifiedAudioAnalysis.ts:116` and `:209`
- Modify: `src/hooks/useAudioReactive.ts`

**Interfaces:**
- Consumes: `AudioBand`, `BAND_PRESETS`, `clampBand`, `bandToBins`, `bandAverage` from Task 1.
- Produces:
  ```ts
  // effectSequencerStore
  interface TrackAudioReactiveConfig { enabled: boolean; source: AudioReactiveSource; sensitivity: number;
    band: AudioBand | null; mod: { param: string | null; amount: number } }
  setTrackAudioBand(effectId: string, band: AudioBand): void   // stores clampBand(band, 20000)
  setTrackAudioMod(effectId: string, mod: Partial<{ param: string | null; amount: number }>): void  // amount clamped −1..1
  // audioReactiveStore
  trackBands: Record<string, number>
  updateBands(sub, mid, high, hit, rms, trackBands?: Record<string, number>): void
  ```

- [ ] **Step 1: Write the failing check**

Add an `isolation` mode to `bands-check.mjs`, above the "later tasks" comment:

```js
if (MODE === 'isolation') {
  const r = await p.evaluate(async () => {
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const ar = (await import('/src/stores/audioReactiveStore.ts')).useAudioReactiveStore
    const src = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore
    const ctx = new AudioContext(); await ctx.resume()
    const analyser = ctx.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0.4
    const osc = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0
    osc.connect(g); g.connect(analyser); osc.start()
    src.getState().setReactiveAnalyser(analyser); src.getState().setAudioContext(ctx)
    const s = seq.getState()
    for (const [id, band] of [['seg_voxel', { lowHz: 40, highHz: 100 }], ['seg_torn', { lowHz: 6000, highHz: 14000 }]]) {
      s.ensureTrack(id); s.setTrackAudioReactiveEnabled(id, true); s.setTrackAudioBand(id, band)
    }
    ar.getState().setEnabled(true)
    const sample = async (hz) => {
      osc.frequency.value = hz; g.gain.value = 0      // silence → let normaliser see a floor
      await new Promise((res) => setTimeout(res, 1500))
      g.gain.value = 0.8
      await new Promise((res) => setTimeout(res, 700))
      const tb = ar.getState().trackBands
      return { kick: tb.seg_voxel ?? -1, hats: tb.seg_torn ?? -1 }
    }
    const at60 = await sample(60)
    const at8k = await sample(8000)
    // review focus 1: toggle off/on resets per-track state
    s.setTrackAudioReactiveEnabled('seg_voxel', false)
    await new Promise((res) => setTimeout(res, 200))
    const offVal = ar.getState().trackBands.seg_voxel
    s.setTrackAudioReactiveEnabled('seg_voxel', true)
    const reOn = await sample(60)
    const def = (() => { s.ensureTrack('seg_echo'); return seq.getState().tracks.seg_echo.audioReactive })()
    osc.stop(); ctx.close()
    return { at60, at8k, offVal, reOn, def, fft: analyser.fftSize }
  })
  console.log(JSON.stringify(r))
  say('trackBands published for both tracks', r.at60.kick >= 0 && r.at60.hats >= 0)
  say('60 Hz → KICK high, HATS low', r.at60.kick > 0.3 && r.at60.hats < 0.15)
  say('8 kHz → HATS high, KICK low', r.at8k.hats > 0.3 && r.at8k.kick < 0.15)
  say('disabled track drops out of trackBands', r.offVal === undefined)
  say('re-enabled track responds again', r.reOn.kick > 0.3)
  say('new-track defaults', JSON.stringify(r.def.band) === '{"lowHz":40,"highHz":100}' && r.def.mod.param === null && r.def.mod.amount === 0.5)
}
```

Also add a static check, run once with grep, that both analyser sites use 4096: `grep -c "reactiveAnalyser.fftSize = 4096" src/hooks/useUnifiedAudioAnalysis.ts` → `2`.

- [ ] **Step 2: Run it to verify it fails**

Fresh server, then `node .superpowers/sdd/bands-check.mjs isolation`. Expected: FAIL. `setTrackAudioBand` is not a function.

- [ ] **Step 3: Store changes**

In `src/stores/effectSequencerStore.ts`:

```ts
import { BAND_PRESETS, clampBand, type AudioBand } from '../utils/audioBands'

export interface TrackAudioMod {
  param: string | null   // registry param id on this track's effect, or null = off
  amount: number         // −1..1, bipolar depth
}

export interface TrackAudioReactiveConfig {
  enabled: boolean
  source: AudioReactiveSource
  sensitivity: number      // 0.1-2.0, kick multiplier / auto-threshold sensitivity
  band: AudioBand | null   // per-track listening window; null → legacy `source`
  mod: TrackAudioMod       // optional continuous param modulation by the band level
}

const DEFAULT_AUDIO_REACTIVE: TrackAudioReactiveConfig = {
  enabled: false,
  source: 'kick',
  sensitivity: 1.0,
  band: { ...BAND_PRESETS.KICK },
  mod: { param: null, amount: 0.5 },
}
```

`createDefaultTrack` spreads `DEFAULT_AUDIO_REACTIVE`. Make that spread deep for `band` and `mod`, so tracks never share an object:

```ts
audioReactive: { ...DEFAULT_AUDIO_REACTIVE, band: { ...BAND_PRESETS.KICK }, mod: { ...DEFAULT_AUDIO_REACTIVE.mod } },
```

Add to the `EffectSequencerState` interface, after `setTrackAudioReactiveEnabled`:

```ts
setTrackAudioBand: (effectId: string, band: AudioBand) => void
setTrackAudioMod: (effectId: string, mod: Partial<TrackAudioMod>) => void
```

Add the implementations after `setTrackAudioReactiveEnabled`:

```ts
setTrackAudioBand: (effectId, band) => {
  set((state) => {
    const track = state.tracks[effectId]
    if (!track) return state
    return {
      tracks: {
        ...state.tracks,
        [effectId]: { ...track, audioReactive: { ...track.audioReactive, band: clampBand(band, 20000) } },
      },
    }
  })
},

setTrackAudioMod: (effectId, mod) => {
  set((state) => {
    const track = state.tracks[effectId]
    if (!track) return state
    const next = { ...track.audioReactive.mod, ...mod }
    next.amount = Math.max(-1, Math.min(1, next.amount))
    return {
      tracks: {
        ...state.tracks,
        [effectId]: { ...track, audioReactive: { ...track.audioReactive, mod: next } },
      },
    }
  })
},
```

In `src/stores/audioReactiveStore.ts`:
- Add `trackBands: Record<string, number>   // per-track band level (0-1), keyed by effectId` to the state interface.
- Initialise it as `trackBands: {}`.
- Change the action signature to `updateBands: (sub: number, mid: number, high: number, hit: number, rms: number, trackBands?: Record<string, number>) => void`.
- Change the implementation to:

```ts
updateBands: (sub, mid, high, hit, rms, trackBands = {}) => set({ sub, mid, high, hit, rms, trackBands }),
```

In `src/hooks/useUnifiedAudioAnalysis.ts`, change both `reactiveAnalyser.fftSize = 2048` lines to `reactiveAnalyser.fftSize = 4096`. Update the nearby comment to say "4096 → ~11.7 Hz bins at 48 kHz, so narrow low bands (e.g. 40–100 Hz) span several bins".

- [ ] **Step 4: Per-track computation in `useAudioReactive.ts`**

Add imports:

```ts
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { bandToBins, bandAverage } from '../utils/audioBands'
```

Add a ref beside the other refs:

```ts
// Per-track band normaliser + envelope state, keyed by effectId
const trackStateRef = useRef<Record<string, { peak: { current: number }; floor: { current: number }; smoothed: number }>>({})
```

In the `!enabled` reset branch, add `trackStateRef.current = {}`.

In `loop()`, after `rms` is computed and before the `updateBands` call, compute the per-track levels:

```ts
// Per-track bands: same normalise → envelope → curve chain as the globals,
// over each audio-reactive track's own frequency window.
const tracks = useEffectSequencerStore.getState().tracks
const trackBands: Record<string, number> = {}
const live = trackStateRef.current
const seen = new Set<string>()
for (const id in tracks) {
  const ar = tracks[id].audioReactive
  if (!ar.enabled || !ar.band) continue
  seen.add(id)
  const st = live[id] ?? (live[id] = { peak: { current: 0.01 }, floor: { current: 0 }, smoothed: 0 })
  const [first, last] = bandToBins(ar.band, sampleRate, fftSize)
  const rawUnnorm = bandAverage(frequencyData, first, last)
  const raw = autoMode
    ? autoNormalize(rawUnnorm, st.peak, st.floor, dt, sensitivity)
    : Math.min(1, rawUnnorm * gain)
  st.smoothed = envelopeFollow(raw, st.smoothed)
  trackBands[id] = Math.pow(st.smoothed, autoMode ? 3.0 - sensitivity * 2.2 : curve)
}
// Forget state for tracks that were disabled/removed so a re-enable starts fresh
for (const id in live) if (!seen.has(id)) delete live[id]
```

Change the store write to `useAudioReactiveStore.getState().updateBands(sub, mid, high, hit, rms, trackBands)`.

`autoNormalize` is typed with `React.MutableRefObject<number>`. The `{ current: number }` objects are structurally compatible; if tsc complains, widen the parameter type to `{ current: number }`.

- [ ] **Step 5: Run the check to verify it passes**

Run the grep check (expect `2`), then `node .superpowers/sdd/bands-check.mjs isolation` on a fresh server. Expected: PASS.

- [ ] **Step 6: Review Focus 1**

The `isolation` mode already toggles the KICK track off and on and asserts both that it disappears from `trackBands` and that it responds again. Confirm both lines say OK.

- [ ] **Step 7: Build, lint, commit**

Run `npm run build`, then `npx eslint` on the four modified files. There must be no new problems compared with the task base; count with `git stash` / `git stash pop`.

```bash
git add src/stores/effectSequencerStore.ts src/stores/audioReactiveStore.ts src/hooks/useUnifiedAudioAnalysis.ts src/hooks/useAudioReactive.ts
git commit -m "feat: per-track audio band levels from the shared FFT"
```

---

### Task 3: Gate reads the track's band

**Files:**
- Modify: `src/hooks/useEffectSequencerPlayback.ts` (`getAudioValue` ~line 58, and its call ~line 302)

**Interfaces:**
- Consumes: `track.audioReactive.band` and `useAudioReactiveStore.getState().trackBands` from Task 2.

- [ ] **Step 1: Write the failing check**

Add a `gate` mode to `bands-check.mjs`. Find the sequencer play/stop actions first: `grep -n "play: \|stop: \|isPlaying" src/stores/effectSequencerStore.ts`. Then:

```js
if (MODE === 'gate') {
  const r = await p.evaluate(async () => {
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const ar = (await import('/src/stores/audioReactiveStore.ts')).useAudioReactiveStore
    const src = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore
    const ctx = new AudioContext(); await ctx.resume()
    const analyser = ctx.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0.4
    const osc = ctx.createOscillator(); osc.frequency.value = 60
    const g = ctx.createGain(); g.gain.value = 0
    osc.connect(g); g.connect(analyser); osc.start()
    src.getState().setReactiveAnalyser(analyser); src.getState().setAudioContext(ctx)
    const s = seq.getState()
    for (const [id, band] of [['seg_voxel', { lowHz: 40, highHz: 100 }], ['seg_torn', { lowHz: 6000, highHz: 14000 }]]) {
      s.ensureTrack(id); s.setTrackAudioReactiveEnabled(id, true); s.setTrackAudioBand(id, band)
    }
    ar.getState().setEnabled(true)
    seq.getState().play()
    // pulse 60 Hz at ~2 Hz for 6 s; count rising edges of each track's level vs its threshold
    const edges = { seg_voxel: 0, seg_torn: 0 }; const was = {}
    const t0 = performance.now()
    while (performance.now() - t0 < 6000) {
      g.gain.value = (Math.floor((performance.now() - t0) / 250) % 2) ? 0.8 : 0
      for (const id of ['seg_voxel', 'seg_torn']) {
        const st = seq.getState()
        const above = (st.trackAudioLevels[id] ?? 0) >= (st.trackAutoThresholds[id] ?? 1)
        if (above && !was[id]) edges[id]++
        was[id] = above
      }
      await new Promise((res) => setTimeout(res, 20))
    }
    seq.getState().stop(); osc.stop(); ctx.close()
    return edges
  })
  console.log(JSON.stringify(r))
  say('KICK track gates on 60 Hz pulses', r.seg_voxel >= 6)
  say('HATS track stays quiet on 60 Hz', r.seg_torn <= 1)
}
```

If the play/stop names differ, use the real ones and say so in the report.

- [ ] **Step 2: Run it to verify it fails**

Run `node .superpowers/sdd/bands-check.mjs gate`. Expected: FAIL. Both tracks still read the global `sub` via `source: 'kick'`, so the HATS track also gates on 60 Hz.

- [ ] **Step 3: Implement**

Change `getAudioValue` to take the effect id and config:

```ts
const getAudioValue = useCallback((effectId: string, config: TrackAudioReactiveConfig): number => {
  const ar = useAudioReactiveStore.getState()
  const as = useAudioSourceStore.getState()

  // Per-track frequency window (normal case): already normalised + enveloped.
  if (config.band) {
    const v = ar.trackBands[effectId] ?? 0
    if (ar.autoMode) return v
    const invCurve = ar.curve > 0 ? 1 / ar.curve : 1
    return Math.pow(Math.min(1, Math.max(0, v)), invCurve)
  }

  const source = config.source
  // …existing autoMode / manual switch bodies unchanged…
}, [])
```

Import `TrackAudioReactiveConfig` from the store if it isn't already imported. Change the call site to `const raw = getAudioValue(effectId, config)`. Keep `AudioReactiveSource` imported only if it is still used.

- [ ] **Step 4: Run the check to verify it passes**

On a fresh server, run `node .superpowers/sdd/bands-check.mjs gate`. Expected: PASS.

- [ ] **Step 5: Legacy path (spec refinement 1)**

Extend the `gate` mode with a second run. Set `seg_torn`'s config to `band: null, source: 'rms'` (via `setTrackAudioReactive('seg_torn', { band: null, source: 'rms' })`). Pulse the same 60 Hz tone and assert `seg_torn` now gates (≥ 6 edges), because `rms` follows overall amplitude exactly as before. Re-run and expect PASS.

- [ ] **Step 6: Build, lint, commit**

```bash
git add src/hooks/useEffectSequencerPlayback.ts
git commit -m "feat: audio-reactive gate follows each track's own band"
```

---

### Task 4: Band → param modulation

**Files:**
- Create: `src/effects/trackBandModulation.ts`
- Modify: `src/hooks/useContinuousModulation.ts` (call it in the rAF loop, beside the "Audio reactive band routings" block)

**Interfaces:**
- Consumes: `EFFECT_PARAM_REGISTRY` (`src/config/effectParams.ts`). Each entry has `getParams(): LockableParam[]` with `{ id, min, max, step, apply(v), read() }`. Also consumes `trackBands` (Task 2) and `track.audioReactive.mod` (Task 2).
- Produces:
  ```ts
  export function stepTrackBandModulation(): void   // call once per frame
  export function resetTrackBandModulation(): void  // restore all bases; used on unmount
  ```

- [ ] **Step 1: Write the failing check**

Add a `mod` mode to `bands-check.mjs`:

```js
if (MODE === 'mod') {
  const r = await p.evaluate(async () => {
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const ar = (await import('/src/stores/audioReactiveStore.ts')).useAudioReactiveStore
    const sg = (await import('/src/stores/segStore.ts')).useSegStore
    const s = seq.getState()
    s.ensureTrack('seg_voxel'); s.setTrackAudioReactiveEnabled('seg_voxel', true)
    sg.getState().updateVoxelParams({ size: 20 })                 // base
    s.setTrackAudioMod('seg_voxel', { param: 'size', amount: 0.5 })
    const drive = async (level, ms = 400) => {
      const st = ar.getState()
      const t0 = performance.now()
      while (performance.now() - t0 < ms) { st.updateBands(0, 0, 0, 0, 0, { seg_voxel: level }); await new Promise((res) => setTimeout(res, 16)) }
      return sg.getState().voxelParams.size
    }
    ar.getState().setEnabled(true)
    const loud = await drive(1)
    const quiet = await drive(0)
    s.setTrackAudioMod('seg_voxel', { amount: -0.5 })
    const neg = await drive(1)
    // review focus 4: user moves the knob mid-modulation → becomes new base
    await drive(0)
    sg.getState().updateVoxelParams({ size: 40 })
    const afterUser = await drive(0)
    // review focus 3: switching param restores the old one to its base
    s.setTrackAudioMod('seg_voxel', { amount: 0.5 })
    await drive(1)
    s.setTrackAudioMod('seg_voxel', { param: 'scatter' })
    const restored = await drive(0)
    s.setTrackAudioMod('seg_voxel', { param: null })
    return { loud, quiet, neg, afterUser, restored }
  })
  console.log(JSON.stringify(r))
  // size range 4..64 (span 60): +0.5 × 1.0 × 60 = +30 → 50 ; −0.5 → 20−30 clamps to 4
  say('band loud raises size (AMT +50%)', Math.abs(r.loud - 50) <= 1)
  say('band quiet returns to base', Math.abs(r.quiet - 20) <= 1)
  say('AMT −50% lowers size', r.neg <= 5)
  say('user knob move becomes new base', Math.abs(r.afterUser - 40) <= 1)
  say('switching param restores old one', Math.abs(r.restored - 40) <= 1)
}
```

The modulation loop reads `trackBands`, and the `useAudioReactive` loop would overwrite it every frame. That is why the check writes it continuously at about 60 Hz, and why `useAudioReactive` isn't fed audio in this mode: with no analyser it skips work (`!analyser` → early return), so `trackBands` stays what the check writes.

- [ ] **Step 2: Run it to verify it fails**

Fresh server, then `node .superpowers/sdd/bands-check.mjs mod`. Expected: FAIL. Size stays at 20.

- [ ] **Step 3: Implement `src/effects/trackBandModulation.ts`**

```ts
import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../config/effectParams'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'

// Per-track modulation target: the param we're driving, its user-set base,
// and the last value we wrote (to detect the user moving the knob).
interface Active { effectId: string; param: LockableParam; base: number; lastWritten: number }
const active = new Map<string, Active>() // keyed by effectId

const EPS = 1e-6

function findParam(effectId: string, paramId: string): LockableParam | null {
  const entry = EFFECT_PARAM_REGISTRY[effectId]
  return entry?.getParams().find((p) => p.id === paramId) ?? null
}

function release(a: Active) {
  a.param.apply(a.base)
}

/**
 * One frame of band→param modulation. value = base + band × amount × (max − min),
 * clamped to the param range. If the param's current value isn't what we last
 * wrote, the user changed it — adopt it as the new base.
 */
export function stepTrackBandModulation(): void {
  const tracks = useEffectSequencerStore.getState().tracks
  const ar = useAudioReactiveStore.getState()
  const want = new Set<string>()

  for (const effectId in tracks) {
    const cfg = tracks[effectId].audioReactive
    const paramId = cfg.mod.param
    if (!cfg.enabled || !paramId || !ar.enabled) continue
    want.add(effectId)

    let a = active.get(effectId)
    if (a && a.param.id !== paramId) { release(a); a = undefined }
    if (!a) {
      const param = findParam(effectId, paramId)
      if (!param) continue
      const base = param.read()
      a = { effectId, param, base, lastWritten: base }
      active.set(effectId, a)
    }

    const current = a.param.read()
    if (Math.abs(current - a.lastWritten) > EPS) a.base = current // user moved it

    const band = ar.trackBands[effectId] ?? 0
    const span = a.param.max - a.param.min
    let v = a.base + band * cfg.mod.amount * span
    v = Math.min(a.param.max, Math.max(a.param.min, v))
    if (a.param.step >= 1) v = Math.round(v)
    if (Math.abs(v - current) > EPS) a.param.apply(v)
    a.lastWritten = a.param.read()
  }

  for (const [effectId, a] of active) {
    if (!want.has(effectId)) { release(a); active.delete(effectId) }
  }
}

export function resetTrackBandModulation(): void {
  for (const a of active.values()) release(a)
  active.clear()
}
```

Check that `LockableParam` is exported from `effectParams.ts` (it is: `export interface LockableParam`).

- [ ] **Step 4: Call it from the modulation loop**

In `src/hooks/useContinuousModulation.ts`, import `{ stepTrackBandModulation, resetTrackBandModulation }` from `'../effects/trackBandModulation'`. Directly after the "Audio reactive band routings" block, and before scheduling the next frame, add:

```ts
// Per-track band → param modulation (track's own frequency window)
stepTrackBandModulation()
```

In the effect cleanup, before or after `cancelAnimationFrame`, call `resetTrackBandModulation()` so params return to their bases on unmount.

- [ ] **Step 5: Run the check to verify it passes**

Run `node .superpowers/sdd/bands-check.mjs mod` on a fresh server. Expected: PASS.

- [ ] **Step 6: Review Focus 3 and 4**

The `mod` mode already covers both: "switching param restores old one" (3) and "user knob move becomes new base" (4). Confirm both lines say OK.

- [ ] **Step 7: Build, lint, commit**

```bash
git add src/effects/trackBandModulation.ts src/hooks/useContinuousModulation.ts
git commit -m "feat: track band level modulates a chosen effect param"
```

---

### Task 5: Band spectrum + panel UI

**Files:**
- Create: `src/components/sequencer/BandSpectrum.tsx`
- Modify: `src/components/sequencer/TrackAudioReactivePanel.tsx`

**Interfaces:**
- Consumes: `hzToLogX`, `logXToHz`, `BAND_PRESETS`, `clampBand`, `legacySourceToBand`, `AudioBand` (Task 1). Also `setTrackAudioBand`, `setTrackAudioMod`, `band`, `mod` (Task 2), and `EFFECT_PARAM_REGISTRY` (`getParams()`).
- Produces: `<BandSpectrum band={AudioBand} onChange={(b: AudioBand) => void} color={string} />`

- [ ] **Step 1: Write the failing check**

Add a `ui` mode to `bands-check.mjs`. It opens a track's audio panel by selecting the effect and the bottom panel's audio tab. To find how `BottomPanelContent` chooses `TrackAudioReactivePanel`, run `grep -n "TrackAudioReactivePanel\|case '" src/components/performance/BottomPanelContent.tsx`, then set the matching uiStore field in the script:

```js
if (MODE === 'ui') {
  // Arrange: track exists + audio reactive on + panel visible
  await p.evaluate(async () => {
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const ui = (await import('/src/stores/uiStore.ts')).useUIStore
    const s = seq.getState(); s.ensureTrack('seg_voxel'); s.setTrackAudioReactiveEnabled('seg_voxel', true)
    ui.getState().setSelectedEffect?.('seg_voxel')
    // + whatever opens the AUDIO bottom tab (found via the grep above)
  })
  await wait(600)
  const strip = await p.$('[data-band-spectrum]')
  say('band spectrum rendered', !!strip)
  const bb = await strip.boundingBox()
  const band = () => p.evaluate(async () => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().tracks.seg_voxel.audioReactive.band)
  // drag right edge far right → highHz rises
  const before = await band()
  const rx = bb.x + bb.width * (await p.evaluate(async (h) => (await import('/src/utils/audioBands.ts')).hzToLogX(h), before.highHz))
  await p.mouse.move(rx, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.95, bb.y + bb.height / 2, { steps: 8 }); await p.mouse.up()
  const afterRight = await band()
  say('dragging right edge raises highHz', afterRight.highHz > before.highHz * 2)
  // review focus 5: drag left edge past the right edge and off the strip → clamps
  const lx = bb.x + bb.width * (await p.evaluate(async (h) => (await import('/src/utils/audioBands.ts')).hzToLogX(h), afterRight.lowHz))
  await p.mouse.move(lx, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width + 200, bb.y + bb.height / 2, { steps: 8 }); await p.mouse.up()
  const clamped = await band()
  say('over-dragged edge clamps (low < high, ≥1/3 oct)', clamped.lowHz < clamped.highHz && Math.log2(clamped.highHz / clamped.lowHz) >= 1 / 3 - 1e-6)
  // preset chip
  const chip = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'HATS'))
  await chip.click(); await wait(200)
  say('HATS chip sets 6–14 kHz', JSON.stringify(await band()) === '{"lowHz":6000,"highHz":14000}')
  // MOD select + AMT knob appear
  const hasMod = await p.evaluate(() => !!document.querySelector('[data-track-mod-select]'))
  say('MOD select rendered', hasMod)
  await p.select('[data-track-mod-select]', 'size'); await wait(200)
  const mod = await p.evaluate(async () => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().tracks.seg_voxel.audioReactive.mod)
  say('MOD select sets param', mod.param === 'size')
  say('AMT knob shown when a param is picked', await p.evaluate(() => [...document.querySelectorAll('*')].some((e) => e.textContent.trim() === 'AMT')))
  await strip.screenshot({ path: '.superpowers/sdd/shots/band-spectrum.png' })
}
```

Chip clicks use `ElementHandle.click()`, which dispatches a real mouse click at the element's centre. If the app's pointer-event buttons ignore it, use `p.mouse.click` on the bounding-box centre instead.

- [ ] **Step 2: Run it to verify it fails**

Run `node .superpowers/sdd/bands-check.mjs ui`. Expected: FAIL. `[data-band-spectrum]` is missing.

- [ ] **Step 3: Implement `BandSpectrum.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { clampBand, hzToLogX, logXToHz, BAND_PRESETS, type AudioBand } from '../../utils/audioBands'

const W = 160
const H = 36
const EDGE_GRAB_PX = 6

function fmtHz(hz: number) {
  return hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`
}

/**
 * Live log-frequency spectrum with a draggable band window. Draws on rAF from
 * the reactive analyser (no React re-render per frame). Drag an edge to move
 * that cutoff, drag inside to slide the window, double-click to reset to KICK.
 */
export function BandSpectrum({ band, onChange, color }: { band: AudioBand; onChange: (b: AudioBand) => void; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bandRef = useRef(band)
  bandRef.current = band

  useEffect(() => {
    let raf = 0
    let data: Uint8Array | null = null
    const draw = () => {
      const c = canvasRef.current
      const ctx2d = c?.getContext('2d')
      if (c && ctx2d) {
        const { reactiveAnalyser: an, audioContext: ac } = useAudioSourceStore.getState()
        ctx2d.clearRect(0, 0, W, H)
        const b = bandRef.current
        const x0 = hzToLogX(b.lowHz) * W
        const x1 = hzToLogX(b.highHz) * W
        ctx2d.fillStyle = `${color}26`
        ctx2d.fillRect(x0, 0, x1 - x0, H)
        if (an && ac) {
          if (!data || data.length !== an.frequencyBinCount) data = new Uint8Array(an.frequencyBinCount)
          an.getByteFrequencyData(data as Uint8Array<ArrayBuffer>)
          const binHz = ac.sampleRate / an.fftSize
          ctx2d.fillStyle = 'rgba(255,255,255,0.35)'
          for (let px = 0; px < W; px++) {
            const hz = logXToHz((px + 0.5) / W)
            const v = data[Math.min(data.length - 1, Math.floor(hz / binHz))] / 255
            ctx2d.fillRect(px, H - v * H, 1, v * H)
          }
        }
        ctx2d.fillStyle = color
        ctx2d.fillRect(x0, 0, 1, H)
        ctx2d.fillRect(x1 - 1, 0, 1, H)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [color])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const toX = (clientX: number) => (clientX - rect.left) / rect.width
    const start = bandRef.current
    const sx = toX(e.clientX)
    const lx = hzToLogX(start.lowHz), hx = hzToLogX(start.highHz)
    const grab = EDGE_GRAB_PX / rect.width
    const mode = Math.abs(sx - lx) <= grab ? 'low' : Math.abs(sx - hx) <= grab ? 'high' : sx > lx && sx < hx ? 'move' : null
    if (!mode) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const x = toX(ev.clientX)
      let next: AudioBand
      if (mode === 'low') next = { lowHz: logXToHz(x), highHz: start.highHz }
      else if (mode === 'high') next = { lowHz: start.lowHz, highHz: logXToHz(x) }
      else {
        const dx = Math.max(-lx, Math.min(1 - hx, x - sx))
        next = { lowHz: logXToHz(lx + dx), highHz: logXToHz(hx + dx) }
      }
      onChange(clampBand(next, 20000))
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="flex flex-col gap-0.5">
      <canvas
        ref={canvasRef}
        data-band-spectrum
        width={W}
        height={H}
        onPointerDown={onPointerDown}
        onDoubleClick={() => onChange({ ...BAND_PRESETS.KICK })}
        className="rounded-sm cursor-ew-resize"
        style={{ width: W, height: H, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', touchAction: 'none' }}
      />
      <div className="flex justify-between text-[9px] tabular-nums" style={{ color: 'var(--text-ghost)', fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{fmtHz(band.lowHz)}</span>
        <span>{fmtHz(band.highHz)} Hz</span>
      </div>
    </div>
  )
}
```

The `Uint8Array<ArrayBuffer>` cast matches how `AudioFileTransport.tsx` calls `getByteFrequencyData`. If tsc rejects it, mirror that file's exact cast.

- [ ] **Step 4: Rework `TrackAudioReactivePanel.tsx`**

Keep the "Select a track…" and "Audio reactive is off…" branches unchanged. Replace the enabled branch's body inside `<ParamSection …>` with two rows:

```tsx
const setTrackAudioBand = useEffectSequencerStore((s) => s.setTrackAudioBand)
const setTrackAudioMod = useEffectSequencerStore((s) => s.setTrackAudioMod)
// (hooks above the early returns, with the other store hooks)

const band = config.band ?? legacySourceToBand(config.source) ?? BAND_PRESETS.FULL
const modParams = EFFECT_PARAM_REGISTRY[effectId]?.getParams() ?? []
```

```tsx
<ParamSection label="Audio Reactive" color={ACCENT} visual={SignalAnalysis}>
  <div className="flex flex-col gap-2">
    {/* Row 1 — band */}
    <div className="flex items-center gap-3">
      <BandSpectrum band={band} color={ACCENT} onChange={(b) => setTrackAudioBand(effectId, b)} />
      <div className="flex flex-wrap gap-1 max-w-[150px]">
        {(Object.keys(BAND_PRESETS) as BandPresetName[]).map((name) => {
          const p = BAND_PRESETS[name]
          const on = Math.abs(band.lowHz - p.lowHz) < 0.5 && Math.abs(band.highHz - p.highHz) < 0.5
          return (
            <button
              key={name}
              onClick={() => setTrackAudioBand(effectId, { ...p })}
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
              style={{ color: on ? ACCENT : 'var(--text-ghost)', border: `1px solid ${on ? `${ACCENT}60` : 'var(--border)'}`, backgroundColor: on ? `${ACCENT}15` : 'transparent' }}
            >
              {name}
            </button>
          )
        })}
      </div>
      {/* existing level meter + threshold line block, unchanged, moved here */}
    </div>

    {/* Row 2 — gate + mod */}
    <div className="flex items-center gap-4">
      {/* existing SENS Knob, unchanged */}
      <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
        MOD
        <select
          data-track-mod-select
          value={config.mod.param ?? ''}
          onChange={(e) => setTrackAudioMod(effectId, { param: e.target.value || null })}
          className="text-[10px] px-1 py-0.5 rounded-sm"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <option value="">—</option>
          {modParams.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {config.mod.param && (
        <Knob
          label="AMT"
          value={config.mod.amount}
          min={-1}
          max={1}
          step={0.01}
          size="xs"
          showArc
          showValue
          color={ACCENT}
          onChange={(v) => setTrackAudioMod(effectId, { amount: v })}
          formatValue={(v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`}
        />
      )}
      {/* existing Off button, unchanged */}
    </div>
  </div>
</ParamSection>
```

Add the imports: `BandSpectrum`; `BAND_PRESETS`, `legacySourceToBand`, `type BandPresetName` from `../../utils/audioBands`; `EFFECT_PARAM_REGISTRY` from `../../config/effectParams`. Keep all hooks above the early returns, which React requires.

Edge case: if `config.band` is null (a legacy `rms`/`peak`/`silence` source), the strip shows the legacy window or FULL. Dragging or picking a chip sets a real band, which switches the track to band mode.

- [ ] **Step 5: Run the check to verify it passes**

Run `node .superpowers/sdd/bands-check.mjs ui`. Expected: PASS. Then look at `.superpowers/sdd/shots/band-spectrum.png`.

- [ ] **Step 6: Review Focus 5**

The `ui` mode's over-drag assertion covers it. Confirm the line says OK.

- [ ] **Step 7: Build, lint, commit**

```bash
git add src/components/sequencer/BandSpectrum.tsx src/components/sequencer/TrackAudioReactivePanel.tsx
git commit -m "feat: per-track band spectrum, presets and MOD controls in the audio panel"
```

---

### Task 6: Cost check + regression

**Files:**
- Modify: `.superpowers/sdd/bands-check.mjs` (add `cost` mode; gitignored)

- [ ] **Step 1: Add the `cost` mode**

```js
if (MODE === 'cost') {
  const r = await p.evaluate(async () => {
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const ar = (await import('/src/stores/audioReactiveStore.ts')).useAudioReactiveStore
    const src = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore
    const { bandToBins, bandAverage, BAND_PRESETS } = await import('/src/utils/audioBands.ts')
    const ctx = new AudioContext(); await ctx.resume()
    const analyser = ctx.createAnalyser(); analyser.fftSize = 4096
    const osc = ctx.createOscillator(); osc.connect(analyser); osc.start()
    src.getState().setReactiveAnalyser(analyser); src.getState().setAudioContext(ctx)
    const ids = ['seg_voxel', 'seg_echo', 'seg_matter', 'seg_stale', 'seg_torn', 'crystallize', 'kaleidoscope', 'thermal']
    const presets = Object.values(BAND_PRESETS)
    const s = seq.getState()
    ids.forEach((id, i) => { s.ensureTrack(id); s.setTrackAudioReactiveEnabled(id, true); s.setTrackAudioBand(id, presets[i % presets.length]) })
    ar.getState().setEnabled(true)
    // micro-benchmark of the per-track band work alone (8 tracks, 4096 FFT)
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const N = 2000; const t0 = performance.now()
    for (let k = 0; k < N; k++) for (let i = 0; i < ids.length; i++) {
      const [f, l] = bandToBins(presets[i % presets.length], ctx.sampleRate, 4096); bandAverage(data, f, l)
    }
    const perFrameMs = (performance.now() - t0) / N
    await new Promise((res) => setTimeout(res, 1000))
    const live = Object.keys(ar.getState().trackBands).length
    osc.stop(); ctx.close()
    return { perFrameMs, live }
  })
  console.log(JSON.stringify(r))
  say('8 tracks publish band levels', r.live === 8)
  say('per-frame band work < 0.5 ms', r.perFrameMs < 0.5)
}
```

- [ ] **Step 2: Run cost + all earlier modes**

On a fresh server before each run: `math`, `isolation`, `gate`, `mod`, `ui`, `cost`. All must PASS. Also run the SEG regression harness `node .superpowers/sdd/seg-verify.mjs wiring`, which exercises the same stores, and expect PASS.

- [ ] **Step 3: Final gates**

Run `npm run build`, which must exit 0. Then run eslint on every file this plan created or modified: new files must be clean, and modified files must have no new problems compared with `6721ab1`. Nothing to commit unless a fix was needed.

---

## Self-Review Notes

- **Spec coverage.**

  | Spec item | Task |
  |---|---|
  | Data model + actions | T2 |
  | Band maths | T1 |
  | FFT 4096 | T2 |
  | Per-track levels | T2 |
  | Gate | T3 |
  | Param modulation | T4 (via the registry, refinement 2) |
  | No-audio behaviour | T2: an empty `trackBands` defaults the gate to 0; T4 skips when `!ar.enabled` |
  | UI rows | T5 |

  Spec tests map as follows: 1→T1, 2→T2, 3→T3, 4→T4, 5→T3 Step 5 (refinement 1), 6→T5, 7→T6.
- **Placeholders.** The gate task looks up the sequencer play/stop names, and the UI task looks up the bottom-tab selector, each with a grep. Both say what to do with the result.
- **Type consistency.** `AudioBand`, `setTrackAudioBand`, `setTrackAudioMod`, `trackBands`, `updateBands(…, trackBands)`, `stepTrackBandModulation` and `BandSpectrum` props are named identically in every task.
- **Bin expectations.** T1 uses `floor` on both ends, giving `[3,8]` at 48 kHz and `[3,9]` at 44.1 kHz. The Step 1 asserts use exactly these.
