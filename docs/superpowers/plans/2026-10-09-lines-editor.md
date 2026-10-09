# Lines Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Sequencer gets a Steps | Lines view. Lines is a Warp-style editor with a tab per track plus a Master tab. Each line has Amount and its own Length in beats. The master line multiplies every track's Dry/wet. The shared line editor gains Serum-style drawing shortcuts.

**Architecture:**
- **Data.** `TrackLine` gains `amount`, `beats` and `gridY`. The store gains a `master` line.
- **Playback.** `useEffectSequencerPlayback` runs one transport beat counter. Every line (tracks and master) reads its phase from that counter.
- **Master.** `mixModulation` holds a master level that scales every sequencer-driven mix: Line tracks per frame, and Steps tracks per frame while a step is open.
- **Editor.** `LinePlot` (shared with the Warp) learns the new modifier gestures. A new `LinesView` builds the tabbed editor from `LinePlot`, `LinesMenu`, `SaveLine` and `Spin`, and replaces `LineToolbar` and the editable lane.

**Tech Stack:** React 19, TypeScript, zustand 5, Vite 7. Verification uses the puppeteer harness `.superpowers/sdd/layout-check.mjs` (gitignored); the repo has no unit-test runner.

**Spec:** `docs/superpowers/specs/2026-10-09-lines-editor-design.md`. Mockup: `docs/superpowers/specs/assets/2026-10-09-lines-editor/lines2.png`. The Line tracks spec (`2026-10-08-line-tracks-design.md`) holds wherever this spec is silent.

## Global Constraints

- **Point convention.** y = 0 is drawn at the top (full) and y = 1 at the bottom (dry).
- **Level:** `level = 1 − amount × sampleLine(points, skewPhase(p, skew))`, clamped to 0..1, and never NaN.
- **Defaults.** `defaultTrackLine()` = `{ points: [{x:0,y:0},{x:1,y:0}], snap: 1/16, skew: 0, amount: 1, beats: 4, gridY: 8 }`. The master is `{ line: defaultTrackLine(), enabled: true }`.
- **Allowed values.** `LINE_BEATS = [0.5, 1, 2, 4, 8, 16]` and `GRID_Y = [2, 3, 4, 6, 8, 12, 16]`. Invalid values are ignored. `amount` is clamped to 0..1.
- **Phase:** `(beats mod line.beats) / line.beats`, where `beats` is the transport beat counter. The counter starts at 0 on Play and grows each frame by `dt_ms × bpm / 60000`.
- **Mix:**
  - Line track: `ceiling × trackLevel × masterLevel`.
  - Open Steps step: `gateOpenLevel × masterLevel`.
  - Closed step: 0.
  - Skip a write within 1e-4 of the stored value.
  - Audio and MIDI gates win (no master or line).
  - Stop restores the user's value.
- **Master level** is 1 when the master is disabled, the sequencer is stopped, or nothing set it.
- **Grids.** X grid = Quantize, or 1/16 when Quantize is Off. Y grid = `gridY` divisions, or 16 for the Warp.
- **Locks.** The master's lock key in `seg.lines.locks` is `__master`.
- **Not saved.** Lines are not saved in banks or presets.
- **Harness:**
  - Run with `PATH=/opt/homebrew/bin:$PATH`.
  - Kill and restart Vite on :5173 before each harness run: `lsof -ti:5173 | xargs kill -9; (npx vite --port 5173 --strictPort > /tmp/vite.log 2>&1 &); sleep 4`.
  - Never run `git stash`.
  - Leave Vite running.
- **Copy rules** for user-visible text: no em dashes and no short codes; full effect names come from `getEffectInfo(id).name`.
- **Commit trailers.** Every commit ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ
  ```

## Review Focus

1. **Master on, a Steps track whose step closes mid-frame.** The closed step must read 0, never `base × master`. The test is in Task 1, check 6.
2. **Turning the master Off while playing.** Every open Steps track returns to exactly `gateOpenLevel` (no residue at the last master value). The test is in Task 1, check 7.
3. **BPM change mid-play.** The phase must not jump. It keeps advancing, only at the new rate. The test is in Task 1, check 4b.
4. **Alt released mid-drag.** Snapping stops on the next pointer move. The test is in Task 2, check 3b.
5. **The open tab's effect leaves the chain.** The Lines view falls back to Master with no page errors. The test is in Task 3, check 7.

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/stores/effectSequencerStore.ts` | `TrackLine` fields, `LINE_BEATS`, `GRID_Y`, `mergeLine`, `master`, `setMasterLine`, `setMasterEnabled` | 1 |
| `src/effects/lines/lineLevel.ts` | `lineLevel(points, phase, skew, amount = 1)` | 1 |
| `src/effects/lines/linePhase.ts` | `getMasterPhase` / `setMasterPhase`, cleared with the rest | 1 |
| `src/effects/mixModulation.ts` | `setMasterLevel`, `getMasterLevel`, `clearMaster`, `isGateOpen`; `noteModulatedMix` × master | 1 |
| `src/hooks/useEffectSequencerPlayback.ts` | Beat counter, line pass on beats, master pass, Steps open-step × master | 1 |
| `src/components/performance/lines/LinePlot.tsx` | `gridY` prop, Serum gestures, double-click add, horizontal grid at `1/gridY` | 2 |
| `src/components/performance/lines/lineTools.ts` | New Draw status text | 2 |
| `src/stores/uiStore.ts` | `sequencerView`, `lineTab` and their setters | 3 |
| `src/components/sequencer/LinesView.tsx` (new) | Tab row, editor, bar, side panel | 3 |
| `src/components/sequencer/LineTabs.tsx` (new) | Tab row with mini lines (and the Alt-drag copy, in Task 4) | 3, 4 |
| `src/components/sequencer/LineSidePanel.tsx` (new) | Track and Master side panels, readout, dice and locks | 3 |
| `src/components/sequencer/lineDice.ts` (new) | `diceLine`, `diceMaster`, `diceAllLines` (moved out of LineToolbar) | 3 |
| `src/components/sequencer/LineLane.tsx` | Preview only; a click opens the Lines view on that tab | 3 |
| `src/components/sequencer/LineToolbar.tsx` | Deleted | 3 |
| `src/components/sequencer/SequencerTransport.tsx` | Steps \| Lines switch; the step tools always show in Steps | 3 |
| `src/components/sequencer/UnifiedSequencerPanel.tsx` | Renders `LinesView` when `sequencerView === 'lines'` | 3 |
| `src/components/sequencer/EffectTrackRow.tsx` | Drops the editable lane and line info | 3 |
| `src/components/sequencer/lineFormat.ts` | `fmtBeats` | 3 |
| `src/components/performance/layout.css` | Lines view styles, narrow layout | 3, 4 |
| `CLAUDE.md` | Line tracks section rewritten for the Lines view | 4 |
| `.superpowers/sdd/layout-check.mjs` | Modes `lines2engine`, `lineshortcuts`, `lineseditor`; obsolete `linesengine`/`linesui`/`linestools` checks updated | 1–4 |

---

### Task 1: Model, beat clock and master line engine

**Files:**
- Modify: `src/stores/effectSequencerStore.ts`, `src/effects/lines/lineLevel.ts`, `src/effects/lines/linePhase.ts`, `src/effects/mixModulation.ts`, `src/hooks/useEffectSequencerPlayback.ts`
- Test: `.superpowers/sdd/layout-check.mjs` (new mode `lines2engine`; update `linesengine` checks 1 and 4)

**Interfaces:**
- Produces:
  - `LINE_BEATS`, `GRID_Y`, `mergeLine(cur: TrackLine | undefined, patch: Partial<TrackLine>): TrackLine`;
  - store `master: { line: TrackLine; enabled: boolean }`, `setMasterLine(patch)`, `setMasterEnabled(on)`;
  - `lineLevel(points, phase, skew, amount?)`;
  - `getMasterPhase(): number | null`;
  - `getMasterLevel(): number`.

  Later tasks rely on these exact names.

- [ ] **Step 1: Write the failing harness mode `lines2engine`**

Add it after the `linestools` block in `.superpowers/sdd/layout-check.mjs`. It reuses that file's `populate`, `evr`, `open`, `say` and `wait` helpers. The `sq` helper is the same as `linesengine`'s:

```js
if (MODE === 'lines2engine') {
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
    return eval(expr)
  }, [expr, a])
  const ids = await evr(async () => {
    const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState()
    const R = (await import('/src/config/effectParams.ts')).EFFECT_PARAM_REGISTRY
    const order = (await import('/src/stores/routingStore.ts')).useRoutingStore.getState().effectOrder
    return order.filter((id) => S.tracks[id] && R[id]?.getEnabled()).slice(0, 2)
  })
  say('0 two enabled tracks', ids.length === 2, ids.join(','))
  const [A, B] = ids
  await sq('(S.getState().setBpm(120), S.getState().setResolution("1/16"), 0)')
  await sq('(G.getState().setEffectMix(a, 0.8), 0)', A)
  await sq('(G.getState().setEffectMix(a, 0.6), 0)', B)

  // 1. model: new fields, defaults and validation
  await sq('(S.getState().setTrackMode(a, "line"), 0)', A)
  say('1 default line has amount 1, beats 4, gridY 8', await sq('JSON.stringify(S.getState().tracks[a].line)', A) === JSON.stringify({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0, amount: 1, beats: 4, gridY: 8 }))
  await sq('(S.getState().setTrackLine(a, { amount: 7, beats: 3, gridY: 5 }), 0)', A)
  say('1 invalid values: amount clamps, bad beats and gridY are ignored', await sq('JSON.stringify([S.getState().tracks[a].line.amount, S.getState().tracks[a].line.beats, S.getState().tracks[a].line.gridY])', A) === '[1,4,8]')
  say('1 master default', await sq('JSON.stringify(S.getState().master)') === JSON.stringify({ line: { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0, amount: 1, beats: 4, gridY: 8 }, enabled: true }))
  say('1 lineLevel with amount 0.5 at the bottom is 0.5', Math.abs(await sq('L.lineLevel([{x:0,y:1},{x:1,y:1}], 0.3, 0, 0.5)') - 0.5) < 1e-6)

  // 2. amount: Half on at amount 0.5 gives base × 0.5 in the second half
  await sq('(S.getState().setTrackLine(a, { points: R.lanePresetPoints("Half on", 1/16), amount: 0.5, beats: 2 }), 0)', A)
  await sq('(T.linkedPlay(), 0)'); await wait(300)
  let ok2 = 0, n2 = 0
  for (let i = 0; i < 14; i++) {
    await wait(90)
    const [mix, ph] = await sq('[G.getState().effectMix[a], P.getLinePhase(a)]', A)
    if (ph > 0.55 && ph < 0.95) { n2++; if (Math.abs(mix - 0.4) < 0.01) ok2++ }
  }
  say('2 amount 0.5: the second half plays at 0.8 × 0.5', n2 > 0 && ok2 === n2, `${ok2}/${n2}`)

  // 3. length: beats 2 at 120 BPM wraps every 1 s
  const wraps = []
  let prev = await sq('P.getLinePhase(a)', A)
  const t0 = Date.now()
  while (Date.now() - t0 < 2600) { await wait(25); const ph = await sq('P.getLinePhase(a)', A); if (ph < prev - 0.5) wraps.push(Date.now()); prev = ph }
  const gap = wraps.length >= 2 ? wraps[1] - wraps[0] : -1
  say('3 beats 2 at 120 BPM: the phase wraps every 1 s', Math.abs(gap - 1000) < 60, gap)

  // 4. every line restarts together; 4b. a BPM change mid-play bends without a jump
  await sq('(T.linkedStop(), 0)'); await wait(150)
  await sq('(S.getState().setTrackLine(a, { beats: 4 }), S.getState().setMasterLine({ beats: 4 }), T.linkedPlay(), 0)', A); await wait(400)
  const [pa, pm] = await sq('[P.getLinePhase(a), P.getMasterPhase()]', A)
  say('4 track and master with the same length share a phase', Math.abs(pa - pm) < 0.02, `${pa} ${pm}`)
  const before = await sq('P.getLinePhase(a)', A)
  await sq('(S.getState().setBpm(60), 0)'); await wait(40)
  const after = await sq('P.getLinePhase(a)', A)
  say('4b BPM change: no jump', after >= before && after - before < 0.03, `${before} -> ${after}`)
  await sq('(S.getState().setBpm(120), 0)')

  // 5. master on a Steps track: every step open, master Ramp down
  await sq('(S.getState().setTrackLine(a, { points: [{x:0,y:0},{x:1,y:0}], amount: 1 }), 0)', A)
  await sq('(S.getState().setTrackMode(a, "gate"), S.getState().tracks[a].steps.forEach((s, i) => { if (!s.active) S.getState().toggleStep(a, i) }), 0)', B)
  await sq('(S.getState().setMasterLine({ points: R.lanePresetPoints("Ramp down", 1/16), beats: 2 }), 0)')
  let ok5 = 0
  for (let i = 0; i < 8; i++) {
    await wait(130)
    const [mix, ph] = await sq('[G.getState().effectMix[a], P.getMasterPhase()]', B)
    const want = 0.6 * (1 - ph)
    if (Math.abs(mix - want) < 0.05) ok5++; else console.log('   steps×master', mix, want, ph)
  }
  say('5 master scales an open Steps track', ok5 >= 7, `${ok5}/8`)

  // 6. a closed step reads 0 under the master
  await sq('(S.getState().tracks[a].steps.forEach((s, i) => { if (s.active) S.getState().toggleStep(a, i) }), 0)', B)
  await wait(400)
  let zeros = 0
  for (let i = 0; i < 6; i++) { await wait(60); if (await sq('G.getState().effectMix[a]', B) === 0) zeros++ }
  say('6 closed steps stay 0 under the master', zeros === 6, zeros)

  // 6b. master on a Line track: mix = ceiling × track × master
  let ok6 = 0
  await sq('(S.getState().setTrackLine(a, { points: R.lanePresetPoints("Half on", 1/16), beats: 4, amount: 1 }), 0)', A)
  for (let i = 0; i < 8; i++) {
    await wait(120)
    const [mix, lv, mv] = await sq('[G.getState().effectMix[a], L.lineLevel(S.getState().tracks[a].line.points, P.getLinePhase(a), 0, 1), M.getMasterLevel()]', A)
    if (Math.abs(mix - 0.8 * lv * mv) < 0.05) ok6++
  }
  say('6b Line track: ceiling × line × master', ok6 >= 7, `${ok6}/8`)

  // 7. master off: open Steps tracks return exactly to the base; the master writes nothing
  await sq('(S.getState().tracks[a].steps.forEach((s, i) => { if (!s.active) S.getState().toggleStep(a, i) }), 0)', B)
  await sq('(S.getState().setMasterEnabled(false), 0)'); await wait(300)
  say('7 master off: the level is 1 and the Steps track is back at its base', await sq('M.getMasterLevel()') === 1 && Math.abs(await sq('G.getState().effectMix[a]', B) - 0.6) < 1e-4)

  // 8. Stop restores both mixes and clears the master
  await sq('(S.getState().setMasterEnabled(true), 0)'); await wait(200)
  await sq('(T.linkedStop(), 0)'); await wait(250)
  const rest = await sq('[G.getState().effectMix[a], M.getMasterLevel(), P.getMasterPhase()]', A)
  const restB = await sq('G.getState().effectMix[a]', B)
  say('8 Stop restores the user mixes and clears the master', Math.abs(rest[0] - 0.8) < 1e-4 && Math.abs(restB - 0.6) < 1e-4 && rest[1] === 1 && rest[2] === null, JSON.stringify(rest))

  await sq('(S.getState().setTrackMode(a, "gate"), 0)', A)
  say('page errors', errors.length === 0, errors.join(' | '))
}
```

`toggleStep` is the store's existing step toggle; if the store calls it something else, use that name (check with `grep -n "toggleStep\|setStepActive" src/stores/effectSequencerStore.ts`).

Also update `linesengine`, because Task 1 changes the behaviour these two checks expect:
- **Check 1:** expect the new default JSON, with `amount: 1, beats: 4, gridY: 8`.
- **Check 4:** a Line track no longer follows time scale. Replace it with: set B to Line with `beats: 2` and A to `beats: 4`, then expect B's phase to advance about twice as fast as A's (`Math.abs(sB / sA - 2) < 0.35`). Keep the label prefix "4".

- [ ] **Step 2: Run it to verify it fails**

Restart Vite, then run `PATH=/opt/homebrew/bin:$PATH node .superpowers/sdd/layout-check.mjs lines2engine`.
Expected: FAIL on check 1 (no `amount` field), and `getMasterPhase is not a function` errors.

- [ ] **Step 3: Store: fields, `mergeLine`, master**

In `src/stores/effectSequencerStore.ts`:

```ts
export const LINE_BEATS = [0.5, 1, 2, 4, 8, 16] as const
export const GRID_Y = [2, 3, 4, 6, 8, 12, 16] as const

/** A line (spec §1): warp-format points (y 0 = full, 1 = dry), quantize grid, skew, depth, loop length and Y grid. */
export interface TrackLine {
  points: WarpPoint[]
  snap: number
  skew: number
  amount: number // 0..1: how deep the line cuts
  beats: number  // one of LINE_BEATS: the line's own loop
  gridY: number  // one of GRID_Y: the vertical snap grid
}

export const defaultTrackLine = (): TrackLine => ({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], snap: 1 / 16, skew: 0, amount: 1, beats: 4, gridY: 8 })

/** `cur` (or the default, filling fields an older line lacks) with the valid parts of `patch`. */
export function mergeLine(cur: TrackLine | undefined, patch: Partial<TrackLine>): TrackLine {
  const next: TrackLine = { ...defaultTrackLine(), ...cur }
  if (patch.points !== undefined) { const p = cleanPoints(patch.points); if (p) next.points = p }
  if (patch.snap !== undefined && SNAPS.includes(patch.snap)) next.snap = patch.snap
  if (patch.skew !== undefined && Number.isFinite(patch.skew)) next.skew = Math.max(-1, Math.min(1, patch.skew))
  if (patch.amount !== undefined && Number.isFinite(patch.amount)) next.amount = Math.max(0, Math.min(1, patch.amount))
  if (patch.beats !== undefined && (LINE_BEATS as readonly number[]).includes(patch.beats)) next.beats = patch.beats
  if (patch.gridY !== undefined && (GRID_Y as readonly number[]).includes(patch.gridY)) next.gridY = patch.gridY
  return next
}
```

`setTrackLine` becomes:

```ts
return { tracks: { ...state.tracks, [effectId]: { ...track, line: mergeLine(track.line, patch) } } }
```

Changes to the state interface:
- Add `master: { line: TrackLine; enabled: boolean }`, `setMasterLine: (patch: Partial<TrackLine>) => void` and `setMasterEnabled: (on: boolean) => void`.
- Initial state: `master: { line: defaultTrackLine(), enabled: true }`.
- Implementations:
  - `setMasterLine: (patch) => set((s) => ({ master: { ...s.master, line: mergeLine(s.master.line, patch) } }))`
  - `setMasterEnabled: (on) => set((s) => ({ master: { ...s.master, enabled: !!on } }))`
- `ensureTrack` already uses `defaultTrackLine()` for new tracks. An existing track with an old line is filled in by `mergeLine` on its next write, and readers use `{ ...defaultTrackLine(), ...track.line }`; see the `lineOf` helper in Step 6.
- `partialize` stays unchanged: lines and the master are not persisted.

- [ ] **Step 4: `lineLevel` amount, master phase**

In `lineLevel.ts`, the signature becomes `lineLevel(points, phase, skew, amount = 1)`, and the value becomes:

```ts
  const a = amount > 0 ? (amount < 1 ? amount : 1) : 0
  const v = 1 - a * y
```

The clamping below is unchanged. NaN still reads as 1.

`linePhase.ts`:

```ts
let masterPhase: number | null = null
export const getMasterPhase = (): number | null => masterPhase
export const setMasterPhase = (p: number | null): void => { masterPhase = p }
```

`clearLinePhases()` also sets `masterPhase = null`.

- [ ] **Step 5: `mixModulation`: master level**

```ts
// Master line (lines editor spec §3): one multiplier on every sequencer-driven mix; 1 = no effect
let masterLevel = 1
export function setMasterLevel(level: number): void { masterLevel = level > 0 ? (level < 1 ? level : 1) : 0 }
export function getMasterLevel(): number { return masterLevel }
export function clearMaster(): void { masterLevel = 1 }
/** True while the sequencer gate drives this effect and its current step is open. */
export function isGateOpen(effectId: string): boolean { return gateOpen.get(effectId) === true }
```

In `noteModulatedMix`, the last line becomes:

```ts
  return (line === undefined ? value : value * line) * (gate !== undefined || line !== undefined ? masterLevel : 1)
```

Update the header comment's rule paragraph to add: "While the sequencer drives an effect (gate or line), the master line multiplies the result."

- [ ] **Step 6: Playback: beat counter, line pass, master pass**

In `useEffectSequencerPlayback.ts`:

Add `const beats = useRef(0)` and `const masterWasActive = useRef(false)`, then:
- On Play (the `isPlaying` effect): `beats.current = 0`.
- On Stop: `clearMaster()`, `masterWasActive.current = false` (alongside `clearLines()`; `clearLinePhases()` also nulls the master phase).
- At the top of `playbackLoop`, after `dt` is computed:

  ```ts
  beats.current += (dt * 1000 * useEffectSequencerStore.getState().bpm) / 60000
  ```

  The loop's `dt` is in seconds. Use the store's `bpm` (not the closure's), so a mid-play BPM change takes effect on the next frame without a jump.

Add a module helper:

```ts
const lineOf = (l: TrackLine | undefined): TrackLine => (l && l.amount !== undefined && l.beats !== undefined && l.gridY !== undefined ? l : { ...defaultTrackLine(), ...l })
const phaseOf = (b: number, len: number) => (((b % len) + len) % len) / len
```

**Master pass.** Put it at the start of the line block, before the Line track loop:

```ts
const { master } = useEffectSequencerStore.getState()
const ml = lineOf(master.line)
const mPhase = phaseOf(beats.current, ml.beats)
setMasterPhase(mPhase)
const mLevel = master.enabled ? lineLevel(ml.points, mPhase, ml.skew, ml.amount) : 1
setMasterLevel(mLevel)
```

**Line pass.** In the existing loop, replace the phase computation (the `ms`, `last`, `f`, `len` and `phase` lines) with:

```ts
const line = lineOf(track.line)
const phase = phaseOf(beats.current, line.beats)
const level = lineLevel(line.points, phase, line.skew, line.amount)
setLinePhase(effectId, phase)
setLineLevel(effectId, level)
const mix = gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * level * mLevel
```

The 1e-4 write guard is unchanged.

**Steps under the master.** Add this after the Line track loop:

```ts
// Open Steps tracks follow the master every frame while it is active, plus one frame after it returns to 1
const masterActive = mLevel !== 1
if (masterActive || masterWasActive.current) {
  for (const effectId of effectOrder) {
    const track = latest[effectId]
    if (!track || track.mode !== 'gate' || !isGateOpen(effectId)) continue
    if (track.muted || (hasSolo && !track.soloed)) continue
    if (track.midiGate || track.audioGate || track.audioReactive.enabled) continue
    const mix = gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * mLevel
    if (Math.abs((ge.effectMix[effectId] ?? 1) - mix) > 1e-4) ge.setEffectMix(effectId, mix)
  }
}
masterWasActive.current = masterActive
```

**Step writes.** Every place that writes an open step's mix in `executeTrackAtStep` and in the retrig and audio-reactive paths uses `gateOpenLevel(...)`. Multiply each by `getMasterLevel()`. Find them with `grep -n "gateOpenLevel" src/hooks/useEffectSequencerPlayback.ts`. The line pass's own release write (`ge.setEffectMix(id, gateOpenLevel(id, baseMix.current[id]))`) is NOT multiplied: it hands the mix back to the user.

Add the new imports: `setMasterLevel`, `getMasterLevel`, `clearMaster` and `isGateOpen` from mixModulation; `setMasterPhase` from linePhase; and `type TrackLine` from the store.

Update the `useEffectSequencerPlayback.ts` comments: the line block's header is "Lines (lines editor spec §2–§3): every line's phase comes from the beat counter; Dry/wet = ceiling × line × master".

- [ ] **Step 7: Run the harness**

Restart Vite, then run `lines2engine`, `linesengine`, `linesui`, `linestools` and `warpmod`.
Expected: all OK. If `linesui` or `linestools` assert the old default JSON or span text, update only those expectations, and report each change in the task report.

Then run `npm run build` and `npx eslint src --quiet`. Expected: no errors, and no new lint problems compared with master.

- [ ] **Step 8: Commit**

```bash
git add src/stores/effectSequencerStore.ts src/effects/lines/lineLevel.ts src/effects/lines/linePhase.ts src/effects/mixModulation.ts src/hooks/useEffectSequencerPlayback.ts
git commit -m "feat: lines editor: line amount, beat clock and master line engine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

---

### Task 2: Serum-style shortcuts in `LinePlot`

**Files:**
- Modify: `src/components/performance/lines/LinePlot.tsx`, `src/components/performance/lines/lineTools.ts`
- Test: `.superpowers/sdd/layout-check.mjs` (new mode `lineshortcuts`, run on the Warp graph, which exists today)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: the `LinePlotProps.gridY?: number` prop (default 16). The Lines view (Task 3) passes `line.gridY`.

- [ ] **Step 1: Write the failing harness mode `lineshortcuts`**

The mode drives the Warp tab's graph (`[data-warp-graph]`) with real mouse events. Set up with `snap: 1/16`, so the X grid is 1/16; the Warp's Y grid is 16. Helpers:

```js
if (MODE === 'lineshortcuts') {
  await open(1440, 900)
  const W = (expr) => evr(async (expr) => { const W = (await import('/src/stores/warpStore.ts')).useWarpStore; return eval(expr) }, expr)
  await evr(async () => { const U = (await import('/src/stores/uiStore.ts')).useUIStore.getState(); U.setBottomTab('warp') })
  await wait(400)
  await W('(W.getState().patch({ points: [{x:0,y:0},{x:1,y:0}], snap: 1/16, skew: 0 }), 0)')
  const box = await p.$eval('[data-warp-graph]', (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })
  const PAD = 6
  const at = (x, y) => [box.x + PAD + x * (box.w - 2 * PAD), box.y + PAD + y * (box.h - 2 * PAD)]
  const drag = async (from, to, keys = []) => {
    for (const k of keys) await p.keyboard.down(k)
    await p.mouse.move(...at(...from)); await p.mouse.down()
    for (let i = 1; i <= 8; i++) await p.mouse.move(...at(from[0] + (to[0] - from[0]) * i / 8, from[1] + (to[1] - from[1]) * i / 8))
    await p.mouse.up()
    for (const k of keys) await p.keyboard.up(k)
    await wait(80)
  }
  const pts = () => W('JSON.stringify(W.getState().points)').then(JSON.parse)
  const onGrid = (v, n) => Math.abs(v * n - Math.round(v * n)) < 1e-6

  // 1. Alt + Shift + drag paints steps on both grids
  await drag([0.13, 0.33], [0.6, 0.71], ['Alt', 'Shift'])
  let P = await pts()
  say('1 Alt+Shift steps: x and y on the grids', P.length > 4 && P.every((q) => onGrid(q.x, 16) && onGrid(q.y, 16)), JSON.stringify(P.slice(0, 6)))

  // 2. Shift + drag paints steps with free heights
  await W('(W.getState().patch({ points: [{x:0,y:0},{x:1,y:0}] }), 0)')
  await drag([0.13, 0.331], [0.6, 0.331], ['Shift'])
  P = await pts()
  say('2 Shift steps: x on the grid, heights free', P.some((q) => q.x > 0 && q.x < 1 && !onGrid(q.y, 16)) && P.every((q) => onGrid(q.x, 16)), JSON.stringify(P.slice(0, 4)))

  // 3. Alt + drag a point snaps both axes; 3b. Alt released mid-drag stops snapping
  await W('(W.getState().patch({ points: [{x:0,y:0},{x:0.5,y:0.5},{x:1,y:0}] }), 0)')
  await drag([0.5, 0.5], [0.53, 0.307], ['Alt'])
  P = await pts()
  say('3 Alt drag a point: both axes snap', onGrid(P[1].x, 16) && onGrid(P[1].y, 16), JSON.stringify(P[1]))
  await p.keyboard.down('Alt')
  await p.mouse.move(...at(P[1].x, P[1].y)); await p.mouse.down()
  await p.mouse.move(...at(0.5, 0.41)); await p.keyboard.up('Alt')
  await p.mouse.move(...at(0.5, 0.413)); await p.mouse.up(); await wait(80)
  P = await pts()
  say('3b Alt released mid-drag: the height is free again', !onGrid(P[1].y, 16), JSON.stringify(P[1]))

  // 4. Alt + drag a bend handle moves every bend by the same amount
  await W('(W.getState().patch({ points: [{x:0,y:0},{x:0.25,y:1},{x:0.5,y:0},{x:0.75,y:1},{x:1,y:0}] }), 0)')
  await wait(80)
  const mid = await p.$eval('[data-warp-bend="2"] circle', (c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })
  await p.keyboard.down('Alt'); await p.mouse.move(...mid); await p.mouse.down()
  for (let i = 1; i <= 6; i++) await p.mouse.move(mid[0], mid[1] - i * 6)
  await p.mouse.up(); await p.keyboard.up('Alt'); await wait(80)
  P = await pts()
  const bends = P.slice(1).map((q) => q.bend ?? 0)
  say('4 Alt bend: every segment got the same bend change', bends[0] !== 0 && bends.every((b) => Math.abs(b - bends[0]) < 1e-6), JSON.stringify(bends))

  // 5. double-click on empty space adds exactly one point; 5b. double-click on a point removes it
  await W('(W.getState().patch({ points: [{x:0,y:0},{x:1,y:0}] }), 0)')
  await p.mouse.click(...at(0.4, 0.6), { clickCount: 1 }); await p.mouse.click(...at(0.4, 0.6), { clickCount: 2 }); await wait(100)
  P = await pts()
  say('5 double-click on empty space adds one point', P.length === 3, JSON.stringify(P))
  await p.mouse.click(...at(P[1].x, P[1].y), { clickCount: 1 }); await p.mouse.click(...at(P[1].x, P[1].y), { clickCount: 2 }); await wait(100)
  say('5b double-click on a point removes it', (await pts()).length === 2)

  say('page errors', errors.length === 0, errors.join(' | '))
}
```

- [ ] **Step 2: Run it to verify it fails**

Restart Vite, then run `lineshortcuts`.
Expected: checks 1, 2, 3 (x not snapped by Alt today), 4 and 5 FAIL.

- [ ] **Step 3: Implement in `LinePlot.tsx`**

1. **Props.** Add `gridY?: number` to `LinePlotProps` (doc: "Vertical snap grid: divisions from top to bottom. Default 16 (the Warp)"). Destructure it as `gridY = 16`.

2. **Snap helpers.** Replace `snapY`, and add `gridX`, `snapGridX` and `snapGridY`:

   ```ts
   const gridX = snap > 0 ? snap : 1 / 16
   const snapGridX = (x: number) => clamp01(Math.round(x / gridX) * gridX)
   const snapGridY = (y: number) => clamp01(Math.round(y * gridY) / gridY)
   const snapY = (y: number, alt: boolean) => (alt ? snapGridY(y) : y) // Alt snaps the height to the Y grid
   ```

3. **`movePoint`.** With `ev.altKey`, x uses `snapGridX(v.x)` instead of `snapX(v.x)`, still clamped between its neighbours; y uses `snapY(v.y, ev.altKey)`. Keys are read on each move, so releasing Alt mid-drag stops snapping on the next move.

4. **`bendSegment(i, e)`.** Gains Alt and Alt+Shift behaviour. Capture `startBends = getPoints().map(p => p.bend ?? 0)` and `startF` (the first move's fraction) at the drag start. On each move:
   - **Alt and Shift:** snap the midpoint height to the Y grid, then compute `f` from the snapped height: `const my = snapGridY(toVal(ev).y); f = (my - a.y) / (b.y - a.y)`, and set the bend with `bendForMid(f)` for segment i only.
   - **Alt only:** `delta = bendForMid(f) − startBends[i]`. For every segment k ≥ 1 with `|y_k − y_{k−1}| ≥ EPS` and `x_k − x_{k−1} ≥ EPS`, set the bend to `clamp(startBends[k] + delta, −1, 1)`, via `withBend`. Skip flat segments.
   - **No Alt:** as today.

5. **`paint`.** In `yOf`, steps mode no longer rounds to `1/n`:

   ```ts
   const yOf = (y: number, alt: boolean) => snapY(y, alt)
   ```

   Draw-mode painting also uses `snapY(y, alt)`. The `at(toVal(ev), ev.altKey)` calls already read Alt per move.

6. **`onPointerDown`, empty space.** `const p = { x: e.altKey ? snapGridX(v.x) : snapX(v.x), y: snapY(v.y, e.altKey) }`. Shift without Alt still goes to steps painting. Alt + Shift also goes to steps painting, which now snaps both axes through `snapY` and the columns.

7. **Double-click.** Keep a ref `const added = useRef<{ x: number; y: number; t: number } | null>(null)`. When `onPointerDown` adds a point on empty space, set `added.current = { x: p.x, y: p.y, t: performance.now() }`. In `onDoubleClick`, with the Draw tool:

   ```ts
   const i = hitPoint(e.clientX, e.clientY, cur)
   const a = added.current
   added.current = null
   // the double-click's first click already added this point: keep it (spec §5)
   if (i >= 0 && a && performance.now() - a.t < 600 && Math.abs(cur[i].x - a.x) < EPS && Math.abs(cur[i].y - a.y) < EPS) return
   if (i >= 0) { if (cur.length > 2 && i > 0 && i < cur.length - 1) { setPoints(cur.filter((_, k) => k !== i)); onSelect(null) } return }
   // empty space (e.g. the first click landed on an existing x): add one point
   const v = toVal(e), p = { x: snapX(v.x), y: v.y }
   let at = cur.length
   for (let k = 0; k < cur.length; k++) if (cur[k].x > p.x) { at = k; break }
   setPoints([...cur.slice(0, at), p, ...cur.slice(at)]); onSelect(at)
   ```

   Endpoints are kept, as the spec requires. Today's code allowed deleting an endpoint on a line with more than 2 points; the spec says endpoints are kept.

8. **Horizontal grid.** The back SVG draws a horizontal line at every `k / gridY` (k = 1 … gridY − 1), replacing the fixed `[0.25, 0.5, 0.75]`. Use `var(--border)` where `k / gridY` is 0.5, and `var(--warp-grid)` elsewhere.

9. **Status text.** `STATUS.draw` and the Draw entry in `LINE_TOOLS` (`lineTools.ts`) become exactly: `Click or double-click to add a point, drag to move, double-click a point to delete. Shift paints steps, Alt snaps to the grid, Alt-drag a curve handle moves every curve.` `STATUS_POINT` becomes `Drag to move this point (Alt snaps it to the grid). Double-click to delete it. Arrows nudge, Delete removes`. `STATUS_BEND` becomes `Drag up or down to bend this segment. Alt bends every segment, Alt and Shift snap the curve's middle to the grid`.

- [ ] **Step 4: Run the harness**

Restart Vite, then run `lineshortcuts`, `warpui`, `warpdice`, `linesui` and `linestools`.
Expected: all OK. `warpui` and `linesui` may assert the old status text or step heights rounded to 1/n; update only those expectations to the new behaviour, and list each change in the report.

Then run `npm run build` and `npx eslint src --quiet`.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/lines/LinePlot.tsx src/components/performance/lines/lineTools.ts
git commit -m "feat: lines editor: Serum-style drawing shortcuts in the shared line editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

---

### Task 3: The Lines view (tabs, editor, bar, side panel)

**Files:**
- Create: `src/components/sequencer/LinesView.tsx`, `LineTabs.tsx`, `LineSidePanel.tsx`, `lineDice.ts`
- Modify: `src/stores/uiStore.ts`, `src/components/sequencer/SequencerTransport.tsx`, `UnifiedSequencerPanel.tsx`, `EffectTrackRow.tsx`, `LineLane.tsx`, `lineFormat.ts`, `src/components/performance/layout.css`
- Delete: `src/components/sequencer/LineToolbar.tsx`
- Test: `.superpowers/sdd/layout-check.mjs` (new mode `lineseditor`, checks 1–8 and 10; `linesui` and `linestools` retired, see Step 7)

**Interfaces:**
- Consumes:
  - from Task 1: `mergeLine`, `LINE_BEATS`, `GRID_Y`, `master`, `setMasterLine`, `setMasterEnabled`, `lineLevel(…, amount)`, `getLinePhase`, `getMasterPhase`, `getMasterLevel`;
  - from Task 2: the `LinePlot` `gridY` prop.
- Produces:
  - `useUIStore`: `sequencerView: 'steps' | 'lines'`, `setSequencerView(v)`, `lineTab: string` (`'master'` or an effect id), `setLineTab(t)`;
  - `lineDice.ts`: `diceLine(id)`, `diceMaster()`, `diceAllLines()`;
  - `LineTabs` with `data-line-tab="<id|master>"`. Task 4 adds Alt-drag to `LineTabs`.

- [ ] **Step 1: Write the failing harness mode `lineseditor`**

Selectors the UI must emit:
- `[data-seq-view]` buttons with values `steps` and `lines`;
- `[data-lines-view]`;
- `[data-line-tabs]`, with `[data-line-tab]` items, each with `data-mode` (`line` or `gate`) and a mini `svg path`;
- `[data-line-graph]`;
- `[data-line-setting="amount"|"beats"|"snap"|"gridy"|"skew"]`;
- `[data-line-side="track"|"master"]`;
- `[data-line-readout]`;
- `[data-line-master-toggle]`;
- `[data-line-dice="track"|"master"|"all"]`;
- `[data-line-lock="<id|__master>"]`;
- `[data-line-lane]` (the previews in the Steps view).

Checks:

```js
if (MODE === 'lineseditor') {
  await open(1440, 900)
  await populate()
  const sq = (expr, a) => evr(async ([expr, a]) => {
    const S = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore
    const U = (await import('/src/stores/uiStore.ts')).useUIStore
    const K = (await import('/src/components/sequencer/lineLocks.ts')).useLineLockStore
    const O = (await import('/src/stores/routingStore.ts')).useRoutingStore
    return eval(expr)
  }, [expr, a])
  await sq('(U.getState().setBottomTab("sequencer"), 0)'); await wait(300)
  const chain = await sq('O.getState().effectOrder.filter((id) => S.getState().tracks[id] && document.querySelector(`[data-track-row="${id}"]`))')
  const [A, B] = chain
  await sq('(S.getState().setTrackMode(a, "line"), 0)', A)

  // 1. the view switch, the preview, and a preview click opening the Lines view on that tab
  say('1 Steps view: a preview lane, no editor', !!(await p.$(`[data-line-lane="${A}"]`)) && !(await p.$('[data-lines-view]')) && !(await p.$('[data-line-tools]')))
  await p.click(`[data-line-lane="${A}"]`); await wait(250)
  say('1 a preview click opens Lines on that tab', !!(await p.$('[data-lines-view]')) && await sq('U.getState().lineTab') === A)
  await p.click('[data-seq-view="steps"]'); await wait(200)
  say('1 the switch goes back to Steps', !(await p.$('[data-lines-view]')) && !!(await p.$(`[data-line-lane="${A}"]`)))
  await p.click('[data-seq-view="lines"]'); await wait(250)

  // 2. tabs: Master first, then the chain in order; modes and mini lines
  const tabs = await p.$$eval('[data-line-tab]', (els) => els.map((e) => [e.getAttribute('data-line-tab'), e.getAttribute('data-mode'), !!e.querySelector('svg path')]))
  say('2 tabs: Master then the chain', tabs[0][0] === 'master' && JSON.stringify(tabs.slice(1).map((t) => t[0])) === JSON.stringify(chain), JSON.stringify(tabs.map((t) => t[0])))
  say('2 modes and mini lines', tabs.find((t) => t[0] === A)[1] === 'line' && tabs.find((t) => t[0] === B)[1] === 'gate' && tabs.every((t) => t[2]))

  // 3. editing the open tab's line through the graph and the bar
  await p.click(`[data-line-tab="${A}"]`); await wait(150)
  const g = await p.$eval('[data-line-graph]', (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height * 0.6] })
  await p.mouse.click(g[0], g[1]); await wait(100)
  say('3 a click in the graph adds a point to that track', (await sq('S.getState().tracks[a].line.points.length', A)) === 3)
  await p.focus(`[data-line-setting="amount"]`); await p.keyboard.press('ArrowDown')
  await p.focus(`[data-line-setting="beats"]`); await p.keyboard.press('ArrowDown')
  await p.focus(`[data-line-setting="gridy"]`); await p.keyboard.press('ArrowUp')
  say('3 bar: amount 0.99, beats 2, gridY 12', await sq('JSON.stringify([S.getState().tracks[a].line.amount, S.getState().tracks[a].line.beats, S.getState().tracks[a].line.gridY])', A) === '[0.99,2,12]')

  // 4. side panel: the track's switch, the master tab's toggle
  say('4 track side panel', !!(await p.$('[data-line-side="track"]')))
  await p.click('[data-line-tab="master"]'); await wait(150)
  say('4 master side panel', !!(await p.$('[data-line-side="master"]')))
  await p.click('[data-line-master-toggle]'); await wait(80)
  say('4 the master toggle turns it off', await sq('S.getState().master.enabled') === false)
  await p.click('[data-line-master-toggle]')

  // 5. dice: master dice changes only the master; Dice all respects locks, including __master
  const before = await sq('JSON.stringify([S.getState().master.line.points, S.getState().tracks[a].line.points])', A)
  await p.click('[data-line-dice="master"]'); await wait(80)
  const after = JSON.parse(await sq('JSON.stringify([S.getState().master.line.points, S.getState().tracks[a].line.points])', A))
  say('5 master dice changes only the master', JSON.stringify(after[0]) !== JSON.stringify(JSON.parse(before)[0]) && JSON.stringify(after[1]) === JSON.stringify(JSON.parse(before)[1]))
  await sq('(K.getState().locks.__master || K.getState().toggleLock("__master"), 0)')
  const m0 = await sq('JSON.stringify(S.getState().master.line.points)')
  await p.click('[data-line-dice="all"]'); await wait(80)
  say('5 Dice all: a locked master is kept, the unlocked Line track changes', await sq('JSON.stringify(S.getState().master.line.points)') === m0 && await sq('JSON.stringify(S.getState().tracks[a].line.points)', A) !== JSON.stringify(after[1]))
  await sq('(K.getState().toggleLock("__master"), 0)')

  // 6. readout while playing
  await evr(async () => (await import('/src/utils/sequencerTransport.ts')).linkedPlay())
  await p.click(`[data-line-tab="${A}"]`); await wait(500)
  const ro = await p.$eval('[data-line-readout]', (e) => e.textContent)
  say('6 readout shows line × master × Dry/wet while playing', /Line [\d.]+ × master [\d.]+ × \d+%/.test(ro) && /Now playing at \d+%/.test(ro), ro)
  await evr(async () => (await import('/src/utils/sequencerTransport.ts')).linkedStop())

  // 7. the open tab's effect leaves the chain: fall back to Master, no errors
  await sq('(U.getState().setLineTab(a), 0)', A)
  await evr(async (id) => (await import('/src/hooks/useEffectDisable.ts')).disableEffect?.(id), A)
  await wait(300)
  say('7 removing the open tab\'s effect falls back to Master', await sq('U.getState().lineTab') === 'master' || !(await p.$(`[data-line-tab="${A}"]`)), await sq('U.getState().lineTab'))

  // 8. layout at 1440 x 900: nothing overflows horizontally, the graph is at least 110 px tall
  const lay = await p.evaluate(() => { const v = document.querySelector('[data-lines-view]'); const gr = document.querySelector('[data-line-graph]'); return [document.documentElement.scrollWidth <= innerWidth, v.scrollWidth <= v.clientWidth + 1, gr.getBoundingClientRect().height] })
  say('8 no horizontal overflow, graph ≥ 110 px', lay[0] && lay[1] && lay[2] >= 110, JSON.stringify(lay))
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-kevin-Documents-web-strand-tracer/3acc0aca-07c8-4b03-877b-7bd1781a848d/scratchpad/mock/le-t3.png' })

  // 10. no Steps-view line toolbar is left anywhere
  await p.click('[data-seq-view="steps"]'); await wait(150)
  say('10 the old line toolbar is gone', !(await p.$('[data-line-tools]')))
  say('page errors', errors.length === 0, errors.join(' | '))
}
```

Check 7 needs to remove an effect from the chain. Use the same mechanism `linesengine` check 8 uses, and copy it exactly (`grep -n "8 " .superpowers/sdd/layout-check.mjs | sed -n 1,5p` within the `linesengine` block). Drop the `disableEffect?.` guess above if that block does it differently.

- [ ] **Step 2: Run it to verify it fails**

Restart Vite, then run `lineseditor`.
Expected: FAIL at check 1 (`[data-seq-view]` does not exist).

- [ ] **Step 3: uiStore, formatting and dice**

**`uiStore.ts`.** Add to the state:

```ts
sequencerView: 'steps' | 'lines'
setSequencerView: (v: 'steps' | 'lines') => void
lineTab: string // 'master' or an effect id (lines editor spec §4.2)
setLineTab: (t: string) => void
```

Initial values: `sequencerView: 'steps'`, `lineTab: 'master'`. The setters are plain `set` calls.

**`lineFormat.ts`.** Add:

```ts
const BEAT_NAMES: Record<string, string> = { '0.5': '½ beat', '1': '1 beat' }
/** A line's loop length as the bar shows it: ½ beat, 1 beat, 2 beats … 16 beats. */
export const fmtBeats = (b: number): string => BEAT_NAMES[String(b)] ?? `${b} beats`
/** The graph's top-left label: "1 bar loop" for 4 beats, "2 bars loop", "½ beat loop" … */
export const fmtLoop = (b: number): string => (b >= 4 ? `${b / 4} ${b === 4 ? 'bar' : 'bars'} loop` : `${fmtBeats(b)} loop`)
```

**`lineDice.ts`.** Move `diceLine` and `diceAllLines` here from `LineToolbar.tsx`, and add the master:

```ts
import { useEffectSequencerStore, defaultTrackLine } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { randomCurves, randomSteps } from '../../effects/warp/warpMath'
import { useLineLockStore } from './lineLocks'

export const MASTER_LOCK = '__master'
const roll = (snap: number) => (Math.random() < 0.5 ? randomSteps(snap || 1 / 16) : randomCurves(snap || 1 / 16))

/** Dice one Line track: random steps or curves, equal chance; snap, skew, amount, beats and gridY are kept. */
export function diceLine(id: string): void {
  const t = useEffectSequencerStore.getState().tracks[id]
  if (!t || t.mode !== 'line') return
  useEffectSequencerStore.getState().setTrackLine(id, { points: roll((t.line ?? defaultTrackLine()).snap) })
}

export function diceMaster(): void {
  const s = useEffectSequencerStore.getState()
  s.setMasterLine({ points: roll(s.master.line.snap) })
}

/** Every unlocked Line track, and the master unless it is locked. Steps tracks are never touched. */
export function diceAllLines(): void {
  const { tracks } = useEffectSequencerStore.getState()
  const { locks } = useLineLockStore.getState()
  const ids = Object.keys(tracks).filter((id) => tracks[id].mode === 'line' && !locks[id])
  ids.forEach(diceLine)
  const master = !locks[MASTER_LOCK]
  if (master) diceMaster()
  const n = ids.length + (master ? 1 : 0)
  useUIStore.getState().setStatusText(n ? `New lines on ${ids.length} ${ids.length === 1 ? 'track' : 'tracks'}${master ? ' and the master' : ''}` : 'Every line is locked, so the dice changed nothing')
}
```

- [ ] **Step 4: `LineTabs.tsx`**

`LineTabs` is a memo component with props `{ ids: string[] }` (the chain's track ids in order). It renders `<div className="seg-line-tabs" role="tablist" data-line-tabs>`, containing:
- **The Master tab:** `<button role="tab" data-line-tab="master" data-mode="line" aria-selected=…>`, with a `--warp` swatch, "Master", 🔒 when `locks.__master` is set, and a mini line.
- **One tab per id:** `data-line-tab={id}`, `data-mode={track.mode === 'line' ? 'line' : 'gate'}`, the effect colour swatch (`getEffectInfo(id).color`, or the `EFFECT_MAP` colour as `UnifiedSequencerPanel` does; pass `color` in with the ids if simpler), the full name, a badge `Line` or `Steps`, 🔒 when locked, and a mini line.

Mini line: `<svg width={54} height={18} aria-hidden="true"><path d={linePath(points, (x) => x * 54, (y) => 2 + y * 14)} stroke={color} fill="none" strokeWidth={1.3} /></svg>`, using `linePath` from `../performance/lines/linePath`.

Clicking a tab calls `setLineTab(id)` and `setSelectedEffect(id)` for an effect, or just `setLineTab('master')`. Arrow Left and Right move between tabs (roving `tabIndex`). The handled keys call `stopPropagation()`, so the Sequencer's window shortcuts never see them.

The row is `overflow-x: auto` inside itself, and the selected tab is scrolled into view with `block: 'nearest', inline: 'nearest'`.

- [ ] **Step 5: `LinesView.tsx` and `LineSidePanel.tsx`**

**`LinesView`** is memo with no props. It reads:
- `lineTab` from uiStore;
- the chain's track ids, computed exactly as `UnifiedSequencerPanel` computes `activeTrackIds` (pass them in as a prop from the panel: `ids: string[]`, `colors: Record<string,string>`).

Fallback: if `lineTab !== 'master' && !ids.includes(lineTab)`, call `setLineTab('master')` in an effect (and render as Master in the meantime).

Accessors for the open line:

```ts
const isMaster = tab === 'master'
const line = useEffectSequencerStore((s) => (isMaster ? s.master.line : s.tracks[tab]?.line)) ?? DEFAULT_LINE
const write = (patch: Partial<TrackLine>) => { const s = useEffectSequencerStore.getState(); if (isMaster) s.setMasterLine(patch); else s.setTrackLine(tab, patch) }
const read = (): TrackLine => { const s = useEffectSequencerStore.getState(); return { ...DEFAULT_LINE, ...(isMaster ? s.master.line : s.tracks[tab]?.line) } }
```

Layout, reusing the Warp classes:

```tsx
<div className="seg-lines" data-lines-view>
  <LineTabs ids={ids} colors={colors} />
  <div className="seg-lines-body">
    <div className="seg-warp-main seg-lines-main">
      <div className="seg-warp-tools" role="toolbar" aria-label={`${title} line tools`}>
        {/* LINE_TOOLS buttons (data-line-tool), sep, Random steps (data-line-random="steps"), Random curves ("curves"), Clear (data-line-clear), sep, gap, LinesMenu attr="line" (builtIns LANE_PRESET_NAMES), SaveLine attr="line" */}
      </div>
      <div className="seg-lines-graph" ref={boxRef}>{/* LinePlot attr="line" gridY={line.gridY} … + overlays + playhead */}</div>
      <div className="seg-warp-settings seg-lines-settings">{/* 5 Spins */}</div>
    </div>
    <LineSidePanel tab={tab} />
  </div>
</div>
```

- **Title:** `title` = `'Master'` or `getEffectInfo(tab).name`.
- **Tool state** is the existing `useLineEditStore` (tool and selected point). Reset the selected point to null whenever `tab` changes.
- **Point editing:** `getPoints = () => read().points`. `setPoints` calls `write({ points: p })` and returns `read().points`, with the same `own` / `editing` guard `LineLane` uses today to drop the selection on outside changes. Move that logic here verbatim, keyed on `tab`.
- **Keys:** `handleLineKey` on the editor root, as `LineLane` does now, including the `LANE_KEYS` stopPropagation rule.
- **Size:** measure `.seg-lines-graph` with a ResizeObserver, like LineLane, and pass `width` and `height`. CSS gives the graph `flex: 1 1 190px; min-height: 110px`.
- **Overlays:**
  - **Track tab:** `backChildren` is the "what you hear" fill. Compute 200 samples `x_i = i/200`, `v_i = lineLevel(line.points, x_i, line.skew, line.amount) × (master.enabled ? lineLevel(m.points, x_i, m.skew, m.amount) : 1)`, and draw a path from (0, bottom) through (`X(x_i)`, `Y(1 − v_i)`) to (1, bottom), filled with the effect colour at 0.22 opacity. These samples are not phase-aligned when the track and master lengths differ; the fill assumes equal lengths and is a visual aid only. When the master is enabled, also draw the master line, dashed (`stroke: var(--warp)`, `strokeDasharray="5 4"`, 1.4 px), using `linePath`.
  - **Master tab:** `backChildren` draws every Line track's line at 0.45 opacity in its colour.
  - **Edge labels** (as children with `pointerEvents="none"` and class `seg-line-edge`): `fmtLoop(line.beats)` at the top left, `wet (card's Dry/wet)` at the top right, `dry` at the bottom right.
- **Playhead:** a `<div className="seg-line-playhead" data-line-playhead hidden>`, moved by rAF exactly as in `LineLane`, reading `getMasterPhase()` on the Master tab and `getLinePhase(tab)` otherwise. Visibility follows `bottomTab === 'sequencer' && showBottom && isPlaying`.
- **Bar (5 Spins)**, using `Spin` from WarpSettingsRow with `attr="line-setting"`:
  - `amount`: "Amount", `NN%`, steps of 1 (10 with Shift), 0..100, `pxPerStep` 2. Status: `Amount: how deep the line cuts. At 0% the line does nothing, at 100% the bottom is fully dry. Drag or use the arrow keys`.
  - `beats`: "Length", `fmtBeats`, stepping through `LINE_BEATS`, `pxPerStep` 14. Status: `Length: the line's own loop, from half a beat to 16 beats, on the Sequencer's Play and BPM. Drag or use the arrow keys`.
  - `snap`: "Quantize", unchanged from LineToolbar's.
  - `gridy`: "Grid Y", the value as a number (for example `8`), stepping through `GRID_Y`, `pxPerStep` 14. Status: `Grid Y: the rows Alt snaps heights to. Drag or use the arrow keys`.
  - `skew`: "Skew", unchanged from LineToolbar's.

  Port the step functions from `LineToolbar` (`nearestIdx`, `clamp`) into LinesView before deleting LineToolbar.
- **Lines ▾ and Save line:** `LinesMenu attr="line" label={`${title} lines`} builtIns={LANE_PRESET_NAMES}`, with the same `pick` and current-name logic as LineToolbar, keyed on `tab`. `SaveLine attr="line"` with `getPoints={() => read().points}`.
- **Random and Clear:** Random steps and Random curves write `randomSteps(snap || 1/16)` and `randomCurves(snap || 1/16)`. Clear writes `[{x:0,y:0},{x:1,y:0}]`.

**`LineSidePanel`** is memo with props `{ tab: string }`, and renders `<aside className="seg-lines-side" data-line-side={tab === 'master' ? 'master' : 'track'}>`.

- **Track tab:**
  - A header with the colour and full name.
  - A Steps / Line segmented switch: reuse the `seg-mode-switch` markup from EffectTrackRow, with `data-track-mode-switch={id}` (keep the attribute name the existing harness uses), calling `setTrackMode`.
  - M, S, A, N: move the four header buttons' handlers into small shared functions only if the row's code allows it without restructuring. Otherwise render M and S (`setTrackMuted` / `setTrackSoloed`) and A and N as buttons that call the same store actions EffectTrackRow calls, with `aria-pressed` reflecting the track's state.
  - A Dry/wet bar: a `ParamBar`-style horizontal bar is acceptable, but the simplest compliant option is a `Spin` with `attr="line-setting" id="mix"` reading `useGlitchEngineStore(s => s.effectMix[id] ?? 1)` and writing `setEffectMix`. Label "Dry/wet", value `NN%`.
  - The readout (`data-line-readout`): while playing, a rAF loop (throttled to every 6th frame) writes `Line ${l.toFixed(2)} × master ${m.toFixed(2)} × ${Math.round(ceil*100)}%` and `Now playing at ${Math.round(mix*100)}%`. Here `l` = `lineLevel` at `getLinePhase(id)`, `m` = `getMasterLevel()`, `ceil` = `gateOpenLevel(id, getUserMix(id) ?? stored)`, and `mix` = the stored `effectMix`. Write `textContent` directly, not through state. When stopped it reads `Plays when the Sequencer runs`.
  - The footer: 🔒 (`data-line-lock={id}`, toggling `useLineLockStore.toggleLock(id)`, with `LockIcon`), 🎲 Dice (`data-line-dice="track"`, `diceLine(id)`), Presets ▾ (`LinesMenu trigger="presets"` with the same handlers as the toolbar's menu; pass them down or lift `pick` into a tiny store), and 🎲 Dice all lines (`data-line-dice="all"`).
- **Master tab:**
  - The header "Master line".
  - On / Off (`data-line-master-toggle`, `aria-pressed={enabled}`).
  - The readout: `Multiplies every track's Dry/wet, Steps tracks included.` plus `Now ×${m.toFixed(2)}` (rAF while playing, `Now ×1.00` when stopped).
  - The footer: 🔒 `data-line-lock="__master"`, 🎲 Dice (`data-line-dice="master"`, `diceMaster`), Presets ▾, and Dice all lines.
- Every button has a `statusHover` with plain-language text.
- **Locks are always visible here.** The side panel shows its lock button directly, so the old lock mode toggle is not used in this view, and the tabs show 🔒 whenever a lock is set (`lineLocks.lockMode` is no longer read by any component; leave the field in the store).

- [ ] **Step 6: Wire the view in, and remove the old editing**

- **`SequencerTransport.tsx`:**
  - Remove the `LineToolbar` import and `lineSelected`; group 3 always renders the step tools.
  - After the transport's play controls, add the segmented switch:

    ```tsx
    <div className="seg-seq-view" role="group" aria-label="Sequencer view">
      {(['steps', 'lines'] as const).map((v) => (
        <button key={v} type="button" data-seq-view={v} aria-pressed={view === v} onClick={() => useUIStore.getState().setSequencerView(v)}
          {...statusHover(v === 'lines' ? 'Lines: draw each effect\'s Dry/wet, and a master line over all of them' : 'Steps: the step grid')}>
          {v === 'lines' ? 'Lines' : 'Steps'}
        </button>
      ))}
    </div>
    ```

  - In the Lines view, the step tools (Random, All tracks, P-locks, Clear) and the page dots are hidden: render them only when `view === 'steps'`.
- **`UnifiedSequencerPanel.tsx`:** when `sequencerView === 'lines'` and there are tracks, render `<LinesView ids={activeTrackIds} colors={…} />` in place of the param panel and track list. Build `colors` from `EFFECT_MAP` with a `useMemo`.
- **`EffectTrackRow.tsx`:** remove `showLineInfo`, the `seg-line-info` block and its ceiling computation (and the now-unused imports). Line tracks render `LineLane` without the `selected` prop.
- **`LineLane.tsx`:** becomes the preview only.
  - Delete the `selected` branch, the `LinePlot` import, the key handling and the edit-selection effects.
  - Keep: the grid, the fill, the line in the effect colour, the playhead and the owner note.
  - A pointer down calls `onSelect()` (track selection), `useUIStore.getState().setLineTab(effectId)` and `setSequencerView('lines')`.
  - Its phase source is `getLinePhase`, as now.
  - The aria-label becomes `${label} line. Click to edit it in Lines`.
- **Delete `LineToolbar.tsx`.** Remove its CSS (`.seg-line-tools`, `.seg-line-tools-slot`, `.seg-line-ctx`, `.seg-line-dice`, `.seg-line-lockmode`, `.seg-line-info`) unless another component still uses a class; check with grep.
- **`layout.css`** (with the Lines view rules next to the `.seg-warp` rules):

  ```css
  .seg-lines { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--gutter); }
  .seg-line-tabs { flex: none; display: flex; gap: 4px; padding: 6px 8px 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; background: var(--bg-surface); }
  .seg-line-tabs [data-line-tab] { flex: none; display: flex; align-items: center; gap: 7px; min-width: 130px; padding: 4px 8px; border: 1px solid var(--border); border-bottom: none; border-radius: var(--radius-ctrl) var(--radius-ctrl) 0 0; background: var(--bg-elevated); color: var(--text-secondary); font: 400 12px var(--font-sans); cursor: pointer; }
  .seg-line-tabs [data-line-tab][aria-selected="true"] { background: var(--bg-void); color: var(--text-primary); border-color: var(--bg-hover); }
  .seg-line-tabs [data-line-tab]:focus-visible { outline: 1px solid var(--text-primary); outline-offset: -1px; }
  .seg-line-tab-badge { font-size: 9.5px; color: var(--text-muted); border: 1px solid var(--border); border-radius: 3px; padding: 0 3px; }
  .seg-lines-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 2px; }
  .seg-lines-graph { position: relative; flex: 1 1 190px; min-height: 110px; margin: 0 8px; border: 1px solid var(--border); border-radius: var(--radius-ctrl); overflow: hidden; }
  .seg-lines-graph > svg { position: absolute; inset: 0; }
  .seg-lines-settings { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; padding: 6px 8px 8px; }
  .seg-lines-side { min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 9px 10px; background: var(--bg-surface); overflow-y: auto; }
  .seg-lines-side-foot { margin-top: auto; display: grid; grid-template-columns: auto 1fr 1fr; gap: 4px; }
  .seg-lines-side-foot [data-line-dice="all"] { grid-column: 1 / -1; }
  .seg-seq-view { display: flex; padding: 2px; border-radius: var(--radius-ctrl); background: var(--bg-elevated); }
  .seg-seq-view button { padding: 1px 9px; border-radius: 3px; color: var(--text-muted); font: 400 11.5px var(--font-sans); }
  .seg-seq-view button[aria-pressed="true"] { background: var(--bg-hover); color: var(--text-primary); }
  ```

  If `--radius-ctrl`, `--gutter` or the other tokens are named differently in `layout.css`, use the ones the `.seg-warp*` rules use. The narrow layout is Task 4.
- **Bottom panel height.** On the Sequencer tab, the bottom panel follows its content up to 40vh. Check that the Lines view gets that full cap at 1440×900 (about 360 px). If the panel sizes to its content, give `.seg-lines` a `min-height: min(40vh, 380px)` so the graph is not squeezed below 110 px.

- [ ] **Step 7: Run the harness**

Restart Vite, then run `lineseditor`, `lines2engine`, `lineshortcuts`, `warpui`, `warpdice`, `labels`, `devices` and `linesengine`.
Expected: all OK.

`linesui` and `linestools` test the removed editable lane and toolbar. Turn both modes into a one-line `say('retired: replaced by lineseditor', true)`, and note it in the report.

Look at `le-t3.png` against the mockup; the tabs, graph, bar and side panel should match its arrangement. Then run `npm run build` and `npx eslint src --quiet`.

- [ ] **Step 8: Commit**

```bash
git add -A src/components/sequencer src/stores/uiStore.ts src/components/performance/layout.css
git commit -m "feat: lines editor: Steps | Lines view with track tabs, Warp-style editor and master line panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```

---

### Task 4: Alt-drag tab copy, narrow layout, docs

**Files:**
- Modify: `src/components/sequencer/LineTabs.tsx`, `src/components/performance/layout.css`, `CLAUDE.md`
- Test: `.superpowers/sdd/layout-check.mjs` (mode `lineseditor`: add checks 9 and 11, plus a narrow check)

**Interfaces:**
- Consumes:
  - from Task 1: `mergeLine`, `setTrackLine`, `setMasterLine`;
  - from Task 3: `LineTabs` and `MASTER_LOCK` (`lineDice.ts`), plus `useLineLockStore`.
- Produces: nothing later tasks rely on.

- [ ] **Step 1: Add the failing checks to `lineseditor`**

Insert this before the final page-errors check:

```js
  // 9. Alt-drag a tab onto another copies the line and its settings; a locked target refuses
  await p.click('[data-seq-view="lines"]'); await wait(200)
  const ids9 = await p.$$eval('[data-line-tab]', (els) => els.map((e) => e.getAttribute('data-line-tab')))
  const [S9, T9] = [ids9[1], ids9[2]]
  await sq('(S.getState().setTrackMode(a, "line"), S.getState().setTrackLine(a, { points: [{x:0,y:0.2},{x:0.5,y:0.9},{x:1,y:0.2}], amount: 0.7, beats: 8, gridY: 6, skew: 0.3 }), 0)', S9)
  await sq('(S.getState().setTrackMode(a, "gate"), 0)', T9)
  const centre = (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })
  const altDrag = async (from, to) => {
    const a = await centre(`[data-line-tab="${from}"]`), b = await centre(`[data-line-tab="${to}"]`)
    await p.keyboard.down('Alt'); await p.mouse.move(...a); await p.mouse.down()
    for (let i = 1; i <= 10; i++) await p.mouse.move(a[0] + (b[0] - a[0]) * i / 10, a[1])
    await p.mouse.up(); await p.keyboard.up('Alt'); await wait(120)
  }
  await altDrag(S9, T9)
  const copied = await sq('JSON.stringify(S.getState().tracks[a].line)', T9)
  const src = await sq('JSON.stringify(S.getState().tracks[a].line)', S9)
  say('9 Alt-drag copies the line and settings', copied === src, copied)
  say('9 the target keeps its mode', await sq('S.getState().tracks[a].mode', T9) === 'gate')
  await altDrag(S9, 'master')
  say('9 copying onto Master works', await sq('JSON.stringify(S.getState().master.line)') === src)
  await sq('(S.getState().setTrackLine(a, { points: [{x:0,y:0},{x:1,y:0}] }), K.getState().locks[a] || K.getState().toggleLock(a), 0)', T9)
  await altDrag(S9, T9)
  say('9 a locked target refuses the copy', await sq('S.getState().tracks[a].line.points.length', T9) === 2)
  await sq('(K.getState().toggleLock(a), 0)', T9)
  await altDrag(S9, S9)
  say('9 dropping on itself changes nothing', await sq('JSON.stringify(S.getState().tracks[a].line)', S9) === src)

  // 11. narrow: 960 wide, the side panel wraps under the editor, nothing scrolls horizontally
  await p.setViewport({ width: 960, height: 1200 }); await wait(400)
  const nar = await p.evaluate(() => { const v = document.querySelector('[data-lines-view]'); const side = document.querySelector('[data-line-side]'); const g = document.querySelector('[data-line-graph]'); return [document.documentElement.scrollWidth <= innerWidth, v.scrollWidth <= v.clientWidth + 1, side.getBoundingClientRect().top >= g.getBoundingClientRect().bottom] })
  say('11 narrow: no horizontal overflow, the side panel sits under the editor', nar.every(Boolean), JSON.stringify(nar))
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-kevin-Documents-web-strand-tracer/3acc0aca-07c8-4b03-877b-7bd1781a848d/scratchpad/mock/le-t4-narrow.png' })
  await p.setViewport({ width: 1440, height: 900 }); await wait(300)
```

- [ ] **Step 2: Run it to verify it fails**

Restart Vite, then run `lineseditor`.
Expected: the check 9 copy and check 11 FAIL.

- [ ] **Step 3: Implement Alt-drag in `LineTabs`**

Use pointer events, not native drag-and-drop:
- **pointerdown** on a tab with `e.altKey` and button 0: `preventDefault()`, `setPointerCapture`, and remember the source id. No click selection happens for an Alt gesture: track `dragged` and ignore the click after it.
- **pointermove:** move a ghost, a fixed-position `div.seg-line-tab-ghost` showing the source tab's label (rendered through a portal to `document.body`, `pointer-events: none`), and find the target with `document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-line-tab]')`. Mark it `data-drop-target` (outlined in `--warp`, or `--rec` when locked).
- **pointerup:** if there is a target and it is not the source, copy:

  ```ts
  const s = useEffectSequencerStore.getState()
  const from = src === 'master' ? s.master.line : s.tracks[src]?.line
  if (!from) return
  const locked = useLineLockStore.getState().locks[dst === 'master' ? MASTER_LOCK : dst]
  if (locked) { flash(dst); useUIStore.getState().setStatusText('That line is locked, so the copy was refused'); return }
  const copy = { points: from.points, amount: from.amount, beats: from.beats, snap: from.snap, gridY: from.gridY, skew: from.skew }
  if (dst === 'master') s.setMasterLine(copy); else s.setTrackLine(dst, copy)
  useUIStore.getState().setStatusText(`Copied ${name(src)} line to ${name(dst)}`)
  ```

  `flash(dst)` sets `data-refused` on the target for 400 ms; the CSS shows the 🔒 in `--rec` and a brief outline.
- **pointercancel**, and a drop anywhere else, clear the ghost and change nothing.
- **Hover text** on every tab: `Click to open. Alt-drag onto another tab to copy this line and its settings`.

- [ ] **Step 4: Narrow layout**

```css
.seg-line-tab-ghost { position: fixed; z-index: 1000; pointer-events: none; padding: 4px 8px; border-radius: var(--radius-ctrl); background: var(--bg-elevated); border: 1px solid var(--warp); color: var(--text-primary); font: 400 12px var(--font-sans); transform: translate(-50%, -50%); }
.seg-line-tabs [data-drop-target] { outline: 1.5px solid var(--warp); outline-offset: -1px; }
.seg-line-tabs [data-refused] { outline: 1.5px solid var(--rec); outline-offset: -1px; }
@media (max-width: 1099px) {
  .seg-lines-body { grid-template-columns: minmax(0, 1fr); }
  .seg-lines-side { flex-direction: row; flex-wrap: wrap; align-items: center; }
  .seg-lines-side-foot { margin-top: 0; margin-left: auto; }
  .seg-lines-settings { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
  .seg-warp-tools { flex-wrap: wrap; }
}
```

Scope the `.seg-warp-tools` wrap to the Lines view (`.seg-lines .seg-warp-tools`), so the Warp tab is unchanged.

- [ ] **Step 5: Docs**

In `CLAUDE.md`, rewrite the "Line tracks" section. Keep its first line, and change the bullets to:
- **View:** the Sequencer's Steps | Lines switch (`[data-seq-view]`, `uiStore.sequencerView`). Steps is the step grid; a Line track's row there is a read-only preview (`LineLane`), and clicking it opens Lines on that tab. Lines is `LinesView`: tabs (`LineTabs`: Master, then the chain; `uiStore.lineTab`), the shared `LinePlot` editor, the bar (Amount, Length, Quantize, Grid Y, Skew) and `LineSidePanel`.
- **Model:** `track.line = { points, snap, skew, amount, beats, gridY }` (`mergeLine` validates; `LINE_BEATS`, `GRID_Y`), plus `master: { line, enabled }`. The level is `1 − amount × y` at the skewed phase.
- **Clock:** one transport beat counter in `useEffectSequencerPlayback` (0 on Play, `+= dt × bpm / 60000`). Each line's phase is `(beats mod line.beats) / line.beats`. `getLinePhase(id)` and `getMasterPhase()` return the phase, or null when stopped.
- **Mix:** Line track = ceiling × line × master. An open Steps step = `gateOpenLevel` × master, rewritten every frame while the master is not 1. Closed steps stay 0. Audio and MIDI gates win. Stop restores the user's value and the master level (`mixModulation`: `setMasterLevel`, `getMasterLevel`, `clearMaster`).
- **Shortcuts** (in `LinePlot`, so the Warp has them too):
  - Shift paints steps;
  - Alt snaps to the grids (X = Quantize or 1/16, Y = `gridY` or 16);
  - Alt + Shift paints steps on both grids;
  - Alt-dragging a curve handle moves every curve;
  - double-click adds or removes a point;
  - Alt-dragging a tab onto another tab copies the line and its settings (a locked target refuses).
- **Dice and locks** (`lineDice.ts`, `lineLocks.ts`): Dice all lines rolls every unlocked Line track and the master (lock key `__master`).
- **Not saved** in banks or presets.

Remove the old Toolbar bullet and the old Editor bullet's lane-size text.

- [ ] **Step 6: Run the full regression**

Restart Vite, then run `lineseditor`, `lines2engine`, `lineshortcuts`, `linesengine`, `warpui`, `warpdice`, `warpmod`, `labels` and `devices`.
Expected: all OK. Then run `npm run build` and `npx eslint src --quiet`.

- [ ] **Step 7: Commit**

```bash
git add src/components/sequencer/LineTabs.tsx src/components/performance/layout.css CLAUDE.md
git commit -m "feat: lines editor: Alt-drag a tab to copy a line, narrow layout, docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ"
```
