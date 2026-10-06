# Per-Track Audio Bands — Design

**Date:** 2026-10-05
**Status:** Approved in conversation; awaiting written-spec review

## Goal

Let each sequencer track's audio reactivity listen to its own frequency window
(a per-track band filter) instead of the three fixed global bands. A track's
band level both gates the track's steps (today's behaviour) and can
continuously modulate one of the track's own effect params.

## Decisions

- **EQ model:** per-track band filter — each track owns a low/high cutoff window.
- **Band drives:** gate (existing auto-threshold) **and** optional param modulation.
- **Approach:** one shared FFT; per-track band = average of the FFT bins inside the
  track's window, run through the same normalise/envelope logic as the global bands.
  Rejected: per-track Web Audio band-pass filters (graph lifecycle, CPU scaling) and
  an AudioWorklet (overkill, adds a build step).

## Current state (for reference)

- `useUnifiedAudioAnalysis.ts` creates `reactiveAnalyser` with `fftSize = 2048`
  (two sites: file source, mic/video source).
- `useAudioReactive.ts` reads it each frame and publishes global `sub` (20–200 Hz),
  `mid` (200–2000 Hz), `high` (2000 Hz+), `hit`, `rms` to `audioReactiveStore`.
- `effectSequencerStore` tracks have `audioReactive: { enabled, source, sensitivity }`
  with `source ∈ kick | silence | high | mid | low | rms | peak`; the panel exposes
  only SENS.
- `useEffectSequencerPlayback.ts` gates tracks via `getAudioValue(source)` with a
  rolling peak / floor / auto-threshold.
- `useContinuousModulation.ts` applies `audio-*` global band routings to params.

## 1. Data and analysis

### Track config (`src/stores/effectSequencerStore.ts`)

`TrackAudioReactiveConfig` gains:

```ts
band: { lowHz: number; highHz: number } | null   // null → legacy `source` applies
mod: { param: string | null; amount: number }      // amount −1..1
```

- New tracks default to `band = KICK (40–100 Hz)`, `mod = { param: null, amount: 0.5 }`.
- Legacy configs without `band` are migrated on read (store hydration, bank/preset
  load): `kick`/`low` → 20–200, `mid` → 200–2000, `high` → 2000–16000.
  `rms`, `peak`, `silence` keep `band = null` and their current behaviour.
- New actions: `setTrackAudioBand(effectId, band)`, `setTrackAudioMod(effectId, partial)`.

### Band maths (`src/utils/audioBands.ts`, new, pure)

- `BAND_PRESETS`: KICK 40–100, BASS 60–250, SNARE 150–2500, HATS 6000–14000,
  VOX 300–3000, FULL 20–20000 (Hz).
- `MIN_BAND_OCTAVES = 1/3`; `clampBand(band, nyquist)` keeps 20 ≤ low < high ≤ nyquist
  and width ≥ 1/3 octave.
- `bandToBins(band, sampleRate, fftSize)` → `[firstBin, lastBin]`, always ≥ 1 bin.
- `legacySourceToBand(source)` → band or null.

### Per-track levels (`src/hooks/useAudioReactive.ts`)

- After the global bands, for each track with `audioReactive.enabled && band`:
  average bytes over `bandToBins(...)`, then the existing auto-normalise and
  envelope-follow functions with per-track state (keyed by effectId; dropped when a
  track is removed or disabled).
- Publish `trackBands: Record<string, number>` (0–1) in the same per-frame `set`
  as the global bands.
- Raise `reactiveAnalyser.fftSize` from 2048 to 4096 at both creation sites
  (~11.7 Hz/bin at 48 kHz). The 3 global bands are unaffected in meaning.

### Gate (`src/hooks/useEffectSequencerPlayback.ts`)

`getAudioValue` takes the track: with a `band`, returns `trackBands[effectId] ?? 0`;
otherwise the existing `source` switch. Rolling peak / floor / threshold logic is
unchanged.

### Param modulation (`src/hooks/useContinuousModulation.ts`)

New block beside the `audio-*` routings: for each track with `audioReactive.enabled`
and `mod.param` set, apply `trackBands[effectId] × mod.amount` as bipolar modulation
around the param's current value via the existing `applyModulation` path. No new
routing-store entries.

### No audio

No source, or global audio reactive off → `trackBands` stays 0: gates don't fire,
modulation rests (current behaviour).

## 2. Track panel UI (`src/components/sequencer/TrackAudioReactivePanel.tsx`)

Inside the existing "Audio Reactive" `ParamSection`, same visual language
(small mono labels, accent `#FF3355`, `Knob`).

**Row 1 — band**
- `BandSpectrum` (new, ~160×36 px): live FFT on a log-frequency axis (20 Hz–20 kHz),
  track window shaded. Drag either edge → that cutoff; drag the middle → slide the
  window; double-click → reset to KICK. Edge labels in Hz/kHz. Redraws on rAF only
  while mounted, reading stores via `getState()` (no React re-render per frame).
- Preset chips: KICK, BASS, SNARE, HATS, VOX, FULL.
- Level meter + auto-threshold line (as today), reading this track's band.

**Row 2 — gate + mod**
- SENS knob (as today).
- MOD select: "—" + the effect's params from `EFFECT_PARAM_REGISTRY[effectId].getParams()`.
- AMT knob, bipolar −100%…+100%, shown only when a param is picked.
- Off button (as today).

## 3. Testing and verification

No unit-test runner; puppeteer scripts under `.superpowers/sdd/` (gitignored),
plus `npm run build` and eslint on changed/new files (no new problems).

1. **Band maths:** in-page import of `audioBands.ts`; 40–100 Hz at 44.1 vs 48 kHz,
   collapse below one bin, `highHz` above Nyquist, legacy mapping, preset values.
2. **Isolation:** OscillatorNode test tone routed into the reactive analyser.
   KICK track vs HATS track: 60 Hz → only KICK rises above threshold; 8 kHz → only HATS.
3. **Gate:** pulsed 60 Hz tone → KICK track steps fire, HATS track's don't.
4. **Modulation:** VOXEL track, MOD = size, AMT +50% → size rises with the band and
   returns at rest; AMT −50% → falls.
5. **Legacy:** bank with `source: 'mid'` and no `band` → 200–2000 Hz window, same gating.
6. **UI:** dragging edges updates `lowHz`/`highHz`; chips set the window; screenshots.
7. **Cost:** 8 audio-reactive tracks → per-frame band work < 0.5 ms; build + lint clean.

## Out of scope

- Multiple bands per track, band-pass filters with slopes/Q, audio output EQ
  (this only shapes what the analyser listens to; sound playback is unchanged).
- Routing a track's band to another track's params.
