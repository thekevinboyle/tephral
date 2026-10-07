# Effect Settings: Knob Strip + Segmented Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chain panel's settings tiles with a strip of 4 knobs plus 32-segment bars. Every numeric setting gets identical drag, p-lock, click-to-route and drop behaviour, which fixes the click-to-route regression.

**Architecture:**
- Pull all non-visual behaviour out of `Knob.tsx` into `useParamControl`. `Knob` and the new `ParamBar` both render through it.
- A `useParamValue` hook (`useSyncExternalStore` over the 15 effect stores the registry reads) gives each control a primitive value. A tick re-renders only that control.
- A new `EffectSettings` component (strip, bars, extras) replaces `BlockParameters` inside `ChainSettings`.
- Dead per-effect panels are deleted at the end.

**Tech Stack:** React 19, TypeScript, zustand 5, Vite 7. Verification uses puppeteer harnesses in the gitignored `.superpowers/sdd/`; the repo has no unit-test runner.

**Spec:** `docs/superpowers/specs/2026-10-07-param-bars-design.md`. Mockup: `docs/superpowers/specs/assets/2026-10-07-param-bars/final.html` and `final.png`.

## Global Constraints

- **Tokens** live in `src/styles/theme.css`; `src/index.css` is stale, so never edit it.
- **Visual rules:** 2px radius, no shadows, no em dashes in UI copy, contrast of at least 4.5:1 for text and 3:1 for lit versus unlit segments.
- **Bar frame:** 28px tall with a 3px gap between bars. Inside each bar: a 58px name in 11px uppercase with `.1em` tracking and `--text-secondary`; 32 segments with 2px gaps; a 40px right-aligned value at 12px with tabular numerals and `--text-primary`.
- **Segment colours:**
  - Unlit `oklch(0.245 0.007 270)`, lit `oklch(0.56 0.008 270)`.
  - Bipolar zero marker (centre cell, when unlit) `oklch(0.48 0.008 270)`.
  - Modulated span: blend the source colour at 40% (unlit) and 70% (lit).
- **No value line on bars.** The number is the exact read-out.
- **Knob strip:** the first 4 numeric settings in registry order, excluding 0/1 toggles. There is no per-effect curation.
- **Interaction parity between bars and knobs:**
  - drag past a 3px threshold, relative, full range in about 200px, Shift for 10× finer;
  - click toggles the p-lock target, double-click resets to the midpoint, right-click opens `ModulationContextMenu`;
  - in assignment mode, a click routes at depth 0.5 and a vertical drag sets the depth;
  - modulation sources can be dropped onto the control;
  - arrow keys step (Shift for ×10), Home/End jump to min/max.
- **Performance:** `PerformanceLayout` re-renders about 280 times a second. Every new component is `React.memo`. No bare `useXStore()` without a selector in new code.
- **Gates:** `npm run build` passes, and eslint shows no new problems in changed files versus the plan base. BankPanel has 3 pre-existing errors.
- **Commits:** stage only named files, never `git add -A`. End each message with a blank line and then:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ`
- **Harness:** run with `PATH=/opt/homebrew/bin:$PATH`. Kill and restart Vite (`lsof -ti:5173 | xargs kill; npm run dev &`) before every harness run, because HMR leaves phantom stores. "Promise was collected" is a known flake; reuse the retry helper in `.superpowers/sdd/layout-check.mjs`.

## Review Focus

1. **Store coverage for SEG, morph and trend effects.** Their values must update live in the panel. Today `BlockParameters` never subscribes to `useSegStore`, `useMorphStore` or `useTrendStore`, so their tiles can show stale values. Test in Task 3.
2. **An effect with exactly 4 or fewer numeric settings** renders only the strip, with no empty bars header. Test in Task 3.
3. **Assignment mode ends mid-gesture.** The user presses Escape or another control clears `assigningModulator` while a bar is pressed. This must not throw or leave a half-made route. Test in Task 1.
4. **Integer settings with more than 32 values** (DENS 64–512 step 8 gives 57 values) use 32 segments and still snap to `step` while dragging and with the arrow keys. Test in Task 2.
5. **Switching the selected effect while dragging a bar.** The pointer capture is released, and no change lands on the newly selected effect. Test in Task 3.

---

### Task 1: `useParamControl` hook, Knob refactor, click-to-route

**Files:**
- Create: `src/hooks/useParamControl.ts`
- Create: `src/utils/modulationSources.ts`, which moves `SPECIAL_SOURCES`, `getSourceInfo`, `POLY_EUCLID_COLOR` and `STEP_SEQ_COLOR` out of `Knob.tsx`
- Modify: `src/components/performance/Knob.tsx`, so it renders through the hook (public `KnobProps` unchanged)
- Modify: `.superpowers/sdd/layout-check.mjs`, adding a `route` mode

**Interfaces:**
- Produces:

```ts
// src/hooks/useParamControl.ts
export interface ParamControlArgs {
  paramId?: string            // `${effectId}.${paramKey}`; behaviour beyond drag needs it
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  axis: 'x' | 'y'             // bar drags horizontally, knob vertically
  dragSpanPx?: number         // full range in this many px, default 200
}
export interface RoutingView { id: string; trackId: string; depth: number; name: string; color: string }
export interface ParamControl {
  rootProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
    onDoubleClick: () => void
    onContextMenu: (e: React.MouseEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
    onLostPointerCapture: () => void
  }
  dotProps: (r: RoutingView) => {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onDoubleClick: (e: React.MouseEvent) => void
  }
  isDragging: boolean
  isHovered: boolean
  isDropTarget: boolean
  isAutomationTarget: boolean
  isInAssignmentMode: boolean
  assigningColor: string | undefined
  isDepthDragging: boolean
  depthDragDisplay: number
  routings: RoutingView[]     // routings whose targetParam === paramId, with resolved name/color
  dotDragging: { name: string; depth: number; color: string } | null
  contextMenu: React.ReactNode // <ModulationContextMenu …/> when open, else null
}
export function useParamControl(args: ParamControlArgs): ParamControl
```

- [ ] **Step 1: Write the failing check.** Add a `route` mode to `.superpowers/sdd/layout-check.mjs`. It uses any `Knob` rendered with a `paramId`. Find one with `grep -rn "<Knob" src | grep paramId`; if none is mounted on load, enable an effect and open the AUDIO tab, where `TrackAudioReactivePanel` renders knobs.

```js
if (MODE === 'route') {
  await open(1440, 900)
  await retry(() => p.evaluate(async () => { (await import('/src/stores/segStore.ts')).useSegStore.getState().setVoxelEnabled(true) }))
  await sleep(600)
  const sel = '[data-param-control][data-param-id]'   // added by this task to Knob's root
  const pid = await p.$eval(sel, (e) => e.dataset.paramId)
  await retry(() => p.evaluate(async () => (await import('/src/stores/modulationStore.ts')).useModulationStore.getState().setAssigningModulator('lfo-0')))
  await p.click(sel)                                   // click, no drag
  const routed = await retry(() => p.evaluate(async (pid) => (await import('/src/stores/sequencerStore.ts')).useSequencerStore.getState().routings.some((r) => r.trackId === 'lfo-0' && r.targetParam === pid), pid))
  say('click in assignment mode routes at 0.5', routed)
  // Review Focus 3: assignment cleared mid-press must not throw or half-route
  await retry(() => p.evaluate(async () => (await import('/src/stores/modulationStore.ts')).useModulationStore.getState().setAssigningModulator('lfo-1')))
  const box = await (await p.$(sel)).boundingBox()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down()
  await retry(() => p.evaluate(async () => (await import('/src/stores/modulationStore.ts')).useModulationStore.getState().setAssigningModulator(null)))
  await p.mouse.up()
  const half = await p.evaluate(async (pid) => (await import('/src/stores/sequencerStore.ts')).useSequencerStore.getState().routings.filter((r) => r.trackId === 'lfo-1' && r.targetParam === pid).length, pid)
  say('assignment cleared mid-press: no route, no error', half === 0 && errors.length === 0)
}
```

Check `modulationStore` for the real setter name (`setAssigningModulator` or similar) and adjust the check to it.

- [ ] **Step 2: Run it and confirm it fails.** Restart Vite, then run `node .superpowers/sdd/layout-check.mjs route`. Expect FAIL on "click in assignment mode routes at 0.5", because today's Knob only routes when `|depth| > 0.02` after a drag.

- [ ] **Step 3: Move the source helpers.** Cut `SPECIAL_SOURCES`, `getSourceInfo`, `POLY_EUCLID_COLOR` and `STEP_SEQ_COLOR` verbatim from `Knob.tsx` into `src/utils/modulationSources.ts`. Export them and import them back in `Knob.tsx`.

- [ ] **Step 4: Extract the hook.** Move these from `Knob.tsx` into `useParamControl`:
  - all state, refs and handlers: drag with rAF throttling, depth-drag assignment, the automation-target toggle, drop handlers, dot handlers, the context-menu state, and status text on hover;
  - also rename the `dragStartY` ref to `dragStart`, so it works on both axes.

  Make these changes as you move them:
  1. **Axis.** Delta is `axis === 'y' ? startY - clientY : clientX - startX`. The new value is `startValue + (delta / (dragSpanPx ?? 200)) * (max - min) * (e.shiftKey ? 0.1 : 1)`, snapped to `step` and clamped. `didDrag` becomes true once `|delta| > 3`. Keep Knob feeling the same: pass Knob's current pixels-per-range as `dragSpanPx` from `Knob.tsx`.
  2. **Click-to-route.** In `onPointerUp`, while `isDepthDragging`, if `|depth| <= 0.02` (a click without a drag), commit with `depth = 0.5`. Keep the existing branch for `|depth| > 0.02`. Keep the "auto-enable LFO" side effect.
  3. **Assignment cleared mid-press.** In `onPointerUp`, re-read assignment from the stores (`useModulationStore.getState().assigningModulator` and the others). If it is now null, reset the depth-drag state and return without routing.
  4. **Narrow selectors.** Replace the destructured bare `useSequencerStore()`, `useModulationStore()`, `usePolyEuclidStore()` and `useUIStore()` with individual selectors, for example `useSequencerStore((s) => s.addRouting)`. Select routings with `useSequencerStore(useShallow((s) => s.routings.filter((r) => r.targetParam === paramId)))`, using `useShallow` from `zustand/react/shallow`.
  5. **Keyboard.** `onKeyDown`:
     - ArrowRight and ArrowUp add `step` (or `(max - min) / 100` when there is no step); ArrowLeft and ArrowDown subtract it;
     - Shift multiplies the step by 10;
     - Home and End jump to `min` and `max`;
     - call `preventDefault` and `stopPropagation` on every key handled.
  6. **Lost capture.** `onLostPointerCapture` resets the drag and depth-drag state without side effects.

- [ ] **Step 5: Re-render Knob through the hook.** `Knob` keeps its JSX: arc, dots, value and label. It spreads `ctl.rootProps` on its interactive root and adds `data-param-control` and `data-param-id={paramId}`. Dots use `ctl.dotProps(r)`. Knob also renders `{ctl.contextMenu}`.
  - Root also gets `tabIndex={0}`, `role="slider"`, `aria-label={label}`, `aria-valuemin={min}`, `aria-valuemax={max}`, `aria-valuenow={value}`.
  - `KnobProps` is unchanged.

- [ ] **Step 6: Run the checks.** Restart Vite, then run `node .superpowers/sdd/layout-check.mjs route` and expect PASS. Then run `chain` and `dock`, `seg-verify.mjs wiring` and `bands-check.mjs ui`; expect PASS, since Knob is used in the audio-band panel. Do a manual sanity check in the browser: an LFO-editor knob still drags with the same feel.

- [ ] **Step 7: Build and lint.** `npm run build` must pass. Run `npx eslint src/hooks/useParamControl.ts src/utils/modulationSources.ts src/components/performance/Knob.tsx`: no new problems.

- [ ] **Step 8: Commit.**

```bash
git add src/hooks/useParamControl.ts src/utils/modulationSources.ts src/components/performance/Knob.tsx
git commit -m "refactor: knob behaviour in useParamControl; click in assignment mode routes at depth 0.5"
```

---

### Task 2: `useParamValue`, segment maths, `ParamBar`

**Files:**
- Create: `src/hooks/useParamValue.ts`
- Create: `src/utils/paramBar.ts`, the pure segment and format maths
- Create: `src/components/performance/ParamBar.tsx`
- Modify: `src/components/performance/layout.css` for the bar styles; layout.css already holds the shell styles
- Modify: `.superpowers/sdd/layout-check.mjs`, adding a `barmath` mode

**Interfaces:**
- Consumes: `useParamControl` and `RoutingView` from Task 1. The `LockableParam` type from `src/config/effectParams.ts` is `{id, label, min, max, step, controlType?, apply(v), read()}`.
- Produces:

```ts
// src/utils/paramBar.ts
export interface Segment { lit: boolean; zero: boolean; mod: boolean }
export function segmentCount(min: number, max: number, step: number): number
export function buildSegments(opts: { value: number; min: number; max: number; step: number; modDepth: number | null }): Segment[]
export function formatParamValue(v: number): string
export function snap(v: number, min: number, max: number, step: number): number

// src/hooks/useParamValue.ts
export function useParamValue(param: LockableParam): number

// src/components/performance/ParamBar.tsx
export const ParamBar: React.NamedExoticComponent<{ effectId: string; param: LockableParam }>
```

- [ ] **Step 1: Write the pure maths.**

```ts
// src/utils/paramBar.ts
export interface Segment { lit: boolean; zero: boolean; mod: boolean }

const MAX_SEGMENTS = 32

export function snap(v: number, min: number, max: number, step: number): number {
  const s = step > 0 ? Math.round((v - min) / step) * step + min : v
  return Math.min(max, Math.max(min, Number(s.toFixed(6))))
}

/** Integer params with <= 32 distinct values get one segment per value; everything else gets 32. */
export function segmentCount(min: number, max: number, step: number): number {
  if (step >= 1) {
    const values = Math.round((max - min) / step) + 1
    if (values <= MAX_SEGMENTS) return values
  }
  return MAX_SEGMENTS
}

export function buildSegments({ value, min, max, step, modDepth }: { value: number; min: number; max: number; step: number; modDepth: number | null }): Segment[] {
  const n = segmentCount(min, max, step)
  const p = (value - min) / (max - min)                       // 0..1
  const bipolar = min < 0
  const z = (0 - min) / (max - min)                            // zero position for bipolar
  const modSpan = modDepth == null ? null : Math.min(1, Math.abs(modDepth))
  const perValue = step >= 1 && Math.round((max - min) / step) + 1 <= MAX_SEGMENTS
  return Array.from({ length: n }, (_, k) => {
    // per-value segments light up to and including the value's own cell
    const c = perValue && n > 1 ? k / (n - 1) : (k + 0.5) / n
    const lit = bipolar ? c >= Math.min(z, p) - 1e-9 && c <= Math.max(z, p) + 1e-9 : c <= p + 1e-9
    const zero = bipolar && !lit && Math.abs(c - z) <= 0.5 / n
    const mod = modSpan != null && c <= modSpan + 1e-9
    return { lit, zero, mod }
  })
}

export function formatParamValue(v: number): string {
  if (Number.isInteger(v)) return String(v)
  const a = Math.abs(v)
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)
  return s.replace(/^(-?)0\./, '$1.')
}
```

- [ ] **Step 2: Write the maths check.** Add a `barmath` mode to `layout-check.mjs`. It covers Review Focus 4 (DENS 64–512 step 8, 57 values, so 32 segments).

```js
if (MODE === 'barmath') {
  await open(1440, 900)
  const r = await retry(() => p.evaluate(async () => {
    const m = await import('/src/utils/paramBar.ts')
    const lit = (o) => m.buildSegments(o).filter((s) => s.lit).length
    return {
      n8: m.segmentCount(1, 8, 1),                       // 8
      nDens: m.segmentCount(64, 512, 8),                 // 32 (57 values)
      nCont: m.segmentCount(0, 1, 0.01),                 // 32
      litHalf: lit({ value: 0.5, min: 0, max: 1, step: 0.01, modDepth: null }),   // 16
      litInt3: lit({ value: 3, min: 1, max: 8, step: 1, modDepth: null }),        // 3
      litMin: lit({ value: 0, min: 0, max: 1, step: 0.01, modDepth: null }),      // 0
      bipolarZeroLit: lit({ value: 0, min: -1, max: 1, step: 0.01, modDepth: null }), // 0
      bipolarHasZero: m.buildSegments({ value: 0, min: -1, max: 1, step: 0.01, modDepth: null }).some((s) => s.zero),
      modCount: m.buildSegments({ value: 0.2, min: 0, max: 1, step: 0.01, modDepth: 0.25 }).filter((s) => s.mod).length, // 8
      snapDens: m.snap(301, 64, 512, 8),                  // 304
      fmt: [m.formatParamValue(0.85), m.formatParamValue(-0.2), m.formatParamValue(2.4), m.formatParamValue(256)].join(','), // .85,-.20,2.40,256
    }
  }))
  say('segment counts', r.n8 === 8 && r.nDens === 32 && r.nCont === 32)
  say('lit counts', r.litHalf === 16 && r.litInt3 === 3 && r.litMin === 0)
  say('bipolar', r.bipolarZeroLit === 0 && r.bipolarHasZero)
  say('mod span', r.modCount === 8)
  say('snap + format', r.snapDens === 304 && r.fmt === '.85,-.20,2.40,256')
}
```

- [ ] **Step 3: Run it.** Restart Vite, then run `node .superpowers/sdd/layout-check.mjs barmath`. It fails until Step 1's file exists. Once it exists, expect PASS. If a line fails, fix `paramBar.ts`, not the expectations; the expectations are what the spec asks for.

- [ ] **Step 4: Write `useParamValue`.**

```ts
// src/hooks/useParamValue.ts
import { useSyncExternalStore } from 'react'
import type { LockableParam } from '../config/effectParams'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useContourStore } from '../stores/contourStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useTrendStore } from '../stores/trendStore'
import { useSegStore } from '../stores/segStore'

// Every store an EFFECT_PARAM_REGISTRY read() can touch (see the getters at the top of effectParams.ts)
const STORES = [
  useGlitchEngineStore, useAcidStore, useAsciiRenderStore, useStippleStore, useContourStore,
  useLandmarksStore, useVisionTrackingStore, useTextureOverlayStore, useDataOverlayStore,
  useStrandStore, useMotionStore, useDestructionStore, useMorphStore, useTrendStore, useSegStore,
]

function subscribe(cb: () => void) {
  const offs = STORES.map((s) => s.subscribe(cb))
  return () => offs.forEach((off) => off())
}

/** The param's live value; re-renders only when that number changes. */
export function useParamValue(param: LockableParam): number {
  return useSyncExternalStore(subscribe, param.read, param.read)
}
```

Before relying on this list, check the store import paths against the getters at lines ~57–71 of `src/config/effectParams.ts`.

- [ ] **Step 5: Write `ParamBar`.**

```tsx
// src/components/performance/ParamBar.tsx
import { memo, useCallback } from 'react'
import type { LockableParam } from '../../config/effectParams'
import { useParamValue } from '../../hooks/useParamValue'
import { useParamControl } from '../../hooks/useParamControl'
import { buildSegments, formatParamValue } from '../../utils/paramBar'

export const ParamBar = memo(function ParamBar({ effectId, param }: { effectId: string; param: LockableParam }) {
  const value = useParamValue(param)
  const onChange = useCallback((v: number) => param.apply(v), [param])
  const ctl = useParamControl({
    paramId: `${effectId}.${param.id}`, label: param.label, value,
    min: param.min, max: param.max, step: param.step, onChange, axis: 'x',
  })
  const first = ctl.routings[0]
  const segs = buildSegments({ value, min: param.min, max: param.max, step: param.step, modDepth: first ? first.depth : null })
  return (
    <div
      className="param-bar"
      data-param-control
      data-param-id={`${effectId}.${param.id}`}
      data-state={ctl.isDragging ? 'drag' : undefined}
      data-locked={ctl.isAutomationTarget || undefined}
      data-assigning={ctl.isInAssignmentMode || undefined}
      data-drop={ctl.isDropTarget || undefined}
      style={{
        ['--mod' as string]: first?.color ?? 'transparent',
        ['--assign' as string]: ctl.assigningColor ?? 'transparent',
      }}
      tabIndex={0}
      role="slider"
      aria-label={param.label}
      aria-valuemin={param.min}
      aria-valuemax={param.max}
      aria-valuenow={value}
      aria-valuetext={formatParamValue(value)}
      {...ctl.rootProps}
    >
      <span className="param-bar-name">{param.label}</span>
      <span className="param-bar-segs" aria-hidden>
        {segs.map((s, i) => (
          <i key={i} data-lit={s.lit || undefined} data-zero={s.zero || undefined} data-mod={s.mod || undefined} />
        ))}
      </span>
      <span className="param-bar-value">{formatParamValue(value)}</span>
      {ctl.routings.slice(0, 3).map((r, i) => (
        <span key={r.id} className="param-bar-src" title={`${r.name} ${Math.round(r.depth * 100)}%`}
          style={{ background: r.color, right: -1 + i * 8 }} {...ctl.dotProps(r)} />
      ))}
      {ctl.contextMenu}
    </div>
  )
})
```

- [ ] **Step 6: Add the bar CSS** to `layout.css`. These values come from the spec and the mockup.

```css
.param-bar { position: relative; height: 28px; display: flex; align-items: center; gap: 5px; padding: 3px 4px;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 2px; cursor: ew-resize;
  user-select: none; touch-action: none; }
.param-bar + .param-bar { margin-top: 3px; }
.param-bar:hover { border-color: var(--border-emphasis); }
.param-bar[data-state="drag"] { border-color: var(--text-secondary); }
.param-bar:focus-visible { outline: 1px solid var(--text-primary); outline-offset: -1px; }
.param-bar[data-locked] { border-color: var(--fx, var(--text-primary)); background: color-mix(in oklch, var(--fx, var(--text-primary)) 8%, var(--bg-surface)); }
.param-bar[data-assigning], .param-bar[data-drop] { border: 1px dashed var(--assign); cursor: copy; }
.param-bar-name { flex: none; width: 58px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.param-bar-segs { flex: 1; align-self: stretch; display: flex; gap: 2px; min-width: 0; }
.param-bar-segs > i { flex: 1; background: oklch(0.245 0.007 270); }
.param-bar-segs > i[data-lit] { background: oklch(0.56 0.008 270); }
.param-bar-segs > i[data-zero] { background: oklch(0.48 0.008 270); }
.param-bar-segs > i[data-mod] { background: color-mix(in oklch, var(--mod) 40%, oklch(0.245 0.007 270)); }
.param-bar-segs > i[data-mod][data-lit] { background: color-mix(in oklch, var(--mod) 70%, oklch(0.56 0.008 270)); }
.param-bar-value { flex: none; width: 40px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.param-bar-src { position: absolute; top: -1px; width: 6px; height: 6px; cursor: ns-resize; }
```

`--fx` is the effect colour. `EffectSettings` sets it on its root in Task 3.

- [ ] **Step 7: Build, lint and commit.** `npm run build` must pass, and eslint on the 4 files must report no problems.

```bash
git add src/hooks/useParamValue.ts src/utils/paramBar.ts src/components/performance/ParamBar.tsx src/components/performance/layout.css
git commit -m "feat: ParamBar (32-segment bar) with live value hook and segment maths"
```

---

### Task 3: `EffectSettings`: knob strip + bars + extras in the chain panel

**Files:**
- Create: `src/components/performance/EffectSettings.tsx`
- Modify: `src/components/performance/ChainPanel.tsx`. `ChainSettings` renders `<EffectSettings effectId={effectId} />` instead of `<EffectParameters_v2 …/>`.
- Modify: `src/components/performance/ExpandedParameterPanel_v2.tsx`. Export `BlockExtras` and leave the rest alone; Task 4 deletes what becomes dead.
- Modify: `.superpowers/sdd/layout-check.mjs`, adding a `settings` mode

**Interfaces:**
- Consumes: `ParamBar` and `useParamValue` (Task 2), `Knob` with an unchanged `paramId` prop (Task 1), `EFFECT_PARAM_REGISTRY` from `src/config/effectParams.ts`, `EffectHeaderBlock`, and `BlockExtras` (now exported).
- Produces: `EffectSettings` with props `{ effectId: string }`. Its root has `data-effect-settings`. The strip root has `data-knob-strip`, and each strip knob carries `data-param-id` (from Task 1).

- [ ] **Step 1: Write the failing check.** Add a `settings` mode to `layout-check.mjs`. It covers Review Focus 1, 2 and 5 and the spec's tests 1 to 5.

```js
if (MODE === 'settings') {
  await open(1440, 900)
  const enable = (fn) => retry(() => p.evaluate(fn))
  // POINT CLOUD: 13 params → 4 knobs + 9 bars, 32 segments each (DENS is in the strip)
  await enable(async () => { const s = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState(); s.setPointCloudEnabled?.(true) ?? s.updatePointCloud?.({ enabled: true }) })
  await enable(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect('point_cloud'))
  await sleep(500)
  const counts = await p.evaluate(() => ({
    knobs: document.querySelectorAll('[data-knob-strip] [data-param-control]').length,
    bars: document.querySelectorAll('[data-effect-settings] .param-bar').length,
    segs: [...document.querySelectorAll('[data-effect-settings] .param-bar')].map((b) => b.querySelectorAll('.param-bar-segs > i').length),
  }))
  say('4 knobs + 9 bars', counts.knobs === 4 && counts.bars === 9)
  say('bars have 32 segments', counts.segs.every((n) => n === 32))
  // Spec test 1: click-to-route on a bar and on a strip knob
  const routeOn = async (sel) => {
    const pid = await p.$eval(sel, (e) => e.dataset.paramId)
    await enable(async () => (await import('/src/stores/modulationStore.ts')).useModulationStore.getState().setAssigningModulator('lfo-0'))
    await p.click(sel)
    await enable(async () => (await import('/src/stores/modulationStore.ts')).useModulationStore.getState().setAssigningModulator(null))
    return p.evaluate(async (pid) => (await import('/src/stores/sequencerStore.ts')).useSequencerStore.getState().routings.some((r) => r.trackId === 'lfo-0' && r.targetParam === pid), pid)
  }
  say('click-to-route on a bar', await routeOn('[data-effect-settings] .param-bar'))
  say('click-to-route on a strip knob', await routeOn('[data-knob-strip] [data-param-control]'))
  // Spec test 4: modulated segments + corner marker on the routed bar
  const mod = await p.$eval('[data-effect-settings] .param-bar', (b) => ({ m: b.querySelectorAll('i[data-mod]').length, src: b.querySelectorAll('.param-bar-src').length }))
  say('modulation span + source marker', mod.m > 0 && mod.src === 1)
  // Spec test 3: drag 100px ≈ half range; click toggles p-lock target; ArrowRight steps
  const bar = '[data-effect-settings] .param-bar:nth-of-type(2)'
  const read = () => p.$eval(bar, (b) => Number(b.getAttribute('aria-valuenow')))
  const v0 = await read(); const bb = await (await p.$(bar)).boundingBox()
  await p.mouse.move(bb.x + 120, bb.y + 14); await p.mouse.down(); await p.mouse.move(bb.x + 220, bb.y + 14, { steps: 8 }); await p.mouse.up()
  const v1 = await read(); const [mn, mx] = await p.$eval(bar, (b) => [Number(b.getAttribute('aria-valuemin')), Number(b.getAttribute('aria-valuemax'))])
  say('drag 100px ≈ half range', Math.abs((v1 - v0) / (mx - mn) - 0.5) < 0.08 || v1 === mx)
  await p.click(bar); await sleep(100)
  say('click sets p-lock target', await p.$eval(bar, (b) => b.hasAttribute('data-locked')))
  await p.focus(bar); const v2 = await read(); await p.keyboard.press('ArrowLeft'); const v3 = await read()
  say('arrow key steps', v3 < v2 || v2 === mn)
  // Review Focus 1: a SEG effect's bar updates live when its store changes
  await enable(async () => { (await import('/src/stores/segStore.ts')).useSegStore.getState().setMatterEnabled(true) })
  await enable(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect('seg_matter'))
  await sleep(400)
  const segBar = '[data-effect-settings] .param-bar'
  const before = await p.$eval(segBar, (b) => b.getAttribute('aria-valuenow'))
  const pid2 = await p.$eval(segBar, (b) => b.dataset.paramId)
  await enable(async () => { const m = await import('/src/config/effectParams.ts'); const [e, k] = pid2.split('.'); const prm = m.EFFECT_PARAM_REGISTRY[e].getParams().find((x) => x.id === k); prm.apply(prm.min) })
  await sleep(200)
  say('SEG bar updates live', (await p.$eval(segBar, (b) => b.getAttribute('aria-valuenow'))) !== before || before === null)
  // Review Focus 2: an effect with ≤4 numeric params shows the strip only (find one from the registry)
  const small = await p.evaluate(async () => { const m = await import('/src/config/effectParams.ts'); return Object.entries(m.EFFECT_PARAM_REGISTRY).find(([, r]) => r.getParams().filter((x) => !(x.min === 0 && x.max === 1 && x.step >= 1)).length <= 4)?.[0] })
  if (small) {
    await enable(async () => { const m = await import('/src/config/effectParams.ts'); m.EFFECT_PARAM_REGISTRY[small].setEnabled(true) })
    await enable(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect(small))
    await sleep(300)
    say(`≤4-param effect (${small}) shows strip only`, await p.evaluate(() => document.querySelectorAll('[data-effect-settings] .param-bar').length === 0 && !!document.querySelector('[data-knob-strip]')))
  }
  // Review Focus 5: switch selection mid-drag → no change lands on the new effect
  await enable(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect('point_cloud'))
  await sleep(300)
  const b2 = await (await p.$(bar)).boundingBox()
  await p.mouse.move(b2.x + 120, b2.y + 14); await p.mouse.down(); await p.mouse.move(b2.x + 160, b2.y + 14, { steps: 4 })
  await enable(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().setSelectedEffect('seg_matter'))
  await sleep(200)
  const segBefore = await p.$eval(segBar, (b) => b.getAttribute('aria-valuenow'))
  await p.mouse.move(b2.x + 260, b2.y + 14, { steps: 4 }); await p.mouse.up(); await sleep(150)
  say('mid-drag switch: new effect untouched', (await p.$eval(segBar, (b) => b.getAttribute('aria-valuenow'))) === segBefore && errors.length === 0)
}
```

If a store setter named here does not exist (for example, how point cloud is enabled), find the real one with `grep` and use it, keeping the assertion the same. The registry's `setEnabled` is the generic route for enabling.

- [ ] **Step 2: Run it and confirm it fails.** Restart Vite, then run `node .superpowers/sdd/layout-check.mjs settings`. Expect FAIL at "4 knobs + 9 bars", because `[data-effect-settings]` does not exist yet.

- [ ] **Step 3: Write `EffectSettings`.**

```tsx
// src/components/performance/EffectSettings.tsx
import { memo, useCallback, useMemo } from 'react'
import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../../config/effectParams'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../../config/effects'
import { EffectHeaderBlock } from './blocks/EffectHeaderBlock'
import { ToggleBlock } from './blocks/ToggleBlock'
import { BlockExtras } from './ExpandedParameterPanel_v2'
import { Knob } from './Knob'
import { ParamBar } from './ParamBar'
import { useParamValue } from '../../hooks/useParamValue'
import { formatParamValue } from '../../utils/paramBar'

const ALL_EFFECTS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]
const isToggle = (p: LockableParam) => p.min === 0 && p.max === 1 && p.step >= 1

const StripKnob = memo(function StripKnob({ effectId, param }: { effectId: string; param: LockableParam }) {
  const value = useParamValue(param)
  const onChange = useCallback((v: number) => param.apply(v), [param])
  return <Knob label={param.label} value={value} min={param.min} max={param.max} step={param.step}
    onChange={onChange} paramId={`${effectId}.${param.id}`} size="md" formatValue={formatParamValue} />
})

const ParamToggle = memo(function ParamToggle({ param }: { param: LockableParam }) {
  const value = useParamValue(param)
  return <ToggleBlock label={param.label} value={value >= 0.5} onChange={(on) => param.apply(on ? 1 : 0)} />
})

export const EffectSettings = memo(function EffectSettings({ effectId }: { effectId: string }) {
  const color = ALL_EFFECTS.find((e) => e.id === effectId)?.color ?? 'var(--text-primary)'
  // getParams() builds closures; build once per effect so memoised children see stable param objects
  const { strip, bars, toggles } = useMemo(() => {
    const all = EFFECT_PARAM_REGISTRY[effectId]?.getParams() ?? []
    const numeric = all.filter((p) => !isToggle(p))
    return { strip: numeric.slice(0, 4), bars: numeric.slice(4), toggles: all.filter(isToggle) }
  }, [effectId])
  return (
    <div data-effect-settings={effectId} style={{ ['--fx' as string]: color, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <EffectHeaderBlock effectId={effectId} />
      {strip.length > 0 && (
        <div data-knob-strip style={{ background: 'var(--bg-surface)', margin: '0 -8px', padding: '6px 8px 4px', borderBottom: '1px solid var(--border)' }}>
          <span className="hud-label" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Main</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', justifyItems: 'center', gap: 4, marginTop: 2 }}>
            {strip.map((p) => <StripKnob key={p.id} effectId={effectId} param={p} />)}
          </div>
        </div>
      )}
      {bars.length > 0 && <div>{bars.map((p) => <ParamBar key={p.id} effectId={effectId} param={p} />)}</div>}
      {toggles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {toggles.map((p) => <ParamToggle key={p.id} param={p} />)}
        </div>
      )}
      <BlockExtras effectId={effectId} />
    </div>
  )
})
```

Check `ToggleBlock`'s and `Knob`'s real prop names (`formatValue`, `size`), and how `BlockParameters` handles select params today (`getSelectParams`). If selects are rendered inside `BlockParameters` rather than in `BlockExtras`, carry that `SelectBlock` loop into `EffectSettings` below the toggles, reading the registry's `getSelectParams`.

- [ ] **Step 4: Wire it into `ChainPanel`.** In `ChainSettings`, replace `<EffectParameters_v2 effectId={effectId} />` with `<EffectSettings effectId={effectId} />`, and update the import. Export `BlockExtras` from `ExpandedParameterPanel_v2.tsx` by adding `export` to its declaration.

- [ ] **Step 5: Run the check.** Restart Vite, then run `node .superpowers/sdd/layout-check.mjs settings`; expect PASS. Then run `chain`, `shell`, `route`, `barmath`, `seg-verify.mjs wiring` and `bands-check.mjs ui gate mod`; all should PASS.

- [ ] **Step 6: Re-render check (spec test 5).** Add a temporary `useRef` counter to `ParamBar` and `StripKnob`, logging on `window.__renders`. Route LFO 1 to one bar, run 2 s and confirm that only that bar's counter climbs. Report the numbers, then remove the counter before committing.

- [ ] **Step 7: Build, lint and commit.**

```bash
git add src/components/performance/EffectSettings.tsx src/components/performance/ChainPanel.tsx src/components/performance/ExpandedParameterPanel_v2.tsx
git commit -m "feat: effect settings as knob strip + segmented bars in the chain panel"
```

---

### Task 4: Delete the dead parameter panels; update CLAUDE.md

**Files:**
- Delete: `src/components/performance/CompactEffectParams.tsx` and `src/components/performance/ExpandedParameterPanel.tsx` (v1)
- Delete if unreferenced afterwards:
  - the numeric blocks `ParamBlock`, `DragNumberBlock`, `ArcBlock`, `VerticalFaderBlock`, `RulerBlock`, `ButtonRowBlock` and `BipolarBlock`;
  - `ParamSection`;
  - `src/utils/classifyParam.ts` and `src/utils/classifySection.ts`;
  - the parts of `ExpandedParameterPanel_v2.tsx` other than `BlockExtras`. If only `BlockExtras` remains, move it to `src/components/performance/EffectExtras.tsx` and delete v2.
  - the orphan components `EffectCard.tsx` and `EffectLauncherGrid.tsx`, if nothing renders them.
- Modify: `CLAUDE.md`

- [ ] **Step 1: Find what is dead.** For each candidate, run `grep -rn "<Name>" src` (the component's import name). A file is dead only if nothing imports it, or if its only importers are themselves being deleted. Write the list into the report before deleting anything.
- [ ] **Step 2: Delete the dead files** and tidy any now-unused imports and exports.
- [ ] **Step 3: Update `CLAUDE.md`.**
  - In "Adding New Effect Pages/Effects", remove step 6 (Compact Effect Params) and step 9 (Expanded Parameter Panel). Renumber the rest.
  - Under step 11 (Param Registry), add: "The registry entry drives the chain panel's settings: its first four numeric params form the knob strip, the rest render as segmented bars, and 0/1 integer params render as toggles. Selects come from `getSelectParams`; bespoke colour/texture controls live in `BlockExtras`."
  - Update the Architecture section's Chain Panel paragraph to mention `EffectSettings`, `ParamBar` and `useParamControl`.
- [ ] **Step 4: Verify.** `npm run build` passes, eslint shows no new problems, and `layout-check settings`, `chain` and `seg-verify wiring` all PASS.
- [ ] **Step 5: Commit.**

```bash
git add -u src CLAUDE.md
git add src/components/performance/EffectExtras.tsx 2>/dev/null || true
git commit -m "chore: delete unused per-effect parameter panels and blocks; CLAUDE.md param docs"
```

`git add -u` stages only tracked modifications and deletions, so it is safe here. It is not `-A`.

---

### Task 5: Final verification and screenshots

**Files:**
- Modify: `.superpowers/sdd/layout-check.mjs`, adding a `paramshots` mode

- [ ] **Step 1: Add the `paramshots` mode.**
  - At 1440×900 and 960×1200, select POINT CLOUD, then SEG_EXP's VOXEL after loading the preset with `usePresetLibraryStore.getState().loadFromDB()` and `loadPreset('factory_seg_exp')`.
  - Screenshot the chain column to `.superpowers/sdd/shots/params-<effect>-<size>.png`.
  - Build `.superpowers/sdd/shots/compare-params.png` with ffmpeg: `hstack` of `docs/superpowers/specs/assets/2026-10-07-param-bars/final.png` (cropped to its column) and `params-point_cloud-1440x900.png`, scaled to the same height.
- [ ] **Step 2: Run everything,** with a fresh server each time:
  - `layout-check` modes `tokens`, `shell`, `chain`, `effects`, `dock`, `menus`, `route`, `barmath`, `settings`, `paramshots`;
  - `seg-verify.mjs wiring`;
  - `bands-check.mjs ui`, `gate` and `mod`;
  - `export-check.mjs`.

  All must PASS. Re-run once on "Promise was collected" and note it.
- [ ] **Step 3: Contrast.** Use the canvas-resolved measurement from `.superpowers/sdd/contrast.mjs`:
  - bar name and value on `--bg-surface` must be at least 4.5:1;
  - lit versus unlit segments must be at least 3:1.

  Report the ratios.
- [ ] **Step 4: Gates.** `npm run build` passes. eslint shows no new problems versus the plan base.
- [ ] **Step 5: Hand over.** List the `compare-params.png` path and the 4 screenshot paths in the report for human review. Do not commit screenshots.
