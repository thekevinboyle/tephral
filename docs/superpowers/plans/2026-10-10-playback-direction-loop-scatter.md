# Playback direction, loop region and Scatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Warp line, every Lines track and the Lines Master their own Direction (Fwd, Rev, Ping-pong, Random), loop region (Start/End handles) and Scatter (slice shuffle).

**Architecture:** One pure function, `playPosition(loopPos, play)` in `src/effects/playhead.ts`, turns an absolute loop position into the x the line is read at. Every reader of a line (Lines level, warp delay on picture and sound, the Warp modulation source, playheads, fills, thumbnails) goes through it. The audio worklet carries a byte-for-byte port, checked against the TS function. Randomness is a hash of (seed, cycle, slice), so picture and sound agree.

**Tech Stack:** React 19, TypeScript, zustand, three.js + postprocessing, AudioWorklet (plain JS), puppeteer harness `.superpowers/sdd/layout-check.mjs` (gitignored).

**Spec:** `docs/superpowers/specs/2026-10-10-playback-direction-loop-scatter-design.md`

## Global Constraints

- Defaults (Fwd, Start 0, End 1, Scatter 0) reproduce today's level and delay exactly (bit for bit).
- Direction values: `'fwd' | 'rev' | 'pingpong' | 'random'`, shown as Fwd, Rev, Ping-pong, Random.
- Slices N = round(1 / Quantize) for Quantize 1/4..1/64, 16 when Quantize is Off.
- Randomness only from `hash32(seed, cycle, slice)` and the seeded shuffle: never `Math.random` in playback.
- Seeds: Warp `0x57a2b`, Master `0x3a57e2`, each Lines track `fnv1a(effectId)`.
- Loop region: 0 ≤ Start < End ≤ 1, End − Start ≥ 1/64. Handles snap to Quantize (1/16 when Off), Alt drags free, double-click resets that handle.
- The worklet allocates nothing in `process()`.
- Warp fields are saved in banks/presets (`direction`, `loopStart`, `loopEnd`, `scatter`); Lines fields are not. Older saves load the defaults. Dice never changes these fields. Alt-drag tab copy copies them.
- Copy: no em dashes in UI text. Every new control has a hover status (`statusHover`).
- Harness: run with `PATH=/opt/homebrew/bin:$PATH`, restart Vite on :5173 before each run, never `git stash`.
- Commits end with the two trailer lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ`

## Review Focus

1. Tempo or Length changed mid-play with Scatter on: picture and sound must keep the same slice order (both read cycle from the same clock segment). Test in Task 4 (`warpplay` probe after a BPM change).
2. Quantize changed while Scatter is on: N changes, the region keeps playing without NaN or out-of-range x. Test in Task 1 (all N in SNAPS give x in [start, end]).
3. A loop region dragged to its minimum (1/64) with Quantize Off and Scatter 1: no NaN, playhead stays inside. Test in Task 1 and Task 6.
4. A bank saved before this feature, and a preset file with junk values (`direction: 'sideways'`, `loopStart: 2`, `loopEnd: NaN`): loads the defaults. Test in Task 2.
5. Rev at the loop seam: `u = 1 − skewPhase(ph)` jumps from 0 to 1 at the cycle boundary; the warp's click guard and the compositor's jump detection must treat it as a jump, not a sweep. Test in Task 4 (jumpCount rises with Rev on a sloped line).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/effects/playhead.ts` (new) | `PlayDirection`, `PlayParams`, `hash32`, `fnv1a`, `slicesFor`, `playPosition`, seeds, `warpPlay(state)`, `linePlay(line, seed)` |
| `public/worklets/warp-processor.js` | Port of `hash32`, the shuffle and `playPosition`; params `play`; per-sample x from the absolute position |
| `src/effects/warp/warpClock.ts` | `getWarpPosition(t)`, `getHeardWarpPosition()` |
| `src/effects/warp/warpMath.ts` | `delayAtX`, `warpModValueAt` (x already mapped) |
| `src/effects/warp/audioWarp.ts` | `play` in `warpParamsMessage` and in the params-change check |
| `src/effects/warp/WarpCompositor.ts` | `render(pos, delay)`; `play` option; jump walk over positions |
| `src/components/Canvas.tsx` | feeds absolute position and `play` |
| `src/stores/warpStore.ts` | four new snapshot fields + sanitize |
| `src/stores/effectSequencerStore.ts` | four new `TrackLine` fields + `mergeLine` |
| `src/effects/lines/linePhase.ts` | positions and head x per line |
| `src/effects/lines/lineLevel.ts` | `lineLevel(points, x, amount)` (x mapped) |
| `src/hooks/useEffectSequencerPlayback.ts` | maps each line and the master |
| `src/hooks/useContinuousModulation.ts` | Warp source at the mapped x |
| `src/components/performance/lines/LoopStrip.tsx` (new) | the Start/End handle strip above a plot |
| `src/components/performance/warp/WarpSettingsRow.tsx` | Direction + Scatter fields |
| `src/components/performance/warp/WarpGraph.tsx` | LoopStrip, dimming, playhead, waveform, thumbnails |
| `src/components/sequencer/LinesView.tsx` | Direction + Scatter fields, LoopStrip, dimming, playhead, fill |
| `src/components/sequencer/LineLane.tsx`, `LineSidePanel.tsx`, `LineTabs.tsx` | playhead/readout from head x; copy the new fields |
| `src/components/performance/layout.css` | strip and dimming styles |
| `CLAUDE.md` | Time warp and Line tracks sections |
| `.superpowers/sdd/layout-check.mjs` | modes `playmath`, `warpplay`, `playui` |

---

### Task 1: The playhead function

**Files:**
- Create: `src/effects/playhead.ts`
- Test: `.superpowers/sdd/layout-check.mjs` mode `playmath`

**Interfaces:**
- Consumes: `skewPhase(x, skew)` from `src/effects/warp/warpMath.ts`.
- Produces:
  - `type PlayDirection = 'fwd' | 'rev' | 'pingpong' | 'random'`, `PLAY_DIRECTIONS: readonly PlayDirection[]`
  - `interface PlayParams { direction: PlayDirection; start: number; end: number; scatter: number; skew: number; slices: number; seed: number }`
  - `interface PlayFields { direction: PlayDirection; loopStart: number; loopEnd: number; scatter: number }`, `PLAY_FIELD_DEFAULTS: PlayFields`
  - `MIN_REGION = 1 / 64`, `WARP_SEED = 0x57a2b`, `MASTER_SEED = 0x3a57e2`
  - `hash32(a, b, c): number` (uint32), `fnv1a(s: string): number`, `slicesFor(snap): number`
  - `playPosition(loopPos: number, p: PlayParams): number` (x in [start, end])
  - `cleanPlayFields(v: Partial<Record<keyof PlayFields, unknown>>, base: PlayFields): PlayFields`
  - `isPlainPlay(f: PlayFields): boolean`

- [ ] **Step 1: Write the failing test.** Add before the final `say('no page errors'…` in the harness:

```js
if (MODE === 'playmath') {
  await open(1440, 900)
  const R = await evr(async () => {
    const out = []
    const t = (k, ok, info) => out.push([k + (info !== undefined ? ` [${info}]` : ''), !!ok])
    const ph = await import('/src/effects/playhead.ts')
    const wm = await import('/src/effects/warp/warpMath.ts')
    const base = { direction: 'fwd', start: 0, end: 1, scatter: 0, skew: 0, slices: 16, seed: ph.WARP_SEED }
    const P = (pos, o = {}) => ph.playPosition(pos, { ...base, ...o })
    // defaults = today's skewed phase, exactly
    let ok = true
    for (let i = 0; i < 2000; i++) { const pos = i * 0.01237 - 3; const sk = ((i % 9) - 4) / 4; const want = wm.skewPhase(pos - Math.floor(pos), sk); if (P(pos, { skew: sk }) !== want) { ok = false; break } }
    t('defaults equal skewPhase(phase) exactly', ok)
    t('rev mirrors', Math.abs(P(2.25, { direction: 'rev' }) - 0.75) < 1e-12)
    t('pingpong: even cycle forward, odd cycle backward', Math.abs(P(4.25, { direction: 'pingpong' }) - 0.25) < 1e-12 && Math.abs(P(5.25, { direction: 'pingpong' }) - 0.75) < 1e-12)
    t('region maps u onto [start, end]', Math.abs(P(0.5, { start: 0.25, end: 0.75 }) - 0.5) < 1e-12 && Math.abs(P(0, { start: 0.25, end: 0.75 }) - 0.25) < 1e-12)
    // scatter 1: every pass is a permutation of slice indices
    const slicesOf = (cycle, o) => Array.from({ length: 16 }, (_, k) => Math.floor(P(cycle + (k + 0.5) / 16, o) * 16))
    const perm1 = slicesOf(7, { scatter: 1 }), perm2 = slicesOf(8, { scatter: 1 })
    t('scatter 1 is a permutation', [...perm1].sort((a, b) => a - b).join() === Array.from({ length: 16 }, (_, i) => i).join(), perm1.join())
    t('scatter 1: a new order each pass', perm1.join() !== perm2.join())
    t('scatter 1: same pass, same order (deterministic)', slicesOf(7, { scatter: 1 }).join() === perm1.join())
    t('scatter 1: other seed, other order', slicesOf(7, { scatter: 1, seed: 12345 }).join() !== perm1.join())
    // scatter share: about s of slices move, over many passes
    let moved = 0, n = 0
    for (let c = 0; c < 400; c++) { const s = slicesOf(c, { scatter: 0.5 }); s.forEach((v, k) => { n++; if (v !== k) moved++ }) }
    t('scatter 0.5 moves roughly half the slices (40..55%)', moved / n > 0.4 && moved / n < 0.55, (moved / n).toFixed(3))
    // the offset inside a slice is kept
    const a = P(3 + 2.25 / 16, { scatter: 1 }) * 16, b = P(3 + 2.75 / 16, { scatter: 1 }) * 16
    t('scatter keeps the offset inside the slice', Math.abs((a % 1) - 0.25) < 1e-9 && Math.abs((b % 1) - 0.75) < 1e-9)
    // random: repeats allowed and stays deterministic
    const rs = Array.from({ length: 64 }, (_, c) => slicesOf(c, { direction: 'random' }).join())
    t('random: deterministic per pass', slicesOf(9, { direction: 'random' }).join() === rs[9])
    t('random: some pass repeats a slice', rs.some((r) => new Set(r.split(',')).size < 16))
    // every N, every direction, extremes: x stays in [start, end], never NaN
    let inRange = true
    for (const N of [4, 8, 12, 16, 24, 32, 48, 64]) for (const d of ph.PLAY_DIRECTIONS) for (const [s0, s1] of [[0, 1], [0.5, 0.5 + 1 / 64], [0.1, 0.9]]) for (const sc of [0, 0.3, 1]) for (let i = 0; i < 200; i++) {
      const pos = i * 0.0731 - 2, x = P(pos, { slices: N, direction: d, start: s0, end: s1, scatter: sc, skew: 0.5 })
      if (!(x >= s0 - 1e-12 && x <= s1 + 1e-12)) { inRange = false }
    }
    t('x stays inside the region for every N, direction, region and scatter', inRange)
    t('non-finite position reads as 0', P(NaN) === 0 && P(Infinity) === 0)
    t('slicesFor: 1/16 -> 16, Off -> 16, 1/64 -> 64, 1/4 -> 4', ph.slicesFor(1 / 16) === 16 && ph.slicesFor(0) === 16 && ph.slicesFor(1 / 64) === 64 && ph.slicesFor(0.25) === 4)
    // cleaning
    const d0 = ph.PLAY_FIELD_DEFAULTS
    const c1 = ph.cleanPlayFields({ direction: 'sideways', loopStart: 2, loopEnd: NaN, scatter: 7 }, d0)
    t('clean: junk gives defaults, scatter clamped', c1.direction === 'fwd' && c1.loopStart === 0 && c1.loopEnd === 1 && c1.scatter === 1, JSON.stringify(c1))
    const c2 = ph.cleanPlayFields({ loopStart: 0.6, loopEnd: 0.6 }, d0)
    t('clean: start >= end gives the full range', c2.loopStart === 0 && c2.loopEnd === 1)
    const c3 = ph.cleanPlayFields({ loopStart: 0.25, loopEnd: 0.5, direction: 'pingpong', scatter: 0.4 }, d0)
    t('clean: valid values kept', c3.loopStart === 0.25 && c3.loopEnd === 0.5 && c3.direction === 'pingpong' && c3.scatter === 0.4)
    t('isPlainPlay', ph.isPlainPlay(d0) && !ph.isPlainPlay(c3))
    return out
  })
  for (const [k, ok] of R) say(k, ok)
}
```

- [ ] **Step 2: Run it to verify it fails.** `PATH=/opt/homebrew/bin:$PATH node .superpowers/sdd/layout-check.mjs playmath` (Vite restarted on :5173). Expected: page error, module `/src/effects/playhead.ts` not found.

- [ ] **Step 3: Write `src/effects/playhead.ts`.**

```ts
// The playhead (playback spec §2): which x of a line is read at an absolute loop position. Shared by the Lines
// engine, the warp picture and the Warp modulation source; public/worklets/warp-processor.js carries a port
// (KEEP IN SYNC: hash32, the shuffle, playPosition). Randomness is a hash of (seed, cycle, slice) only.
import { skewPhase } from './warp/warpMath'

export type PlayDirection = 'fwd' | 'rev' | 'pingpong' | 'random'
export const PLAY_DIRECTIONS: readonly PlayDirection[] = ['fwd', 'rev', 'pingpong', 'random']
export const PLAY_DIRECTION_NAMES: Record<PlayDirection, string> = { fwd: 'Fwd', rev: 'Rev', pingpong: 'Ping-pong', random: 'Random' }

/** What a line stores (warp snapshot and TrackLine). */
export interface PlayFields { direction: PlayDirection; loopStart: number; loopEnd: number; scatter: number }
export const PLAY_FIELD_DEFAULTS: PlayFields = { direction: 'fwd', loopStart: 0, loopEnd: 1, scatter: 0 }

/** Everything playPosition needs. */
export interface PlayParams { direction: PlayDirection; start: number; end: number; scatter: number; skew: number; slices: number; seed: number }

export const MIN_REGION = 1 / 64
export const WARP_SEED = 0x57a2b
export const MASTER_SEED = 0x3a57e2

/** A uint32 hash of three integers (lowbias32 finaliser). */
export function hash32(a: number, b: number, c: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be59b, 0x85ebca6b) ^ Math.imul((c | 0) + 0x27d4eb2f, 0xc2b2ae35)) | 0
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return h >>> 0
}

/** 32-bit FNV-1a of a string (each Lines track's seed). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Slices per region: the Quantize grid (1/4..1/64), 16 when Quantize is Off. */
export const slicesFor = (snap: number) => (snap > 0 ? Math.max(1, Math.min(64, Math.round(1 / snap))) : 16)

// One cached shuffle: recomputed when (seed, cycle, n) changes (at most a few lines a frame, 64 steps each).
const perm = new Uint8Array(64)
let pSeed = NaN, pCycle = NaN, pN = 0
function shuffleAt(seed: number, cycle: number, n: number): Uint8Array {
  if (seed === pSeed && cycle === pCycle && n === pN) return perm
  for (let i = 0; i < n; i++) perm[i] = i
  let s = hash32(seed, cycle, 0x5ca77e5)
  for (let i = n - 1; i > 0; i--) {
    // mulberry32 step
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(r * (i + 1))
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp
  }
  pSeed = seed; pCycle = cycle; pN = n
  return perm
}

/**
 * x of the line at absolute loop position `loopPos` (loops since the anchor): Skew, then Direction, then Scatter,
 * then the region (stretched over the whole Length). Defaults give skewPhase(phase, skew) exactly.
 */
export function playPosition(loopPos: number, p: PlayParams): number {
  const pos = Number.isFinite(loopPos) ? loopPos : 0
  const cycle = Math.floor(pos)
  let u = skewPhase(pos - cycle, p.skew)
  const n = p.slices
  if (p.direction === 'rev') u = 1 - u
  else if (p.direction === 'pingpong') { if (cycle & 1) u = 1 - u }
  else if (p.direction === 'random') {
    const k = Math.min(n - 1, Math.floor(u * n))
    u = ((hash32(p.seed, cycle, k) % n) + (u * n - k)) / n
  }
  if (p.scatter > 0) {
    const k = Math.min(n - 1, Math.floor(u * n))
    if (hash32(p.seed ^ 0x51ced, cycle, k) / 4294967296 < p.scatter) u = (shuffleAt(p.seed, cycle, n)[k] + (u * n - k)) / n
  }
  if (p.start === 0 && p.end === 1) return u
  return p.start + u * (p.end - p.start)
}

const num01 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null)

/** Untrusted fields (bank, preset file): each invalid one takes `base`'s; an empty or inverted region becomes 0..1. */
export function cleanPlayFields(v: Partial<Record<keyof PlayFields, unknown>>, base: PlayFields): PlayFields {
  const direction = PLAY_DIRECTIONS.includes(v.direction as PlayDirection) ? (v.direction as PlayDirection) : base.direction
  const s = v.loopStart === undefined ? base.loopStart : num01(v.loopStart)
  const e = v.loopEnd === undefined ? base.loopEnd : num01(v.loopEnd)
  const okRegion = s !== null && e !== null && e - s >= MIN_REGION - 1e-9
  return {
    direction,
    loopStart: okRegion ? s : 0,
    loopEnd: okRegion ? e : 1,
    scatter: num01(v.scatter) ?? base.scatter,
  }
}

export const isPlainPlay = (f: PlayFields) => f.direction === 'fwd' && f.loopStart === 0 && f.loopEnd === 1 && f.scatter === 0

/** PlayParams for stored fields + skew + Quantize. */
export const playParams = (f: PlayFields, skew: number, snap: number, seed: number): PlayParams => ({
  direction: f.direction, start: f.loopStart, end: f.loopEnd, scatter: f.scatter, skew, slices: slicesFor(snap), seed,
})
```

- [ ] **Step 4: Run it to verify it passes.** Same command. Expected: every `playmath` line OK, `LAYOUT playmath CHECK: PASS`. `npx tsc --noEmit -p tsconfig.app.json` clean.

- [ ] **Step 5: Commit.** `git add src/effects/playhead.ts && git commit` with message `feat: playhead: direction, loop region and scatter as one position function` + trailers.

---

### Task 2: Stored fields (Warp and Lines)

**Files:**
- Modify: `src/stores/warpStore.ts` (WarpSnapshot, WARP_DEFAULTS, sanitize, getSnapshot)
- Modify: `src/stores/effectSequencerStore.ts:56-82` (TrackLine, defaultTrackLine, mergeLine)
- Modify: `src/components/sequencer/LineTabs.tsx:39` (copyLine)
- Test: harness `playmath` (store checks appended)

**Interfaces:**
- Consumes: `PlayFields`, `PLAY_FIELD_DEFAULTS`, `cleanPlayFields` (Task 1).
- Produces: `WarpSnapshot` and `TrackLine` both `extends PlayFields` (fields `direction`, `loopStart`, `loopEnd`, `scatter`).

- [ ] **Step 1: Failing test.** Append inside the `playmath` evaluate, before `return out`:

```js
    const ws = (await import('/src/stores/warpStore.ts')).useWarpStore.getState()
    ws.applySnapshot({ enabled: false, amount: 0.5 })
    const old = ws.getSnapshot()
    t('warp: an older save loads the defaults', old.direction === 'fwd' && old.loopStart === 0 && old.loopEnd === 1 && old.scatter === 0)
    ws.patch({ direction: 'rev', loopStart: 0.25, loopEnd: 0.75, scatter: 0.3 })
    const s1 = ws.getSnapshot()
    t('warp: fields saved in the snapshot', s1.direction === 'rev' && s1.loopStart === 0.25 && s1.loopEnd === 0.75 && s1.scatter === 0.3)
    ws.patch({ direction: 'sideways', loopEnd: 0.1 })
    const s2 = ws.getSnapshot()
    t('warp: junk direction ignored, inverted region -> full range', s2.direction === 'rev' && s2.loopStart === 0 && s2.loopEnd === 1, JSON.stringify(s2))
    ws.patch({ loopStart: 0.25, loopEnd: 0.75 })
    ws.dice({ amount: false, profile: false, graph: false, settings: false, knobs: false, output: false })
    const s3 = ws.getSnapshot()
    t('warp: Dice leaves direction, region and scatter', s3.direction === 'rev' && s3.loopStart === 0.25 && s3.loopEnd === 0.75 && s3.scatter === 0.3)
    ws.applySnapshot(undefined)
    const seq = await import('/src/stores/effectSequencerStore.ts')
    const ml = seq.mergeLine(undefined, { direction: 'pingpong', loopStart: 0.5, loopEnd: 1, scatter: 2 })
    t('lines: mergeLine keeps valid fields, clamps scatter', ml.direction === 'pingpong' && ml.loopStart === 0.5 && ml.loopEnd === 1 && ml.scatter === 1, JSON.stringify(ml))
    const ml2 = seq.mergeLine(ml, { loopStart: 0.99 })
    t('lines: a start past the end resets the region', ml2.loopStart === 0 && ml2.loopEnd === 1)
    t('lines: default line is plain', seq.defaultTrackLine().direction === 'fwd' && seq.defaultTrackLine().scatter === 0)
```

- [ ] **Step 2: Run, expect FAIL** (fields undefined).

- [ ] **Step 3: Implement.**

`warpStore.ts`: `import { cleanPlayFields, PLAY_FIELD_DEFAULTS, type PlayFields } from '../effects/playhead'`; `export interface WarpSnapshot extends PlayFields { …existing… }`; in `WARP_DEFAULTS` add `...PLAY_FIELD_DEFAULTS,`; in `sanitize`'s returned object add `...cleanPlayFields(i, base),` (base is a WarpSnapshot, so it is a PlayFields); in `getSnapshot` add `direction: s.direction, loopStart: s.loopStart, loopEnd: s.loopEnd, scatter: s.scatter,`. Extend the dice comment: "Never touches enabled, appliesTo, placement or the playback fields (direction, loop region, scatter)."

`effectSequencerStore.ts`:
```ts
import { cleanPlayFields, PLAY_FIELD_DEFAULTS, type PlayFields } from '../effects/playhead'
/** A line (spec §1) … plus its playback (playback spec §1): direction, loop region, scatter. */
export interface TrackLine extends PlayFields { …existing fields… }
export const defaultTrackLine = (): TrackLine => ({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0, amount: 1, beats: 4, gridY: 8, ...PLAY_FIELD_DEFAULTS })
// in mergeLine, before `return next`:
  Object.assign(next, cleanPlayFields({ ...pickPlay(next), ...pickPlay(patch) }, pickPlay(next)))
```
with, above `mergeLine`:
```ts
const pickPlay = (l: Partial<TrackLine>): Partial<PlayFields> => {
  const o: Partial<PlayFields> = {}
  if (l.direction !== undefined) o.direction = l.direction
  if (l.loopStart !== undefined) o.loopStart = l.loopStart
  if (l.loopEnd !== undefined) o.loopEnd = l.loopEnd
  if (l.scatter !== undefined) o.scatter = l.scatter
  return o
}
```
(`next` always has all four from `defaultTrackLine()`, so the cast to `PlayFields` for `base` is safe: write `pickPlay(next) as PlayFields`.)

`LineTabs.tsx` `copyLine`: `const copy = { points: from.points, amount: from.amount, beats: from.beats, snap: from.snap, gridY: from.gridY, skew: from.skew, direction: from.direction, loopStart: from.loopStart, loopEnd: from.loopEnd, scatter: from.scatter }` and add "direction, loop region, scatter" to its doc comment.

- [ ] **Step 4: Run `playmath`, expect PASS; `tsc` clean.**
- [ ] **Step 5: Commit** `feat: playback fields on the warp snapshot and on line tracks`.

---

### Task 3: Lines engine and Lines playheads

**Files:**
- Modify: `src/effects/lines/linePhase.ts`, `src/effects/lines/lineLevel.ts`
- Modify: `src/hooks/useEffectSequencerPlayback.ts:470-515`
- Modify: `src/components/sequencer/LinesView.tsx` (playhead 133-149, cycle 151-168, `hearPaths` 40-64), `LineLane.tsx:68-82`, `LineSidePanel.tsx:99-108`
- Test: harness `playmath` (level checks) and `lineseditor` / `lines2engine` still pass

**Interfaces:**
- Consumes: `playPosition`, `playParams`, `fnv1a`, `MASTER_SEED` (Task 1); `TrackLine` play fields (Task 2).
- Produces:
  - `lineLevel(points, x, amount = 1)` — `x` is the mapped x (no skew argument).
  - `linePhase.ts`: `setLinePos(id, pos, x)`, `getLinePos(id): number | null`, `getLineHead(id): number | null`, `setMasterPos(pos: number | null, x?: number)`, `getMasterPos()`, `getMasterHead()`; `getLinePhase`/`getMasterPhase` stay (frac of the position).
  - In `lineLevel.ts` (keeps `playhead.ts` free of store types): `lineSeed(id: string): number` (`'master'` gives `MASTER_SEED`, else `fnv1a(id)`) and `linePlay(l: TrackLine, seed: number): PlayParams`.

- [ ] **Step 1: Failing test** (append to `playmath`):

```js
    const ll = await import('/src/effects/lines/lineLevel.ts')
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }]
    t('lineLevel(points, x, amount): 1 - amount*y at x', Math.abs(ll.lineLevel(pts, 0.25, 1) - 0.75) < 1e-6 && Math.abs(ll.lineLevel(pts, 0.25, 0.5) - 0.875) < 1e-6)
    t('lineSeed: master constant, tracks differ', ll.lineSeed('master') === ph.MASTER_SEED && ll.lineSeed('rgb_split') !== ll.lineSeed('noise'))
    const L1 = { ...seq.defaultTrackLine(), points: pts, direction: 'rev' }
    t('linePlay + playPosition: rev reads 1 - phase', Math.abs(ph.playPosition(0.25, ll.linePlay(L1, 1)) - 0.75) < 1e-12)
```

- [ ] **Step 2: Run, expect FAIL** (`lineSeed` undefined, `lineLevel` with old signature gives the skewed value).

- [ ] **Step 3: Implement.**

`lineLevel.ts`:
```ts
// A Line track's level (spec §1): 1 − amount·y of the line at x (the playhead's x: playback spec §2), from a LUT cached per points array.
import { buildLut, type WarpPoint } from '../warp/warpMath'
import { fnv1a, MASTER_SEED, playParams, type PlayParams } from '../playhead'
import type { TrackLine } from '../../stores/effectSequencerStore'
…lineLut unchanged…
/** Level 0..1 at the line's x (top = 1, bottom = 1 − amount). Never NaN: anything non-finite reads as full. */
export function lineLevel(points: WarpPoint[], x: number, amount = 1): number {
  const lut = lineLut(points)
  const f = (x > 0 ? (x < 1 ? x : 1) : 0) * (lut.length - 1)
  …rest unchanged…
}
/** Each line's scatter/random seed: the master a constant, a track a hash of its effect id. */
export const lineSeed = (id: string) => (id === 'master' ? MASTER_SEED : fnv1a(id))
/** PlayParams of a stored line. */
export const linePlay = (l: TrackLine, seed: number): PlayParams => playParams(l, l.skew, l.snap, seed)
```
(If importing the store type creates a cycle warning, import it with `import type` as written; it is erased.)

`linePhase.ts`:
```ts
// Each Line track's position while the sequencer plays (spec §2; playback spec §2), written by the playback line
// pass and read by the lanes' rAF playheads. pos = loops since Play (beats / line.beats); head = the x being read.
const pos = new Map<string, number>()
const head = new Map<string, number>()
let passes = 0
const frac = (v: number) => v - Math.floor(v)
export const getLinePos = (id: string): number | null => pos.get(id) ?? null
export const getLinePhase = (id: string): number | null => { const p = pos.get(id); return p === undefined ? null : frac(p) }
export const getLineHead = (id: string): number | null => head.get(id) ?? null
export const setLinePos = (id: string, p: number, x: number): void => { pos.set(id, p); head.set(id, x) }
export const deleteLinePhase = (id: string): void => { pos.delete(id); head.delete(id) }
export const clearLinePhases = (): void => { pos.clear(); head.clear(); masterPos = null; masterHead = null }
let masterPos: number | null = null
let masterHead: number | null = null
export const getMasterPos = (): number | null => masterPos
export const getMasterPhase = (): number | null => (masterPos === null ? null : frac(masterPos))
export const getMasterHead = (): number | null => masterHead
export const setMasterPos = (p: number | null, x: number | null = null): void => { masterPos = p; masterHead = x }
…noteLinePass / getLinePassCount unchanged…
```
Remove `setLinePhase` and `setMasterPhase` (grep: only the playback hook uses them).

Playback hook, lines block: replace
```ts
const mPhase = phaseOf(beats.current, ml.beats)
setMasterPhase(mPhase)
const mLevel = master.enabled ? lineLevel(ml.points, mPhase, ml.skew, ml.amount) : 1
```
with
```ts
const mPos = beats.current / ml.beats
const mx = playPosition(mPos, linePlay(ml, MASTER_SEED))
setMasterPos(mPos, mx)
const mLevel = master.enabled ? lineLevel(ml.points, mx, ml.amount) : 1
```
and per track replace the `phase`/`level`/`setLinePhase` lines with
```ts
const pos = beats.current / line.beats
const x = playPosition(pos, linePlay(line, lineSeed(effectId)))
const level = lineLevel(line.points, x, line.amount)
setLinePos(effectId, pos, x)
```
`beats.current` starts at 0 on Play and only grows, so `pos` ≥ 0. Imports: `playPosition, MASTER_SEED` from `../effects/playhead`; `lineLevel, linePlay, lineSeed` from `../effects/lines/lineLevel`; `clearLinePhases, deleteLinePhase, noteLinePass, setLinePos, setMasterPos` from linePhase. Remove `phaseOf` if unused (lint). Linelevel ignores `skew` now: `linePlay` already applies it.

`LinesView.tsx` playhead frame: `const hx = tab === 'master' ? getMasterHead() : getLineHead(tab)`; hide on null; `head.style.transform = translateX(PAD + hx * iw)`. Drop the skew lookup.

`LinesView.tsx` cycle polling: replace `cycleNow` with the track's absolute pass while playing:
```ts
const [passNow, setPassNow] = useState(0)
useEffect(() => {
  if (!visible || !isPlaying || isMaster) return
  let raf = 0, last = -1
  const frame = () => {
    raf = requestAnimationFrame(frame)
    const p = getLinePos(tab)
    const c = p === null ? 0 : Math.floor(p)
    if (c !== last) { last = c; setPassNow(c) }
  }
  frame()
  return () => cancelAnimationFrame(raf)
}, [visible, isPlaying, isMaster, tab])
const pass = visible && isPlaying && !isMaster ? passNow : 0
const hear = useMemo(() => (isMaster || w <= 0 ? null : hearPaths(line, master, tab, pass, iw, ih)), [isMaster, w, line, master, tab, pass, iw, ih])
```
(The old `ratio`/`cycle` code and its `getMasterPhase` use go; plain settings reproduce the old picture because the master's position at track pass `c` is `(c + p)·tb/mb`, the same master cycle the old code picked.)

`hearPaths` (column-sampled; plain settings give the old curve within one column):
```ts
const COLS_HEAR = SAMPLES // one column per old sample step
/**
 * The track tab's overlays in the line's point space: over the track's pass `pass`, each moment's x (playPosition)
 * gets track level × master level at that moment; the dashed master is the master level at the same moments.
 * Columns no moment reads (Random, Scatter, a region) show the track level alone and no dash.
 */
function hearPaths(line: TrackLine, master: { line: TrackLine; enabled: boolean }, id: string, pass: number, iw: number, ih: number) {
  const m = master.line
  const tb = line.beats || 4, mb = m.beats || 4, amount = line.amount ?? 1
  const tp = linePlay(line, lineSeed(id)), mp = linePlay(m, MASTER_SEED)
  const val = new Float32Array(COLS_HEAR + 1).fill(NaN), mval = new Float32Array(COLS_HEAR + 1).fill(NaN)
  const steps = COLS_HEAR * 8
  for (let i = 0; i < steps; i++) {
    const p = (i + 0.5) / steps
    const x = playPosition(pass + p, tp)
    const col = Math.round(x * COLS_HEAR)
    const v = lineLevel(line.points, x, amount)
    let mv = 1
    if (master.enabled) mv = lineLevel(m.points, playPosition(((pass + p) * tb) / mb, mp), m.amount ?? 1)
    val[col] = v * mv; mval[col] = mv
  }
  const X = (x: number) => (PAD + x * iw).toFixed(1)
  const Y = (y: number) => (PAD + y * ih).toFixed(1)
  let fill = `M${X(0)} ${Y(1)}`, dash = '', pen = false
  for (let i = 0; i <= COLS_HEAR; i++) {
    const x = i / COLS_HEAR
    const v = Number.isNaN(val[i]) ? lineLevel(line.points, x, amount) : val[i]
    fill += ` L${X(x)} ${Y(1 - v)}`
    if (master.enabled && !Number.isNaN(mval[i])) { dash += `${pen ? ' L' : ' M'}${X(x)} ${Y(1 - mval[i])}`; pen = true } else pen = false
  }
  fill += ` L${X(1)} ${Y(1)} Z`
  return { fill, dash: dash.trim() }
}
```
Imports in LinesView: `getLineHead, getLinePos, getMasterHead` from linePhase; `lineLevel, linePlay, lineSeed` from lineLevel; `playPosition, MASTER_SEED` from playhead. Remove `unskew` and `skewPhase` imports if now unused.

`LineLane.tsx` playhead: `const hx = getLineHead(effectId)`; hide on null; `translateX(PAD + hx * iw)`; drop skew.

`LineSidePanel.tsx` readout: `const hx = getLineHead(id); const l = hx === null ? 1 : lineLevel(line.points, hx, line.amount)`.

- [ ] **Step 4: Run `playmath`, `lines2engine`, `lineseditor`, `linesengine`; expect PASS.** If a lines mode asserted `setLinePhase`/`getLinePhase` values, update it to `setLinePos`/`getLinePhase` (phase is still the frac). `tsc` clean, lint count not above the branch baseline (268).
- [ ] **Step 5: Commit** `feat: lines play through the playhead (direction, loop region, scatter)`.

---

### Task 4: Warp engine (clock, worklet, compositor, modulation, Warp graph)

**Files:**
- Modify: `src/effects/warp/warpClock.ts`, `src/effects/warp/warpMath.ts`, `src/effects/warp/audioWarp.ts`, `public/worklets/warp-processor.js`
- Modify: `src/effects/warp/WarpCompositor.ts` (options, `render`, `detectJump`, `delayAt`, Filter Spam's `ph`)
- Modify: `src/components/Canvas.tsx` (`runWarp`), `src/hooks/useContinuousModulation.ts:749`, `src/components/performance/warp/WarpGraph.tsx` (playhead, waveform, thumbnails)
- Test: harness modes `playmath` (worklet parity), `warpplay` (new), and `warpmath`, `warpaudio`, `warpvideo`, `warpfinal`, `warpmod`, `warpplace` still pass

**Interfaces:**
- Consumes: Task 1 exports; warp store play fields (Task 2).
- Produces:
  - `getWarpPosition(ctxTime): number` (loops since the segment's t0, unwrapped), `getHeardWarpPosition(): number`
  - `warpPlay(s: { skew; snap; direction; loopStart; loopEnd; scatter }): PlayParams` (in `playhead.ts`, seed `WARP_SEED`)
  - `delayAtX(lut, x, amount, loopSeconds, max?)`, `warpModValueAt(lut, x, amount)` in warpMath
  - `WarpVideoOptions.play: PlayParams`; `WarpCompositor.render(pos: number, delaySec: number)`
  - worklet params message field `play: { direction, start, end, scatter, skew, slices, seed }`; worklet test hook message `{type:'playtest', positions: number[]}` replies `{type:'playtest', xs: number[]}` (test only)

- [ ] **Step 1: Failing tests.**

Append to `playmath` (worklet parity: load the worklet source as text and evaluate its maths section in the page):
```js
    const src = await (await fetch('/worklets/warp-processor.js')).text()
    const cut = src.slice(0, src.indexOf('// ---------------------------------------------------------------- processor'))
    const mod = new Function(cut.replace(/^registerProcessor.*$/m, '') + '\nreturn { playPositionW: playPosition }')()
    let same = true, worst = ''
    for (let i = 0; i < 10000; i++) {
      const o = { direction: ph.PLAY_DIRECTIONS[i % 4], start: (i % 7) / 14, end: 0.5 + (i % 5) / 10, scatter: (i % 3) / 2, skew: ((i % 9) - 4) / 4, slices: [4, 8, 16, 32, 64][i % 5], seed: (i * 2654435761) >>> 0 }
      if (o.end - o.start < 1 / 64) o.end = o.start + 1 / 64
      const pos = i * 0.01731 - 5
      const a = ph.playPosition(pos, o), b = mod.playPositionW(pos, o)
      if (a !== b) { same = false; worst = `${pos} ${JSON.stringify(o)} ${a} vs ${b}`; break }
    }
    t('worklet playPosition equals the TS one on 10 000 inputs', same, worst)
```
(The worklet's maths section must therefore be self-contained above the `// ---- processor` marker and must not reference `sampleRate`/`currentTime` at top level.)

Add mode `warpplay` (copy the preamble `ws`, `dropFiles` and `info` helpers from `warpfinal`, autoplay flag added to the launch condition):
```js
if (MODE === 'warpplay') {
  await open(1440, 900)
  // …ws, dropFiles from warpfinal…
  await evr(async () => { const lib = await import('/src/stores/presetLibraryStore.ts'); await lib.usePresetLibraryStore.getState().loadFromDB(); lib.usePresetLibraryStore.getState().loadPreset('factory_seg_exp') })
  await evr(async () => { (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().setBpm(120) })
  await ws("(s.applySnapshot(undefined), s.loadPreset('Stutter build'), s.patch({ lengthBeats: 4, scatter: 1, direction: 'fwd', output: { low: 20, high: 20000, levelDb: -3 } }), 0)")
  await dropFiles(['seg-exp-28-reference.mp4']); await wait(2500)
  await ws('s.setEnabled(true)'); await wait(2500)
  // audio x (probe channel 1 now carries x, not phase) vs video x at the heard position, like warpfinal's sync probe
  const probe = () => evr(() => { window.__pp = null; (async () => {
    const R = { err: 'none', rows: [] }
    try {
      const aw = await import('/src/effects/warp/audioWarp.ts'); const clk = await import('/src/effects/warp/warpClock.ts'); const ph = await import('/src/effects/playhead.ts')
      const st = (await import('/src/stores/warpStore.ts')).useWarpStore
      const node = aw.activeAudioWarpNodes()[0]; const ctx = node.context
      const sp = ctx.createChannelSplitter(2); const an = ctx.createAnalyser(); an.fftSize = 32768; an.smoothingTimeConstant = 0
      node.connect(sp); sp.connect(an, 1)
      node.port.postMessage({ type: 'params', probe: true })
      await new Promise((r) => setTimeout(r, 600))
      const N = an.fftSize, buf = new Float32Array(N)
      const end = performance.now() + 3000
      while (performance.now() < end) {
        await new Promise((r) => requestAnimationFrame(r))
        an.getFloatTimeDomainData(buf)
        const lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0)
        const tLastCtx = ctx.currentTime // newest sample ~ currentTime + render quantum; compare the heard x to the newest few ms
        const vx = ph.playPosition(clk.getHeardWarpPosition(), ph.warpPlay(st.getState()))
        const ax = buf[N - 1 - Math.round(lat * ctx.sampleRate)]
        R.rows.push([vx, ax])
      }
      node.port.postMessage({ type: 'params', probe: false }); sp.disconnect(); an.disconnect()
    } catch (e) { R.err = String(e.stack || e).slice(0, 300) }
    window.__pp = R
  })() })
  await probe(); await p.waitForFunction('window.__pp', { timeout: 20000, polling: 300 })
  let P = await evr(() => window.__pp)
  const agree = (rows) => rows.filter(([v, a]) => Math.abs(v - a) < 1 / 16 / 2).length / rows.length
  say('scatter 1: video x and audio x name the same slice (>= 80% of frames)', P.err === 'none' && agree(P.rows) >= 0.8, `${P.err} rows ${P.rows.length} agree ${agree(P.rows).toFixed(2)}`)
  // tempo change mid-play keeps them together (Review Focus 1)
  await evr(async () => { (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().setBpm(97) }); await wait(800)
  await probe(); await p.waitForFunction('window.__pp', { timeout: 20000, polling: 300 })
  P = await evr(() => window.__pp)
  say('after a BPM change: still the same slice (>= 80%)', P.err === 'none' && agree(P.rows) >= 0.8, `agree ${agree(P.rows).toFixed(2)}`)
  // Rev on a sloped line: the seam is a jump for the compositor (Review Focus 5)
  const j0 = await evr(() => window.__warpTest.compositor().jumpCount)
  await ws("(s.loadPreset('Tape stop'), s.patch({ scatter: 0, direction: 'rev' }), 0)"); await wait(4500)
  const j1 = await evr(() => window.__warpTest.compositor().jumpCount)
  say('rev: the loop seam registers as a jump on the picture', j1 > j0, `${j0} -> ${j1}`)
  // defaults: delay identical to before (pos-based delay equals phase-based delay)
  const same = await evr(async () => {
    const m = await import('/src/effects/warp/warpMath.ts'); const ph = await import('/src/effects/playhead.ts')
    const lut = m.buildLut(m.PRESETS['Tape stop'])
    for (let i = 0; i < 1000; i++) {
      const pos = i * 0.0173, sk = ((i % 5) - 2) / 2
      const a = m.delaySeconds({ phase: pos - Math.floor(pos), lut, amount: 0.8, skew: sk, loopSeconds: 2 })
      const b = m.delayAtX(lut, ph.playPosition(pos, { direction: 'fwd', start: 0, end: 1, scatter: 0, skew: sk, slices: 16, seed: 1 }), 0.8, 2)
      if (a !== b) return false
    }
    return true
  })
  say('defaults: delay is bit-identical to the phase-based delay', same)
}
```

- [ ] **Step 2: Run `playmath` and `warpplay`, expect FAIL** (no `playPosition` in the worklet; no `getHeardWarpPosition`).

- [ ] **Step 3: Implement.**

`warpClock.ts`, after `getWarpPhase`:
```ts
/** Loops since the segment's anchor at `ctxTime`, unwrapped (frac of it is getWarpPhase). Scatter and Ping-pong read the whole part. */
export function getWarpPosition(ctxTime: number): number {
  const s = segAt(ctxTime)
  return (ctxTime - s.t0) / loopSeconds(s.lengthBeats, s.bpm)
}
/** getWarpPosition of what is heard now (minus output and base latency), for the video side. */
export function getHeardWarpPosition(): number {
  const ac = timeBase instanceof AudioContext ? timeBase : null
  const lat = ac ? (ac.outputLatency || 0) + (ac.baseLatency || 0) : 0
  return getWarpPosition(warpNow() - lat)
}
```
(Rewrite `getWarpPhase` as `frac(getWarpPosition(t))` and `getHeardWarpPhase` as `frac(getHeardWarpPosition())`.)

`warpMath.ts`:
```ts
/** delaySeconds for an x already through the playhead (playback spec §2). Same clamping, never NaN. */
export function delayAtX(lut: Float32Array, x: number, amount: number, loopSeconds: number, maxSeconds = MAX_DELAY_SECONDS): number {
  const d = warpedY(lut, x, amount) * loopSeconds
  return d > 0 ? (d < maxSeconds ? d : maxSeconds) : 0
}
/** warpModValue at an x already through the playhead. */
export const warpModValueAt = (lut: Float32Array, x: number, amount: number) => clamp01(warpedY(lut, x, amount))
```
(`delaySeconds` stays for existing callers and tests; with plain settings `delayAtX(lut, playPosition(pos), …)` equals it because `playPosition` returns `skewPhase(phase, skew)` exactly.)

`playhead.ts`, add:
```ts
/** The warp's PlayParams from its store state (seed WARP_SEED). */
export const warpPlay = (s: PlayFields & { skew: number; snap: number }): PlayParams => playParams(s, s.skew, s.snap, WARP_SEED)
```

Worklet: above the `// ---- processor` marker add the port, then use it:
```js
// ---------------------------------------------------------------- playhead (KEEP IN SYNC WITH src/effects/playhead.ts)
function hash32(a, b, c) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be59b, 0x85ebca6b) ^ Math.imul((c | 0) + 0x27d4eb2f, 0xc2b2ae35)) | 0
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return h >>> 0
}
const perm = new Uint8Array(64)
let pSeed = NaN, pCycle = NaN, pN = 0
function shuffleAt(seed, cycle, n) {
  if (seed === pSeed && cycle === pCycle && n === pN) return perm
  for (let i = 0; i < n; i++) perm[i] = i
  let s = hash32(seed, cycle, 0x5ca77e5)
  for (let i = n - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(r * (i + 1))
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp
  }
  pSeed = seed; pCycle = cycle; pN = n
  return perm
}
function playPosition(loopPos, p) {
  const pos = Number.isFinite(loopPos) ? loopPos : 0
  const cycle = Math.floor(pos)
  let u = skewPhase(pos - cycle, p.skew)
  const n = p.slices
  if (p.direction === 'rev') u = 1 - u
  else if (p.direction === 'pingpong') { if (cycle & 1) u = 1 - u }
  else if (p.direction === 'random') {
    const k = Math.min(n - 1, Math.floor(u * n))
    u = ((hash32(p.seed, cycle, k) % n) + (u * n - k)) / n
  }
  if (p.scatter > 0) {
    const k = Math.min(n - 1, Math.floor(u * n))
    if (hash32(p.seed ^ 0x51ced, cycle, k) / 4294967296 < p.scatter) u = (shuffleAt(p.seed, cycle, n)[k] + (u * n - k)) / n
  }
  if (p.start === 0 && p.end === 1) return u
  return p.start + u * (p.end - p.start)
}
/** delay for an x already through the playhead (same as warpDelay with the skew applied by playPosition). */
function warpDelayX(lut, x, amount, L) {
  const d = amount * lutAt(lut, x) * L
  return d > 0 ? (d < MAX_DELAY_SECONDS ? d : MAX_DELAY_SECONDS) : 0
}
```
In the processor: `this.play = { direction: 'fwd', start: 0, end: 1, scatter: 0, skew: 0, slices: 16, seed: 0 }` in the constructor; add
```js
  posAt(t) {
    while (this.segs.length > 1 && this.segs[1].at <= t) this.segs.shift()
    const s = this.segs[0]
    return (t - s.t0) / loopSeconds(s.lengthBeats, s.bpm)
  }
```
and rewrite `phaseAt(t)` as `{ const v = this.posAt(t); return v - Math.floor(v) }`. In `onParams`: 
```js
    const q = m.play
    if (q && typeof q === 'object') {
      const pl = this.play
      if (['fwd', 'rev', 'pingpong', 'random'].includes(q.direction)) pl.direction = q.direction
      for (const k of ['start', 'end', 'scatter', 'skew']) if (typeof q[k] === 'number' && Number.isFinite(q[k])) pl[k] = q[k]
      if (typeof q.slices === 'number' && q.slices >= 1 && q.slices <= 64) pl.slices = Math.round(q.slices)
      if (typeof q.seed === 'number') pl.seed = q.seed >>> 0
      pl.start = clamp01(pl.start); pl.end = clamp01(pl.end); pl.scatter = clamp01(pl.scatter)
      if (pl.end - pl.start < 1 / 64) { pl.start = 0; pl.end = 1 }
    }
```
(`clamp01` is defined above the processor; move the playhead section after it.) In `process()`: replace `const phase = this.phaseAt(t)` and the delay line with
```js
      const pos = this.posAt(t)
      const phase = pos - Math.floor(pos)
      …
      const x = playPosition(pos, this.play)
      if (doWarp) P = n - warpDelayX(this.lut, x, p.amount, L) * sr
      …
      if (p.probe && out[1]) out[1][i] = x
```
`p.skew` is no longer used for the delay (it travels in `play.skew`); keep accepting it in params for compatibility. Update the header comment: params gain `play`, probe channel 1 carries x (the read position on the line).

`audioWarp.ts` `warpParamsMessage`: add `play: warpPlay(s)` (import from `../playhead`); `sameParams` also compares `a.direction === b.direction && a.loopStart === b.loopStart && a.loopEnd === b.loopEnd && a.scatter === b.scatter && a.snap === b.snap` (snap now sets the slice count).

`WarpCompositor.ts`:
- `WarpVideoOptions` gains `play: PlayParams` (default in the `opts` literal: `{ direction: 'fwd', start: 0, end: 1, scatter: 0, skew: 0, slices: 16, seed: 0 }`).
- `render(pos: number, delaySec: number)`: `const ph = Number.isFinite(pos) ? pos - Math.floor(pos) : 0` for the existing uses of `ph` (Filter Spam slices stay on time phase); jump detection uses `pos`.
- Replace `prevPhase` with `prevPos`; `delayAt(pos)` becomes `delayAtX(o.lut, playPosition(pos, o.play), o.amount, o.loopSeconds)`; `detectJump(pos, delay, now)`:
```ts
    let dpos = pos - this.prevPos
    if (!(dpos >= 0) || dpos > MAX_WALK_PHASE) return true
    const cells = Math.max(1, Math.ceil(dpos * LUT_SIZE))
    …walk this.prevPos + (dpos * i) / cells…
```
  A clock re-anchor (pos going backwards) counts as a jump, as before.
- Update the class comment ("render(pos, delay): pos is the absolute loop position").

`Canvas.tsx` `runWarp`: `const pos = getHeardWarpPosition()`; `warpOpts.play = warpPlay(w)` (allocates one small object per frame; acceptable, or keep one object and assign its fields: prefer assigning fields of a reused `playOpts` object to keep the loop allocation-free); `delay = delayAtX(w.lut, playPosition(pos, playOpts), w.amount, loop)`; `comp.render(pos, delay)`. Remove `delayArgs`.

`useContinuousModulation.ts:749`: `warpValue = warpModValueAt(w.lut, playPosition(getHeardWarpPosition(), warpPlay(w)), w.amount)`.

`WarpGraph.tsx`:
- Playhead: `const xs = playPosition(getHeardWarpPosition(), warpPlay(s))` (the waveform bar index uses the same `xs`, unchanged otherwise).
- Thumbnails: per column, the time the last completed pass read it:
```ts
        const pos0 = getWarpPosition(now)
        const passStart = Math.floor(pos0) - 1 // the last completed pass, in loops
        const play = warpPlay(s)
        times.fill(NaN); readAt.fill(NaN)
        const STEPS = THUMBS * 16
        for (let k = 0; k < STEPS; k++) {
          const pos = passStart + (k + 0.5) / STEPS
          const x = playPosition(pos, play)
          const col = Math.min(THUMBS - 1, Math.floor(x * THUMBS))
          readAt[col] = now - (pos0 - pos) * L - delayAtX(s.lut, x, s.amount, L)
        }
        for (let i = 0; i < THUMBS; i++) {
          const t = readAt[i]
          if (Number.isNaN(t)) { times[i] = NaN; src[i] = -1; continue }
          const ft = comp.frameTimeAt(t)
          …existing dedupe and getThumbnailAt(t, cells[i])…
        }
```
  with `const readAt = new Float64Array(THUMBS)` next to `times`. A column the pass never read keeps the surface fill (`times[i]` NaN).

- [ ] **Step 4: Run `playmath`, `warpplay`, `warpmath`, `warpaudio`, `warpvideo`, `warpfinal`, `warpmod`, `warpplace`, `warpui`; expect PASS.** `warpaudio`/`warpfinal` probes read channel 1: with plain settings x equals the skewed phase, and those modes run at skew 0, so x equals the phase they expect. If a mode compares the probe to `getHeardWarpPhase`, it still holds at skew 0.
- [ ] **Step 5: Commit** `feat: warp plays through the playhead on picture and sound`.

---

### Task 5: Direction and Scatter fields

**Files:**
- Modify: `src/components/performance/warp/WarpSettingsRow.tsx`, `src/components/sequencer/LinesView.tsx:290-305`
- Test: harness mode `playui` (new; extended in Task 6)

**Interfaces:**
- Consumes: `PLAY_DIRECTIONS`, `PLAY_DIRECTION_NAMES` (Task 1), `Spin` (existing), store patchers.
- Produces: `[data-warp-setting="direction"]`, `[data-warp-setting="scatter"]`, `[data-line-setting="direction"]`, `[data-line-setting="scatter"]`.

- [ ] **Step 1: Failing test.**
```js
if (MODE === 'playui') {
  await open(1440, 900)
  const ws = (expr) => evr(async (expr) => { const s = (await import('/src/stores/warpStore.ts')).useWarpStore.getState(); return eval(expr) }, expr)
  await ws('(s.applySnapshot(undefined), 0)')
  await p.click('[data-bottom-tab-btn="warp"]'); await wait(500)
  const key = async (sel, k, n = 1) => { await p.focus(sel); for (let i = 0; i < n; i++) await p.keyboard.press(k); await wait(80) }
  await key('[data-warp-setting="direction"]', 'ArrowUp')
  say('warp: Direction steps Fwd -> Rev', (await ws('s.direction')) === 'rev' && (await p.$eval('[data-warp-setting="direction"]', (e) => e.textContent)).includes('Rev'))
  await key('[data-warp-setting="direction"]', 'ArrowUp', 3)
  say('warp: Direction stops at Random', (await ws('s.direction')) === 'random')
  await key('[data-warp-setting="scatter"]', 'ArrowUp', 25)
  say('warp: Scatter 25%', Math.abs((await ws('s.scatter')) - 0.25) < 1e-9 && (await p.$eval('[data-warp-setting="scatter"]', (e) => e.textContent)).includes('25%'))
  const fits = await p.$eval('.seg-warp-settings', (el) => el.scrollWidth <= el.clientWidth + 1)
  say('warp: settings row fits at 1440', fits)
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(400)
  await p.click('[data-seq-view="lines"]').catch(() => {}); await wait(500)
  await key('[data-line-setting="direction"]', 'ArrowUp', 2)
  const ml = await evr(async () => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().master.line)
  say('lines (master tab): Direction Ping-pong', ml.direction === 'pingpong', ml.direction)
  await key('[data-line-setting="scatter"]', 'ArrowUp', 10)
  say('lines: Scatter 10%', Math.abs((await evr(async () => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().master.line.scatter)) - 0.1) < 1e-9)
  for (const [w, h] of [[1100, 800], [1440, 900], [2560, 1080]]) {
    await p.setViewport({ width: w, height: h }); await wait(400)
    const f = await p.$eval('.seg-lines-settings', (el) => el.scrollWidth <= el.clientWidth + 1)
    say(`lines: settings row fits at ${w}`, f)
  }
  await p.screenshot({ path: '.superpowers/sdd/shots/playui-lines.png' })
}
```
(Check the Lines view switch selector in `lineseditor` mode and use the same one.)

- [ ] **Step 2: Run, expect FAIL** (no direction field).

- [ ] **Step 3: Implement.** In `WarpSettingsRow.tsx`:
```ts
const stepDirection = (dir: number) => {
  const i = clamp(PLAY_DIRECTIONS.indexOf(useWarpStore.getState().direction) + dir, 0, PLAY_DIRECTIONS.length - 1)
  patch({ direction: PLAY_DIRECTIONS[i] })
}
const stepScatter = (dir: number, big: boolean) => {
  const v = Math.round(useWarpStore.getState().scatter * 100) + dir * (big ? 10 : 1)
  patch({ scatter: clamp(v, 0, 100) / 100 })
}
const DIRECTION_STATUS = 'Direction: Fwd plays the line left to right, Rev right to left, Ping-pong alternates each pass, Random plays a random slice at each grid step. Drag or use the arrow keys'
const SCATTER_STATUS = 'Scatter: shuffles the loop\'s slices (one per Quantize step) each pass. 0% plays in order, 100% fully shuffled. Drag or use the arrow keys'
```
and in the row, after the Skew Spin (not covered by a lock group, so no `locked`):
```tsx
      <Spin id="direction" label="Direction" value={PLAY_DIRECTION_NAMES[direction]} now={PLAY_DIRECTIONS.indexOf(direction)} min={0} max={PLAY_DIRECTIONS.length - 1}
        step={stepDirection} pxPerStep={14} status={DIRECTION_STATUS} />
      <Spin id="scatter" label="Scatter" value={`${scatter}%`} now={scatter} min={0} max={100} step={stepScatter} pxPerStep={2} status={SCATTER_STATUS} />
```
with `const direction = useWarpStore((s) => s.direction)` and `const scatter = Math.round(useWarpStore((s) => s.scatter) * 100)`. Update the component comment to list the two fields.

In `LinesView.tsx` the same two Spins with `attr="line-setting"`, stepping through `writeLine(tab, { direction })` / `writeLine(tab, { scatter })` (the view's existing write helper; follow how `stepSkew` is written there), after the Skew Spin. Same status strings, with "the line" wording for Scatter: "Scatter: shuffles the line's slices (one per Quantize step) each pass. 0% plays in order, 100% fully shuffled. Drag or use the arrow keys".

If the Lines row overflows at 1100 px, reduce `.seg-lines-settings > [data-line-setting]` padding (CSS) rather than dropping a field; label text may shorten to "Dir" only if it still overflows (status hover keeps the full name).

- [ ] **Step 4: Run `playui`, `warpui`, `warpdice`, `lineseditor`; expect PASS.**
- [ ] **Step 5: Commit** `feat: Direction and Scatter fields in the Warp and Lines bars`.

---

### Task 6: Loop region handles and dimming

**Files:**
- Create: `src/components/performance/lines/LoopStrip.tsx`
- Modify: `src/components/performance/warp/WarpGraph.tsx`, `src/components/sequencer/LinesView.tsx`, `src/components/performance/layout.css`
- Test: harness `playui` (appended)

**Interfaces:**
- Consumes: `PAD` from `LinePlot.tsx`; `MIN_REGION` (Task 1); store fields (Task 2).
- Produces: `LoopStrip({ start, end, snap, width, attr: 'warp' | 'line', onChange(start, end) })`; handles `[data-warp-loop="start|end"]` / `[data-line-loop="start|end"]`; dim rects `[data-warp-loop-dim]` / `[data-line-loop-dim]` in the plot's `backChildren`.

- [ ] **Step 1: Failing test** (append to `playui`, back at 1440×900 on the Warp tab):
```js
  await p.setViewport({ width: 1440, height: 900 }); await wait(300)
  await p.click('[data-bottom-tab-btn="warp"]'); await wait(500)
  await ws("(s.patch({ snap: 1 / 16, loopStart: 0, loopEnd: 1 }), 0)"); await wait(200)
  const strip = await p.$eval('[data-warp-loop-strip]', (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width } })
  const iw = strip.w - 12 // PAD 6 each side
  const drag = async (sel, toX, alt = false) => {
    const b = await p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    if (alt) await p.keyboard.down('Alt')
    await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(toX, b.y, { steps: 6 }); await p.mouse.up()
    if (alt) await p.keyboard.up('Alt')
    await wait(150)
  }
  await drag('[data-warp-loop="start"]', strip.x + 6 + 0.26 * iw)
  say('start handle snaps to 1/16 (0.25)', Math.abs((await ws('s.loopStart')) - 0.25) < 1e-9, await ws('s.loopStart'))
  await drag('[data-warp-loop="end"]', strip.x + 6 + 0.613 * iw, true)
  const e1 = await ws('s.loopEnd')
  say('Alt drags the end handle freely', Math.abs(e1 - 0.613) < 0.01 && Math.abs(e1 * 16 - Math.round(e1 * 16)) > 1e-6, e1)
  await drag('[data-warp-loop="end"]', strip.x + 6 + 0.1 * iw)
  say('end cannot cross start (min one slice)', Math.abs((await ws('s.loopEnd')) - 0.3125) < 1e-9, await ws('s.loopEnd'))
  const dims = await p.$$eval('[data-warp-loop-dim]', (els) => els.length)
  say('outside the region is dimmed (2 rects)', dims === 2)
  await p.screenshot({ path: '.superpowers/sdd/shots/playui-warp-loop.png' })
  const sb = await p.$eval('[data-warp-loop="start"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await p.mouse.click(sb.x, sb.y, { clickCount: 2 }); await wait(150)
  say('double-click resets start to 0', (await ws('s.loopStart')) === 0)
  await ws("(s.patch({ snap: 0, loopStart: 0.5, loopEnd: 0.5 + 1 / 64, scatter: 1 }), 0)")
  say('minimum region with Quantize Off is kept', Math.abs((await ws('s.loopEnd')) - (0.5 + 1 / 64)) < 1e-9)
  // the Lines editor has the same strip
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(400)
  say('lines: loop strip present', !!(await p.$('[data-line-loop-strip] [data-line-loop="start"]')))
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement `LoopStrip.tsx`.**
```tsx
import { memo, useRef } from 'react'
import { MIN_REGION } from '../../../effects/playhead'
import { statusHover } from '../../../hooks/useStatusHover'
import { PAD } from './LinePlot'

const STATUS = 'Loop: drag a handle to set where the loop starts or ends. It snaps to Quantize; Alt drags freely. Double-click a handle to reset it'

interface LoopStripProps {
  start: number
  end: number
  snap: number // 0 = Quantize Off (handles snap to 1/16)
  width: number
  attr: 'warp' | 'line'
  onChange: (start: number, end: number) => void
}

/** The Start/End handles above a line plot (playback spec §4). x maps like the plot: PAD + x · inner width. */
export const LoopStrip = memo(function LoopStrip({ start, end, snap, width, attr, onChange }: LoopStripProps) {
  const ref = useRef<HTMLDivElement>(null)
  const iw = Math.max(1, width - 2 * PAD)
  const grid = snap > 0 ? snap : 1 / 16
  const dragHandle = (which: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      let x = (ev.clientX - r.left - PAD) / iw
      x = Math.max(0, Math.min(1, x))
      const min = ev.altKey ? MIN_REGION : Math.max(MIN_REGION, grid)
      if (!ev.altKey) x = Math.round(x / grid) * grid
      if (which === 'start') onChange(Math.min(x, end - min), end)
      else onChange(start, Math.max(x, start + min))
    }
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  const reset = (which: 'start' | 'end') => () => (which === 'start' ? onChange(0, end) : onChange(start, 1))
  const da = (k: string, v?: string) => ({ [`data-${attr}-loop${k}`]: v ?? '' })
  return (
    <div ref={ref} className="seg-loop-strip" style={{ width }} {...da('-strip')} aria-label="Loop region">
      <div className="seg-loop-range" style={{ left: PAD + start * iw, width: (end - start) * iw }} />
      {(['start', 'end'] as const).map((w) => (
        <div key={w} className="seg-loop-handle" role="slider" tabIndex={-1} aria-label={w === 'start' ? 'Loop start' : 'Loop end'}
          aria-valuemin={0} aria-valuemax={1} aria-valuenow={w === 'start' ? start : end} data-edge={w}
          style={{ left: PAD + (w === 'start' ? start : end) * iw }}
          {...da('', w)} onPointerDown={dragHandle(w)} onDoubleClick={reset(w)} {...statusHover(STATUS)} />
      ))}
    </div>
  )
})
```
(Check the `statusHover` import path used by `WarpSidePanel.tsx` and use the same.)

CSS (`layout.css`, near the warp graph rules):
```css
.seg-loop-strip { position: relative; flex: none; height: 12px; }
.seg-loop-range { position: absolute; top: 5px; height: 2px; background: var(--warp); opacity: .55; pointer-events: none; }
.seg-loop-handle { position: absolute; top: 0; width: 10px; height: 12px; margin-left: -5px; cursor: ew-resize; }
.seg-loop-handle::before { content: ''; position: absolute; left: 4px; top: 0; width: 2px; height: 12px; background: var(--warp); }
.seg-loop-handle[data-edge="start"]::after, .seg-loop-handle[data-edge="end"]::after { content: ''; position: absolute; top: 0; width: 5px; height: 5px; background: var(--warp); }
.seg-loop-handle[data-edge="start"]::after { left: 6px; }
.seg-loop-handle[data-edge="end"]::after { left: -1px; }
.seg-loop-handle:hover::before { width: 3px; }
```

Dimming: in each editor's `backChildren` (Warp: WarpGraph passes them to LinePlot; Lines: LinesView), add
```tsx
{loopStart > 0 && <rect {...{ [`data-${attr}-loop-dim`]: '' }} x={0} y={0} width={PAD + loopStart * iw} height={gh} style={{ fill: 'var(--bg-void)', fillOpacity: 0.55 }} pointerEvents="none" />}
{loopEnd < 1 && <rect {...{ [`data-${attr}-loop-dim`]: '' }} x={PAD + loopEnd * iw} y={0} width={w - (PAD + loopEnd * iw)} height={gh} style={{ fill: 'var(--bg-void)', fillOpacity: 0.55 }} pointerEvents="none" />}
```
(The test counts 2 rects with both edges moved; with start 0 or end 1 the matching rect is absent.)

Placement: render `<LoopStrip>` directly above the plot inside `.seg-warp-graph` (Warp) and above the Lines plot in `LinesView`, and subtract 12 px from the height each passes to `LinePlot` (`gh`), so the panel keeps its size. Warp: `onChange={(a, b) => useWarpStore.getState().patch({ loopStart: a, loopEnd: b })}`; Lines: `onChange={(a, b) => writeLine(tab, { loopStart: a, loopEnd: b })}`.

- [ ] **Step 4: Run `playui`, `warpui`, `warpdice`, `warpcard`, `lineseditor`, `lineshortcuts`; expect PASS.** Fix any old-mode assertion that measured the plot height by subtracting 12.
- [ ] **Step 5: Commit** `feat: loop Start/End handles on the Warp and Lines graphs`.

---

### Task 7: Lines behaviour check, docs, final regression

**Files:**
- Modify: `CLAUDE.md` (Time warp: Time model, Saved as, Dice; Line tracks: Model, Clock, Editor)
- Test: harness `playui` (engine checks appended), then every warp/lines mode

- [ ] **Step 1: Failing test** (append to `playui`): play the sequencer with one Line track whose line is a ramp (`[{x:0,y:0},{x:1,y:1}]`, amount 1, beats 4), set `loopStart 0.5, loopEnd 1`, then read `getLineHead(id)` for 2 s of frames: every head x ≥ 0.5; set `direction: 'rev'` and check consecutive head values (within one pass) decrease; set `scatter: 1` and check the heads visit at least 10 of 16 slices in one pass; stop and check `getLineHead` is null. Use `useEffectSequencerStore.getState().setTrackLine(id, …)`, the transport play/stop the `lines2engine` mode uses, and `toggleEffect('rgb_split')` + `setTrackMode`/mode `'line'` the same way `lines2engine` does.

- [ ] **Step 2: Run, expect FAIL until Task 3's head positions are wired (should pass already if Tasks 3-6 are done; if it passes first time, still keep it as the regression check).**

- [ ] **Step 3: Docs.** In `CLAUDE.md` add to the Time warp section after **Time model**:
  `- **Playback** (\`src/effects/playhead.ts\`, playback spec): Direction (Fwd, Rev, Ping-pong = alternate passes, Random = a random slice per grid step), loop Start/End (handles above the graph, snap to Quantize, Alt free, double-click resets; the region is stretched over the whole Length) and Scatter (shuffles the region's slices, one per Quantize step, 16 when Off, new order each pass). \`playPosition(loopPos, play)\` maps the clock's absolute position to the line's x; the worklet carries a port (KEEP IN SYNC, checked by harness \`playmath\`), and randomness is a hash of (seed, pass, slice) so picture and sound agree. Rev on a held line plays reversed at double speed. Dice never changes these.`
  Add `direction, loop region, scatter` to the **Saved as** list. In Line tracks **Model** add the four fields; in **Clock** replace the phase sentence with "Each line's position is beats / line.beats; \`playPosition\` (with the line's direction, region, scatter, skew and a per-track seed) gives the x the level is read at. \`getLinePos\`, \`getLineHead\` (x), \`getMasterPos\`, \`getMasterHead\`; null when stopped."; in **Editor** mention the bar's Direction and Scatter and the loop strip; in the Alt-drag copy list add direction, loop region and scatter.

- [ ] **Step 4: Full regression.** Run `playmath`, `warpplay`, `playui`, `warpmath`, `warpaudio`, `warpvideo`, `warpui`, `warpcard`, `warpdice`, `warpmod`, `warpfinal`, `warpplace`, `linesengine`, `lines2engine`, `lineseditor`, `lineshortcuts`, `devices`, `labels`, `tokens2`; `npm run build`; lint count not above 268. Copy the `playui` screenshots to the progress page (`scratchpad/mock/playback.html`).

- [ ] **Step 5: Commit** `docs: playback direction, loop region and scatter` (plus any harness-driven fixes in their own commits).
