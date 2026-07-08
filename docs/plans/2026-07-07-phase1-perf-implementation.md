# Phase 1: Core Performance Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the WebGL pass-rebuild leak, per-frame costs of disabled temporal effects, redundant GPU→CPU readbacks, and unthrottled control updates in the Strand Tracer render pipeline.

**Architecture:** The `EffectPipeline` (three.js + postprocessing `EffectComposer`) gains pass caching with disposal and a structural short-circuit. Param updates move out of React's render cycle into direct zustand `subscribe` listeners that write shader uniforms. Canvas-2D overlays share one downsampled readback of the WebGL canvas instead of each doing their own.

**Tech Stack:** TypeScript, React 18, zustand 5, three ^0.182, postprocessing ^6.38, Vite. No test runner exists in this repo — the verification protocol is `npm run build` (runs `tsc -b`) plus Playwright MCP browser checks against `npm run dev`, per project convention.

**Spec:** `docs/plans/2026-07-07-optimization-trend-effects-design.md` (Phase 1 section is authoritative).

## Global Constraints

- Every task ends with `npm run build` passing (this runs `tsc -b && vite build`).
- Browser verification uses Playwright MCP against the Vite dev server; the app must show no new console errors.
- Do not modify anything under `src/components/overlays/strand/` or `src/components/overlays/acid/` effect files (that's Phase 3).
- Do not change any effect's visual output except PixelSort (Task 8, bounded change) — if a verification screenshot looks different from before your change, stop and investigate.
- Commit per task with prefix `perf:`.
- The repo has uncommitted UI-polish changes; Task 0 commits them first so perf work starts from a clean tree. Do not revert or edit those changes.

---

### Task 0: Commit the in-flight motion-polish work and create the branch

**Files:** none created; git only.

- [ ] **Step 1: Verify the current working tree builds**

Run: `npm run build`
Expected: exits 0. If it fails, STOP and report — do not commit broken WIP.

- [ ] **Step 2: Commit the existing working-tree changes on master**

The working tree contains Kevin's finished motion-foundation polish (theme.css + performance components). Commit it as its own commit:

```bash
git add -A src/ 
git commit -m "feat(ui): motion foundation tokens + control interaction feedback"
```

- [ ] **Step 3: Create the phase branch**

```bash
git checkout -b perf/phase1-pipeline
```

---

### Task 1: Frame-time monitor (baseline measurement)

**Files:**
- Create: `src/utils/perfMonitor.ts`
- Modify: `src/components/Canvas.tsx:655-664` (render loop)
- Modify: `src/components/performance/StatusBar.tsx` (readout)

**Interfaces:**
- Produces: `perfMonitor.record(frameMs: number): void`, `perfMonitor.getStats(): { avgMs: number; maxMs: number; fps: number }`, `advanceReadbackFrame` is NOT here (Task 6). Later tasks use these exact names.

- [ ] **Step 1: Create the monitor module**

```ts
// src/utils/perfMonitor.ts
// Ring buffer of recent frame durations. Zero allocation per frame.
const SIZE = 120
const samples = new Float32Array(SIZE)
let index = 0
let count = 0

export const perfMonitor = {
  record(frameMs: number) {
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
```

- [ ] **Step 2: Record frames in the Canvas render loop**

In `src/components/Canvas.tsx`, add the import at the top with the other utils imports:

```ts
import { perfMonitor } from '../utils/perfMonitor'
```

Replace the `animate` function (currently at ~line 655):

```ts
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      const start = performance.now()
      try {
        pipeline.render()
      } catch (e) {
        // Prevent render errors (e.g. tainted texture) from crashing the loop
        console.warn('Render error:', e)
      }
      perfMonitor.record(performance.now() - start)
    }
```

Note: this measures the WebGL pipeline cost specifically (not total main-thread frame time) — that is intentional; it is the number Tasks 2–8 move.

- [ ] **Step 3: Add a dev-only readout to StatusBar**

Read `src/components/performance/StatusBar.tsx` first to match its existing row/label styling. Add, inside the component:

```tsx
import { useState, useEffect } from 'react'
import { perfMonitor } from '../../utils/perfMonitor'

// inside the component body:
const [perf, setPerf] = useState({ avgMs: 0, maxMs: 0, fps: 0 })
useEffect(() => {
  if (!import.meta.env.DEV) return
  const id = setInterval(() => setPerf(perfMonitor.getStats()), 500)
  return () => clearInterval(id)
}, [])
```

And render (only in dev), styled like the neighboring status items:

```tsx
{import.meta.env.DEV && (
  <span title="render pipeline avg/max ms">
    {perf.avgMs.toFixed(1)}ms · {perf.fps.toFixed(0)}fps
  </span>
)}
```

- [ ] **Step 4: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 5: Record the baseline (browser)**

Start `npm run dev`. With Playwright MCP: open the app, enable webcam or load a clip, enable RGB split + Echo Trail + Pixel Sort + one STRAND effect (e.g. TAR). Read the StatusBar numbers. Write them into a new file `docs/plans/phase1-perf-baseline.md`:

```markdown
# Phase 1 perf baseline (before)
Stack: RGB split + Echo Trail + Pixel Sort + TAR, source: <what you used>, window ~<w×h>
- pipeline avg: <X> ms, max: <X> ms, fps: <X>
- knob drag (RGB amount, 10s): avg <X> ms
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/perfMonitor.ts src/components/Canvas.tsx src/components/performance/StatusBar.tsx docs/plans/phase1-perf-baseline.md
git commit -m "perf: add dev-only pipeline frame-time monitor + baseline"
```

---

### Task 2: EffectPass caching, disposal, and structural short-circuit

**Files:**
- Modify: `src/effects/EffectPipeline.ts:92-93, 206-328, 436-472`

**Interfaces:**
- Consumes: existing `updateEffects(config)` signature — unchanged for callers.
- Produces: private `passCache: Map<Effect, EffectPass>`, private `lastChainKey: string`. Behavior later tasks rely on: calling `updateEffects` with an unchanged enabled set/order is near-free.

- [ ] **Step 1: Add the cache fields**

In `src/effects/EffectPipeline.ts`, replace lines 92–93:

```ts
  private effectPasses: EffectPass[] = []
  private crossfaderPass: EffectPass | null = null
```

with:

```ts
  private effectPasses: EffectPass[] = []
  private crossfaderPass: EffectPass | null = null
  // Cache one EffectPass per Effect so param changes never recompile shaders.
  // A pass is disposed only when its effect leaves the chain (or on dispose()).
  private passCache = new Map<Effect, EffectPass>()
  private lastChainKey = ''
```

- [ ] **Step 2: Rewrite the pass-management section of `updateEffects`**

Replace the body of `updateEffects` from the `// Remove existing passes` comment (line 249) through the end of the method (line 328) with:

```ts
    // Update crossfader position (cheap uniform write, safe on every call)
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setCrossfaderPosition(config.crossfaderPosition)
    }

    // Map effect IDs to enabled state
    const enabledMap: Record<string, boolean> = {
      rgb_split: config.rgbSplitEnabled,
      chromatic: config.chromaticAberrationEnabled,
      posterize: config.posterizeEnabled,
      color_grade: config.colorGradeEnabled,
      block_displace: config.blockDisplaceEnabled,
      static_displace: config.staticDisplacementEnabled,
      pixelate: config.pixelateEnabled,
      lens: config.lensDistortionEnabled,
      scan_lines: config.scanLinesEnabled,
      vhs: config.vhsTrackingEnabled,
      noise: config.noiseEnabled,
      dither: config.ditherEnabled,
      edges: config.edgeDetectionEnabled,
      feedback: config.feedbackLoopEnabled,
      motion_extract: config.motionExtractEnabled,
      echo_trail: config.echoTrailEnabled,
      time_smear: config.timeSmearEnabled,
      freeze_mask: config.freezeMaskEnabled,
      acid_dots: config.dotsEnabled,
      ascii: config.asciiEnabled,
      datamosh: config.datamoshEnabled,
      pixelSort: config.pixelSortEnabled,
      sonify: config.sonifyEnabled,
      point_cloud: config.pointCloudEnabled,
      face_hud: config.faceHudEnabled,
      // Trace effects
      track_bright: config.brightTraceEnabled,
      track_motion: config.motionTraceEnabled,
      track_edge: config.edgeTraceEnabled,
      track_color: config.colorTraceEnabled,
      track_face: config.faceTraceEnabled,
      track_hands: config.handsTraceEnabled,
    }

    // Compute the active chain (empty when bypassed)
    const activeIds = config.bypassActive
      ? []
      : config.effectOrder.filter((id) => enabledMap[id] && this.getEffectById(id))

    // Structural short-circuit: same chain -> nothing to rebuild
    const chainKey = activeIds.join('|')
    if (chainKey === this.lastChainKey) return
    this.lastChainKey = chainKey

    // Remove all current effect passes from the composer (they stay cached)
    for (const pass of this.effectPasses) {
      this.composer.removePass(pass)
    }
    this.effectPasses = []
    if (this.crossfaderPass) {
      this.composer.removePass(this.crossfaderPass)
      this.crossfaderPass = null
    }

    // Dispose cached passes whose effect is no longer in the chain.
    // Disposing only here is safe: the effect itself is leaving the chain too.
    const activeEffects = new Set(activeIds.map((id) => this.getEffectById(id)!))
    for (const [effect, pass] of this.passCache) {
      if (!activeEffects.has(effect)) {
        pass.dispose()
        this.passCache.delete(effect)
      }
    }

    // If bypass is active, don't add any effect passes - just render the input
    if (config.bypassActive) return

    // Add effect passes in order, reusing cached passes (guitar-pedal chain)
    for (const effectId of activeIds) {
      const effect = this.getEffectById(effectId)!
      let pass = this.passCache.get(effect)
      if (!pass) {
        pass = new EffectPass(this.camera, effect)
        this.passCache.set(effect, pass)
      }
      this.composer.addPass(pass)
      this.effectPasses.push(pass)
    }

    // Add crossfader pass for A/B blending (source vs processed)
    // Always add the pass - source texture is set separately via setSourceTexture()
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setQuadScale(1, 1)
      this.crossfaderPass = new EffectPass(this.camera, this.crossfaderEffect)
      this.composer.addPass(this.crossfaderPass)
    }
```

Note the crossfader pass is still recreated per rebuild — rebuilds are now rare (enable/disable/reorder only), so that is acceptable; but dispose it: add `this.crossfaderPass.dispose()` immediately after the `this.composer.removePass(this.crossfaderPass)` line above (before nulling).

- [ ] **Step 3: Dispose cached passes in `dispose()`**

At the top of `dispose()` (line 436), before `this.composer.dispose()`, add:

```ts
    for (const [, pass] of this.passCache) pass.dispose()
    this.passCache.clear()
```

- [ ] **Step 4: Delete dead code**

Delete the entire `captureFrameForMotionEffects` method (lines 474–498). `grep -rn captureFrameForMotionEffects src` must return only zero hits after deletion (it already has no callers).

- [ ] **Step 5: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 6: Browser verification**

With dev server + Playwright MCP:
1. Enable RGB split → screenshot shows the split. Disable → normal. Re-enable → split again (proves cached-pass re-add and disposal/recreate path work).
2. Leak check: temporarily expose the renderer in `src/hooks/useThree.ts` by adding `;(window as any).__renderer = renderer` right after the renderer is created (remove before commit). In the browser console run `__renderer.info.programs.length`, drag the RGB amount knob for 10 s, run it again — the count must be identical. Also confirm StatusBar avg-ms during the drag stays within ~1 ms of idle (rebuilds still fire from React until Task 4, but each is now a cheap re-add of cached passes).
3. Toggle Echo Trail off/on: trails restart cleanly, no black frame, no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/effects/EffectPipeline.ts
git commit -m "perf: cache EffectPasses, dispose on removal, short-circuit unchanged chains"
```

---

### Task 3: Guard `initialize()` against double target allocation

With cached passes, `composer.addPass(pass)` re-runs `pass.initialize(...)` → each effect's `initialize()`. Today those methods unconditionally `new THREE.WebGLRenderTarget(...)`, leaking the previous targets on every re-add. Guard each one to allocate only when its targets are null.

**Files (all Modify):**
- `src/effects/glitch-engine/EchoTrailEffect.ts:140`
- `src/effects/glitch-engine/FeedbackLoopEffect.ts:181`
- `src/effects/glitch-engine/DatamoshEffect.ts:582`
- `src/effects/glitch-engine/MotionExtractEffect.ts:122`
- `src/effects/glitch-engine/TimeSmearEffect.ts` (its `initialize`)
- `src/effects/glitch-engine/FreezeMaskEffect.ts` (its `initialize`)
- `src/effects/glitch-engine/MotionTraceEffect.ts:84`
- `src/effects/glitch-engine/TraceEffect.ts:79` (base class — covers BrightTrace/EdgeTrace/ColorTrace)
- `src/effects/glitch-engine/FaceTraceEffect.ts:98`
- `src/effects/glitch-engine/HandsTraceEffect.ts:116`
- `src/effects/glitch-engine/PointCloudEffect.ts:343`

**Interfaces:** none new. Task 5 relies on: after targets are nulled, calling `initialize` again recreates them.

- [ ] **Step 1: Add a guard line to each `initialize`**

Insert the guard as the first line after the `super.initialize(...)` call in each file, keyed on that class's first target member:

| File | Guard line |
|------|-----------|
| EchoTrailEffect.ts | `if (this.trailTarget) return` |
| FeedbackLoopEffect.ts | `if (this.feedbackTarget) return` |
| DatamoshEffect.ts | `if (this.prevFrameTarget) return` |
| MotionExtractEffect.ts | `if (this.historyTargets.length > 0) return` |
| TimeSmearEffect.ts | `if (this.accumulationTarget) return` |
| FreezeMaskEffect.ts | `if (this.freezeTarget) return` |
| MotionTraceEffect.ts | `if (this.historyTarget) return` |
| TraceEffect.ts | `if (this.traceMaskTarget) return` |
| FaceTraceEffect.ts | `if (this.faceMaskTarget) return` |
| HandsTraceEffect.ts | `if (this.handMaskTarget) return` |
| PointCloudEffect.ts | `if (this.renderTarget) return` |

Example (EchoTrailEffect.ts, line 140):

```ts
  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.trailTarget) return
    // ... existing allocation code unchanged
```

Apply the same two-line shape in every file listed. If any file's `initialize` also allocates non-target resources (scenes/materials, e.g. EchoTrail's `copyMaterial`), the guard placed before ALL allocations is correct — those would double-allocate too.

- [ ] **Step 2: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 3: Browser verification**

Enable Echo Trail → disable → enable another effect (forces chain rebuilds) → re-enable Echo Trail. Trails must still render. Repeat with Freeze Mask. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/effects/glitch-engine/
git commit -m "perf: guard effect initialize() against double render-target allocation"
```

---

### Task 4: Move param sync out of React (zustand subscriptions)

**Files:**
- Create: `src/effects/paramSync.ts`
- Modify: `src/components/Canvas.tsx:76-152` (store destructures), `216-532` (the giant useEffect)

**Interfaces:**
- Consumes: `EffectPipeline` public effect fields (`pipeline.rgbSplit` etc., unchanged); Task 2's short-circuit (residual structural calls are near-free).
- Produces: `initParamSync(pipeline: EffectPipeline): () => void` — subscribes to all param slices, pushes initial values immediately, returns an unsubscribe-all function. `Canvas.tsx` calls it in a `useEffect` keyed on `[pipeline]`.

- [ ] **Step 1: Create `src/effects/paramSync.ts`**

```ts
import type { EffectPipeline } from './EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMotionStore } from '../stores/motionStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useRoutingStore } from '../stores/routingStore'

/**
 * Pushes effect parameters straight into shader uniforms via zustand
 * subscriptions — no React render cycle involved. Structural changes
 * (enable/disable/reorder) remain React-driven in Canvas.tsx.
 */
export function initParamSync(pipeline: EffectPipeline): () => void {
  const getMix = (id: string) => useGlitchEngineStore.getState().effectMix[id] ?? 1

  const pushGlitch = () => {
    const s = useGlitchEngineStore.getState()
    pipeline.rgbSplit?.updateParams({ ...s.rgbSplit, mix: getMix('rgb_split') })
    pipeline.chromaticAberration?.updateParams({ ...s.chromaticAberration, mix: getMix('chromatic') })
    pipeline.posterize?.updateParams({ ...s.posterize, mix: getMix('posterize') })
    pipeline.colorGrade?.updateParams({ ...s.colorGrade, mix: getMix('color_grade') })
    pipeline.blockDisplace?.updateParams({ ...s.blockDisplace, mix: getMix('block_displace') })
    pipeline.staticDisplacement?.updateParams({ ...s.staticDisplacement, mix: getMix('static_displace') })
    pipeline.pixelate?.updateParams({ ...s.pixelate, mix: getMix('pixelate') })
    pipeline.lensDistortion?.updateParams({ ...s.lensDistortion, mix: getMix('lens') })
    pipeline.scanLines?.updateParams({ ...s.scanLines, mix: getMix('scan_lines') })
    pipeline.vhsTracking?.updateParams({ ...s.vhsTracking, mix: getMix('vhs') })
    pipeline.noise?.updateParams({ ...s.noise, mix: getMix('noise') })
    pipeline.dither?.updateParams({ ...s.dither, mix: getMix('dither') })
    pipeline.edgeDetection?.updateParams({ ...s.edgeDetection, mix: getMix('edges') })
    pipeline.feedbackLoop?.updateParams({ ...s.feedbackLoop, mix: getMix('feedback') })
  }

  const pushMotion = () => {
    const s = useMotionStore.getState()
    pipeline.motionExtract?.updateParams({ ...s.motionExtract, mix: getMix('motion_extract') })
    pipeline.echoTrail?.updateParams({ ...s.echoTrail, mix: getMix('echo_trail') })
    pipeline.timeSmear?.updateParams({ ...s.timeSmear, mix: getMix('time_smear') })
    pipeline.freezeMask?.updateParams({ ...s.freezeMask, mix: getMix('freeze_mask') })
  }

  const pushDots = () => {
    const s = useAcidStore.getState()
    pipeline.dotsEffect?.updateParams({ ...s.dotsParams, mix: getMix('acid_dots') })
  }

  const pushAscii = () => {
    const p = useAsciiRenderStore.getState().params
    pipeline.asciiEffect?.updateParams({
      mode: p.mode === 'matrix' ? 'standard' : (p.mode as 'standard' | 'blocks' | 'braille'),
      cellSize: p.resolution,
      contrast: p.contrast,
      invert: p.invert,
      colorMode: p.colorMode as 'mono' | 'original' | 'gradient',
      monoColor: p.monoColor,
      gradientEndColor: p.gradientEnd,
      mix: getMix('ascii'),
    })
  }

  const pushDestruction = () => {
    const s = useDestructionStore.getState()
    // Note: destruction-mode override (max datamosh) stays in Canvas.tsx's
    // structural effect — it depends on destructionActive, not these params.
    pipeline.datamosh?.updateParams({ ...s.datamoshParams, mix: getMix('datamosh') })
    pipeline.pixelSort?.updateParams({ ...s.pixelSortParams, mix: getMix('pixelSort') })
    pipeline.sonify?.updateParams({ ...s.sonifyParams, mix: getMix('sonify') })
    pipeline.pointCloud?.updateParams({ ...s.pointCloudParams, mix: getMix('point_cloud') })
  }

  const pushMorph = () => {
    const s = useMorphStore.getState()
    pipeline.faceHud?.updateParams({ ...s.faceHudParams, mix: getMix('face_hud') })
  }

  const pushTrace = () => {
    const s = useVisionTrackingStore.getState()
    pipeline.brightTrace?.updateParams({
      threshold: 0.5,
      trailEnabled: s.brightTraceParams.trailEnabled,
      trailDecay: s.brightTraceParams.trailDecay,
      mix: 0,
    })
    pipeline.motionTrace?.updateParams({
      threshold: 0.1,
      trailEnabled: s.motionTraceParams.trailEnabled,
      trailDecay: s.motionTraceParams.trailDecay,
      sensitivity: s.motionTraceParams.sensitivity,
      mix: 0,
    })
    pipeline.edgeTrace?.updateParams({
      threshold: 0.15,
      trailEnabled: s.edgeTraceParams.trailEnabled,
      trailDecay: s.edgeTraceParams.trailDecay,
      mix: 0,
    })
    pipeline.colorTrace?.updateParams({
      threshold: 0.5,
      trailEnabled: s.colorTraceParams.trailEnabled,
      trailDecay: s.colorTraceParams.trailDecay,
      targetHue: s.colorTraceParams.targetHue,
      hueRange: s.colorTraceParams.hueRange,
      satMin: s.colorTraceParams.satMin,
      valMin: s.colorTraceParams.valMin,
      mix: 0,
    })
    pipeline.faceTrace?.updateParams({
      trailEnabled: s.faceTraceParams.trailEnabled,
      trailDecay: s.faceTraceParams.trailDecay,
      feather: s.faceTraceParams.feather,
      fillMode: s.faceTraceParams.fillMode as 'mesh' | 'oval' | 'bbox',
      mix: 0,
    })
    pipeline.handsTrace?.updateParams({
      trailEnabled: s.handsTraceParams.trailEnabled,
      trailDecay: s.handsTraceParams.trailDecay,
      feather: s.handsTraceParams.feather,
      fillMode: s.handsTraceParams.fillMode as 'skeleton' | 'hull' | 'bbox',
      mix: 0,
    })
  }

  const pushCrossfader = () => {
    pipeline.setCrossfaderPosition(useRoutingStore.getState().crossfaderPosition)
  }

  // Initial push so a fresh pipeline gets current values immediately
  pushGlitch(); pushMotion(); pushDots(); pushAscii()
  pushDestruction(); pushMorph(); pushTrace(); pushCrossfader()

  // Subscribe with reference-equality slice checks (zustand v5 vanilla
  // subscribe gives (state, prevState)). effectMix lives in the glitch
  // store and feeds every group's mix, so a mix change re-pushes all.
  const unsubs = [
    useGlitchEngineStore.subscribe((s, prev) => {
      if (s.effectMix !== prev.effectMix) {
        pushGlitch(); pushMotion(); pushDots(); pushAscii()
        pushDestruction(); pushMorph()
        return
      }
      if (
        s.rgbSplit !== prev.rgbSplit || s.chromaticAberration !== prev.chromaticAberration ||
        s.posterize !== prev.posterize || s.colorGrade !== prev.colorGrade ||
        s.blockDisplace !== prev.blockDisplace || s.staticDisplacement !== prev.staticDisplacement ||
        s.pixelate !== prev.pixelate || s.lensDistortion !== prev.lensDistortion ||
        s.scanLines !== prev.scanLines || s.vhsTracking !== prev.vhsTracking ||
        s.noise !== prev.noise || s.dither !== prev.dither ||
        s.edgeDetection !== prev.edgeDetection || s.feedbackLoop !== prev.feedbackLoop
      ) pushGlitch()
    }),
    useMotionStore.subscribe((s, prev) => {
      if (
        s.motionExtract !== prev.motionExtract || s.echoTrail !== prev.echoTrail ||
        s.timeSmear !== prev.timeSmear || s.freezeMask !== prev.freezeMask
      ) pushMotion()
    }),
    useAcidStore.subscribe((s, prev) => {
      if (s.dotsParams !== prev.dotsParams) pushDots()
    }),
    useAsciiRenderStore.subscribe((s, prev) => {
      if (s.params !== prev.params) pushAscii()
    }),
    useDestructionStore.subscribe((s, prev) => {
      if (
        s.datamoshParams !== prev.datamoshParams || s.pixelSortParams !== prev.pixelSortParams ||
        s.sonifyParams !== prev.sonifyParams || s.pointCloudParams !== prev.pointCloudParams
      ) pushDestruction()
    }),
    useMorphStore.subscribe((s, prev) => {
      if (s.faceHudParams !== prev.faceHudParams) pushMorph()
    }),
    useVisionTrackingStore.subscribe((s, prev) => {
      if (
        s.brightTraceParams !== prev.brightTraceParams || s.motionTraceParams !== prev.motionTraceParams ||
        s.edgeTraceParams !== prev.edgeTraceParams || s.colorTraceParams !== prev.colorTraceParams ||
        s.faceTraceParams !== prev.faceTraceParams || s.handsTraceParams !== prev.handsTraceParams
      ) pushTrace()
    }),
    useRoutingStore.subscribe((s, prev) => {
      if (s.crossfaderPosition !== prev.crossfaderPosition) pushCrossfader()
    }),
  ]

  return () => unsubs.forEach((u) => u())
}
```

Caveat for the implementer: if any of these stores was created with zustand middleware that changes `subscribe`'s signature, adapt the compare to `(state) => {...}` with a captured `prev` variable. Check each store's `create` call; as of writing they are all plain `create<T>()((set, get) => ...)`.

- [ ] **Step 2: Wire it into Canvas.tsx and strip the param code from the structural effect**

In `src/components/Canvas.tsx`:

(a) Add import: `import { initParamSync } from '../effects/paramSync'`

(b) Add a new useEffect right after the pipeline-initialization useEffect (~line 180):

```ts
  // Param sync: direct store→uniform writes, outside the React render cycle
  useEffect(() => {
    if (!pipeline) return
    return initParamSync(pipeline)
  }, [pipeline])
```

(c) In the giant useEffect (starts ~line 216), DELETE:
- the `getMix` helper and every `updateParams` call for: rgbSplit, chromaticAberration, posterize, colorGrade, blockDisplace, staticDisplacement, pixelate, lensDistortion, scanLines, vhsTracking, noise, dither, edgeDetection, feedbackLoop, motionExtract, echoTrail, timeSmear, freezeMask, faceHud, dotsEffect, asciiEffect (lines ~219–258)
- the `pixelSort`/`sonify`/`pointCloud` param blocks (lines ~331–341, 351–355)
- the datamosh `else if (datamoshEnabled)` branch param push (keep the `destructionActive` max-override block — that is structural)
- all six trace-effect `updateParams` blocks (lines ~359–425) BUT KEEP the `setFaceLandmarks`/`setHandLandmarks` calls — move them to their own effect (step d)

KEEP in the structural effect: `pipeline.updateEffects({...})`, the destruction-mode datamosh override, faceHud `initFaceMesh`/`setVideoElement`, and the trace-mask application block (`applyTraceMask` + the three `setTraceMask` calls).

(d) Landmarks change many times per second and must not re-run the structural effect. Add a dedicated effect:

```ts
  // Landmark data flows at detection cadence — keep it out of the structural effect
  useEffect(() => {
    if (!pipeline) return
    if (pipeline.faceTrace && faceEnabled) {
      pipeline.faceTrace.setFaceLandmarks(faces.map(f => ({
        points: f.points.map(p => ({ x: p.point.x, y: p.point.y })),
        boundingBox: f.boundingBox,
      })))
    }
    if (pipeline.handsTrace && handsEnabled) {
      pipeline.handsTrace.setHandLandmarks(hands.map(h => ({
        points: h.points.map(p => ({ x: p.point.x, y: p.point.y })),
        handedness: h.handedness,
      })))
    }
  }, [pipeline, faces, hands, faceEnabled, handsEnabled])
```

(e) Prune the structural effect's dependency array to exactly:

```ts
  }, [
    pipeline,
    glitchEnabled,
    rgbSplitEnabled, chromaticAberrationEnabled, posterizeEnabled, colorGradeEnabled,
    blockDisplaceEnabled, staticDisplacementEnabled, pixelateEnabled, lensDistortionEnabled,
    scanLinesEnabled, vhsTrackingEnabled, noiseEnabled, ditherEnabled,
    edgeDetectionEnabled, feedbackLoopEnabled,
    effectOrder, bypassActive, crossfaderPosition, effectBypassed, soloEffectId,
    motionExtractEnabled, echoTrailEnabled, timeSmearEnabled, freezeMaskEnabled,
    mediaTexture, slicerEnabled, slicerProcessEffects,
    dotsEnabled, asciiEnabled, asciiParams,
    destructionActive,
    datamoshEnabled, pixelSortEnabled, sonifyEnabled, pointCloudEnabled, faceHudEnabled,
    brightEnabled, edgeEnabled, colorEnabled, motionEnabled, faceEnabled, handsEnabled,
    effectTraceMask,
    videoElement,
  ])
```

(`asciiParams` stays because `asciiParams.mode !== 'matrix'` feeds an enabled flag; `crossfaderPosition` stays as an updateEffects input but Task 2's short-circuit makes it free; `videoElement` is used by faceHud wiring. Param objects — `rgbSplit`, `datamoshParams`, `faces`, `hands`, `effectMix`, etc. — are GONE.)

(f) Remove the now-unused param destructures from the component's store hooks (e.g. `rgbSplit, chromaticAberration, ... feedbackLoop` from `useGlitchEngineStore()`, `motionExtract...freezeMask` from `useMotionStore()`, `dotsParams`, `faceHudParams`, all six `*TraceParams`, `datamoshParams`/`pixelSortParams`/`sonifyParams`/`pointCloudParams`, `effectMix`). `tsc` will flag any you miss or over-delete: `asciiParams`, `faces`, `hands` are still used (structural + landmarks effects).

- [ ] **Step 3: Build**

Run: `npm run build` — expected: exit 0. Fix any unused/missing-identifier errors per (f).

- [ ] **Step 4: Browser verification (behavior parity)**

1. RGB split knob drag changes the visual live (param path works).
2. Effect mix slider on a card changes wet/dry live (effectMix path).
3. Enable Face HUD with webcam — HUD params (e.g. toggling mesh) still respond.
4. Datamosh via grid: params respond; then trigger destruction mode: datamosh cranks to max (structural override intact).
5. Crossfader drag: A/B blend moves.
6. StatusBar during a 10 s knob drag: pipeline avg-ms now indistinguishable from idle (this is the headline fix — record the number in `docs/plans/phase1-perf-baseline.md` under an "after Task 4" heading).

- [ ] **Step 5: Commit**

```bash
git add src/effects/paramSync.ts src/components/Canvas.tsx
git commit -m "perf: move effect param sync to zustand subscriptions, slim structural effect"
```

---

### Task 5: Gate temporal captures; release targets on disable

**Files:**
- Modify: `src/effects/EffectPipeline.ts` (render(), updateEffects())
- Modify: `src/effects/glitch-engine/{FeedbackLoopEffect,DatamoshEffect,MotionExtractEffect,EchoTrailEffect,TimeSmearEffect,FreezeMaskEffect,MotionTraceEffect}.ts` (add `releaseTargets()`)

**Interfaces:**
- Produces: each of the 7 temporal effects gains `releaseTargets(): void` (dispose + null all render targets, reset init flags). `EffectPipeline` gains private `temporalEnabled: Record<string, boolean>`.

- [ ] **Step 1: Add `releaseTargets()` to each temporal effect**

Pattern — dispose every target member the class owns, null it, reset state flags so the shader's "has data" uniform goes false. Exact code per class:

`EchoTrailEffect.ts` (targets: trailTarget, tempTarget; flag: hasInitialized):
```ts
  releaseTargets() {
    this.trailTarget?.dispose(); this.trailTarget = null
    this.tempTarget?.dispose(); this.tempTarget = null
    this.hasInitialized = false
  }
```

`FeedbackLoopEffect.ts` (feedbackTarget, tempTarget — check the class for an init flag like `hasFeedback` and reset it the same way):
```ts
  releaseTargets() {
    this.feedbackTarget?.dispose(); this.feedbackTarget = null
    this.tempTarget?.dispose(); this.tempTarget = null
  }
```

`DatamoshEffect.ts` (prevFrameTarget, feedbackTarget1, feedbackTarget2, freezeFrameTarget):
```ts
  releaseTargets() {
    this.prevFrameTarget?.dispose(); this.prevFrameTarget = null
    this.feedbackTarget1?.dispose(); this.feedbackTarget1 = null
    this.feedbackTarget2?.dispose(); this.feedbackTarget2 = null
    this.freezeFrameTarget?.dispose(); this.freezeFrameTarget = null
  }
```

`MotionExtractEffect.ts` (historyTargets array):
```ts
  releaseTargets() {
    for (const t of this.historyTargets) t.dispose()
    this.historyTargets = []
  }
```

`TimeSmearEffect.ts` (accumulationTarget + any temp target in the class; hasInitialized):
```ts
  releaseTargets() {
    this.accumulationTarget?.dispose(); this.accumulationTarget = null
    this.hasInitialized = false
  }
```

`FreezeMaskEffect.ts` (freezeTarget, tempTarget; hasInitialized):
```ts
  releaseTargets() {
    this.freezeTarget?.dispose(); this.freezeTarget = null
    this.tempTarget?.dispose(); this.tempTarget = null
    this.hasInitialized = false
  }
```

`MotionTraceEffect.ts` (historyTarget):
```ts
  releaseTargets() {
    this.historyTarget?.dispose(); this.historyTarget = null
  }
```

Before writing each, open the class and dispose ANY additional `WebGLRenderTarget` members it has beyond those listed (e.g. Datamosh may have more) — the rule is: every target member gets disposed and nulled; every "has data" boolean resets. Also reset any uniform that references a released texture to `null` if the class sets it in `update()` from the target (all seven set it per-frame in `update()`, so nulling the member suffices).

- [ ] **Step 2: Track temporal enablement in EffectPipeline**

Add a private field near `lastChainKey`:

```ts
  private temporalEnabled: Record<string, boolean> = {}
```

In `updateEffects`, right after `enabledMap` is built (works even when the chain short-circuits — place it BEFORE the short-circuit return):

```ts
    // Gate temporal frame-captures + release GPU targets on disable
    const temporalIds = [
      'feedback', 'datamosh', 'motion_extract', 'echo_trail',
      'time_smear', 'freeze_mask', 'track_motion',
    ] as const
    const temporalEffects: Record<string, { releaseTargets(): void } | null> = {
      feedback: this.feedbackLoop, datamosh: this.datamosh,
      motion_extract: this.motionExtract, echo_trail: this.echoTrail,
      time_smear: this.timeSmear, freeze_mask: this.freezeMask,
      track_motion: this.motionTrace,
    }
    for (const id of temporalIds) {
      const nowEnabled = !config.bypassActive && enabledMap[id]
      if (this.temporalEnabled[id] && !nowEnabled) {
        temporalEffects[id]?.releaseTargets()
      }
      this.temporalEnabled[id] = nowEnabled
    }
```

(Ordering note: `enabledMap` construction must therefore also sit before the short-circuit — it already does in Task 2's layout.)

- [ ] **Step 3: Gate `render()` captures**

Replace the capture block in `render()`:

```ts
    if (renderer && outputBuffer) {
      if (this.temporalEnabled['feedback']) this.feedbackLoop?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['datamosh']) this.datamosh?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['motion_extract']) this.motionExtract?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['echo_trail']) this.echoTrail?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['time_smear']) this.timeSmear?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['freeze_mask']) this.freezeMask?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['track_motion']) this.motionTrace?.captureFrame(renderer, outputBuffer)
    }
```

- [ ] **Step 4: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 5: Browser verification**

1. Enable Echo Trail 5 s → disable → StatusBar avg-ms drops back to pre-enable level (before this task it stayed elevated).
2. Re-enable Echo Trail → trails render again from scratch (releaseTargets + guarded initialize round-trip).
3. Same off/on check for Datamosh and Freeze Mask.
4. Enable MOTION-page Track Motion trace + RGB split with motion mask routing → mask still works; disable trace → re-enable → still works.

- [ ] **Step 6: Commit**

```bash
git add src/effects/
git commit -m "perf: gate temporal frame captures on enabled state, release targets on disable"
```

---

### Task 6: Shared overlay readback

**Files:**
- Create: `src/components/overlays/sharedReadback.ts`
- Modify: `src/components/Canvas.tsx` (advance call in render loop)
- Modify: `src/components/overlays/StrandOverlay.tsx:97`, `AcidOverlay.tsx:195,204`, `StippleOverlay.tsx:153`, `AsciiRenderOverlay.tsx:~106`, `VisionTrackingOverlay.tsx:~887-892`, `ContourOverlay.tsx:~427`

**Interfaces:**
- Produces: `getSharedFrame(source: HTMLCanvasElement): HTMLCanvasElement | null` (960×540 snapshot, refreshed at most once per main-loop frame) and `advanceReadbackFrame(): void` (called by the Canvas render loop).

- [ ] **Step 1: Create the module**

```ts
// src/components/overlays/sharedReadback.ts
// One GPU→CPU readback of the WebGL canvas per frame, shared by all
// Canvas-2D overlays. Overlays copy FROM this 2D canvas (cheap) instead
// of each forcing their own synchronous WebGL drawing-buffer readback.
const WIDTH = 960
const HEIGHT = 540

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let stamp = 0
let renderedStamp = -1

/** Called once per frame by the main render loop (Canvas.tsx). */
export function advanceReadbackFrame() {
  stamp++
}

/** Returns the shared snapshot, refreshing it if this frame hasn't been read yet. */
export function getSharedFrame(source: HTMLCanvasElement): HTMLCanvasElement | null {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!ctx) return null
  if (renderedStamp !== stamp) {
    ctx.drawImage(source, 0, 0, WIDTH, HEIGHT)
    renderedStamp = stamp
  }
  return canvas
}
```

- [ ] **Step 2: Advance the stamp from the render loop**

In `Canvas.tsx`, import `advanceReadbackFrame` from `./overlays/sharedReadback` and add `advanceReadbackFrame()` as the first line inside `animate()` (before `pipeline.render()`).

- [ ] **Step 3: Point each overlay's readback at the shared frame**

Each overlay currently populates its own offscreen canvas from the WebGL canvas. Change ONLY the drawImage source; all downstream pixel code is untouched (offscreen resolution and coordinates stay exactly as they are).

`StrandOverlay.tsx:97` — replace:
```ts
      sourceCtx.drawImage(source, 0, 0, w, h)
```
with:
```ts
      const shared = getSharedFrame(source)
      sourceCtx.drawImage(shared ?? source, 0, 0, w, h)
```
and add `import { getSharedFrame } from './sharedReadback'` at the top.

`AcidOverlay.tsx:195` — same replacement shape for `sourceCtx.drawImage(source, 0, 0, currentWidth, currentHeight)`.
`AcidOverlay.tsx:204` (the preserveVideo visible composite) — same replacement. This one draws to the visible canvas: after the change, compare a preserveVideo screenshot against master. If the 960→display upscale visibly softens it, revert ONLY line 204 to the direct source and note it in the commit message.

`StippleOverlay.tsx:153`, `AsciiRenderOverlay.tsx` (its `offCtx.drawImage(renderer.domElement ...)` line ~106), `VisionTrackingOverlay.tsx` (its downsample `drawImage` ~887-892), `ContourOverlay.tsx` (~427) — same one-line replacement, same import. Open each file at the cited line first; the variable naming differs slightly (`source`, `renderer.domElement`) but the pattern is identical: `drawImage(<webgl canvas>, ...)` → `drawImage(getSharedFrame(<webgl canvas>) ?? <webgl canvas>, ...)`.

- [ ] **Step 4: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 5: Browser verification**

1. Enable one STRAND effect (TAR) + one ACID effect (HALF) + Stipple simultaneously — all three render, visuals comparable to master (minor softening acceptable for STRAND/ACID since they now sample a 960×540 snapshot).
2. VISION page: enable BRIGHT tracking — tracking boxes still follow.
3. StatusBar avg-ms with the 3-overlay stack vs. the Task 1 baseline: expect a measurable drop; record it in `docs/plans/phase1-perf-baseline.md`.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/ src/components/Canvas.tsx
git commit -m "perf: single shared WebGL readback for all Canvas-2D overlays"
```

---

### Task 7: rAF-throttle Knob and XYPad changes

**Files:**
- Modify: `src/components/performance/Knob.tsx:195-215`
- Modify: `src/components/performance/XYPad.tsx:347-356`

**Interfaces:** none — `onChange`/`updateParams` signatures unchanged; calls just coalesce to ≤1 per frame.

- [ ] **Step 1: Throttle Knob**

In `Knob.tsx`, add refs near the other drag refs (~line 72):

```ts
  const pendingValueRef = useRef<number | null>(null)
  const changeRafRef = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
```

In `handlePointerMove`, replace the final `onChange(newValue)` (line 214) with:

```ts
    pendingValueRef.current = newValue
    if (!changeRafRef.current) {
      changeRafRef.current = requestAnimationFrame(() => {
        changeRafRef.current = 0
        if (pendingValueRef.current !== null) {
          onChangeRef.current(pendingValueRef.current)
          pendingValueRef.current = null
        }
      })
    }
```

Remove `onChange` from that callback's dependency array (it now reads the ref) — keep the rest.

In `handlePointerUp`, immediately after `setIsDragging(false)` (line 222), flush synchronously so the final value always lands:

```ts
    if (changeRafRef.current) {
      cancelAnimationFrame(changeRafRef.current)
      changeRafRef.current = 0
    }
    if (pendingValueRef.current !== null) {
      onChangeRef.current(pendingValueRef.current)
      pendingValueRef.current = null
    }
```

Add an unmount cleanup near the component's other effects:

```ts
  useEffect(() => () => cancelAnimationFrame(changeRafRef.current), [])
```

- [ ] **Step 2: Throttle XYPad**

Same pattern in `XYPad.tsx`: add `pendingXYRef = useRef<{x:number;y:number}|null>(null)`, `xyRafRef = useRef(0)`, `updateParamsRef` mirroring `updateParams`. In `handlePointerMove` (line 347), keep `setPosition({ x, y })` immediate (crosshair stays snappy) and replace `updateParams(x, y)` with the pending/rAF flush shape from Step 1. Flush + cancel in `handlePointerUp`; cleanup on unmount.

- [ ] **Step 3: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 4: Browser verification**

Drag a knob fast — visual response still feels immediate (≤1 frame behind); release mid-drag — value sticks at release point exactly. Click-without-drag still toggles automation target (didDrag path unaffected). XYPad drag moves both bound params; crosshair tracks the pointer with no lag.

- [ ] **Step 5: Commit**

```bash
git add src/components/performance/Knob.tsx src/components/performance/XYPad.tsx
git commit -m "perf: coalesce knob/xy-pad change events to one per frame"
```

---

### Task 8: Cap PixelSort shader sampling with stride

**Files:**
- Modify: `src/effects/glitch-engine/PixelSortEffect.ts:117-137, 162-187`

The two search loops walk 1 texel per iteration up to `streakLength` (≤64 and ≤128 iterations). Sample with a stride instead so iteration count is bounded (≤32 and ≤48) while reach is preserved.

- [ ] **Step 1: Stride the below-threshold loop (lines 117-137)**

Replace:
```glsl
    for (float i = 1.0; i <= 64.0; i++) {
      if (i > streakLength * 0.5) break;

      vec2 sampleUV = uv - sortDir * i * texel.x;
```
with:
```glsl
    float stride1 = max(1.0, streakLength * 0.5 / 32.0);
    for (float i = 1.0; i <= 32.0; i++) {
      float d = i * stride1;
      if (d > streakLength * 0.5) break;

      vec2 sampleUV = uv - sortDir * d * texel.x;
```
and inside that loop change `if (pushDist >= i * texel.x)` to `if (pushDist >= d * texel.x)`.

- [ ] **Step 2: Stride the main sort loop (lines 162-187)**

Replace:
```glsl
  for (float i = 0.0; i <= 128.0; i++) {
    if (i > streakLength) break;

    float t = i / streakLength;
    vec2 sampleUV = uv - sortDir * i * texel.x;
```
with:
```glsl
  float stride2 = max(1.0, streakLength / 48.0);
  for (float i = 0.0; i <= 48.0; i++) {
    float d = i * stride2;
    if (d > streakLength) break;

    vec2 sampleUV = uv - sortDir * d * texel.x;
```
(the unused `t` line is deleted), and widen the displacement match window to the stride so runs don't develop holes — replace:
```glsl
    if (sampleDisplacement >= i * texel.x * 0.9 && sampleDisplacement <= i * texel.x * 1.1 + texel.x) {
```
with:
```glsl
    if (abs(sampleDisplacement - d * texel.x) <= stride2 * texel.x * 0.6 + texel.x) {
```

The 8-sample streak-blend loop (lines 200-209) is already cheap — leave it.

- [ ] **Step 3: Build**

Run: `npm run build` — expected: exit 0.

- [ ] **Step 4: Browser verification (visual + perf)**

Enable Pixel Sort alone, intensity ~0.7, long streaks. Screenshot at streakLength low/mid/max — streaks must still read as continuous melted runs (small texture change acceptable; banding/holes are NOT — if holes appear, raise the `0.6` window factor to `0.75` and re-check). StatusBar avg-ms with Pixel Sort at max streak: record before/after in `docs/plans/phase1-perf-baseline.md`.

- [ ] **Step 5: Commit**

```bash
git add src/effects/glitch-engine/PixelSortEffect.ts
git commit -m "perf: bound pixel-sort shader sampling with stride (200 -> 88 max samples)"
```

---

### Task 9: Final measurements, docs, and wrap-up

**Files:**
- Modify: `docs/plans/phase1-perf-baseline.md` (final numbers), `CLAUDE.md` (architecture note)

- [ ] **Step 1: Full regression pass in the browser**

One session covering: enable/disable/reorder several GLITCH effects; knob drags on 3 different pages; Echo Trail + Datamosh off/on cycles; a STRAND + ACID + Stipple stack; Face HUD with webcam; crossfader sweep; bypass toggle; solo an effect. Zero console errors; every behavior matches master.

- [ ] **Step 2: Record final numbers**

Repeat the exact Task 1 baseline scenario; append an "After Phase 1" section to `docs/plans/phase1-perf-baseline.md` with the same measurements plus the knob-drag number.

- [ ] **Step 3: Update CLAUDE.md**

In the "Adding New Effect Pages/Effects" checklist, update item 7 (Canvas) to reflect the split: enabled flags/order stay in Canvas.tsx's structural effect; per-frame params register in `src/effects/paramSync.ts` (add the effect's push + subscription slice check there). Add one sentence to the Architecture section: "Effect params flow through `src/effects/paramSync.ts` (zustand subscribe → uniform writes); Canvas.tsx's structural effect only rebuilds the pass chain on enable/disable/reorder."

- [ ] **Step 4: Commit and hand off**

```bash
git add docs/plans/phase1-perf-baseline.md CLAUDE.md
git commit -m "perf: phase 1 wrap-up — final measurements and architecture docs"
```

Then use superpowers:finishing-a-development-branch to merge `perf/phase1-pipeline`.
