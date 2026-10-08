# Line Tracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any effect-sequencer track can switch from Steps to **Line**. In Line mode a line drawn over the track's loop drives that effect's Dry/wet, using the same editor and tools as the time warp.

**Architecture:**
- **Data.** `EffectTrack` gains a `line` (points, snap, skew) and a `'line'` mode.
- **Playback.** `useEffectSequencerPlayback` computes each Line track's phase every frame from the per-track step timer. It writes `effectMix = ceiling × level` through `mixModulation.ts`, so the line combines with continuous modulation the way gates do.
- **Editor.** The warp graph's point-editing core is extracted into a generic `LinePlot`, used by both `WarpGraph` and the new `LineLane`. The Lines menu, Save line and the spinbutton are generalised in the same way.

**Tech Stack:** React 19, TypeScript, zustand 5, Vite 7. Verification uses the puppeteer harness in `.superpowers/sdd/layout-check.mjs`; the repo has no unit-test runner.

**Spec:** `docs/superpowers/specs/2026-10-08-line-tracks-design.md`. Mockup: `docs/superpowers/specs/assets/2026-10-08-line-tracks/lines.png`.

## Global Constraints

- **Point convention.** Points use the warp's format (`WarpPoint { x, y, bend? }`): x is the phase from 0 to 1; y = 0 is drawn at the top, y = 1 at the bottom. The level is `1 − y`.
- **Default line** is `{ points: [{x:0,y:0},{x:1,y:0}], snap: 1/16, skew: 0 }`. Switching a track to Line must leave `effectMix` equal to the ceiling exactly.
- **Mix formula:** `mix = gateOpenLevel(effectId, base) × level(p)`. Skip the write when it is within 1e-4 of the stored value.
- **Phase formula:** `((trackStep + clamp01(elapsed / trackMsPerStep)) mod length) / length`.
- **Audio and MIDI gates win.** If the audio gate, audio-reactive stepping or the MIDI gate is on, the line writes nothing, and the lane shows "Audio gate controls Dry/wet" or "MIDI gate controls Dry/wet".
- **Step data is ignored in Line mode:** p-locks, retrigs, probability, Fill and Swing. Steps are kept in the store.
- **localStorage.** Locks go in `seg.lines.locks` as `{ [effectId]: true }`. Saved lines stay in `seg.warp.lines`, shared with the warp. Every storage access is wrapped in try/catch.
- **Not saved:** lines are not stored in banks or presets.
- **Harness rules:**
  - Run with `PATH=/opt/homebrew/bin:$PATH`.
  - Kill and restart Vite on :5173 before each harness run.
  - Never run `git stash`.
  - Leave Vite running when done.
- **Copy rules** for user-visible text: no em dashes and no short codes; full effect names come from `getEffectInfo(id).name`.
- **Commit trailers.** Every commit ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ
  ```

## Review Focus

1. **Line → Steps → Line on a playing track.** The mix must never stick at 0 or at a scaled value: after each switch it returns to the base, or follows the line again. The test is in Task 1, check 7.
2. **Removing an effect from the chain while its Line track plays.** There must be no page errors, and the removed effect's mix and line state must be released. The test is in Task 1, check 8.
3. **Arrow keys or Delete in a focused lane.** They must not also change the Sequencer step page or the selected step; the Sequencer's window keydown listener must not see them. The test is in Task 3, check 6.
4. **A track at time scale 2× or ½×.** The line's phase must follow the track's own speed. The test is in Task 1, check 4.
5. **Saving a line under a lane preset's name** (for example "Swell") must be refused, in the warp and in the Sequencer. The test is in Task 4, check 5.

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/effects/lines/lineLevel.ts` (new) | `lineLut`, `lineLevel`: points, phase and skew to a level from 0 to 1 | 1 |
| `src/effects/lines/linePhase.ts` (new) | Module map of each Line track's phase while playing, plus a dev counter of line passes | 1 |
| `src/effects/lines/lanePresets.ts` (new) | `LANE_PRESETS`, `LANE_PRESET_NAMES`, `lanePresetPoints(name, snap)` | 1 |
| `src/effects/mixModulation.ts` | `setLineLevel`, `releaseLine`, `clearLines`, `isLineActive`; `noteModulatedMix` scales by the line | 1 |
| `src/stores/effectSequencerStore.ts` | `TrackLine`, `mode: 'line'`, `line` on every track, `setTrackLine` | 1 |
| `src/hooks/useEffectSequencerPlayback.ts` | The line pass; Line mode skips step execution and retrigs | 1 |
| `src/components/performance/lines/LinePlot.tsx` (new) | Generic line editor: grid, line, points, bends, tools, pointer editing | 2 |
| `src/components/performance/lines/lineKeys.ts` (new) | `handleLineKey`: the editor keys ([ ], Delete, arrows, Escape) | 2 |
| `src/components/performance/warp/WarpGraph.tsx` | Becomes `LinePlot` plus the warp layers | 2 |
| `src/components/performance/warp/WarpEditor.tsx` | Uses `handleLineKey` | 2 |
| `src/components/sequencer/LineLane.tsx` (new) | A Line track's lane: mini or selected, playhead, owner note | 3 |
| `src/components/sequencer/EffectTrackRow.tsx` | Steps / Line switch, lane in place of the cells, header info | 3 |
| `src/components/sequencer/lineSelection.ts` (new) | Small zustand store: the selected lane's tool and selected point | 3 |
| `src/components/sequencer/LineToolbar.tsx` (new) | Line tools for the selected Line track | 4 |
| `src/components/sequencer/lineLocks.ts` (new) | Lock store, `seg.lines.locks` | 4 |
| `src/components/performance/warp/WarpLineTools.tsx` | Generic `LinesMenu` and `SaveLine`; the warp wrappers keep their behaviour | 4 |
| `src/components/performance/warp/warpLines.ts` | `isBuiltInName` also covers the lane presets | 4 |
| `src/components/performance/warp/WarpSettingsRow.tsx` | Exports `Spin` with a configurable data attribute | 4 |
| `src/components/sequencer/SequencerTransport.tsx` | Shows `LineToolbar` instead of the step tools when the selected track is a Line track | 4 |
| `src/components/performance/layout.css` | Lane and toolbar styles | 3, 4 |
| `CLAUDE.md` | A "Line tracks" section | 4 |
| `.superpowers/sdd/layout-check.mjs` | Modes `linesengine`, `linesui`, `linestools` | 1, 3, 4 |

---

### Task 1: Line model, presets and playback engine

**Files:**
- Create: `src/effects/lines/lineLevel.ts`, `src/effects/lines/linePhase.ts`, `src/effects/lines/lanePresets.ts`
- Modify: `src/effects/mixModulation.ts`, `src/stores/effectSequencerStore.ts`, `src/hooks/useEffectSequencerPlayback.ts`
- Test: `.superpowers/sdd/layout-check.mjs`, new mode `linesengine`

**Interfaces:**
- Consumes: from `src/effects/warp/warpMath.ts`: `WarpPoint`, `buildLut`, `skewPhase`, `cleanPoints`, `normalizePoints`, `randomSteps`. From `src/stores/warpStore.ts`: `SNAPS`.
- Produces:
  - `lineLevel.ts`:
    - `lineLut(points: WarpPoint[]): Float32Array`
    - `lineLevel(points: WarpPoint[], phase: number, skew: number): number`, from 0 to 1.
  - `linePhase.ts`:
    - `getLinePhase(id: string): number | null`
    - `setLinePhase(id: string, p: number): void`
    - `deleteLinePhase(id: string): void`
    - `clearLinePhases(): void`
    - `noteLinePass(): void`
    - `getLinePassCount(): number`
  - `lanePresets.ts`:
    - `LANE_PRESET_NAMES: readonly string[]`
    - `lanePresetPoints(name: string, snap: number): WarpPoint[] | null`
  - `mixModulation.ts`:
    - `setLineLevel(id: string, level: number): void`
    - `releaseLine(id: string): void`
    - `clearLines(): void`
    - `isLineActive(id: string): boolean`
  - `effectSequencerStore.ts`:
    - `interface TrackLine { points: WarpPoint[]; snap: number; skew: number }`
    - `defaultTrackLine(): TrackLine`
    - `EffectTrack.mode: 'gate' | 'param' | 'line'`
    - `EffectTrack.line: TrackLine`
    - `setTrackMode(effectId: string, mode: 'gate' | 'param' | 'line'): void`
    - `setTrackLine(effectId: string, patch: Partial<TrackLine>): void`

- [ ] **Step 1: Write the failing harness mode `linesengine`.**

  Add it to `.superpowers/sdd/layout-check.mjs` just above the `// (later tasks add modes here)` line:

```js
if (MODE === 'linesengine') {
  // Line tracks Task 1: the model, presets and the playback line pass (spec §1–§3)
  await open(1440, 900)
  await populate()
  const sq = (expr, a) => evr(async ([expr, a]) => {
    const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const G = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore
    const M = await import('/src/effects/mixModulation.ts')
    const P = await import('/src/effects/lines/linePhase.ts')
    const L = await import('/src/effects/lines/lineLevel.ts')
    const R = await import('/src/effects/lines/lanePresets.ts')
    const T = await import('/src/utils/sequencerTransport.ts')
    const Q = (await import('/src/stores/sequencerStore.ts')).useSequencerStore
    const W = (await import('/src/stores/warpStore.ts')).useWarpStore
    return eval(expr)
  }, [expr, a])
  // the first two chain effects that have tracks and are enabled
  const ids = await evr(async () => {
    const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState()
    const R = (await import('/src/config/effectParams.ts')).EFFECT_PARAM_REGISTRY
    const order = (await import('/src/stores/routingStore.ts')).useRoutingStore.getState().effectOrder
    return order.filter((id) => S.tracks[id] && R[id]?.getEnabled()).slice(0, 2)
  })
  say('0 two enabled tracks to test with', ids.length === 2, ids.join(','))
  const [A, B] = ids
  await sq('(S.getState().setBpm(120), S.getState().setResolution("1/16"), 0)')
  await sq(`(S.getState().setTrackLength(a, 16), 0)`, A)
  await sq(`(G.getState().setEffectMix(a, 0.8), 0)`, A)

  // 10. no Line tracks: the line pass does no work while playing
  const c0 = await sq('P.getLinePassCount()')
  await sq('(T.linkedPlay(), 0)'); await wait(600)
  const c1 = await sq('P.getLinePassCount()')
  await sq('(T.linkedStop(), 0)'); await wait(200)
  say('10 no Line tracks: the line pass count stays the same', c1 === c0, `${c0} -> ${c1}`)

  // 1. neutral: the default line leaves the mix at the base
  const stepsBefore = await sq('JSON.stringify(S.getState().tracks[a].steps)', A)
  await sq('(S.getState().setTrackMode(a, "line"), 0)', A)
  say('1 a new track carries the default line', await sq('JSON.stringify(S.getState().tracks[a].line)', A) === JSON.stringify({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0 }))
  await sq('(T.linkedPlay(), 0)'); await wait(700)
  const neutral = await sq('[G.getState().effectMix[a], P.getLinePhase(a), M.isLineActive(a)]', A)
  say('1 default line: mix equals the base while playing', Math.abs(neutral[0] - 0.8) < 1e-4 && neutral[1] !== null && neutral[2] === true, JSON.stringify(neutral))

  // 2. Ramp up follows base × level at several phases
  await sq('(S.getState().setTrackLine(a, { points: R.lanePresetPoints("Ramp up", 1/16) }), 0)', A)
  let rampOk = 0
  for (let i = 0; i < 6; i++) {
    await wait(170)
    const [mix, ph, lvl] = await sq('[G.getState().effectMix[a], P.getLinePhase(a), L.lineLevel(S.getState().tracks[a].line.points, P.getLinePhase(a), 0)]', A)
    if (ph !== null && Math.abs(mix - 0.8 * lvl) < 0.05 && Math.abs(lvl - ph) < 0.02) rampOk++
    else console.log('   ramp sample', mix, ph, lvl)
  }
  say(`2 Ramp up: mix follows 0.8 × level (${rampOk}/6)`, rampOk >= 5)

  // 3. Half on: the base in the first half, 0 in the second
  await sq('(S.getState().setTrackLine(a, { points: R.lanePresetPoints("Half on", 1/16) }), 0)', A)
  let first = 0, second = 0, n1 = 0, n2 = 0
  for (let i = 0; i < 12; i++) {
    await wait(110)
    const [mix, ph] = await sq('[G.getState().effectMix[a], P.getLinePhase(a)]', A)
    if (ph < 0.47) { n1++; if (Math.abs(mix - 0.8) < 1e-3) first++ } else if (ph > 0.53) { n2++; if (mix < 1e-3) second++ }
  }
  say('3 Half on: full in the first half, dry in the second', n1 > 0 && n2 > 0 && first === n1 && second === n2, `${first}/${n1} ${second}/${n2}`)

  // 4. time scale 2×: the phase runs twice as fast as a 1× track of the same length
  await sq('(S.getState().setTrackMode(b, "line"), S.getState().setTrackLength(b, 16), S.getState().setTrackTimeScale(b, 2), 0)', B)
  const span = async (id) => { const t0 = await sq('P.getLinePhase(a)', id); await wait(400); const t1 = await sq('P.getLinePhase(a)', id); return (t1 - t0 + 1) % 1 }
  const sA = await span(A), sB = await span(B)
  say('4 a 2× track advances about twice as fast', Math.abs(sB / sA - 2) < 0.35, `${sA.toFixed(3)} vs ${sB.toFixed(3)}`)
  await sq('(S.getState().setTrackTimeScale(b, 1), S.getState().setTrackMode(b, "gate"), 0)', B)

  // 5. a Warp route on the same Dry/wet sets the ceiling: mix = modulated × level
  await sq('(S.getState().setTrackLine(a, { points: [{x:0,y:0},{x:1,y:0}] }), 0)', A)
  await sq('(W.getState().patch({ points: [{x:0,y:0.5},{x:1,y:0.5}], amount: 1, skew: 0 }), Q.getState().addRouting("warp", a + ".effectMix", 1), 0)', A)
  await wait(500)
  const routed = await sq('G.getState().effectMix[a]', A)
  await sq('(S.getState().setTrackLine(a, { points: R.lanePresetPoints("Half on", 1/16) }), 0)', A)
  let rOk = 0, rN = 0
  for (let i = 0; i < 10; i++) { await wait(110); const [mix, ph] = await sq('[G.getState().effectMix[a], P.getLinePhase(a)]', A); if (ph < 0.47) { rN++; if (Math.abs(mix - 0.5) < 0.02) rOk++ } else if (ph > 0.53) { rN++; if (mix < 0.02) rOk++ } }
  say('5 with a Warp route at 0.5 the ceiling is 0.5', Math.abs(routed - 0.5) < 0.02 && rOk === rN && rN > 0, `${routed} ${rOk}/${rN}`)
  await sq('(Q.getState().routings.filter((r) => r.targetParam === a + ".effectMix").forEach((r) => Q.getState().removeRouting(r.id)), 0)', A)

  // 6. an audio gate takes the mix: the line lets go
  await sq('(S.getState().setTrackAudioGate(a, true), 0)', A); await wait(300)
  say('6 audio gate on: the line is not active', (await sq('M.isLineActive(a)', A)) === false)
  await sq('(S.getState().setTrackAudioGate(a, false), 0)', A); await wait(300)
  say('6 audio gate off: the line is active again', (await sq('M.isLineActive(a)', A)) === true)

  // 7. Line → Steps → Line while playing, then Stop restores the user's mix and the steps are unchanged
  await sq('(S.getState().setTrackMode(a, "gate"), 0)', A); await wait(300)
  const afterSteps = await sq('[M.isLineActive(a), P.getLinePhase(a)]', A)
  say('7 back to Steps: the line released its hold', afterSteps[0] === false && afterSteps[1] === null, JSON.stringify(afterSteps))
  await sq('(S.getState().setTrackMode(a, "line"), 0)', A); await wait(400)
  say('7 Line again: active', (await sq('M.isLineActive(a)', A)) === true)
  await sq('(T.linkedStop(), 0)'); await wait(300)
  const stopped = await sq('[G.getState().effectMix[a], M.isLineActive(a), P.getLinePhase(a)]', A)
  say('7 Stop restores 0.8 and clears the line state', Math.abs(stopped[0] - 0.8) < 1e-4 && stopped[1] === false && stopped[2] === null, JSON.stringify(stopped))
  await sq('(S.getState().setTrackMode(a, "gate"), 0)', A)
  say('7 Steps are unchanged after the round trip', (await sq('JSON.stringify(S.getState().tracks[a].steps)', A)) === stepsBefore)

  // 8. removing the effect while its Line track plays releases it, with no errors
  await sq('(S.getState().setTrackMode(b, "line"), S.getState().setTrackLine(b, { points: R.lanePresetPoints("Stutter", 1/16) }), T.linkedPlay(), 0)', B); await wait(500)
  await evr(async (b) => { const R = (await import('/src/config/effectParams.ts')).EFFECT_PARAM_REGISTRY; R[b].setEnabled(false); (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().removeTrack(b) }, B)
  await wait(400)
  say('8 a removed track is released', (await sq('[M.isLineActive(a), P.getLinePhase(a)]', B)).join() === 'false,')
  await sq('(T.linkedStop(), 0)')

  // presets and setTrackLine hygiene
  const names = await sq('R.LANE_PRESET_NAMES.join(",")')
  say('presets: the 8 lane presets', names === 'Ramp up,Ramp down,Stutter,Half on,Swell,Sidechain pump,Triangle,Random steps', names)
  const ok = await sq('R.LANE_PRESET_NAMES.every((n) => { const p = R.lanePresetPoints(n, 1/16); return p && p.length >= 2 && p[0].x === 0 && p[p.length-1].x === 1 })')
  say('presets: every preset is a normalised line', ok === true)
  await sq('(S.getState().setTrackLine(a, { points: [{x:"bad"}], snap: 0.3, skew: NaN }), 0)', A)
  say('setTrackLine ignores unusable points, snaps and skews', (await sq('JSON.stringify(S.getState().tracks[a].line)', A)) !== null && (await sq('S.getState().tracks[a].line.snap', A)) === 1 / 16 && Number.isFinite(await sq('S.getState().tracks[a].line.skew', A)))
}
```

  Note: inside `sq`, the second argument is available as `a`.

- [ ] **Step 2: Run it and check it fails.**

  Run: `PATH=/opt/homebrew/bin:$PATH zsh -c 'lsof -ti:5173 | xargs kill 2>/dev/null; sleep 1; (npm run dev >/tmp/vite.log 2>&1 &); sleep 6; node .superpowers/sdd/layout-check.mjs linesengine'`

  Expected: FAIL. The import of `/src/effects/lines/linePhase.ts` fails, or `setTrackLine is not a function`.

- [ ] **Step 3: Create `src/effects/lines/lineLevel.ts`.**

```ts
// A Line track's level (spec §1): 1 − y of the line at the skewed phase, from a LUT cached per points array.
import { buildLut, skewPhase, type WarpPoint } from '../warp/warpMath'

const luts = new WeakMap<WarpPoint[], Float32Array>()

/** The line's LUT, built once per (immutable) points array. */
export function lineLut(points: WarpPoint[]): Float32Array {
  let l = luts.get(points)
  if (!l) { l = buildLut(points); luts.set(points, l) }
  return l
}

/** Level 0..1 at loop phase `phase` (top = 1, bottom = 0). Never NaN: anything non-finite reads as full. */
export function lineLevel(points: WarpPoint[], phase: number, skew: number): number {
  const lut = lineLut(points)
  const x = skewPhase(phase, skew)
  const f = (x > 0 ? (x < 1 ? x : 1) : 0) * (lut.length - 1)
  const i = Math.floor(f)
  const y = i >= lut.length - 1 ? lut[lut.length - 1] : lut[i] + (lut[i + 1] - lut[i]) * (f - i)
  const v = 1 - y
  return v > 0 ? (v < 1 ? v : 1) : v === 0 ? 0 : Number.isNaN(v) ? 1 : 0
}
```

- [ ] **Step 4: Create `src/effects/lines/linePhase.ts`.**

```ts
// Each Line track's phase while the sequencer plays (spec §2), written by the playback line pass and read by the
// lanes' rAF playheads. Outside React; Map.set on existing keys only, per frame.
const phases = new Map<string, number>()
let passes = 0

export const getLinePhase = (id: string): number | null => phases.get(id) ?? null
export const setLinePhase = (id: string, p: number): void => { phases.set(id, p) }
export const deleteLinePhase = (id: string): void => { phases.delete(id) }
export const clearLinePhases = (): void => { phases.clear() }

/** Dev only: counts Line tracks processed by the line pass (the harness checks it stays put with none). */
export const noteLinePass = (): void => { passes++ }
export const getLinePassCount = (): number => passes
```

- [ ] **Step 5: Create `src/effects/lines/lanePresets.ts`.**

```ts
// Built-in lines for Line tracks (spec §5). y follows the warp convention: 0 = full (top), 1 = dry (bottom).
import { normalizePoints, randomSteps, type WarpPoint } from '../warp/warpMath'

const stutter = (): WarpPoint[] => {
  const pts: WarpPoint[] = []
  for (let k = 0; k < 8; k++) {
    const y = k % 2 === 0 ? 0 : 1
    pts.push({ x: k / 8, y }, { x: (k + 1) / 8, y })
  }
  return pts
}

const pump = (): WarpPoint[] => {
  const pts: WarpPoint[] = []
  for (const q of [0, 0.25, 0.5, 0.75]) pts.push({ x: q, y: 0 }, { x: q, y: 1 }, { x: q + 0.25, y: 0, bend: -0.5 })
  return pts
}

const FIXED: Record<string, () => WarpPoint[]> = {
  'Ramp up': () => [{ x: 0, y: 1 }, { x: 1, y: 0 }],
  'Ramp down': () => [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  Stutter: stutter,
  'Half on': () => [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }],
  Swell: () => [{ x: 0, y: 1 }, { x: 1, y: 0, bend: 0.6 }],
  'Sidechain pump': pump,
  Triangle: () => [{ x: 0, y: 1 }, { x: 0.5, y: 0 }, { x: 1, y: 1 }],
}

export const LANE_PRESET_NAMES: readonly string[] = [...Object.keys(FIXED), 'Random steps']

/** A preset's normalised points (Random steps rolls on every call, on `snap`); null for an unknown name. */
export function lanePresetPoints(name: string, snap: number): WarpPoint[] | null {
  if (name === 'Random steps') return normalizePoints(randomSteps(snap))
  const f = FIXED[name]
  return f ? normalizePoints(f()) : null
}
```

- [ ] **Step 6: Extend `src/effects/mixModulation.ts`.**

  Add these module state and functions after the `gateOpen` map:

```ts
// Line side (Line tracks, spec §3): present while a Line track drives the effect's mix; the line's level 0..1
const lineLevels = new Map<string, number>()

export function setLineLevel(effectId: string, level: number): void {
  lineLevels.set(effectId, level)
}

/** The track left Line mode, was removed, or an audio/MIDI gate took the mix. */
export function releaseLine(effectId: string): void {
  lineLevels.delete(effectId)
}

/** Sequencer stopped: no line drives any mix. */
export function clearLines(): void {
  lineLevels.clear()
}

export function isLineActive(effectId: string): boolean {
  return lineLevels.has(effectId)
}
```

  In `noteModulatedMix`, replace the body with the version below. The changes:
  - the user's value is only captured when no line holds the mix either;
  - an active line scales the modulated value.

```ts
export function noteModulatedMix(effectId: string, value: number, current: number): number | null {
  const gate = gateOpen.get(effectId)
  const line = lineLevels.get(effectId)
  if (!isMixModulated(effectId) && gate === undefined && line === undefined) userMix.set(effectId, current)
  modLevel.set(effectId, value)
  modFrame.set(effectId, frame)
  if (gate === false) return null
  return line === undefined ? value : value * line
}
```

  Update the file's header comment so the rule mentions lines: "While a Line track plays, the line scales the modulated (or user) Dry/wet: mix = ceiling × level."

- [ ] **Step 7: Extend `src/stores/effectSequencerStore.ts`.**

  Add these imports:

```ts
import { cleanPoints, type WarpPoint } from '../effects/warp/warpMath'
import { SNAPS } from './warpStore'
```

  Add the type and the default after the `EffectStep` interface:

```ts
/** A Line track's line (spec §1): warp-format points (y 0 = full, 1 = dry), quantize grid and skew. */
export interface TrackLine {
  points: WarpPoint[]
  snap: number
  skew: number
}

export const defaultTrackLine = (): TrackLine => ({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0 })
```

  Then:
  - In `EffectTrack`, change `mode: 'gate' | 'param'` to `mode: 'gate' | 'param' | 'line'` and add `line: TrackLine` after `euclidean`.
  - In `createDefaultTrack`, add `line: defaultTrackLine(),`.
  - Change the `setTrackMode` signature in the interface to `(effectId: string, mode: 'gate' | 'param' | 'line') => void`.
  - Add `setTrackLine: (effectId: string, patch: Partial<TrackLine>) => void` to the interface, and this implementation after `setTrackMode`:

```ts
  setTrackLine: (effectId, patch) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const cur = track.line ?? defaultTrackLine()
      const next: TrackLine = { ...cur }
      if (patch.points !== undefined) { const p = cleanPoints(patch.points); if (p) next.points = p }
      if (patch.snap !== undefined && SNAPS.includes(patch.snap)) next.snap = patch.snap
      if (patch.skew !== undefined && Number.isFinite(patch.skew)) next.skew = Math.max(-1, Math.min(1, patch.skew))
      return { tracks: { ...state.tracks, [effectId]: { ...track, line: next } } }
    })
  },
```

  Run `grep -n "euclidean: " src/stores/effectSequencerStore.ts`. Every other place that builds a whole `EffectTrack` literal (not a `...track` spread) must also set `line: defaultTrackLine()`. Readers elsewhere use `track.line ?? defaultTrackLine()`.

- [ ] **Step 8: Add the line pass to `src/hooks/useEffectSequencerPlayback.ts`.**

  1. Imports:

```ts
import { captureUserMix, clearGates, clearLines, gateOpenLevel, isLineActive, releaseGate, releaseLine, setGateOpen, setLineLevel } from '../effects/mixModulation'
import { lineLevel } from '../effects/lines/lineLevel'
import { clearLinePhases, deleteLinePhase, noteLinePass, setLinePhase } from '../effects/lines/linePhase'
import { defaultTrackLine } from '../stores/effectSequencerStore'
```

     Merge the first one into the existing `mixModulation` import. Merge `defaultTrackLine` into the existing `effectSequencerStore` import.

  2. Add a ref next to the others:

     `const lineIds = useRef<Set<string>>(new Set()) // tracks the line pass drove last frame`

  3. In `executeTrackAtStep`, right after the mute/solo block (after `muteBypassed.current.delete(effectId)` and its `}`), add:

```ts
    // Line mode (spec §2): the step data (locks, gates, probability, fill) does not run; the line pass owns the mix
    if (track.mode === 'line') { releaseGate(effectId); return }
```

  4. In the per-track stepping loop, change `if (step && step.retrig > 0) {` to `if (track.mode !== 'line' && step && step.retrig > 0) {`.

  5. In `playbackLoop`, immediately before `animationFrameId.current = requestAnimationFrame(playbackLoop)`, add the line pass:

```ts
      // === Line tracks (spec §2–§3): Dry/wet = ceiling × the line's level at the track's phase, every frame ===
      {
        const latest = useEffectSequencerStore.getState().tracks // trackStep advanced above
        const ge = useGlitchEngineStore.getState()
        const seen = new Set<string>()
        for (const effectId of effectOrder) {
          const track = latest[effectId]
          if (!track || track.mode !== 'line') continue
          if (import.meta.env.DEV) noteLinePass()
          const entry = EFFECT_PARAM_REGISTRY[effectId]
          if (!entry) continue
          if (!(effectId in prePlayEnabled.current)) {
            prePlayEnabled.current[effectId] = entry.getEnabled()
            baseMix.current[effectId] = captureUserMix(effectId, ge.getEffectMix(effectId))
          }
          if (!prePlayEnabled.current[effectId]) continue
          if (track.muted || (hasSolo && !track.soloed)) continue // executeTrackAtStep bypasses it
          if (track.midiGate || track.audioGate || track.audioReactive.enabled) continue // those gates own the mix
          seen.add(effectId)
          const ms = baseMsPerStep / (track.timeScale ?? 1)
          const last = trackLastStepTime.current[effectId] ?? timestamp
          const f = Math.min(1, Math.max(0, (timestamp - last) / ms))
          const len = Math.max(1, track.length)
          const phase = (((track.trackStep + f) % len) + len) % len / len
          const line = track.line ?? defaultTrackLine()
          const level = lineLevel(line.points, phase, line.skew)
          setLinePhase(effectId, phase)
          setLineLevel(effectId, level)
          const mix = gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * level
          if (Math.abs((ge.effectMix[effectId] ?? 1) - mix) > 1e-4) ge.setEffectMix(effectId, mix)
        }
        // Tracks the line drove last frame but not now: left Line mode, removed, muted or gated. Hand the mix back.
        for (const id of lineIds.current) {
          if (seen.has(id)) continue
          deleteLinePhase(id)
          if (!isLineActive(id)) continue
          releaseLine(id)
          const t = latest[id]
          const gatedElsewhere = !!t && (t.mode === 'gate' || t.midiGate || t.audioGate || t.audioReactive.enabled)
          if (!gatedElsewhere && id in baseMix.current) ge.setEffectMix(id, gateOpenLevel(id, baseMix.current[id]))
        }
        lineIds.current = seen
      }
```

     Check the names: `hasSolo`, `baseMsPerStep` and `effectOrder` are already defined in `playbackLoop`. `trackLastStepTime` is the existing ref.

     The hand-back rule: when a track switches back to Steps (`'gate'`), its next step sets the mix itself, so the pass does not write. In every other case the pass restores the ceiling. A track switched back to Steps must still show `isLineActive` false and a null phase at once (harness check 7). So `releaseLine` and `deleteLinePhase` always run; only the mix write is skipped.

  6. In the start/stop effect's `else` branch (Stop), after `restoreBaseValues()`, add:

```ts
      clearLines()
      clearLinePhases()
      lineIds.current = new Set()
```

     If `clearGates()` is called in `restoreBaseValues`, call `clearLines()` there too, and do not call it twice.

- [ ] **Step 9: Run `linesengine`, then the regression modes.**

  Run (fresh Vite before each): `node .superpowers/sdd/layout-check.mjs linesengine`, then `warpmod`, then `devices`.

  Expected: `LAYOUT linesengine CHECK: PASS`, `warpmod` PASS, `devices` PASS.

  Then run `npm run build`; it must be clean. Then run `npx eslint` on the changed files; there must be no new problems.

- [ ] **Step 10: Commit.**

```bash
git add src/effects/lines src/effects/mixModulation.ts src/stores/effectSequencerStore.ts src/hooks/useEffectSequencerPlayback.ts
git commit -m "feat: line tracks: line model, lane presets and the playback line pass

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

  `.superpowers/` is gitignored, so the harness change is not committed.

---

### Task 2: Extract `LinePlot` and `handleLineKey` from the warp editor (no behaviour change)

**Files:**
- Create: `src/components/performance/lines/LinePlot.tsx`, `src/components/performance/lines/lineKeys.ts`
- Modify: `src/components/performance/warp/WarpGraph.tsx`, `src/components/performance/warp/WarpEditor.tsx`
- Test: the existing harness modes `warpui`, `warpdice`, `warpmath` and `labels` must pass unchanged

**Interfaces:**
- Consumes: from `warpMath`: `WarpPoint`, `sampleLine`. The `WarpTool` type (it moves to `LinePlot.tsx` and is re-exported from `WarpGraph.tsx`).
- Produces:

```ts
// src/components/performance/lines/LinePlot.tsx
export type WarpTool = 'draw' | 'steps' | 'curve' | 'erase'
export interface LinePlotProps {
  points: WarpPoint[]
  /** Read the latest points during a drag (store getState), so a gesture never sees stale props. */
  getPoints: () => WarpPoint[]
  /** Write points; returns the normalised points now stored. */
  setPoints: (p: WarpPoint[]) => WarpPoint[]
  snap: number                 // 0 = quantize Off
  tool: WarpTool
  selected: number | null
  onSelect: (i: number | null) => void
  width: number                // svg width in px
  height: number               // plot height in px
  /** 'warp' keeps every existing data-warp-* attribute; 'line' emits data-line-* (data-line-graph, -point, -bend). */
  attr: 'warp' | 'line'
  ariaLabel: string
  /** Hover status for empty space at (px, py) inside the plot; return null to use the tool's text. */
  hoverStatus?: (px: number, py: number, iw: number, ih: number) => string | null
  statusPoint?: string         // default: the warp's STATUS_POINT text
  /** SVG children drawn on top of the line and handles, without pointer events (labels). */
  children?: React.ReactNode
  /** Stroke for the line. Default var(--text-primary). */
  stroke?: string
}
export const LinePlot: React.MemoExoticComponent<(p: LinePlotProps & { svgRef?: React.Ref<SVGSVGElement> }) => JSX.Element>
export const PAD = 6

// src/components/performance/lines/lineKeys.ts
export interface LineKeyCtx {
  points: WarpPoint[]
  snap: number
  selected: number | null
  setSelected: (i: number | null) => void
  setPoints: (p: WarpPoint[]) => WarpPoint[]
  say: (pts: WarpPoint[], i: number) => void
  announce: (t: string) => void
  /** The focused plot (for [ and ]) */
  inPlot: boolean
}
/** Handles [ ] Delete/Backspace Escape and the arrows; returns true (after preventDefault + stopPropagation) when handled. */
export function handleLineKey(e: React.KeyboardEvent, c: LineKeyCtx): boolean
```

- [ ] **Step 1: Record a baseline.** Run `warpui`, `warpdice`, `warpmath` and `labels` (fresh Vite each time) and save each log to `.superpowers/sdd/2026-10-08-line-tracks/base-<mode>.log`. Expected: all PASS. These are the checks that pin the behaviour.

- [ ] **Step 2: Create `LinePlot.tsx`.** Move these from `WarpGraph.tsx` into it unchanged, except that every `useWarpStore.getState().points` becomes `getPoints()` and `editPoints` becomes `setPoints`:
  - the constants `PAD`, `COLS`, `HIT_PX`, `HIT_END_PX`, `EPS`, `clamp01`, `STATUS`, `STATUS_POINT` and `STATUS_BEND`;
  - `bendForMid` and `withBend`;
  - the editing block from `toVal` to `onPointerLeave`;
  - the grid `<g>`;
  - the line `<path>`, the bend handles and the points.

  Two more changes:
  - Data attributes come from `attr`, as in this helper:

    ```tsx
    const da = (name: string, v: string | number | boolean | undefined = '') => ({ [`data-${attr}-${name}`]: v })
    // e.g. <g key={i} {...da('point', i)} data-selected={selected === i || undefined}>
    // bend lookup: t.closest(`[data-${attr}-bend]`), read with getAttribute(`data-${attr}-bend`)
    ```

    With `attr="warp"` the DOM must be byte-for-byte what `WarpGraph` renders today: `data-warp-graph`, `data-warp-grid`, `data-warp-point`, `data-warp-bend`.
  - `onPointerMove`: for empty space, call `hoverStatus?.(px, py, iw, ih)`. The warp's "stopped guide" distance test moves into `WarpGraph` as its `hoverStatus` prop.

  `LinePlot` renders two absolutely positioned SVGs at `width` × `height`:
  - the back SVG: the grid, then `backChildren` (add `backChildren?: React.ReactNode` to the props);
  - the front SVG: the interactive one with `tabIndex={0}`, `role="application"` and `aria-label={ariaLabel}`, holding the line, handles, points, then `children`.

  `WarpGraph` passes the dashed guide `<line>` as `backChildren` and the "stopped" `<text>` as `children`.

- [ ] **Step 3: Rewrite `WarpGraph.tsx`.** It keeps:
  - the size observer, `gh`, `iw` and `ih`;
  - the waveform and playhead effect;
  - the thumbnails effect;
  - `previewEnvelope`;
  - the canvases;
  - the edge labels and the locked note.

  Its stacking order stays thumbs canvas → back SVG → wave canvas → playhead → front SVG. To keep that order, `LinePlot` takes `between?: React.ReactNode` (the wave canvas and the playhead div), rendered between its two SVGs.

  `WarpGraph` passes these props to `LinePlot`:
  - `points`, `getPoints={() => useWarpStore.getState().points}`, `setPoints={editPoints}`;
  - `snap`, `tool`, `selected`, `onSelect`;
  - `width={w}`, `height={gh}`, `attr="warp"`;
  - its existing aria-label;
  - `hoverStatus` (the guide test returning `STATUS_GUIDE`);
  - `backChildren`, `children`, `between`.

  `export type { WarpTool } from '../lines/LinePlot'` keeps existing imports working.

- [ ] **Step 4: Create `lineKeys.ts` and use it in `WarpEditor`.** Move the `[`/`]`, Escape, Delete/Backspace and arrow branches of `WarpEditor.onKeyDown` into `handleLineKey`, with the same logic:
  - The grid steps are `g = snap > 0 ? snap : 1/64`, and the y grid is `GRID_Y = 1/16`.
  - Every handled key calls `preventDefault()` and `stopPropagation()`.

  `WarpEditor.onKeyDown` keeps its early returns (modifiers, menus, inputs) and the `R` shortcut, then calls:

  ```ts
  handleLineKey(e, {
    points: s.points, snap: s.snap, selected, setSelected,
    setPoints: editPoints, say, announce: setAnnounce,
    inPlot: !!target.closest('[data-warp-graph]'),
  })
  ```

- [ ] **Step 5: Run the baseline modes again.** Run `warpui`, `warpdice`, `warpmath` and `labels`; all must PASS with the same check lines as the baseline. Compare with `diff <(grep -E ': (OK|FAIL)' base-warpui.log) <(grep -E ': (OK|FAIL)' run-warpui.log)`: only bracketed timing numbers may differ. Then run `npm run build`, and `npx eslint` on the changed files (no new problems).

- [ ] **Step 6: Commit.**

```bash
git add src/components/performance/lines src/components/performance/warp/WarpGraph.tsx src/components/performance/warp/WarpEditor.tsx
git commit -m "refactor: warp graph editing core as a shared LinePlot and line keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

---

### Task 3: Line lanes in the Sequencer (switch, lane, editing)

**Files:**
- Create: `src/components/sequencer/LineLane.tsx`, `src/components/sequencer/lineSelection.ts`
- Modify: `src/components/sequencer/EffectTrackRow.tsx`, `src/components/performance/layout.css`
- Test: `.superpowers/sdd/layout-check.mjs`, new mode `linesui`

**Interfaces:**
- Consumes:
  - Task 1: `TrackLine`, `defaultTrackLine`, `setTrackMode`, `setTrackLine`, `getLinePhase`, `isLineActive`.
  - Task 2: `LinePlot`, `PAD`, `WarpTool`, `handleLineKey`.
- Produces:

```ts
// src/components/sequencer/lineSelection.ts — the lane editor's tool and selected point (one lane is edited at a time)
export const useLineEditStore: UseBoundStore<StoreApi<{
  tool: WarpTool; selected: number | null
  setTool: (t: WarpTool) => void; setSelected: (i: number | null) => void
}>>
// src/components/sequencer/LineLane.tsx
export const LineLane: React.MemoExoticComponent<(p: { effectId: string; track: EffectTrack; color: string; label: string; selected: boolean; onSelect: () => void }) => JSX.Element>
```

  DOM contract, used by the harness and Task 4:
  - the switch: `[data-track-mode-switch="<id>"]`, with buttons `[data-mode="gate"]` and `[data-mode="line"]` (`aria-pressed`);
  - the lane: `[data-line-lane="<id>"]`, with `data-selected` when selected;
  - inside a selected lane: `LinePlot` with `attr="line"` (`[data-line-graph]`, `[data-line-point]`, `[data-line-bend]`);
  - the playhead: `[data-line-playhead]`;
  - the owner note: `[data-line-owner-note]`;
  - the header info: `[data-line-info]`.

- [ ] **Step 1: Write the failing harness mode `linesui`.**

```js
if (MODE === 'linesui') {
  // Line tracks Task 3: the Steps / Line switch, the lane and editing in it (spec §4)
  await open(1440, 900)
  await populate()
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(600)
  const S = (expr, a) => evr(async ([expr, a]) => { const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore; return eval(expr) }, [expr, a])
  const A = await p.$eval('[data-track-mode-switch]', (e) => e.getAttribute('data-track-mode-switch'))
  const B = await p.$$eval('[data-track-mode-switch]', (els) => els[1]?.getAttribute('data-track-mode-switch'))
  await S('(S.getState().setTrackLength(a, 16), 0)', A)

  // 1. switching to Line hides the cells and shows a lane spanning the row
  const counts = await p.evaluate(() => [document.querySelectorAll('[data-track-row]').length, document.querySelectorAll('[data-track-mode-switch]').length])
  await p.click(`[data-track-mode-switch="${A}"] [data-mode="line"]`); await wait(250)
  say('1 the switch sets mode line', (await S('S.getState().tracks[a].mode', A)) === 'line')
  const lane = await p.evaluate((a) => {
    const l = document.querySelector(`[data-line-lane="${a}"]`); const row = l?.closest('[data-track-row]')
    return l && row ? { lw: l.getBoundingClientRect().width, cells: row.querySelectorAll('[data-step-cell]').length } : null
  }, A)
  say('1 a lane replaces the step cells', !!lane && lane.cells === 0 && lane.lw > 900, JSON.stringify(lane))
  say('1 the switch exists on every row', counts[0] > 1 && counts[0] === counts[1], JSON.stringify(counts))

  // 2. an unselected lane: a click selects the track and adds no point
  await p.click(`[data-track-mode-switch="${B}"] [data-mode="line"]`); await wait(200)
  await evr(async (a) => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect(a), A); await wait(200)
  const bBox = await (await p.$(`[data-line-lane="${B}"]`)).boundingBox()
  const bPts = await S('S.getState().tracks[a].line.points.length', B)
  await p.mouse.click(bBox.x + bBox.width * 0.4, bBox.y + bBox.height * 0.5); await wait(250)
  const sel = await evr(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().selectedEffectId)
  say('2 clicking an unselected lane selects its track', sel === B, sel)
  say('2 and adds no point', (await S('S.getState().tracks[a].line.points.length', B)) === bPts)
  const tall = await p.$eval(`[data-line-lane="${B}"]`, (e) => e.getBoundingClientRect().height)
  say('2 the selected lane is about 170 px tall', tall > 150 && tall < 190, tall)
  const miniH = await p.$eval(`[data-line-lane="${A}"]`, (e) => e.getBoundingClientRect().height)
  say('2 an unselected lane is about 58 px tall', miniH > 45 && miniH < 70, miniH)

  // 3. editing the selected lane: add, drag with x snapped to 1/16, double-click delete, bend
  const g = async () => (await p.$(`[data-line-lane="${B}"] [data-line-graph]`)).boundingBox()
  let gb = await g()
  const PAD = 6
  const at = (x, y) => [gb.x + PAD + x * (gb.width - 2 * PAD), gb.y + PAD + y * (gb.height - 2 * PAD)]
  const n0 = await S('S.getState().tracks[a].line.points.length', B)
  await p.mouse.click(...at(0.3, 0.5)); await wait(150)
  const n1 = await S('S.getState().tracks[a].line.points.length', B)
  say('3 a click adds a point', n1 === n0 + 1, `${n0} -> ${n1}`)
  const added = await S('S.getState().tracks[a].line.points.findIndex((q) => Math.abs(q.y - 0.5) < 0.02)', B)
  let [px, py] = at(0.3, 0.5)
  await p.mouse.move(px, py); await p.mouse.down(); await p.mouse.move(...at(0.41, 0.3), { steps: 6 }); await p.mouse.up(); await wait(150)
  const pt = await evr(async ([b, i]) => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().tracks[b].line.points[i], [B, added])
  say('3 a drag moves it with x on the 1/16 grid', !!pt && Math.abs(pt.x * 16 - Math.round(pt.x * 16)) < 1e-6 && Math.abs(pt.y - 0.3) < 0.04, JSON.stringify(pt))
  ;[px, py] = at(pt.x, pt.y)
  await p.mouse.click(px, py, { clickCount: 2 }); await wait(200)
  say('3 a double-click deletes it', (await S('S.getState().tracks[a].line.points.length', B)) === n0)
  await S('(S.getState().setTrackLine(a, { points: [{x:0,y:0},{x:1,y:1}] }), 0)', B); await wait(150)
  gb = await g()
  const bend = await p.$(`[data-line-lane="${B}"] [data-line-bend="1"]`)
  if (bend) { const bb = await bend.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 30, { steps: 5 }); await p.mouse.up(); await wait(150) }
  say('3 dragging a bend handle sets bend', !!bend && (await S('S.getState().tracks[a].line.points[1].bend ?? 0', B)) !== 0)

  // 4. the playhead moves while playing; the owner note shows with the audio gate on
  await evr(async () => (await import('/src/utils/sequencerTransport.ts')).linkedPlay()); await wait(300)
  const x1 = await p.$eval(`[data-line-lane="${B}"] [data-line-playhead]`, (e) => e.getBoundingClientRect().left)
  await wait(300)
  const x2 = await p.$eval(`[data-line-lane="${B}"] [data-line-playhead]`, (e) => e.getBoundingClientRect().left)
  say('4 the playhead moves while playing', Math.abs(x2 - x1) > 3, `${x1} -> ${x2}`)
  await S('(S.getState().setTrackAudioGate(a, true), 0)', B); await wait(250)
  const note = await p.$eval(`[data-line-lane="${B}"] [data-line-owner-note]`, (e) => e.textContent).catch(() => null)
  say('4 audio gate on: the lane says the gate controls Dry/wet', note === 'Audio gate controls Dry/wet', note)
  await S('(S.getState().setTrackAudioGate(a, false), 0)', B)
  await evr(async () => (await import('/src/utils/sequencerTransport.ts')).linkedStop()); await wait(200)
  say('4 stopped: no playhead', !(await p.$(`[data-line-lane="${B}"] [data-line-playhead]:not([hidden])`)))

  // 5. header info for the selected Line track
  const info = await p.$eval(`[data-track-mode-switch="${B}"]`, (e) => e.closest('[data-track-row]')?.querySelector('[data-line-info]')?.textContent ?? null)
  say('5 the header shows Length, Scale and the Dry/wet ceiling', !!info && /Length 16/.test(info) && /Scale 1×/.test(info) && /Dry\/wet ceiling \d+%/.test(info), info)

  // 6. keys in a focused lane do not reach the sequencer's own shortcuts
  await S('(S.getState().setTrackLine(a, { points: [{x:0,y:0},{x:0.5,y:0.5},{x:1,y:0}] }), 0)', B); await wait(150)
  gb = await g()
  await p.mouse.click(...at(0.5, 0.5)); await wait(100)
  const page0 = await S('S.getState().stepPage')
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowUp'); await wait(150)
  const mp = await evr(async (b) => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().tracks[b].line.points[1], B)
  say('6 arrows nudge the selected point', Math.abs(mp.x - 0.5625) < 1e-6 && Math.abs(mp.y - 0.4375) < 1e-6, JSON.stringify(mp))
  await p.keyboard.press('Delete'); await wait(150)
  say('6 Delete removes it', (await S('S.getState().tracks[a].line.points.length', B)) === 2)
  say('6 the step page did not change', (await S('S.getState().stepPage')) === page0)

  // 7. back to Steps restores the cells
  await p.click(`[data-track-mode-switch="${B}"] [data-mode="gate"]`); await wait(200)
  const cellsBack = await p.$eval(`[data-track-mode-switch="${B}"]`, (e) => e.closest('[data-track-row]')?.querySelectorAll('[data-step-cell]').length ?? 0)
  say('7 Steps shows the step cells again', cellsBack > 0, cellsBack)

  await p.screenshot({ path: '.superpowers/sdd/shots/lines-t3.png' })
}
```

  If the existing row or step-cell elements lack `data-track-row` and `data-step-cell`, Step 3 adds them: `data-track-row` on `EffectTrackRow`'s root, and `data-step-cell` on each `EffectStepCell` root.

- [ ] **Step 2: Run it and check it fails** at check 1: there is no `[data-track-mode-switch]`.

- [ ] **Step 3: Create `lineSelection.ts`.**

```ts
import { create } from 'zustand'
import type { WarpTool } from '../performance/lines/LinePlot'

interface LineEditState {
  tool: WarpTool
  selected: number | null
  setTool: (t: WarpTool) => void
  setSelected: (i: number | null) => void
}

/** The lane editor's tool and selected point. One lane (the selected track's) is edited at a time. */
export const useLineEditStore = create<LineEditState>((set) => ({
  tool: 'draw',
  selected: null,
  setTool: (tool) => set({ tool }),
  setSelected: (selected) => set({ selected }),
}))
```

  Clear `selected` whenever the selected effect changes. In `LineLane`, add an effect on `selected` that runs `useLineEditStore.getState().setSelected(null)` when the lane becomes selected.

- [ ] **Step 4: Create `LineLane.tsx`.** Its behaviour:

  - **Root.** `<div className="seg-line-lane" data-line-lane={effectId} data-selected={selected || undefined} style={{ '--lane': color }}>`, with a ResizeObserver for `w`/`h`, the same as `WarpGraph`.
  - **Unselected.** An SVG with:
    - the 16-column grid (`stroke: i % 4 ? 'var(--warp-grid)' : 'var(--border)'`);
    - a filled polygon under the line (`fill: var(--lane)`, `fill-opacity: .16`);
    - the line in `var(--lane)`, 1.5 px.

    Use the `d` path builder that `LinePlot` uses, exported from `LinePlot.tsx` as `linePath(points, X, Y)`; add that export in this task. `onPointerDown` calls `onSelect()` and stops; it adds no point.
  - **Selected.** A `LinePlot` with:
    - `attr="line"`, `points={line.points}`;
    - `getPoints={() => (useEffectSequencerStore.getState().tracks[effectId]?.line ?? defaultTrackLine()).points}`;
    - `setPoints={(p) => { useEffectSequencerStore.getState().setTrackLine(effectId, { points: p }); return useEffectSequencerStore.getState().tracks[effectId].line.points }}`;
    - `snap={line.snap}`, `tool` and `selected` from `useLineEditStore`;
    - `width={w}`, `height={h}`;
    - `ariaLabel={`${label} line: height is how much of the effect plays. Top is the card's Dry/wet, bottom is dry`}`;
    - `backChildren` holding the fill polygon;
    - `children` holding the three edge labels as SVG `<text>`: `wet (card's Dry/wet)` top right, `dry` bottom right, and the span top left. The span is `${bars} bars · ${scale}`. Bars are `track.length × stepBeats / timeScale / 4`, where `stepBeats` comes from the resolution (`1/4` = 1, `1/8` = .5, `1/16` = .25, `1/32` = .125). Format the scale as `½×`, `1×`, `2×` and so on, with the same formatting as the header badge.
  - **Keyboard.** A wrapper `onKeyDown` runs this only while selected:

    ```ts
    handleLineKey(e, {
      points: getPoints(), snap: line.snap, selected: sel, setSelected,
      setPoints, say, announce: setAnnounce,
      inPlot: !!(e.target as Element).closest('[data-line-graph]'),
    })
    ```

    `say` writes `describePoint` (from `warp/warpEdit`) to the status bar and to an `sr-only` aria-live span.
  - **Playhead.** A `<div className="seg-line-playhead" data-line-playhead hidden>`, positioned by rAF: each frame, `const ph = getLinePhase(effectId)`. When `ph === null`, set `hidden`. Otherwise clear it and set `transform: translateX(PAD + skewPhase(ph, line.skew) * iw)`. Skip the rAF entirely while the Sequencer tab is hidden (`useUIStore((s) => s.bottomTab === 'sequencer' && s.showBottom)`).
  - **Owner note.** `<span className="seg-line-owner" data-line-owner-note>` shows `Audio gate controls Dry/wet` when `track.audioGate || track.audioReactive.enabled`, and `MIDI gate controls Dry/wet` when `track.midiGate`.

- [ ] **Step 5: Wire `EffectTrackRow.tsx`.**
  1. Add `data-track-row={effectId}` on the root `<div className="flex" ...>`, and `data-step-cell` on each `EffectStepCell` root.
  2. After the MIDI gate button in the controls row, add the switch:

```tsx
<div className="seg-mode-switch" data-track-mode-switch={effectId} role="group" aria-label={`${label} track mode`}>
  {(['gate', 'line'] as const).map((m) => (
    <button key={m} type="button" data-mode={m} aria-pressed={(track.mode === 'line') === (m === 'line')}
      onClick={(e) => { e.stopPropagation(); useEffectSequencerStore.getState().setTrackMode(effectId, m); onSelectTrack?.(effectId) }}
      {...statusHover(m === 'line' ? `Line: draw how much of ${label} plays across the loop` : `Steps: switch ${label} on and off per step`)}>
      {m === 'line' ? 'Line' : 'Steps'}
    </button>
  ))}
</div>
```

  3. Where the visible step cells render, render this instead when `track.mode === 'line'`:

     `<LineLane effectId={effectId} track={track} color={_color} label={label} selected={!!isSelectedTrack} onSelect={() => onSelectTrack?.(effectId)} />`

     It spans the full width the cells occupied. Use the real `color` prop: rename `_color` to `color` and drop the `void`.
  4. In Line mode with `isSelectedTrack`, the header shows, below the controls row:

     `<div className="seg-line-info" data-line-info>Length {track.length} · Scale {fmt(track.timeScale)}<br/>Dry/wet ceiling {Math.round(mix*100)}%</div>`

     Here `mix = useGlitchEngineStore((s) => s.effectMix[effectId] ?? 1)` while stopped. While playing, use the user's base: show the stored value only while `!isPlaying`, and otherwise `captureUserMix`'s remembered base, read with a new export `getUserMix(effectId): number | undefined` added to `mixModulation.ts` (`return userMix.get(effectId)`).
  5. The row's dimming test (`hasAnyActiveSteps`) counts a Line track as active.

- [ ] **Step 6: Styles in `layout.css`.** Add these rules:
  - `.seg-line-lane`:
    - `position: relative; flex: 1; min-width: 0; height: 58px; background: var(--bg-void); border: 1px solid var(--border); border-radius: 4px; overflow: hidden`;
    - with `[data-selected]`: `height: 170px`;
    - its SVGs are `position: absolute; inset: 0`.
  - `.seg-line-playhead`: `position: absolute; top: 0; bottom: 0; width: 2px; background: var(--live); pointer-events: none`.
  - `.seg-line-owner`: the `.seg-warp-locked-note` look, but in `--text-secondary`.
  - `.seg-mode-switch`: a 2-button segmented control matching `.seg-warp-seg`, 10.5 px text; the pressed button gets `background: var(--bg-hover); color: var(--text-primary)`.
  - `.seg-line-info`: 11 px, `--text-muted`, with `b` in `--text-primary`.

  Edge label text in the lane uses the `.seg-warp-edge` font (10 px mono, `--text-muted`).

- [ ] **Step 7: Run the tests.** Run `linesui`, then `linesengine`, `warpui`, `labels` and `devices` (fresh Vite each time). All must PASS. Then run the build, and lint on the changed files (no new problems). Look at `.superpowers/sdd/shots/lines-t3.png` and compare it with the mockup. Copy it to the scratchpad progress folder and add it to the progress page (`http://127.0.0.1:8765/tw-progress.html`; add a "Line tracks" section).

- [ ] **Step 8: Commit.**

```bash
git add src/components/sequencer/LineLane.tsx src/components/sequencer/lineSelection.ts src/components/sequencer/EffectTrackRow.tsx src/components/sequencer/EffectStepCell.tsx src/components/performance/lines/LinePlot.tsx src/components/performance/layout.css src/effects/mixModulation.ts
git commit -m "feat: line tracks: Steps / Line switch and drawable lanes in the sequencer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

---

### Task 4: Line toolbar, presets, saved lines, dice and locks, docs

**Files:**
- Create: `src/components/sequencer/LineToolbar.tsx`, `src/components/sequencer/lineLocks.ts`
- Modify: `src/components/performance/warp/WarpLineTools.tsx`, `src/components/performance/warp/warpLines.ts`, `src/components/performance/warp/WarpSettingsRow.tsx`, `src/components/sequencer/SequencerTransport.tsx`, `src/components/performance/layout.css`, `CLAUDE.md`
- Test: `.superpowers/sdd/layout-check.mjs`, new mode `linestools`

**Interfaces:**
- Consumes:
  - Task 1: `lanePresetPoints`, `LANE_PRESET_NAMES`, `setTrackLine`.
  - Task 3: `useLineEditStore`.
  - From `warpMath`: `randomSteps`, `randomCurves`.
  - From `warpLines`: `loadLines`, `saveLine`, `deleteLine`.
- Produces:

```ts
// WarpLineTools.tsx (generic; WarpLinesMenu and WarpSaveLine become thin wrappers with identical DOM)
export function LinesMenu(p: {
  builtIns: readonly string[]; current: string | null; label: string; attr: 'warp' | 'line'
  onPickBuiltIn: (name: string) => void; onPickUser: (l: WarpLine) => void; trigger?: 'lines' | 'presets'
}): JSX.Element
export function SaveLine(p: { attr: 'warp' | 'line'; getPoints: () => WarpPoint[]; onSaved: (name: string) => void; onAnnounce: (t: string) => void }): JSX.Element
// WarpSettingsRow.tsx
export const Spin  // now exported; SpinProps.id widens to string and gains attr?: string (default 'warp-setting'), rendered as data-<attr>={id}
// lineLocks.ts
export const useLineLockStore: UseBoundStore<StoreApi<{
  lockMode: boolean; locks: Record<string, boolean>
  setLockMode: (on: boolean) => void; toggleLock: (effectId: string) => void
}>>
export function loadLineLocks(): Record<string, boolean>
export function saveLineLocks(l: Record<string, boolean>): boolean
// LineToolbar.tsx
export const LineToolbar: React.MemoExoticComponent<(p: { effectId: string }) => JSX.Element>
```

  DOM contract:
  - the toolbar: `[data-line-tools]`;
  - the tools: `[data-line-tool="draw|steps|curve|erase"]`;
  - the Lines menu trigger: `[data-line-lines]`; the menu `[data-line-lines-menu]`, with items `[data-line-preset]` and `[data-line-line]`;
  - `[data-line-save]` and `[data-line-save-name]`;
  - `[data-line-clear]`;
  - the spinbuttons `[data-line-setting="snap"]` and `[data-line-setting="skew"]`;
  - `[data-line-lockmode]`;
  - `[data-line-dice="track"]` and `[data-line-dice="all"]`;
  - each lane's lock: `[data-line-lock="<id>"]`, in the track header, shown only in lock mode.

- [ ] **Step 1: Write the failing harness mode `linestools`.**

```js
if (MODE === 'linestools') {
  // Line tracks Task 4: the line toolbar, presets, saved lines, dice and locks (spec §4–§5)
  await open(1440, 900)
  await populate()
  await evr(async () => { try { localStorage.removeItem('seg.lines.locks'); localStorage.removeItem('seg.warp.lines') } catch {} })
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(500)
  const S = (expr, a) => evr(async ([expr, a]) => { const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore; return eval(expr) }, [expr, a])
  const ids = await p.$$eval('[data-track-mode-switch]', (els) => els.slice(0, 3).map((e) => e.getAttribute('data-track-mode-switch')))
  const [A, B, C] = ids
  for (const id of [A, B]) { await p.click(`[data-track-mode-switch="${id}"] [data-mode="line"]`); await wait(120) }
  const selectTrack = (id) => evr(async (id) => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect(id), id)

  // 1. the toolbar swaps to line tools for a selected Line track, and back for a Steps track
  await selectTrack(A); await wait(200)
  say('1 a Line track selected shows the line tools', !!(await p.$('[data-line-tools]')) && !(await p.$('[aria-label="Randomize track steps"]')))
  const ctx = await p.$eval('[data-line-tools]', (e) => e.textContent)
  say('1 the toolbar names the effect\'s line', / line/.test(ctx))
  await selectTrack(C); await wait(200)
  say('1 a Steps track selected shows the step tools', !(await p.$('[data-line-tools]')) && !!(await p.$('[aria-label="Randomize track steps"]')))
  await selectTrack(A); await wait(200)

  // 2. tools, quantize, skew
  await p.click('[data-line-tool="steps"]')
  say('2 the Steps tool is pressed', (await p.$eval('[data-line-tool="steps"]', (e) => e.getAttribute('aria-pressed'))) === 'true')
  await p.click('[data-line-tool="draw"]')
  await p.focus('[data-line-setting="snap"]'); await p.keyboard.press('ArrowDown'); await wait(80)
  say('2 Quantize steps to 1/8', (await S('S.getState().tracks[a].line.snap', A)) === 1 / 8)
  await p.focus('[data-line-setting="skew"]'); for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowUp'); await wait(80)
  say('2 Skew +20%', Math.abs((await S('S.getState().tracks[a].line.skew', A)) - 0.2) < 1e-9)

  // 3. Lines menu: built-ins load; Random steps rolls
  await p.click('[data-line-lines]'); await wait(150)
  const items = await p.$$eval('[data-line-lines-menu] [data-line-preset]', (els) => els.map((e) => e.getAttribute('data-line-preset')).join(','))
  say('3 the menu lists the 8 lane presets', items === 'Ramp up,Ramp down,Stutter,Half on,Swell,Sidechain pump,Triangle,Random steps', items)
  await p.click('[data-line-preset="Half on"]'); await wait(150)
  say('3 Half on loads', (await S('JSON.stringify(S.getState().tracks[a].line.points)', A)) === JSON.stringify([{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }]))
  say('3 the trigger names the loaded line', /Half on/.test(await p.$eval('[data-line-lines]', (e) => e.textContent)))

  // 4. Clear: flat along the top
  await p.click('[data-line-clear]'); await wait(100)
  say('4 Clear gives the flat full line', (await S('JSON.stringify(S.getState().tracks[a].line.points)', A)) === JSON.stringify([{ x: 0, y: 0 }, { x: 1, y: 0 }]))

  // 5. Save line round trip with the warp, and lane preset names are refused (in both editors)
  await S('(S.getState().setTrackLine(a, { points: [{x:0,y:0.25},{x:0.5,y:0.75},{x:1,y:0.25}] }), 0)', A)
  await p.click('[data-line-save]'); await p.type('[data-line-save-name]', 'Swell'); await p.keyboard.press('Enter'); await wait(150)
  const refused = await evr(async () => (await import('/src/components/performance/warp/warpLines.ts')).loadLines().length)
  say('5 a lane preset name is refused', refused === 0 && !!(await p.$('[data-line-save-name]')))
  await p.click('[data-line-save-name]', { clickCount: 3 }); await p.type('[data-line-save-name]', 'Wave'); await p.keyboard.press('Enter'); await wait(150)
  await p.click('[data-bottom-tab-btn="warp"]'); await wait(300)
  await p.click('[data-warp-lines]'); await wait(150)
  await p.click('[data-warp-line="Wave"]'); await wait(150)
  const warpPts = await evr(async () => JSON.stringify((await import('/src/stores/warpStore.ts')).useWarpStore.getState().points))
  say('5 a line saved on a track loads in the warp', warpPts === JSON.stringify([{ x: 0, y: 0.25 }, { x: 0.5, y: 0.75 }, { x: 1, y: 0.25 }]), warpPts)
  await p.click('[data-warp-save]'); await p.type('[data-warp-save-name]', 'Swell'); await p.keyboard.press('Enter'); await wait(150)
  say('5 the warp refuses a lane preset name too', !!(await p.$('[data-warp-save-name]')))
  await p.keyboard.press('Escape')
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(300)

  // 6. dice: track only; all lines skip a locked track and Steps tracks
  const lineOf = (id) => S('JSON.stringify(S.getState().tracks[a].line.points)', id)
  const stepsC = await S('JSON.stringify(S.getState().tracks[a].steps)', C)
  let a0 = await lineOf(A), b0 = await lineOf(B)
  await p.click('[data-line-dice="track"]'); await wait(120)
  say('6 Dice track changes only the selected line', (await lineOf(A)) !== a0 && (await lineOf(B)) === b0)
  await p.click('[data-line-lockmode]'); await wait(120)
  await p.click(`[data-line-lock="${B}"]`); await wait(100)
  a0 = await lineOf(A); b0 = await lineOf(B)
  await p.click('[data-line-dice="all"]'); await wait(150)
  say('6 Dice all lines skips the locked track', (await lineOf(A)) !== a0 && (await lineOf(B)) === b0)
  say('6 and never touches a Steps track', (await S('JSON.stringify(S.getState().tracks[a].steps)', C)) === stepsC)
  const outline = await p.$eval(`[data-line-lane="${B}"]`, (e) => e.hasAttribute('data-locked'))
  say('6 the locked lane is outlined in lock mode', outline)

  // 7. locks persist across a reload
  await open(1440, 900)
  const locks = await evr(async () => JSON.parse(localStorage.getItem('seg.lines.locks') || '{}'))
  say('7 locks survive a reload', locks[B] === true, JSON.stringify(locks))

  // 8. narrow: the toolbar wraps, no horizontal page scroll
  await open(1000, 900); await populate()
  await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(400)
  const id0 = await p.$eval('[data-track-mode-switch]', (e) => e.getAttribute('data-track-mode-switch'))
  await p.click(`[data-track-mode-switch="${id0}"] [data-mode="line"]`); await selectTrack(id0); await wait(300)
  const nar = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, tb: (() => { const t = document.querySelector('[data-line-tools]'); return t ? t.scrollWidth - t.clientWidth : -1 })() }))
  say('8 narrow: no horizontal scroll, toolbar fits', nar.sw <= nar.cw && nar.tb <= 1, JSON.stringify(nar))
  await p.screenshot({ path: '.superpowers/sdd/shots/lines-t4-narrow.png' })
  await open(1440, 900); await populate(); await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(300)
  for (const id of [A, B]) { await p.click(`[data-track-mode-switch="${id}"] [data-mode="line"]`); await wait(100) }
  await selectTrack(A); await wait(300)
  await p.screenshot({ path: '.superpowers/sdd/shots/lines-t4.png' })
}
```

- [ ] **Step 2: Run it and check it fails** at check 1: there is no `[data-line-tools]`.

- [ ] **Step 3: Make the line tools generic in `WarpLineTools.tsx`.**
  - Turn `WarpLinesMenu`'s body into `LinesMenu`:
    - `BUILT_INS` comes from `p.builtIns`, and `presetName` from `p.current`.
    - Every `data-warp-*` attribute in it becomes `data-${p.attr}-*`: `lines`, `presets`, `lines-menu`, `line`, `line-delete`, `preset`.
    - The CSS classes stay the same.
    - `loadUser` calls `p.onPickUser(l)` and the built-in buttons call `p.onPickBuiltIn(n)`; both then call `close(true)`.
    - The aria-labels take `p.label` ("Warp lines" or "<Effect> lines").
  - `WarpLinesMenu({ variant })` becomes:

```tsx
export const WarpLinesMenu = memo(function WarpLinesMenu({ variant = 'lines' }: { variant?: 'lines' | 'presets' }) {
  const presetName = useWarpStore((s) => s.presetName)
  return <LinesMenu attr="warp" label="Warp lines" builtIns={BUILT_INS} current={presetName} trigger={variant}
    onPickBuiltIn={(n) => useWarpStore.getState().loadPreset(n)}
    onPickUser={(l) => useWarpStore.getState().patch({ points: l.points.map((q) => ({ ...q })), presetName: l.name })} />
})
```

  - Do the same for `SaveLine`:
    - `commit` uses `p.getPoints()` and then `p.onSaved(name)`.
    - Its attributes are `data-${attr}-save` and `data-${attr}-save-name`.
    - `WarpSaveLine` passes `getPoints={() => useWarpStore.getState().points}` and `onSaved={(n) => useWarpStore.setState({ presetName: n })}`.

- [ ] **Step 4: Built-in names in `warpLines.ts`.**

```ts
import { LANE_PRESET_NAMES } from '../../../effects/lines/lanePresets'
const BUILT_IN_NAMES = [...Object.keys(PRESETS), ...LANE_PRESET_NAMES].map((n) => n.toLowerCase())
/** A built-in line's name (any case), warp or lane presets: user lines may not use one. */
export const isBuiltInName = (name: string) => BUILT_IN_NAMES.includes(name.trim().toLowerCase())
```

  `loadLines` already skips built-in names, so a previously saved warp line called, say, "Swell" no longer lists. That is accepted.

- [ ] **Step 5: Export `Spin`.** In `WarpSettingsRow.tsx`:
  - Change `id` to `string`.
  - Add `attr?: string`.
  - Render `{...{ [`data-${attr ?? 'warp-setting'}`]: id }}` in place of `data-warp-setting={id}`.
  - Export it.

  The warp's own usages are unchanged.

- [ ] **Step 6: Create `lineLocks.ts`.**

```ts
// Line track locks (spec §5): one flag per effect id in localStorage `seg.lines.locks`. A UI preference: never in
// banks or presets. Every access is wrapped, so a blocked page still works for the session.
import { create } from 'zustand'

const KEY = 'seg.lines.locks'

export function loadLineLocks(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(KEY)
    const v: unknown = raw ? JSON.parse(raw) : {}
    const out: Record<string, boolean> = {}
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, b] of Object.entries(v)) if (b === true) out[k] = true
    return out
  } catch { return {} }
}

export function saveLineLocks(l: Record<string, boolean>): boolean {
  try { window.localStorage.setItem(KEY, JSON.stringify(l)); return true } catch { return false }
}

interface LineLockState {
  lockMode: boolean
  locks: Record<string, boolean>
  setLockMode: (on: boolean) => void
  toggleLock: (effectId: string) => void
}

export const useLineLockStore = create<LineLockState>((set, get) => ({
  lockMode: false,
  locks: loadLineLocks(),
  setLockMode: (lockMode) => set({ lockMode }),
  toggleLock: (id) => {
    const locks = { ...get().locks }
    if (locks[id]) delete locks[id]
    else locks[id] = true
    saveLineLocks(locks)
    set({ locks })
  },
}))
```

- [ ] **Step 7: Create `LineToolbar.tsx`.** It renders `<div className="seg-line-tools" role="toolbar" aria-label={`${name} line tools`} data-line-tools>`, where `name = getEffectInfo(effectId).name`, containing in order:
  1. `<span className="seg-line-ctx">{name} line</span>`.
  2. Four tool buttons. They reuse `WarpEditor`'s `TOOLS` texts, exported from `WarpEditor.tsx` as `LINE_TOOLS`. Each is `className="seg-warp-tool"`, `data-line-tool={id}`, `aria-pressed`, and `onClick={() => useLineEditStore.getState().setTool(id)}`.
  3. A separator, then:

     ```tsx
     <LinesMenu attr="line" label={`${name} lines`} builtIns={LANE_PRESET_NAMES}
       current={presetName}
       onPickBuiltIn={(n) => {
         const pts = lanePresetPoints(n, line.snap || 1/16)
         if (pts) { setLine({ points: pts }); setPresetName(n) }
       }}
       onPickUser={(l) => { setLine({ points: l.points }); setPresetName(l.name) }} />
     ```

     `presetName` is component state, reset to `null` when `effectId` changes or when the points change from something other than a pick. Track this with a ref holding the points array the pick produced; if the store's points differ from it, show `Custom`.
  4. `<SaveLine attr="line" getPoints={...} onSaved={setPresetName} onAnnounce={setAnnounce} />`.
  5. A Clear button with `data-line-clear`, `onClick` → `setLine({ points: [{x:0,y:0},{x:1,y:0}] })`, and status text "Clear: a flat line along the top, so the effect plays at its full Dry/wet".
  6. A separator, then `<Spin attr="line-setting" id="snap" ...>` and `<Spin attr="line-setting" id="skew" ...>`. Their step logic matches the warp's `stepSnap` and `stepSkew`, applied to `setTrackLine(effectId, { snap })` and `{ skew }`.
  7. A flexible gap, then three buttons:
     - `data-line-lockmode` (`aria-pressed={lockMode}`), showing `<LockIcon />` and, when on, "Lock mode";
     - `data-line-dice="track"`: `🎲 Dice track`, which runs `diceLine(effectId)`;
     - `data-line-dice="all"`: `🎲 Dice all lines`, which runs `diceLine` for every track with `mode === 'line'` and no lock.

     ```ts
     const diceLine = (id: string) => {
       const t = useEffectSequencerStore.getState().tracks[id]
       if (!t || t.mode !== 'line') return
       const snap = (t.line ?? defaultTrackLine()).snap || 1 / 16
       useEffectSequencerStore.getState().setTrackLine(id, { points: Math.random() < 0.5 ? randomSteps(snap) : randomCurves(snap) })
     }
     ```

  Every button has `statusHover` text in plain words, with no em dashes. Keys handled inside the toolbar stop propagating, as in the warp.

- [ ] **Step 8: Wire everything up.**
  1. **`SequencerTransport.tsx`.** Read `selectedEffectId` from `useUIStore` and the selected track's mode from `useEffectSequencerStore`. When the mode is `'line'`, render `<LineToolbar effectId={selectedEffectId} />` where `RandomizeButton`, `RandomizeAllButton`, `RandomizeLocksButton` and `ClearTrackButton` render now; otherwise render those four buttons. Swing and resolution are untouched.
  2. **Lock button in `EffectTrackRow.tsx`.** When `useLineLockStore((s) => s.lockMode)` is on and `track.mode === 'line'`, render a lock button in the header name row:
     - `data-line-lock={effectId}`, `aria-pressed={locked}`, `<LockIcon open={!locked} />`;
     - `onClick` stops propagation and toggles the lock.
  3. **`LineLane`.** Add `data-locked` when `lockMode && locks[effectId]`, and outline it with `outline: 1.5px solid var(--warp-lock)`.
  4. **CSS.** `.seg-line-tools { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-width: 0 }`, and `.seg-line-ctx { color: var(--text-muted); font-size: 11.5px; margin-right: 4px }`. The toolbar row must wrap (no horizontal scroll) under 1100 px.

- [ ] **Step 9: Docs.** In `CLAUDE.md`, after the "Time warp" section, add a "Line tracks" section of about 12 lines. It covers:
  - the files: `src/effects/lines/*`, `LineLane`, `LineToolbar`, `lineSelection.ts` and `lineLocks.ts`;
  - the model (`mode: 'line'`, `line { points, snap, skew }`, level `1 − y`);
  - the clock (track phase from the per-track step timer, with `getLinePhase`);
  - the mix rule (`ceiling × level` through `mixModulation`; audio and MIDI gates win; Stop restores);
  - the shared editor (`LinePlot`, `handleLineKey`, `LinesMenu`, `SaveLine`, `Spin`);
  - presets, dice and locks (`seg.lines.locks`);
  - that lines are not saved in banks or presets.

  In the "Device chain" paragraph, change "Sequencer: `SequencerContainer` > `UnifiedSequencerPanel`" to say that tracks are Steps or Line.

- [ ] **Step 10: Run everything.** Run each with fresh Vite: `linestools`, `linesui`, `linesengine`, `warpui`, `warpdice`, `warpmod`, `warpcard`, `labels`, `devices` and `menus`. All must PASS. Then run the build, and lint on the changed files (no new problems).

  Look at `.superpowers/sdd/shots/lines-t4.png` and `lines-t4-narrow.png` and compare them with the mockup. Add them to the progress page.

- [ ] **Step 11: Commit.**

```bash
git add src/components/sequencer src/components/performance/warp src/components/performance/layout.css CLAUDE.md
git commit -m "feat: line tracks: line toolbar, lane presets, saved lines, dice and locks; docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```
