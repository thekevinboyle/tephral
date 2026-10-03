# SEG_EXP Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared MediaPipe person-segmentation service and five new DESTROY-page effects (VOXEL, ECHO4D, MATTER, STALE, TORN) plus a `SEG_EXP` factory preset that reproduces the reference reel's layered glitch look live.

**Architecture:** `SegmentationService` runs MediaPipe `selfie_multiclass_256x256` on a downscaled copy of the source on its own throttled loop and publishes a class-ID `DataTexture` + smoothed `personCoverage`. `EffectPipeline` owns one instance, activates it only while a consuming effect is enabled, and hands it to the effects. Each effect is a `postprocessing` `Effect` subclass wired through the app's standard 12 wiring points, with params in a new `segStore`.

**Tech Stack:** TypeScript, React 19, three 0.182, postprocessing 6.38, zustand 5, @mediapipe/tasks-vision 0.10.33, Vite 7. Verification: `tsc` via `npm run build`, `npm run lint`, puppeteer scripts under `.superpowers/sdd/` (gitignored).

**Spec:** `docs/superpowers/specs/2026-10-03-seg-exp-effects-design.md`

## Global Constraints

- Effects occupy DESTROY reserved slots `destruction_reserved_10`..`14` → ids `seg_voxel`, `seg_echo`, `seg_matter`, `seg_stale`, `seg_torn`; labels `VOXEL`, `ECHO4D`, `MATTER`, `STALE`, `TORN`; page 5.
- Model: `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite`, `delegate: 'GPU'`, `outputCategoryMask: true`, `outputConfidenceMasks: false`, `runningMode: 'VIDEO'`.
- WASM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm` (pinned to the installed package version).
- Classes: 0 background, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others. "Person" = class ≥ 1.
- Segmentation loop ≤ 30 fps; skip a tick if an inference is in flight; never blocks render.
- Old `BankSnapshot`s without a `seg` key load with all five effects disabled at defaults.
- The reference clip `.superpowers/sdd/fixtures/seg-exp-28-reference.mp4` is gitignored and must never be committed or copied into `src/` or `public/`.
- Factory preset id `factory_seg_exp`, folder id `folder_factory` named `Factory`; seeded at most once (marker id `factory_seg_exp_seeded`).
- SEG_EXP chain order: `seg_stale`, `seg_matter`, `seg_voxel`, `seg_echo`, `seg_torn`.
- Full SEG_EXP preset ≥ 30 fps with the reference clip playing.
- Commit messages: `fx: …` prefix, ending with the session attribution lines used on this branch.

## Spec refinements made while planning (read before Task 1)

These follow from code read during planning and do not change user-visible behaviour:

1. **No `uvTransform`.** The canvas container takes the video's aspect ratio via CSS and the quad always fills (`EffectPipeline.ts` `updateQuadScale`, `setVideoSize`), so canvas UV = source UV. The only correction is a vertical flip (MediaPipe row 0 is the image top): shaders sample the mask at `vec2(uv.x, 1.0 - uv.y)`.
2. **`setActive(bool)` instead of `acquire()/release()`.** The pipeline is the only caller and already computes enable state, so a boolean is simpler and equivalent.
3. **STALE and ECHO4D do their frame work in `update()` from `inputBuffer`**, not via `captureFrame()`. That makes each one remember *its own input* (the chain up to it) instead of the final composite, which avoids feeding MATTER/TORN output back into STALE's held frame. They still join the pipeline's `temporalIds` list so `releaseTargets()` runs on disable.
4. **Extra wiring points.** Besides the 10 in `CLAUDE.md`, effects must be registered in `src/config/effectParams.ts` (drives `ExpandedParameterPanel` and param locks) and `src/hooks/useContinuousModulation.ts` (LFO/sequencer targets). `routingStore.defaultEffectOrder` already derives from `DESTRUCTION_EFFECTS`, so it needs no edit.
5. **TORN fill modes are `black` | `smear`** (smear = edge pixels pulled inward), not a held stale frame; this keeps TORN stateless. The reel's border is black, which is the default.

## Review Focus

1. **No person in frame / still image source** — mask is all background; VOXEL and ECHO4D must pass through untouched, MATTER uses colour regions only; no errors. → Task 3 Step 6 and Task 5 Step 6 test frames with no person (fixture t=7.0s, counter only).
2. **Source switched or set to None while effects are on** — the service must stop segmenting the old element, not throw, and clear the mask. → Task 1 Step 6 tests `setSource(null)` mid-run.
3. **Rapid enable/disable of a consumer** — the model must not double-load or leak. → Task 9 Step 2 toggles 10×.
4. **BPM changes / BPM at extremes (20, 300)** — auto reshuffle/burst intervals must stay finite and never fire every frame. → Task 5 Step 7 and Task 6 Step 7 set BPM 300 and assert interval ≥ 0.2 s.
5. **Old saved banks/presets** — loading a snapshot without `seg` must not throw or leave stale seg effects enabled. → Task 2 Step 7 applies a snapshot with `seg` deleted.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/effects/vision/SegmentationService.ts` (create) | Model lifecycle, throttled segmentation loop, class-ID texture, coverage |
| `src/stores/segStore.ts` (create) | Enabled flags + params for the five effects, snapshot/apply |
| `src/effects/glitch-engine/SegVoxelEffect.ts` (create) | VOXEL shader |
| `src/effects/glitch-engine/SegEchoEffect.ts` (create) | ECHO4D ring buffer + composite |
| `src/effects/glitch-engine/SegMatterEffect.ts` (create) | MATTER region materials + reshuffle |
| `src/effects/glitch-engine/SegStaleEffect.ts` (create) | STALE conditional-refresh ping-pong |
| `src/effects/glitch-engine/SegTornEffect.ts` (create) | TORN border erosion |
| `src/effects/glitch-engine/segShared.ts` (create) | GLSL mask-sampling helpers shared by the effects |
| `src/effects/glitch-engine/index.ts` | exports |
| `src/config/effects.ts` | replace reserved slots 10–14 |
| `src/effects/EffectPipeline.ts` | instances, lookup, enable map, temporal list, service activation, resolution, dispose |
| `src/components/Canvas.tsx` | enabled flags into `updateEffects`, source into service |
| `src/effects/paramSync.ts` | `pushSeg()` + subscriptions (segStore, sequencer BPM) |
| `src/components/performance/PerformanceGrid.tsx` | grid state + page-active check |
| `src/hooks/useActiveEffects.ts` | cards |
| `src/hooks/useEffectDisable.ts` | remove button |
| `src/components/performance/CompactEffectParams.tsx` | compact knobs |
| `src/config/effectParams.ts` | full params (expanded panel, locks) |
| `src/hooks/useContinuousModulation.ts` | modulation targets |
| `src/stores/bankStore.ts`, `src/stores/presetLibraryStore.ts` | snapshot capture/apply; factory preset seed |
| `CLAUDE.md` | document the two extra wiring points |
| `.superpowers/sdd/seg-verify.mjs` (create, gitignored) | puppeteer verification harness |

---

### Task 1: SegmentationService

**Files:**
- Create: `src/effects/vision/SegmentationService.ts`
- Create: `.superpowers/sdd/seg-service-check.mjs` (gitignored)

**Interfaces:**
- Produces:
  ```ts
  export type SegStatus = 'idle' | 'loading' | 'ready' | 'error'
  export class SegmentationService {
    readonly maskTexture: THREE.DataTexture   // R8 class IDs, NearestFilter, flipY false
    personCoverage: number                     // 0..1, smoothed
    hasMask: boolean                           // true once at least one mask landed for the current source
    status: SegStatus
    setSource(el: HTMLVideoElement | HTMLImageElement | null): void
    setActive(active: boolean): void
    dispose(): void
  }
  ```

- [ ] **Step 1: Write the failing check script**

Create `.superpowers/sdd/seg-service-check.mjs`:

```js
// Usage: node .superpowers/sdd/seg-service-check.mjs  (fresh dev server on :5173)
import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
const errors = []
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
const r = await p.evaluate(async () => {
  const { SegmentationService } = await import('/src/effects/vision/SegmentationService.ts')
  const v = document.createElement('video')
  v.src = '/@fs/Users/kevin/Documents/web/strand-tracer/.superpowers/sdd/fixtures/seg-exp-28-reference.mp4'
  v.muted = true; v.loop = true; v.playsInline = true
  await new Promise((res) => { v.onloadeddata = res })
  v.currentTime = 0.5; await new Promise((res) => { v.onseeked = res })
  const s = new SegmentationService()
  s.setSource(v); s.setActive(true)
  const t0 = performance.now()
  while (!s.hasMask && performance.now() - t0 < 30000) await new Promise((res) => setTimeout(res, 200))
  const data = s.maskTexture.image.data
  const classes = new Set(data)
  const out = { status: s.status, hasMask: s.hasMask, coverage: s.personCoverage, classes: [...classes].sort(), w: s.maskTexture.image.width }
  s.setSource(null)
  await new Promise((res) => setTimeout(res, 300))
  out.afterNull = { hasMask: s.hasMask, coverage: s.personCoverage }
  s.setActive(false)
  out.afterInactive = s.status
  s.dispose()
  return out
})
console.log(JSON.stringify(r))
const ok = r.status === 'ready' && r.hasMask && r.coverage > 0.05 && r.classes.some((c) => c >= 1) &&
  r.afterNull.hasMask === false && r.afterNull.coverage === 0 && r.afterInactive === 'idle' && errors.length === 0
errors.forEach((e) => console.log(' ERR:', e))
await b.close()
console.log(ok ? 'SEG SERVICE: PASS' : 'SEG SERVICE: FAIL')
process.exit(ok ? 0 : 1)
```

- [ ] **Step 2: Run it to verify it fails**

Start a fresh dev server (`npm run dev` in the background), then run: `node .superpowers/sdd/seg-service-check.mjs`
Expected: FAIL — the dynamic import errors because `SegmentationService.ts` does not exist.

- [ ] **Step 3: Implement the service**

Create `src/effects/vision/SegmentationService.ts`:

```ts
import * as THREE from 'three'
import type { ImageSegmenter } from '@mediapipe/tasks-vision'
import { useUIStore } from '../../stores/uiStore'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
const TICK_MS = 33 // ≤ 30 fps
const INPUT_WIDTH = 256 // downscale before inference; mask comes back at this size
const COVERAGE_SMOOTHING = 0.15

export type SegStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Person/part segmentation shared by the SEG effects. Runs MediaPipe's
 * multiclass selfie model on a downscaled copy of the source on its own
 * timer (never inside the render loop) and publishes a class-ID texture:
 * 0 background, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others.
 * Row 0 of the texture is the TOP of the image — shaders flip v.
 */
export class SegmentationService {
  readonly maskTexture: THREE.DataTexture
  personCoverage = 0
  hasMask = false
  status: SegStatus = 'idle'

  private segmenter: ImageSegmenter | null = null
  private loadPromise: Promise<void> | null = null
  private source: HTMLVideoElement | HTMLImageElement | null = null
  private lastImage: HTMLImageElement | null = null
  private active = false
  private busy = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d', { willReadFrequently: false })!
  private lastTimestamp = 0
  private generation = 0 // bumps on setSource/setActive(false) to drop stale callbacks

  constructor() {
    this.maskTexture = new THREE.DataTexture(new Uint8Array(1), 1, 1, THREE.RedFormat, THREE.UnsignedByteType)
    this.maskTexture.minFilter = THREE.NearestFilter
    this.maskTexture.magFilter = THREE.NearestFilter
    this.maskTexture.flipY = false
    this.maskTexture.needsUpdate = true
  }

  setSource(el: HTMLVideoElement | HTMLImageElement | null) {
    if (el === this.source) return
    this.source = el
    this.lastImage = null
    this.generation++
    this.clearMask()
  }

  setActive(active: boolean) {
    if (active === this.active) return
    this.active = active
    if (active) {
      this.ensureLoaded()
      this.schedule()
    } else {
      this.generation++
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      this.segmenter?.close()
      this.segmenter = null
      this.loadPromise = null
      this.status = 'idle'
      this.clearMask()
    }
  }

  dispose() {
    this.setActive(false)
    this.maskTexture.dispose()
  }

  private clearMask() {
    this.hasMask = false
    this.personCoverage = 0
    const img = this.maskTexture.image as { data: Uint8Array; width: number; height: number }
    img.data.fill(0)
    this.maskTexture.needsUpdate = true
  }

  private ensureLoaded() {
    if (this.loadPromise) return
    this.status = 'loading'
    useUIStore.getState().setStatusText('SEG: loading person model…')
    this.loadPromise = (async () => {
      try {
        const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const seg = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })
        if (!this.active) { seg.close(); return }
        this.segmenter = seg
        this.status = 'ready'
        useUIStore.getState().setStatusText(null)
      } catch (err) {
        console.warn('[SEG] person model failed to load:', err)
        this.status = 'error'
        this.loadPromise = null
        useUIStore.getState().setStatusText('SEG: person mask unavailable')
      }
    })()
  }

  private schedule() {
    if (!this.active) return
    this.timer = setTimeout(() => { this.tick(); this.schedule() }, TICK_MS)
  }

  private tick() {
    const seg = this.segmenter
    const src = this.source
    if (!seg || !src || this.busy) return
    if (src instanceof HTMLVideoElement) {
      if (src.readyState < 2 || src.videoWidth === 0) return
    } else {
      if (!src.complete || src.naturalWidth === 0 || src === this.lastImage) return
    }
    const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth
    const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight
    const w = INPUT_WIDTH
    const h = Math.max(1, Math.round((INPUT_WIDTH * sh) / sw))
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    this.ctx.drawImage(src, 0, 0, w, h)

    // VIDEO mode requires strictly increasing timestamps
    const ts = Math.max(performance.now(), this.lastTimestamp + 1)
    this.lastTimestamp = ts
    const gen = this.generation
    this.busy = true
    try {
      seg.segmentForVideo(this.canvas, ts, (result) => {
        const mask = result.categoryMask
        if (mask && gen === this.generation) this.publish(mask.getAsUint8Array(), mask.width, mask.height)
        result.close()
      })
      if (src instanceof HTMLImageElement) this.lastImage = src
    } catch (err) {
      console.warn('[SEG] segmentation failed:', err)
    } finally {
      this.busy = false
    }
  }

  private publish(data: Uint8Array, w: number, h: number) {
    const img = this.maskTexture.image as { data: Uint8Array; width: number; height: number }
    if (img.width !== w || img.height !== h) {
      img.data = new Uint8Array(w * h)
      img.width = w
      img.height = h
    }
    img.data.set(data)
    let person = 0
    for (let i = 0; i < data.length; i++) if (data[i] !== 0) person++
    const cov = person / data.length
    this.personCoverage = this.hasMask ? this.personCoverage + (cov - this.personCoverage) * COVERAGE_SMOOTHING : cov
    this.hasMask = true
    this.maskTexture.needsUpdate = true
  }
}
```

Note: if `DataTexture` dimensions change, three re-allocates on the next upload because `image.width/height` changed; `needsUpdate = true` triggers it.

- [ ] **Step 4: Run the check to verify it passes**

Run: `node .superpowers/sdd/seg-service-check.mjs`
Expected: `SEG SERVICE: PASS` with `classes` containing at least one value ≥ 1 and `coverage` > 0.05.
If `hasMask` stays false and status is `ready`, the person in the already-glitched reference frame was not detected: re-run with `v.currentTime = 1.0` (closer, larger person). If that still fails, record a 3-second clip of a person (e.g. the webcam via QuickTime) to `.superpowers/sdd/fixtures/person-clean.mp4` and point the script at it; report which fixture passed.

- [ ] **Step 5: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Source-switch check is covered**

The script already asserts that `setSource(null)` clears `hasMask` and `personCoverage` (Review Focus 2) and that `setActive(false)` returns to `idle`. Confirm both appear in the printed JSON.

- [ ] **Step 7: Commit**

```bash
git add src/effects/vision/SegmentationService.ts
git commit -m "fx: shared MediaPipe multiclass segmentation service"
```

---

### Task 2: segStore + five pass-through effects wired through all 12 points

Goal: every SEG effect is fully wired (grid, card, remove, compact + expanded params, modulation, presets/banks) with shaders that pass input through. Later tasks replace each shader.

**Files:**
- Create: `src/stores/segStore.ts`
- Create: `src/effects/glitch-engine/segShared.ts`
- Create: `src/effects/glitch-engine/SegVoxelEffect.ts`, `SegEchoEffect.ts`, `SegMatterEffect.ts`, `SegStaleEffect.ts`, `SegTornEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`, `src/config/effects.ts:170-183`, `src/effects/EffectPipeline.ts`, `src/components/Canvas.tsx`, `src/effects/paramSync.ts`, `src/components/performance/PerformanceGrid.tsx`, `src/hooks/useActiveEffects.ts`, `src/hooks/useEffectDisable.ts`, `src/components/performance/CompactEffectParams.tsx`, `src/config/effectParams.ts`, `src/hooks/useContinuousModulation.ts`, `src/stores/bankStore.ts`, `src/stores/presetLibraryStore.ts`
- Create: `.superpowers/sdd/seg-verify.mjs` (gitignored)

**Interfaces:**
- Consumes: `SegmentationService` (Task 1).
- Produces (later tasks depend on these exact names):
  ```ts
  // segStore.ts
  export interface SegVoxelParams { size: number; depth: number; scatter: number; shading: number; classes: number; debugMask: boolean; mix: number }
  export interface SegEchoParams { copies: number; delay: number; decay: number; offsetX: number; offsetY: number; zoom: number; mix: number }
  export interface SegMatterParams { coverage: number; seed: number; autoReshuffle: boolean; reshuffleBeats: number; wBlack: number; wSolid: number; wGradient: number; wZebra: number; wRainbow: number; wMosaic: number; mix: number }
  export interface SegStaleParams { cellSize: number; threshold: number; refresh: number; burst: number; raggedness: number; autoBurst: boolean; burstBeats: number; mix: number }
  export interface SegTornParams { depth: number; blockSize: number; speed: number; fill: number; mix: number }
  export interface SegSnapshot { voxelEnabled; echoEnabled; matterEnabled; staleEnabled; tornEnabled: boolean; voxelParams; echoParams; matterParams; staleParams; tornParams }
  useSegStore: { <x>Enabled, <x>Params, set<X>Enabled(b), update<X>Params(partial), getSnapshot(), applySnapshot(s) } for X in Voxel|Echo|Matter|Stale|Torn
  // every Seg*Effect class:
  updateParams(p: Partial<Params>): void
  setResolution(w: number, h: number): void
  // consumers of the mask (Voxel, Echo, Matter):
  setSegmentation(s: SegmentationService): void
  // tempo-aware (Matter, Stale):
  setBpm(bpm: number): void
  // temporal (Echo, Stale):
  releaseTargets(): void
  // EffectPipeline:
  segmentation: SegmentationService
  segVoxel / segEcho / segMatter / segStale / segTorn: Seg*Effect | null
  ```

- [ ] **Step 1: Write the failing wiring check**

Create `.superpowers/sdd/seg-verify.mjs`. Task 2 uses `wiring` mode; Tasks 3–7 add `visual` mode later in this file.

```js
// Usage: node .superpowers/sdd/seg-verify.mjs wiring
//        node .superpowers/sdd/seg-verify.mjs visual <LABEL> <storeKey> <param> <low> <high> <seekSec> <bgStrip:l|r|none>
// Fresh dev server on :5173 required (HMR phantom-store gotcha).
import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'

const [MODE, ...ARGS] = process.argv.slice(2)
mkdirSync('.superpowers/sdd/shots', { recursive: true })
const FIXTURE = '/@fs/Users/kevin/Documents/web/strand-tracer/.superpowers/sdd/fixtures/seg-exp-28-reference.mp4'
const EFFECTS = [
  { label: 'VOXEL', id: 'seg_voxel', key: 'voxel' },
  { label: 'ECHO4D', id: 'seg_echo', key: 'echo' },
  { label: 'MATTER', id: 'seg_matter', key: 'matter' },
  { label: 'STALE', id: 'seg_stale', key: 'stale' },
  { label: 'TORN', id: 'seg_torn', key: 'torn' },
]
const cap = (s) => s[0].toUpperCase() + s.slice(1)

const errors = []
const b = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 2560, height: 1440 })
p.on('console', (m) => {
  if (m.type() === 'error' && !/key.*prop|DragNumberBlock|ParamBlock|VerticalFaderBlock/s.test(m.text()))
    errors.push(m.text().slice(0, 200))
})
p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const loadFixture = (seek) => p.evaluate(async ({ FIXTURE, seek }) => {
  const media = await import('/src/stores/mediaStore.ts')
  const rec = await import('/src/stores/recordingStore.ts')
  const v = document.createElement('video')
  v.src = FIXTURE; v.muted = true; v.loop = true; v.playsInline = true
  await new Promise((res) => { v.onloadeddata = res })
  v.currentTime = seek; await new Promise((res) => { v.onseeked = res })
  window.__segFixture = v
  media.useMediaStore.getState().setVideoElement(v)
  media.useMediaStore.getState().setSource('file')
  rec.useRecordingStore.getState().setSource('file')
}, { FIXTURE, seek })

const click = async (t) => {
  const box = await p.evaluate((t) => {
    const c = [...document.querySelectorAll('button, div, span')]
      .filter((e) => (e.textContent || '').trim() === t && !e.closest('.overflow-y-auto'))
      .map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, area: r.width * r.height } })
      .filter((c) => c.area > 0).sort((a, b) => a.area - b.area)
    return c[0] ?? null
  }, t)
  if (!box) return false
  await p.mouse.click(box.x, box.y)
  await new Promise((r) => setTimeout(r, 500))
  return true
}
const seg = (fn, arg) => p.evaluate(async ({ fn, arg }) => {
  const m = await import('/src/stores/segStore.ts')
  return new Function('s', 'arg', fn)(m.useSegStore.getState(), arg)
}, { fn, arg })
const cardVisible = (label) => p.evaluate((label) =>
  [...document.querySelectorAll('.overflow-y-auto *')].some((e) => (e.textContent || '').trim() === label), label)
// 64x36 fingerprint via compositor screenshot (WebGL canvas has no preserveDrawingBuffer)
const shot = async (name) => {
  const el = await p.$('[data-video-canvas-container]')
  const buf = await el.screenshot({ path: `.superpowers/sdd/shots/seg-${name}.png` })
  return p.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas'); c.width = 64; c.height = 36
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 36)
    return [...ctx.getImageData(0, 0, 64, 36).data]
  }, Buffer.from(buf).toString('base64'))
}
const diff = (a, b, x0 = 0, x1 = 64) => {
  let s = 0, n = 0
  for (let y = 0; y < 36; y++) for (let x = x0; x < x1; x++) for (let k = 0; k < 3; k++) {
    const i = (y * 64 + x) * 4 + k; s += Math.abs(a[i] - b[i]); n++
  }
  return s / n
}
let pass = true
const say = (k, ok) => { console.log(`${k}: ${ok ? 'OK' : 'FAIL'}`); if (!ok) pass = false }

if (MODE === 'wiring') {
  await loadFixture(0.5)
  await new Promise((r) => setTimeout(r, 800))
  say('DESTROY tab', await click('DESTROY'))
  for (const e of EFFECTS) {
    say(`${e.label} grid click`, await click(e.label))
    say(`${e.label} enabled in store`, await seg(`return s.${e.key}Enabled`))
    say(`${e.label} card visible`, await cardVisible(e.label))
    say(`${e.label} in effectOrder`, await p.evaluate(async (id) => {
      const r = await import('/src/stores/routingStore.ts'); return r.useRoutingStore.getState().effectOrder.includes(id)
    }, e.id))
  }
  // snapshot round-trip through preset capture/apply + old-snapshot compat (Review Focus 5)
  say('snapshot roundtrip', await p.evaluate(async () => {
    const lib = await import('/src/stores/presetLibraryStore.ts')
    const segm = await import('/src/stores/segStore.ts')
    const st = segm.useSegStore.getState()
    st.updateVoxelParams({ size: 33 })
    const snap = lib.captureCurrentEffects()
    st.updateVoxelParams({ size: 7 }); st.setVoxelEnabled(false)
    lib.applyEffects(snap)
    const okRound = segm.useSegStore.getState().voxelParams.size === 33 && segm.useSegStore.getState().voxelEnabled
    const old = structuredClone(snap); delete old.seg
    lib.applyEffects(old)
    return okRound && segm.useSegStore.getState().voxelEnabled === false
  }))
  // bank save/load carries seg too
  say('bank roundtrip', await p.evaluate(async () => {
    const bank = await import('/src/stores/bankStore.ts')
    const segm = await import('/src/stores/segStore.ts')
    segm.useSegStore.getState().setTornEnabled(true)
    bank.useBankStore.getState().saveBank(3)
    segm.useSegStore.getState().setTornEnabled(false)
    bank.useBankStore.getState().loadBank(3)
    const ok = segm.useSegStore.getState().tornEnabled === true
    segm.useSegStore.getState().setTornEnabled(false)
    return ok
  }))
  // remove buttons via the hook's mapping
  say('disable all via useEffectDisable mapping', await seg(`
    ['Voxel','Echo','Matter','Stale','Torn'].forEach(k => s['set'+k+'Enabled'](false)); return true`))
}

if (MODE === 'visual') {
  const [LABEL, KEY, PARAM, LOW, HIGH, SEEK, BG] = ARGS
  await loadFixture(Number(SEEK))
  await new Promise((r) => setTimeout(r, 1500))
  const base = await shot(`${LABEL}-source`)
  say('DESTROY tab', await click('DESTROY'))
  say('enable click', await click(LABEL))
  await new Promise((r) => setTimeout(r, 4000)) // model load + first masks
  const on = await shot(`${LABEL}-on`)
  say('effect changes canvas', diff(on, base) > 2)
  if (BG === 'l') say('left background strip untouched', diff(on, base, 0, 8) < 1.5)
  if (BG === 'r') say('right background strip untouched', diff(on, base, 56, 64) < 1.5)
  await seg(`s.update${cap(KEY)}Params({ ${PARAM}: Number(arg) })`, LOW)
  await new Promise((r) => setTimeout(r, 800))
  const low = await shot(`${LABEL}-low`)
  await seg(`s.update${cap(KEY)}Params({ ${PARAM}: Number(arg) })`, HIGH)
  await new Promise((r) => setTimeout(r, 800))
  const high = await shot(`${LABEL}-high`)
  say(`param ${PARAM} sweep changes visuals`, diff(low, high) > 1)
  await seg(`s.set${cap(KEY)}Enabled(false)`)
  await new Promise((r) => setTimeout(r, 800))
  const off = await shot(`${LABEL}-off`)
  say('disable restores source', diff(off, base) < 0.8)
}

say('no console errors', errors.length === 0)
errors.slice(0, 5).forEach((e) => console.log(' ERR:', e))
await b.close()
console.log(pass ? `SEG ${MODE} VERIFY: PASS` : `SEG ${MODE} VERIFY: FAIL`)
process.exit(pass ? 0 : 1)
```

The script calls `captureCurrentEffects()` / `applyEffects()` from `presetLibraryStore.ts` (currently module-private, lines 167 and 230) and `useBankStore.getState().saveBank(i)` / `loadBank(i)`. Step 9 exports the two preset helpers. (`saveBank`/`loadBank` exist at `bankStore.ts:96` and `:172`.)

- [ ] **Step 2: Run it to verify it fails**

Restart the dev server, then run: `node .superpowers/sdd/seg-verify.mjs wiring`
Expected: FAIL at `VOXEL grid click` (the slot still reads `—`).

- [ ] **Step 3: Create `segStore.ts`**

```ts
import { create } from 'zustand'

export interface SegVoxelParams {
  size: number      // 4-64 px, base cell size
  depth: number     // 0-4, cell growth with person coverage
  scatter: number   // 0-1, edge cells fly off
  shading: number   // 0-1, cube face shading
  classes: number   // 0 person, 1 skin, 2 hair, 3 clothes
  debugMask: boolean
  mix: number
}
export const DEFAULT_SEG_VOXEL_PARAMS: SegVoxelParams = {
  size: 12, depth: 1.5, scatter: 0.4, shading: 0.6, classes: 0, debugMask: false, mix: 1,
}

export interface SegEchoParams {
  copies: number    // 1-8
  delay: number     // 1-12 frames between captures
  decay: number     // 0-1, opacity multiplier per copy
  offsetX: number   // -0.1..0.1 uv per copy
  offsetY: number   // -0.1..0.1 uv per copy
  zoom: number      // 0.9-1.1 per copy
  mix: number
}
export const DEFAULT_SEG_ECHO_PARAMS: SegEchoParams = {
  copies: 4, delay: 3, decay: 0.75, offsetX: 0.02, offsetY: 0, zoom: 1, mix: 1,
}

export interface SegMatterParams {
  coverage: number        // 0-1, share of regions swapped
  seed: number            // 0-999, manual reshuffle (modulate to trigger)
  autoReshuffle: boolean
  reshuffleBeats: number  // 1-32
  wBlack: number; wSolid: number; wGradient: number; wZebra: number; wRainbow: number; wMosaic: number // 0-1
  mix: number
}
export const DEFAULT_SEG_MATTER_PARAMS: SegMatterParams = {
  coverage: 0.45, seed: 0, autoReshuffle: true, reshuffleBeats: 4,
  wBlack: 1, wSolid: 1, wGradient: 1, wZebra: 0.6, wRainbow: 1, wMosaic: 0.6, mix: 1,
}

export interface SegStaleParams {
  cellSize: number    // 8-96 px
  threshold: number   // 0-1, change needed to refresh a cell
  refresh: number     // 0-1, random refresh chance per frame
  burst: number       // 0-1, shatter amount
  raggedness: number  // 0-1, cell edge warp
  autoBurst: boolean
  burstBeats: number  // 1-32
  mix: number
}
export const DEFAULT_SEG_STALE_PARAMS: SegStaleParams = {
  cellSize: 28, threshold: 0.12, refresh: 0.04, burst: 0, raggedness: 0.5, autoBurst: false, burstBeats: 8, mix: 1,
}

export interface SegTornParams {
  depth: number      // 0-0.2 of the short side
  blockSize: number  // 4-64 px
  speed: number      // 0-4
  fill: number       // 0 black, 1 smear
  mix: number
}
export const DEFAULT_SEG_TORN_PARAMS: SegTornParams = {
  depth: 0.04, blockSize: 16, speed: 1, fill: 0, mix: 1,
}

export interface SegSnapshot {
  voxelEnabled: boolean; echoEnabled: boolean; matterEnabled: boolean; staleEnabled: boolean; tornEnabled: boolean
  voxelParams: SegVoxelParams; echoParams: SegEchoParams; matterParams: SegMatterParams
  staleParams: SegStaleParams; tornParams: SegTornParams
}

interface SegState extends SegSnapshot {
  setVoxelEnabled: (v: boolean) => void
  setEchoEnabled: (v: boolean) => void
  setMatterEnabled: (v: boolean) => void
  setStaleEnabled: (v: boolean) => void
  setTornEnabled: (v: boolean) => void
  updateVoxelParams: (p: Partial<SegVoxelParams>) => void
  updateEchoParams: (p: Partial<SegEchoParams>) => void
  updateMatterParams: (p: Partial<SegMatterParams>) => void
  updateStaleParams: (p: Partial<SegStaleParams>) => void
  updateTornParams: (p: Partial<SegTornParams>) => void
  getSnapshot: () => SegSnapshot
  applySnapshot: (s: SegSnapshot | undefined) => void
}

const defaults = (): SegSnapshot => ({
  voxelEnabled: false, echoEnabled: false, matterEnabled: false, staleEnabled: false, tornEnabled: false,
  voxelParams: { ...DEFAULT_SEG_VOXEL_PARAMS },
  echoParams: { ...DEFAULT_SEG_ECHO_PARAMS },
  matterParams: { ...DEFAULT_SEG_MATTER_PARAMS },
  staleParams: { ...DEFAULT_SEG_STALE_PARAMS },
  tornParams: { ...DEFAULT_SEG_TORN_PARAMS },
})

export const useSegStore = create<SegState>((set, get) => ({
  ...defaults(),
  setVoxelEnabled: (v) => set({ voxelEnabled: v }),
  setEchoEnabled: (v) => set({ echoEnabled: v }),
  setMatterEnabled: (v) => set({ matterEnabled: v }),
  setStaleEnabled: (v) => set({ staleEnabled: v }),
  setTornEnabled: (v) => set({ tornEnabled: v }),
  updateVoxelParams: (p) => set((s) => ({ voxelParams: { ...s.voxelParams, ...p } })),
  updateEchoParams: (p) => set((s) => ({ echoParams: { ...s.echoParams, ...p } })),
  updateMatterParams: (p) => set((s) => ({ matterParams: { ...s.matterParams, ...p } })),
  updateStaleParams: (p) => set((s) => ({ staleParams: { ...s.staleParams, ...p } })),
  updateTornParams: (p) => set((s) => ({ tornParams: { ...s.tornParams, ...p } })),
  getSnapshot: () => {
    const s = get()
    return {
      voxelEnabled: s.voxelEnabled, echoEnabled: s.echoEnabled, matterEnabled: s.matterEnabled,
      staleEnabled: s.staleEnabled, tornEnabled: s.tornEnabled,
      voxelParams: { ...s.voxelParams }, echoParams: { ...s.echoParams }, matterParams: { ...s.matterParams },
      staleParams: { ...s.staleParams }, tornParams: { ...s.tornParams },
    }
  },
  // undefined (older banks/presets) resets to defaults = all disabled
  applySnapshot: (snap) => {
    const d = defaults()
    if (!snap) { set(d); return }
    set({
      voxelEnabled: snap.voxelEnabled, echoEnabled: snap.echoEnabled, matterEnabled: snap.matterEnabled,
      staleEnabled: snap.staleEnabled, tornEnabled: snap.tornEnabled,
      voxelParams: { ...d.voxelParams, ...snap.voxelParams },
      echoParams: { ...d.echoParams, ...snap.echoParams },
      matterParams: { ...d.matterParams, ...snap.matterParams },
      staleParams: { ...d.staleParams, ...snap.staleParams },
      tornParams: { ...d.tornParams, ...snap.tornParams },
    })
  },
}))
```

- [ ] **Step 4: Create `segShared.ts`**

```ts
// GLSL shared by the SEG effects. The mask texture stores class IDs
// (0 bg, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others) with row 0
// at the image TOP, so v is flipped when sampling.
export const SEG_MASK_GLSL = /* glsl */ `
uniform sampler2D segMask;
uniform float hasMask;

float segClass(vec2 uv) {
  return floor(texture2D(segMask, vec2(uv.x, 1.0 - uv.y)).r * 255.0 + 0.5);
}

// sel: 0 person, 1 skin, 2 hair, 3 clothes
float segSelected(float c, int sel) {
  if (sel == 1) return (c == 2.0 || c == 3.0) ? 1.0 : 0.0;
  if (sel == 2) return c == 1.0 ? 1.0 : 0.0;
  if (sel == 3) return c == 4.0 ? 1.0 : 0.0;
  return c > 0.5 ? 1.0 : 0.0;
}
`

/** Seconds per auto-trigger at a BPM, never shorter than 0.2 s. */
export function beatsToSeconds(beats: number, bpm: number): number {
  const safeBpm = Math.min(300, Math.max(20, bpm || 120))
  return Math.max(0.2, (Math.max(1, beats) * 60) / safeBpm)
}
```

- [ ] **Step 5: Create the five pass-through effect classes**

Each file below is the complete Task 2 version; Tasks 3–7 replace the shader and add internals. All five share this structure (shown in full for VOXEL; the others differ only in name, params type, and the extra methods listed in Interfaces).

`src/effects/glitch-engine/SegVoxelEffect.ts`:

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_VOXEL_PARAMS, type SegVoxelParams } from '../../stores/segStore'

const fragmentShader = /* glsl */ `
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`

export class SegVoxelEffect extends Effect {
  private seg: SegmentationService | null = null

  constructor(params: Partial<SegVoxelParams> = {}) {
    const p = { ...DEFAULT_SEG_VOXEL_PARAMS, ...params }
    super('SegVoxelEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setSegmentation(s: SegmentationService) { this.seg = s }
  setResolution(_w: number, _h: number) {}

  updateParams(params: Partial<SegVoxelParams>) {
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

Create `SegEchoEffect.ts`, `SegMatterEffect.ts`, `SegStaleEffect.ts`, `SegTornEffect.ts` with the same body, renaming the class (`SegEchoEffect` etc.), the `super()` name string, the params import (`DEFAULT_SEG_ECHO_PARAMS`/`SegEchoParams`, …), and adding these no-op methods:
- `SegEchoEffect`: `setSegmentation(s)` (as above), `releaseTargets() {}`
- `SegMatterEffect`: `setSegmentation(s)`, `setBpm(_bpm: number) {}`
- `SegStaleEffect`: no `seg` field; `setBpm(_bpm: number) {}`, `releaseTargets() {}`
- `SegTornEffect`: no `seg` field.

Stale/Torn have no `seg` field. `tsconfig.app.json` sets `noUnusedLocals`, which rejects a private field that is written but never read, so in the Voxel/Echo/Matter stubs add this getter (Tasks 3–5 replace the files and read `seg` for real):

```ts
  /** True once the pipeline has handed over the shared segmentation service. */
  get hasSegmentation() { return this.seg !== null }
```

- [ ] **Step 6: Exports and effects config**

Append to `src/effects/glitch-engine/index.ts`:

```ts
// SEG_EXP effects
export { SegVoxelEffect } from './SegVoxelEffect'
export { SegEchoEffect } from './SegEchoEffect'
export { SegMatterEffect } from './SegMatterEffect'
export { SegStaleEffect } from './SegStaleEffect'
export { SegTornEffect } from './SegTornEffect'
```

In `src/config/effects.ts`, replace the five lines for `destruction_reserved_10` … `destruction_reserved_14` (keep `_15`, `_16`) with:

```ts
  // Row 3-4: SEG_EXP (subject-targeted glitch layers)
  { id: 'seg_voxel', label: 'VOXEL', color: '#ff8a3d', row: 'render', page: 5, min: 4, max: 64 },
  { id: 'seg_echo', label: 'ECHO4D', color: '#ffb36b', row: 'render', page: 5, min: 1, max: 8 },
  { id: 'seg_matter', label: 'MATTER', color: '#c86bff', row: 'render', page: 5, min: 0, max: 1 },
  { id: 'seg_stale', label: 'STALE', color: '#9aa4b2', row: 'distortion', page: 5, min: 8, max: 96 },
  { id: 'seg_torn', label: 'TORN', color: '#5b5b5b', row: 'texture', page: 5, min: 0, max: 0.2 },
```

- [ ] **Step 7: EffectPipeline wiring**

In `src/effects/EffectPipeline.ts`:

1. Add to the glitch-engine import list: `SegVoxelEffect, SegEchoEffect, SegMatterEffect, SegStaleEffect, SegTornEffect,`; add `import { SegmentationService } from './vision/SegmentationService'`.
2. Fields, after `physarum: PhysarumEffect | null = null`:
   ```ts
   // SEG_EXP effects + their shared person segmentation
   segmentation: SegmentationService = new SegmentationService()
   segVoxel: SegVoxelEffect | null = null
   segEcho: SegEchoEffect | null = null
   segMatter: SegMatterEffect | null = null
   segStale: SegStaleEffect | null = null
   segTorn: SegTornEffect | null = null
   ```
3. Constructor, after `this.physarum = new PhysarumEffect()`:
   ```ts
   this.segVoxel = new SegVoxelEffect()
   this.segEcho = new SegEchoEffect()
   this.segMatter = new SegMatterEffect()
   this.segStale = new SegStaleEffect()
   this.segTorn = new SegTornEffect()
   this.segVoxel.setSegmentation(this.segmentation)
   this.segEcho.setSegmentation(this.segmentation)
   this.segMatter.setSegmentation(this.segmentation)
   ```
4. `getEffectById()`, after `case 'physarum': return this.physarum`:
   ```ts
   case 'seg_voxel': return this.segVoxel
   case 'seg_echo': return this.segEcho
   case 'seg_matter': return this.segMatter
   case 'seg_stale': return this.segStale
   case 'seg_torn': return this.segTorn
   ```
5. `updateEffects()` config type, after `fractalDomainEnabled: boolean`:
   ```ts
   segVoxelEnabled: boolean
   segEchoEnabled: boolean
   segMatterEnabled: boolean
   segStaleEnabled: boolean
   segTornEnabled: boolean
   ```
6. `enabledMap`, after `fractal_domain: config.fractalDomainEnabled,`:
   ```ts
   seg_voxel: config.segVoxelEnabled,
   seg_echo: config.segEchoEnabled,
   seg_matter: config.segMatterEnabled,
   seg_stale: config.segStaleEnabled,
   seg_torn: config.segTornEnabled,
   ```
7. `temporalIds`: append `'seg_echo', 'seg_stale',`; `temporalEffects`: add
   ```ts
   // SEG_EXP — frame work happens in update() from inputBuffer (no
   // captureFrame), but ring/held targets must be freed on disable.
   seg_echo: this.segEcho,
   seg_stale: this.segStale,
   ```
8. Directly after the `for (const id of temporalIds)` loop, add:
   ```ts
   // Person segmentation runs only while a consumer is live.
   this.segmentation.setActive(
     !config.bypassActive && !!(enabledMap['seg_voxel'] || enabledMap['seg_echo'] || enabledMap['seg_matter'])
   )
   ```
9. In the method containing `this.strandOdradek?.setResolution(...)` (the canvas-resize handler), append:
   ```ts
   this.segVoxel?.setResolution(this.canvasWidth, this.canvasHeight)
   this.segEcho?.setResolution(this.canvasWidth, this.canvasHeight)
   this.segMatter?.setResolution(this.canvasWidth, this.canvasHeight)
   this.segStale?.setResolution(this.canvasWidth, this.canvasHeight)
   this.segTorn?.setResolution(this.canvasWidth, this.canvasHeight)
   ```
10. `dispose()`, after `this.physarum?.dispose()`:
    ```ts
    this.segVoxel?.dispose()
    this.segEcho?.dispose()
    this.segMatter?.dispose()
    this.segStale?.dispose()
    this.segTorn?.dispose()
    this.segmentation.dispose()
    ```

- [ ] **Step 8: Canvas.tsx + paramSync**

`src/components/Canvas.tsx`:
1. `import { useSegStore } from '../stores/segStore'`
2. After the `useTrendStore()` destructure (line ~187):
   ```ts
   const { voxelEnabled: segVoxelEnabled, echoEnabled: segEchoEnabled, matterEnabled: segMatterEnabled,
     staleEnabled: segStaleEnabled, tornEnabled: segTornEnabled } = useSegStore()
   ```
3. In the `pipeline.updateEffects({ ... })` object after `fractalDomainEnabled: …`:
   ```ts
   // SEG_EXP effects
   segVoxelEnabled: getEffectiveEnabled('seg_voxel', segVoxelEnabled && !effectBypassed['seg_voxel']),
   segEchoEnabled: getEffectiveEnabled('seg_echo', segEchoEnabled && !effectBypassed['seg_echo']),
   segMatterEnabled: getEffectiveEnabled('seg_matter', segMatterEnabled && !effectBypassed['seg_matter']),
   segStaleEnabled: getEffectiveEnabled('seg_stale', segStaleEnabled && !effectBypassed['seg_stale']),
   segTornEnabled: getEffectiveEnabled('seg_torn', segTornEnabled && !effectBypassed['seg_torn']),
   ```
4. Add `segVoxelEnabled, segEchoEnabled, segMatterEnabled, segStaleEnabled, segTornEnabled,` to that effect's dependency array.
5. New effect after the structural effect:
   ```ts
   // Person segmentation follows the active source (video or still image)
   useEffect(() => {
     pipeline?.segmentation.setSource(videoElement ?? imageElement ?? null)
   }, [pipeline, videoElement, imageElement])
   ```

`src/effects/paramSync.ts`:
1. Imports: `import { useSegStore } from '../stores/segStore'` and `import { useSequencerStore } from '../stores/sequencerStore'`.
2. After `pushTrend`:
   ```ts
   // SEG_EXP effects
   const pushSeg = () => {
     const s = useSegStore.getState()
     pipeline.segVoxel?.updateParams({ ...s.voxelParams, mix: s.voxelParams.mix * getMix('seg_voxel') })
     pipeline.segEcho?.updateParams({ ...s.echoParams, mix: s.echoParams.mix * getMix('seg_echo') })
     pipeline.segMatter?.updateParams({ ...s.matterParams, mix: s.matterParams.mix * getMix('seg_matter') })
     pipeline.segStale?.updateParams({ ...s.staleParams, mix: s.staleParams.mix * getMix('seg_stale') })
     pipeline.segTorn?.updateParams({ ...s.tornParams, mix: s.tornParams.mix * getMix('seg_torn') })
   }
   const pushBpm = () => {
     const bpm = useSequencerStore.getState().bpm
     pipeline.segMatter?.setBpm(bpm)
     pipeline.segStale?.setBpm(bpm)
   }
   ```
3. Initial push line: append `pushSeg(); pushBpm()`.
4. In the glitch-store `effectMix` branch, add `pushSeg()` alongside the other group pushes.
5. Append to `unsubs`:
   ```ts
   useSegStore.subscribe((s, prev) => {
     if (
       s.voxelParams !== prev.voxelParams || s.echoParams !== prev.echoParams ||
       s.matterParams !== prev.matterParams || s.staleParams !== prev.staleParams ||
       s.tornParams !== prev.tornParams
     ) pushSeg()
   }),
   useSequencerStore.subscribe((s, prev) => {
     if (s.bpm !== prev.bpm) pushBpm()
   }),
   ```

- [ ] **Step 9: UI wiring + snapshots**

`src/components/performance/PerformanceGrid.tsx`:
1. `import { useSegStore } from '../../stores/segStore'`; after `const trend = useTrendStore()` add `const seg = useSegStore()`.
2. In `getEffectState` switch, after the `fractal_domain` case:
   ```ts
   case 'seg_voxel':
     return {
       active: seg.voxelEnabled,
       value: seg.voxelParams.size,
       onToggle: () => { if (!seg.voxelEnabled) moveToEndOfChain(effectId); seg.setVoxelEnabled(!seg.voxelEnabled) },
       onValueChange: (v: number) => seg.updateVoxelParams({ size: v }),
     }
   case 'seg_echo':
     return {
       active: seg.echoEnabled,
       value: seg.echoParams.copies,
       onToggle: () => { if (!seg.echoEnabled) moveToEndOfChain(effectId); seg.setEchoEnabled(!seg.echoEnabled) },
       onValueChange: (v: number) => seg.updateEchoParams({ copies: Math.round(v) }),
     }
   case 'seg_matter':
     return {
       active: seg.matterEnabled,
       value: seg.matterParams.coverage,
       onToggle: () => { if (!seg.matterEnabled) moveToEndOfChain(effectId); seg.setMatterEnabled(!seg.matterEnabled) },
       onValueChange: (v: number) => seg.updateMatterParams({ coverage: v }),
     }
   case 'seg_stale':
     return {
       active: seg.staleEnabled,
       value: seg.staleParams.cellSize,
       onToggle: () => { if (!seg.staleEnabled) moveToEndOfChain(effectId); seg.setStaleEnabled(!seg.staleEnabled) },
       onValueChange: (v: number) => seg.updateStaleParams({ cellSize: v }),
     }
   case 'seg_torn':
     return {
       active: seg.tornEnabled,
       value: seg.tornParams.depth,
       onToggle: () => { if (!seg.tornEnabled) moveToEndOfChain(effectId); seg.setTornEnabled(!seg.tornEnabled) },
       onValueChange: (v: number) => seg.updateTornParams({ depth: v }),
     }
   ```
3. In `pageHasActiveEffects` `case 5`, extend the return with `|| seg.voxelEnabled || seg.echoEnabled || seg.matterEnabled || seg.staleEnabled || seg.tornEnabled`.

`src/hooks/useActiveEffects.ts`: import `useSegStore`, add `const seg = useSegStore()` beside the other store hooks, add `seg` to the `useMemo` deps, and after the DESTROY trend pushes:
```ts
// SEG_EXP — DESTROY
if (seg.voxelEnabled) activeEffects.push({ id: 'seg_voxel', label: 'VOXEL', color: '#ff8a3d', primaryValue: Math.round(seg.voxelParams.size), primaryLabel: 'px' })
if (seg.echoEnabled) activeEffects.push({ id: 'seg_echo', label: 'ECHO4D', color: '#ffb36b', primaryValue: seg.echoParams.copies, primaryLabel: 'cps' })
if (seg.matterEnabled) activeEffects.push({ id: 'seg_matter', label: 'MATTER', color: '#c86bff', primaryValue: Math.round(seg.matterParams.coverage * 100), primaryLabel: 'cov' })
if (seg.staleEnabled) activeEffects.push({ id: 'seg_stale', label: 'STALE', color: '#9aa4b2', primaryValue: Math.round(seg.staleParams.cellSize), primaryLabel: 'px' })
if (seg.tornEnabled) activeEffects.push({ id: 'seg_torn', label: 'TORN', color: '#5b5b5b', primaryValue: Math.round(seg.tornParams.depth * 100), primaryLabel: 'dep' })
```

`src/hooks/useEffectDisable.ts`: import `useSegStore`, add `const seg = useSegStore()`, add `seg` to the `useCallback` deps, and after the DESTROY trend cases:
```ts
// SEG_EXP
case 'seg_voxel': seg.setVoxelEnabled(false); break
case 'seg_echo': seg.setEchoEnabled(false); break
case 'seg_matter': seg.setMatterEnabled(false); break
case 'seg_stale': seg.setStaleEnabled(false); break
case 'seg_torn': seg.setTornEnabled(false); break
```

`src/components/performance/CompactEffectParams.tsx`: import `useSegStore`, add `const seg = useSegStore()`, and after the `crystallize` case's siblings in DESTROY:
```tsx
case 'seg_voxel':
  return (<>
    <Knob label="SIZE" value={seg.voxelParams.size} min={4} max={64} step={1}
      onChange={v => seg.updateVoxelParams({ size: v })} paramId="seg_voxel.size" {...knobProps} />
    <Knob label="DPTH" value={seg.voxelParams.depth} min={0} max={4} step={0.05}
      onChange={v => seg.updateVoxelParams({ depth: v })} paramId="seg_voxel.depth" {...knobProps} />
    <Knob label="SCTR" value={seg.voxelParams.scatter} min={0} max={1} step={0.01}
      onChange={v => seg.updateVoxelParams({ scatter: v })} paramId="seg_voxel.scatter" {...knobProps} />
  </>)
case 'seg_echo':
  return (<>
    <Knob label="CPS" value={seg.echoParams.copies} min={1} max={8} step={1}
      onChange={v => seg.updateEchoParams({ copies: v })} paramId="seg_echo.copies" {...knobProps} />
    <Knob label="DLY" value={seg.echoParams.delay} min={1} max={12} step={1}
      onChange={v => seg.updateEchoParams({ delay: v })} paramId="seg_echo.delay" {...knobProps} />
    <Knob label="DCAY" value={seg.echoParams.decay} min={0} max={1} step={0.01}
      onChange={v => seg.updateEchoParams({ decay: v })} paramId="seg_echo.decay" {...knobProps} />
  </>)
case 'seg_matter':
  return (<>
    <Knob label="COV" value={seg.matterParams.coverage} min={0} max={1} step={0.01}
      onChange={v => seg.updateMatterParams({ coverage: v })} paramId="seg_matter.coverage" {...knobProps} />
    <Knob label="SEED" value={seg.matterParams.seed} min={0} max={999} step={1}
      onChange={v => seg.updateMatterParams({ seed: v })} paramId="seg_matter.seed" {...knobProps} />
    <Knob label="BEAT" value={seg.matterParams.reshuffleBeats} min={1} max={32} step={1}
      onChange={v => seg.updateMatterParams({ reshuffleBeats: v })} paramId="seg_matter.reshuffleBeats" {...knobProps} />
  </>)
case 'seg_stale':
  return (<>
    <Knob label="CELL" value={seg.staleParams.cellSize} min={8} max={96} step={1}
      onChange={v => seg.updateStaleParams({ cellSize: v })} paramId="seg_stale.cellSize" {...knobProps} />
    <Knob label="THR" value={seg.staleParams.threshold} min={0} max={1} step={0.01}
      onChange={v => seg.updateStaleParams({ threshold: v })} paramId="seg_stale.threshold" {...knobProps} />
    <Knob label="BRST" value={seg.staleParams.burst} min={0} max={1} step={0.01}
      onChange={v => seg.updateStaleParams({ burst: v })} paramId="seg_stale.burst" {...knobProps} />
  </>)
case 'seg_torn':
  return (<>
    <Knob label="DPTH" value={seg.tornParams.depth} min={0} max={0.2} step={0.005}
      onChange={v => seg.updateTornParams({ depth: v })} paramId="seg_torn.depth" {...knobProps} />
    <Knob label="BLK" value={seg.tornParams.blockSize} min={4} max={64} step={1}
      onChange={v => seg.updateTornParams({ blockSize: v })} paramId="seg_torn.blockSize" {...knobProps} />
  </>)
```
Match the surrounding cases' wrapper element: if neighbouring cases wrap knobs in a `<div …>` rather than a fragment, use the identical wrapper.

`src/config/effectParams.ts`: `import { useSegStore } from '../stores/segStore'`, add `const sg = () => useSegStore.getState()` beside `trd`, and add registry entries after `fractal_domain`:
```ts
seg_voxel: {
  getParams: () => [
    { id: 'size', label: 'SIZE', min: 4, max: 64, step: 1, apply: (v) => sg().updateVoxelParams({ size: v }), read: () => sg().voxelParams.size },
    { id: 'depth', label: 'DPTH', min: 0, max: 4, step: 0.05, apply: (v) => sg().updateVoxelParams({ depth: v }), read: () => sg().voxelParams.depth },
    { id: 'scatter', label: 'SCTR', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateVoxelParams({ scatter: v }), read: () => sg().voxelParams.scatter },
    { id: 'shading', label: 'SHADE', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateVoxelParams({ shading: v }), read: () => sg().voxelParams.shading },
    { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateVoxelParams({ mix: v }), read: () => sg().voxelParams.mix },
  ],
  getSelectParams: () => [
    { id: 'classes', label: 'TARGET', type: 'select',
      options: [{ value: '0', label: 'PERSON' }, { value: '1', label: 'SKIN' }, { value: '2', label: 'HAIR' }, { value: '3', label: 'CLOTHES' }],
      apply: (v) => sg().updateVoxelParams({ classes: Number(v) }), read: () => String(sg().voxelParams.classes) },
    { id: 'debugMask', label: 'MASK VIEW', type: 'select',
      options: [{ value: '0', label: 'OFF' }, { value: '1', label: 'ON' }],
      apply: (v) => sg().updateVoxelParams({ debugMask: v === '1' }), read: () => (sg().voxelParams.debugMask ? '1' : '0') },
  ],
  setEnabled: (v) => sg().setVoxelEnabled(v),
  getEnabled: () => sg().voxelEnabled,
},
seg_echo: {
  getParams: () => [
    { id: 'copies', label: 'CPS', min: 1, max: 8, step: 1, apply: (v) => sg().updateEchoParams({ copies: v }), read: () => sg().echoParams.copies },
    { id: 'delay', label: 'DLY', min: 1, max: 12, step: 1, apply: (v) => sg().updateEchoParams({ delay: v }), read: () => sg().echoParams.delay },
    { id: 'decay', label: 'DCAY', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateEchoParams({ decay: v }), read: () => sg().echoParams.decay },
    { id: 'offsetX', label: 'OFFX', min: -0.1, max: 0.1, step: 0.001, controlType: 'bipolar', apply: (v) => sg().updateEchoParams({ offsetX: v }), read: () => sg().echoParams.offsetX },
    { id: 'offsetY', label: 'OFFY', min: -0.1, max: 0.1, step: 0.001, controlType: 'bipolar', apply: (v) => sg().updateEchoParams({ offsetY: v }), read: () => sg().echoParams.offsetY },
    { id: 'zoom', label: 'ZOOM', min: 0.9, max: 1.1, step: 0.001, apply: (v) => sg().updateEchoParams({ zoom: v }), read: () => sg().echoParams.zoom },
    { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateEchoParams({ mix: v }), read: () => sg().echoParams.mix },
  ],
  setEnabled: (v) => sg().setEchoEnabled(v),
  getEnabled: () => sg().echoEnabled,
},
seg_matter: {
  getParams: () => [
    { id: 'coverage', label: 'COV', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ coverage: v }), read: () => sg().matterParams.coverage },
    { id: 'seed', label: 'SEED', min: 0, max: 999, step: 1, apply: (v) => sg().updateMatterParams({ seed: v }), read: () => sg().matterParams.seed },
    { id: 'reshuffleBeats', label: 'BEATS', min: 1, max: 32, step: 1, apply: (v) => sg().updateMatterParams({ reshuffleBeats: v }), read: () => sg().matterParams.reshuffleBeats },
    { id: 'wBlack', label: 'BLACK', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wBlack: v }), read: () => sg().matterParams.wBlack },
    { id: 'wSolid', label: 'SOLID', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wSolid: v }), read: () => sg().matterParams.wSolid },
    { id: 'wGradient', label: 'GRAD', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wGradient: v }), read: () => sg().matterParams.wGradient },
    { id: 'wZebra', label: 'ZEBRA', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wZebra: v }), read: () => sg().matterParams.wZebra },
    { id: 'wRainbow', label: 'RAINBW', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wRainbow: v }), read: () => sg().matterParams.wRainbow },
    { id: 'wMosaic', label: 'MOSAIC', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ wMosaic: v }), read: () => sg().matterParams.wMosaic },
    { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateMatterParams({ mix: v }), read: () => sg().matterParams.mix },
  ],
  getSelectParams: () => [
    { id: 'autoReshuffle', label: 'AUTO', type: 'select',
      options: [{ value: '0', label: 'OFF' }, { value: '1', label: 'BEAT' }],
      apply: (v) => sg().updateMatterParams({ autoReshuffle: v === '1' }), read: () => (sg().matterParams.autoReshuffle ? '1' : '0') },
  ],
  setEnabled: (v) => sg().setMatterEnabled(v),
  getEnabled: () => sg().matterEnabled,
},
seg_stale: {
  getParams: () => [
    { id: 'cellSize', label: 'CELL', min: 8, max: 96, step: 1, apply: (v) => sg().updateStaleParams({ cellSize: v }), read: () => sg().staleParams.cellSize },
    { id: 'threshold', label: 'THR', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateStaleParams({ threshold: v }), read: () => sg().staleParams.threshold },
    { id: 'refresh', label: 'RFSH', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateStaleParams({ refresh: v }), read: () => sg().staleParams.refresh },
    { id: 'burst', label: 'BRST', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateStaleParams({ burst: v }), read: () => sg().staleParams.burst },
    { id: 'raggedness', label: 'RAG', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateStaleParams({ raggedness: v }), read: () => sg().staleParams.raggedness },
    { id: 'burstBeats', label: 'BEATS', min: 1, max: 32, step: 1, apply: (v) => sg().updateStaleParams({ burstBeats: v }), read: () => sg().staleParams.burstBeats },
    { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateStaleParams({ mix: v }), read: () => sg().staleParams.mix },
  ],
  getSelectParams: () => [
    { id: 'autoBurst', label: 'AUTO', type: 'select',
      options: [{ value: '0', label: 'OFF' }, { value: '1', label: 'BEAT' }],
      apply: (v) => sg().updateStaleParams({ autoBurst: v === '1' }), read: () => (sg().staleParams.autoBurst ? '1' : '0') },
  ],
  setEnabled: (v) => sg().setStaleEnabled(v),
  getEnabled: () => sg().staleEnabled,
},
seg_torn: {
  getParams: () => [
    { id: 'depth', label: 'DPTH', min: 0, max: 0.2, step: 0.005, apply: (v) => sg().updateTornParams({ depth: v }), read: () => sg().tornParams.depth },
    { id: 'blockSize', label: 'BLK', min: 4, max: 64, step: 1, apply: (v) => sg().updateTornParams({ blockSize: v }), read: () => sg().tornParams.blockSize },
    { id: 'speed', label: 'SPD', min: 0, max: 4, step: 0.05, apply: (v) => sg().updateTornParams({ speed: v }), read: () => sg().tornParams.speed },
    { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01, apply: (v) => sg().updateTornParams({ mix: v }), read: () => sg().tornParams.mix },
  ],
  getSelectParams: () => [
    { id: 'fill', label: 'FILL', type: 'select',
      options: [{ value: '0', label: 'BLACK' }, { value: '1', label: 'SMEAR' }],
      apply: (v) => sg().updateTornParams({ fill: Number(v) }), read: () => String(sg().tornParams.fill) },
  ],
  setEnabled: (v) => sg().setTornEnabled(v),
  getEnabled: () => sg().tornEnabled,
},
```

`src/hooks/useContinuousModulation.ts`: import `useSegStore`; add after the DESTROY trend cases (value is 0–1):
```ts
// SEG_EXP
case 'seg_voxel': {
  const s = useSegStore.getState()
  if (paramName === 'size') s.updateVoxelParams({ size: 4 + Math.round(value * 60) })
  if (paramName === 'depth') s.updateVoxelParams({ depth: value * 4 })
  if (paramName === 'scatter') s.updateVoxelParams({ scatter: value })
  if (paramName === 'shading') s.updateVoxelParams({ shading: value })
  if (paramName === 'mix') s.updateVoxelParams({ mix: value })
  break
}
case 'seg_echo': {
  const s = useSegStore.getState()
  if (paramName === 'copies') s.updateEchoParams({ copies: 1 + Math.round(value * 7) })
  if (paramName === 'delay') s.updateEchoParams({ delay: 1 + Math.round(value * 11) })
  if (paramName === 'decay') s.updateEchoParams({ decay: value })
  if (paramName === 'offsetX') s.updateEchoParams({ offsetX: value * 0.2 - 0.1 })
  if (paramName === 'offsetY') s.updateEchoParams({ offsetY: value * 0.2 - 0.1 })
  if (paramName === 'zoom') s.updateEchoParams({ zoom: 0.9 + value * 0.2 })
  if (paramName === 'mix') s.updateEchoParams({ mix: value })
  break
}
case 'seg_matter': {
  const s = useSegStore.getState()
  if (paramName === 'coverage') s.updateMatterParams({ coverage: value })
  if (paramName === 'seed') s.updateMatterParams({ seed: Math.round(value * 999) })
  if (paramName === 'mix') s.updateMatterParams({ mix: value })
  break
}
case 'seg_stale': {
  const s = useSegStore.getState()
  if (paramName === 'cellSize') s.updateStaleParams({ cellSize: 8 + Math.round(value * 88) })
  if (paramName === 'threshold') s.updateStaleParams({ threshold: value })
  if (paramName === 'refresh') s.updateStaleParams({ refresh: value })
  if (paramName === 'burst') s.updateStaleParams({ burst: value })
  if (paramName === 'raggedness') s.updateStaleParams({ raggedness: value })
  if (paramName === 'mix') s.updateStaleParams({ mix: value })
  break
}
case 'seg_torn': {
  const s = useSegStore.getState()
  if (paramName === 'depth') s.updateTornParams({ depth: value * 0.2 })
  if (paramName === 'blockSize') s.updateTornParams({ blockSize: 4 + Math.round(value * 60) })
  if (paramName === 'speed') s.updateTornParams({ speed: value * 4 })
  if (paramName === 'mix') s.updateTornParams({ mix: value })
  break
}
```

Snapshots:
- `src/stores/bankStore.ts`: `import { useSegStore, type SegSnapshot } from './segStore'`; add to `BankSnapshot` after `trend?: TrendSnapshot`:
  ```ts
  // SEG_EXP effects — optional for backward compat with older presets
  seg?: SegSnapshot
  ```
  In `saveBank` (line ~157) add `seg: useSegStore.getState().getSnapshot(),` after the `trend:` line; in `loadBank`, after the `if (snapshot.trend) {…}` block (line ~253), add:
  ```ts
  // Older banks predate SEG_EXP: applySnapshot(undefined) resets seg to defaults (all off)
  useSegStore.getState().applySnapshot(snapshot.seg)
  ```
- `src/stores/presetLibraryStore.ts`: import `useSegStore`; add `seg: useSegStore.getState().getSnapshot(),` after the `trend:` line in `captureCurrentEffects()` (line ~224) and `useSegStore.getState().applySnapshot(effects.seg)` after the `if (effects.trend) {…}` block in `applyEffects()` (line ~295). Change both declarations to `export function captureCurrentEffects()` / `export function applyEffects(...)` (no behaviour change; the harness and Task 8 use them).

- [ ] **Step 10: Build, lint, run the wiring check**

Run: `npm run build && npm run lint` → both exit 0.
Restart the dev server, run: `node .superpowers/sdd/seg-verify.mjs wiring`
Expected: `SEG wiring VERIFY: PASS`.

- [ ] **Step 11: Commit**

```bash
git add src/stores/segStore.ts src/effects/glitch-engine/segShared.ts src/effects/glitch-engine/Seg*.ts \
  src/effects/glitch-engine/index.ts src/config/effects.ts src/effects/EffectPipeline.ts src/components/Canvas.tsx \
  src/effects/paramSync.ts src/components/performance/PerformanceGrid.tsx src/hooks/useActiveEffects.ts \
  src/hooks/useEffectDisable.ts src/components/performance/CompactEffectParams.tsx src/config/effectParams.ts \
  src/hooks/useContinuousModulation.ts src/stores/bankStore.ts src/stores/presetLibraryStore.ts
git commit -m "fx: SEG_EXP store + five pass-through effects wired end to end"
```

---

### Task 3: VOXEL shader

**Files:**
- Modify: `src/effects/glitch-engine/SegVoxelEffect.ts` (full replacement)

**Interfaces:**
- Consumes: `SEG_MASK_GLSL` (`segShared.ts`), `NOISE_GLSL` (`glsl-utils.ts`: `hash(vec2)`, `hash2(vec2)`), `SegmentationService.maskTexture/hasMask/personCoverage`.
- Produces: same public methods as Task 2.

- [ ] **Step 1: Confirm the visual check fails on the pass-through**

Restart dev server, run: `node .superpowers/sdd/seg-verify.mjs visual VOXEL voxel size 6 48 0.5 l`
Expected: FAIL at `effect changes canvas` (pass-through shader).

- [ ] **Step 2: Replace `SegVoxelEffect.ts`**

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_VOXEL_PARAMS, type SegVoxelParams } from '../../stores/segStore'
import { NOISE_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL } from './segShared'

const fragmentShader = NOISE_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float cellPx;
uniform float scatterAmt;
uniform float shadingAmt;
uniform int classSel;
uniform float debugMask;
uniform float uTime;
uniform float effectMix;

float selAt(vec2 uvp) { return segSelected(segClass(uvp), classSel); }

vec3 cellColor(vec2 cellCenterUv, vec2 cellUv) {
  // 4-tap average inside the cell → flat block colour
  vec2 q = cellUv * 0.25;
  return 0.25 * (texture2D(inputBuffer, cellCenterUv + vec2(-q.x, -q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2( q.x, -q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2(-q.x,  q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2( q.x,  q.y)).rgb);
}

// Isometric-ish cube shading in the cell's local frame q ∈ [-0.5, 0.5]^2
vec3 shadeCube(vec3 c, vec2 q) {
  float bevel = 0.2;
  float top = step(0.5 - bevel, q.y);                 // lit top face (v up)
  float side = step(0.5 - bevel, q.x) * (1.0 - top);  // dark right face
  float edge = 1.0 - step(max(abs(q.x), abs(q.y)), 0.46);
  vec3 s = c;
  s = mix(s, min(c * 1.3 + 0.04, 1.0), top);
  s = mix(s, c * 0.62, side);
  s = mix(s, c * 0.4, edge);
  return mix(c, s, shadingAmt);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasMask < 0.5) { outputColor = inputColor; return; }

  if (debugMask > 0.5) {
    float m = selAt(uv);
    outputColor = vec4(mix(inputColor.rgb, vec3(1.0, 0.2, 0.6), 0.55 * m), inputColor.a);
    return;
  }

  vec2 px = uv * resolution;
  vec2 cell = floor(px / cellPx);
  vec2 cellUv = vec2(cellPx) / resolution;

  // Gather: which cell's (possibly displaced, rotated) square covers this pixel?
  // Edge cells fly outward up to 2 cells, so search a 5x5 neighbourhood.
  vec3 best = inputColor.rgb;
  float bestPri = -1.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec2 k = cell + vec2(float(dx), float(dy));
      vec2 kc = (k + 0.5) * cellPx;                 // cell centre, px
      vec2 kuv = kc / resolution;
      if (selAt(kuv) < 0.5) continue;

      // Edge cell = any 4-neighbour outside the mask; outward = toward the outside
      float l = selAt((kc + vec2(-cellPx, 0.0)) / resolution);
      float r = selAt((kc + vec2( cellPx, 0.0)) / resolution);
      float d = selAt((kc + vec2(0.0, -cellPx)) / resolution);
      float u = selAt((kc + vec2(0.0,  cellPx)) / resolution);
      vec2 grad = vec2(r - l, u - d);               // points INTO the mask
      float isEdge = step(0.5, 4.0 - (l + r + d + u));

      float h = hash(k);
      vec2 jit = hash2(k + 7.13) - 0.5;
      vec2 outward = length(grad) > 0.0 ? -normalize(grad) : normalize(jit + 1e-4);
      float fly = isEdge * scatterAmt * step(1.0 - scatterAmt * 0.8, h);   // only some edge cells fly
      float drift = 0.5 + 0.5 * sin(uTime * (0.6 + h) + h * 6.283);
      vec2 offset = fly * (outward * (0.6 + 1.4 * h) + jit * 0.6) * cellPx * (0.6 + 0.8 * drift);
      float ang = fly * (h - 0.5) * 1.6;
      float scl = 1.0 - fly * 0.25 * h;

      vec2 rel = px - (kc + offset);
      float cs = cos(-ang), sn = sin(-ang);
      vec2 q = vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y) / (cellPx * scl);
      if (max(abs(q.x), abs(q.y)) > 0.5) continue;

      float pri = fly + h * 0.01;                   // flying cells draw on top
      if (pri > bestPri) {
        bestPri = pri;
        best = shadeCube(cellColor(kuv, cellUv), q);
      }
    }
  }

  outputColor = vec4(mix(inputColor.rgb, best, effectMix), inputColor.a);
}
`

export class SegVoxelEffect extends Effect {
  private seg: SegmentationService | null = null
  private baseSize = DEFAULT_SEG_VOXEL_PARAMS.size
  private depth = DEFAULT_SEG_VOXEL_PARAMS.depth
  private elapsed = 0

  constructor(params: Partial<SegVoxelParams> = {}) {
    const p = { ...DEFAULT_SEG_VOXEL_PARAMS, ...params }
    super('SegVoxelEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['cellPx', new THREE.Uniform(p.size)],
        ['scatterAmt', new THREE.Uniform(p.scatter)],
        ['shadingAmt', new THREE.Uniform(p.shading)],
        ['classSel', new THREE.Uniform(p.classes)],
        ['debugMask', new THREE.Uniform(p.debugMask ? 1 : 0)],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.baseSize = p.size
    this.depth = p.depth
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setResolution(w: number, h: number) {
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h))
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
    const cov = this.seg?.personCoverage ?? 0
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0
    // Close-ups (high coverage) get bigger blocks, like the reference
    this.uniforms.get('cellPx')!.value = Math.max(2, this.baseSize * (1 + this.depth * cov))
  }

  updateParams(params: Partial<SegVoxelParams>) {
    if (params.size !== undefined) this.baseSize = params.size
    if (params.depth !== undefined) this.depth = params.depth
    if (params.scatter !== undefined) this.uniforms.get('scatterAmt')!.value = params.scatter
    if (params.shading !== undefined) this.uniforms.get('shadingAmt')!.value = params.shading
    if (params.classes !== undefined) this.uniforms.get('classSel')!.value = params.classes
    if (params.debugMask !== undefined) this.uniforms.get('debugMask')!.value = params.debugMask ? 1 : 0
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run lint` → exit 0.

- [ ] **Step 4: Run the visual check**

Restart dev server, run: `node .superpowers/sdd/seg-verify.mjs visual VOXEL voxel size 6 48 0.5 l`
Expected: `PASS`; the left 8/64 strip (kitchen wall) stays within diff < 1.5.

- [ ] **Step 5: Eyeball against the reference**

Open `.superpowers/sdd/shots/seg-VOXEL-on.png` and the reference frame (`ffmpeg -ss 1.75 -i .superpowers/sdd/fixtures/seg-exp-28-reference.mp4 -frames:v 1 .superpowers/sdd/shots/ref-1.75.png`). Expect blocks only on the person, lit top / dark side faces, and some edge cubes detached. Re-run with `scatter` swept (`visual VOXEL voxel scatter 0 1 1.75 none`) and confirm detached cubes appear only at the high value.

- [ ] **Step 6: No-person frame passes through (Review Focus 1)**

Run: `node .superpowers/sdd/seg-verify.mjs visual VOXEL voxel size 6 48 7.0 none`
Expected: `effect changes canvas` FAILS here **by design** (no person at t=7.0 → pass-through) while `disable restores source` and `no console errors` pass. Record that this frame is a pass-through; if `effect changes canvas` passes at 7.0, check `debugMask` output to see what the model classified as person and note it in the task report.

- [ ] **Step 7: Mask alignment at two canvas sizes**

Set `debugMask: true` via the store in a one-off puppeteer run (or the expanded panel's MASK VIEW select) at viewport 2560×1440 and 1280×900; save both screenshots and confirm the pink tint sits on the person in both, with no vertical flip.

- [ ] **Step 8: Commit**

```bash
git add src/effects/glitch-engine/SegVoxelEffect.ts
git commit -m "fx: VOXEL subject cube mosaic with edge scatter"
```

---

### Task 4: ECHO4D ring buffer

**Files:**
- Modify: `src/effects/glitch-engine/SegEchoEffect.ts` (full replacement)

**Interfaces:**
- Consumes: `SEG_MASK_GLSL`, `SegmentationService`.
- Produces: same public methods as Task 2 (`releaseTargets()` now real).

- [ ] **Step 1: Confirm the visual check fails**

Run (fresh server): `node .superpowers/sdd/seg-verify.mjs visual ECHO4D echo offsetX -0.08 0.08 4.0 none`
Expected: FAIL at `effect changes canvas`. Note: the fixture video is paused at the seek point, so echoes only differ from the live frame once offsets are non-zero; the sweep uses offsetX for that reason.

- [ ] **Step 2: Replace `SegEchoEffect.ts`**

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_ECHO_PARAMS, type SegEchoParams } from '../../stores/segStore'
import { SEG_MASK_GLSL } from './segShared'

const MAX_COPIES = 8

const fragmentShader = SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D echo0; uniform sampler2D echo1; uniform sampler2D echo2; uniform sampler2D echo3;
uniform sampler2D echo4; uniform sampler2D echo5; uniform sampler2D echo6; uniform sampler2D echo7;
uniform int copies;
uniform int filled;
uniform float decay;
uniform vec2 offsetStep;
uniform float zoomStep;
uniform float effectMix;

vec4 echoAt(int i, vec2 p) {
  if (i == 0) return texture2D(echo0, p);
  if (i == 1) return texture2D(echo1, p);
  if (i == 2) return texture2D(echo2, p);
  if (i == 3) return texture2D(echo3, p);
  if (i == 4) return texture2D(echo4, p);
  if (i == 5) return texture2D(echo5, p);
  if (i == 6) return texture2D(echo6, p);
  return texture2D(echo7, p);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  int n = min(copies, filled);
  if (hasMask < 0.5 || n == 0) { outputColor = inputColor; return; }
  vec3 acc = inputColor.rgb;
  // Oldest first so newer copies sit on top; echo i=0 is newest.
  for (int j = ${MAX_COPIES - 1}; j >= 0; j--) {
    if (j >= n) continue;
    float k = float(j + 1);
    vec2 p = (uv - 0.5) / pow(zoomStep, k) + 0.5 - offsetStep * k;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) continue;
    vec4 e = echoAt(j, p);
    acc = mix(acc, e.rgb, e.a * pow(decay, k));
  }
  // The live person always stays on top
  float live = segSelected(segClass(uv), 0);
  vec3 result = mix(acc, inputColor.rgb, live);
  outputColor = vec4(mix(inputColor.rgb, result, effectMix), inputColor.a);
}
`

// Copies the input with alpha = person mask into a ring slot.
const captureFrag = SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D tInput;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tInput, vUv);
  float m = hasMask > 0.5 ? segSelected(segClass(vUv), 0) : 0.0;
  gl_FragColor = vec4(c.rgb, m);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export class SegEchoEffect extends Effect {
  private seg: SegmentationService | null = null
  private ring: THREE.WebGLRenderTarget[] = []
  private head = 0          // next slot to write
  private filled = 0
  private frame = 0
  private delay = DEFAULT_SEG_ECHO_PARAMS.delay
  private width = 1920
  private height = 1080
  private captureMat: THREE.ShaderMaterial | null = null
  private quad: THREE.Mesh | null = null
  private scene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  constructor(params: Partial<SegEchoParams> = {}) {
    const p = { ...DEFAULT_SEG_ECHO_PARAMS, ...params }
    const uniforms = new Map<string, THREE.Uniform>([
      ['segMask', new THREE.Uniform(null)],
      ['hasMask', new THREE.Uniform(0)],
      ['copies', new THREE.Uniform(p.copies)],
      ['filled', new THREE.Uniform(0)],
      ['decay', new THREE.Uniform(p.decay)],
      ['offsetStep', new THREE.Uniform(new THREE.Vector2(p.offsetX, p.offsetY))],
      ['zoomStep', new THREE.Uniform(p.zoom)],
      ['effectMix', new THREE.Uniform(p.mix)],
    ])
    for (let i = 0; i < MAX_COPIES; i++) uniforms.set(`echo${i}`, new THREE.Uniform(null))
    super('SegEchoEffect', fragmentShader, { blendFunction: BlendFunction.NORMAL, uniforms })
    this.delay = p.delay
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    for (const t of this.ring) t.setSize(this.width, this.height)
  }

  private ensureTargets() {
    if (this.ring.length) return
    for (let i = 0; i < MAX_COPIES; i++) {
      this.ring.push(new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
      }))
    }
    this.captureMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: captureFrag, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, segMask: { value: this.seg?.maskTexture ?? null }, hasMask: { value: 0 } },
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.captureMat)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    const hasMask = this.seg?.hasMask ? 1 : 0
    this.uniforms.get('hasMask')!.value = hasMask
    if (!hasMask) return
    this.ensureTargets()
    this.frame++
    if (this.frame % Math.max(1, Math.round(this.delay)) === 0) {
      const mat = this.captureMat!
      mat.uniforms.tInput.value = inputBuffer.texture
      mat.uniforms.hasMask.value = hasMask
      const prev = renderer.getRenderTarget()
      renderer.setRenderTarget(this.ring[this.head])
      renderer.render(this.scene!, this.camera)
      renderer.setRenderTarget(prev)
      this.head = (this.head + 1) % MAX_COPIES
      this.filled = Math.min(MAX_COPIES, this.filled + 1)
    }
    // echo{i} = i-th newest capture
    for (let i = 0; i < MAX_COPIES; i++) {
      const slot = (this.head - 1 - i + MAX_COPIES * 2) % MAX_COPIES
      this.uniforms.get(`echo${i}`)!.value = this.ring[slot].texture
    }
    this.uniforms.get('filled')!.value = this.filled
  }

  updateParams(params: Partial<SegEchoParams>) {
    if (params.copies !== undefined) this.uniforms.get('copies')!.value = Math.round(params.copies)
    if (params.delay !== undefined) this.delay = params.delay
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    const off = this.uniforms.get('offsetStep')!.value as THREE.Vector2
    if (params.offsetX !== undefined) off.x = params.offsetX
    if (params.offsetY !== undefined) off.y = params.offsetY
    if (params.zoom !== undefined) this.uniforms.get('zoomStep')!.value = params.zoom
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  releaseTargets() {
    for (const t of this.ring) t.dispose()
    this.ring = []
    this.captureMat?.dispose(); this.captureMat = null
    this.quad?.geometry.dispose(); this.quad = null
    this.scene = null
    this.head = 0; this.filled = 0; this.frame = 0
    for (let i = 0; i < MAX_COPIES; i++) this.uniforms.get(`echo${i}`)!.value = null
    this.uniforms.get('filled')!.value = 0
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }
}
```

- [ ] **Step 3: Build and lint** — `npm run build && npm run lint` → exit 0.

- [ ] **Step 4: Run the visual check**

`node .superpowers/sdd/seg-verify.mjs visual ECHO4D echo offsetX -0.08 0.08 4.0 none` → PASS.

- [ ] **Step 5: Eyeball with playback**

In a one-off puppeteer run, `window.__segFixture.play()`, enable VOXEL then ECHO4D (in that order), wait 3 s, screenshot. Expect stacked, fading blocky arm copies behind the live arm (compare reference t=4.0–6.0).

- [ ] **Step 6: Commit**

```bash
git add src/effects/glitch-engine/SegEchoEffect.ts
git commit -m "fx: ECHO4D person-only ring-buffer echoes"
```

---

### Task 5: MATTER region materials

**Files:**
- Modify: `src/effects/glitch-engine/SegMatterEffect.ts` (full replacement)

**Interfaces:**
- Consumes: `SEG_MASK_GLSL`, `beatsToSeconds()` (segShared), `NOISE_GLSL` (`hash`), `COLOR_UTILS_GLSL` (`luminance`, `rgb2hsv`, `hsv2rgb`).
- Produces: same public methods as Task 2; `setBpm()` now real.

- [ ] **Step 1: Confirm the visual check fails**

Fresh server: `node .superpowers/sdd/seg-verify.mjs visual MATTER matter seed 1 500 12.0 none`
Expected: FAIL at `effect changes canvas`.

- [ ] **Step 2: Replace `SegMatterEffect.ts`**

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_MATTER_PARAMS, type SegMatterParams } from '../../stores/segStore'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL, beatsToSeconds } from './segShared'

const BLUR_DIV = 8 // blur target = 1/8 canvas resolution

const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D blurTex;
uniform float hasBlur;
uniform vec2 resolution;
uniform float seed;
uniform float coverage;
uniform float w[6]; // black, solid, gradient, zebra, rainbow, mosaic
uniform float uTime;
uniform float effectMix;

float regionId(vec2 uv, vec3 blurred) {
  float c = segClass(uv);
  if (hasMask > 0.5 && c > 0.5) return 100.0 + c;          // person parts
  vec3 hsv = rgb2hsv(blurred);
  float hueBin = hsv.y < 0.15 ? 8.0 : floor(hsv.x * 8.0);   // greys get their own bin
  float lumBin = floor(clamp(hsv.z, 0.0, 0.999) * 4.0);
  return hueBin * 4.0 + lumBin;
}

int pickMaterial(float id) {
  if (hash(vec2(id, seed)) > coverage) return -1;
  float total = w[0] + w[1] + w[2] + w[3] + w[4] + w[5];
  if (total <= 0.0) return -1;
  float r = hash(vec2(seed * 1.37, id + 11.0)) * total;
  float a = 0.0;
  for (int i = 0; i < 6; i++) { a += w[i]; if (r < a) return i; }
  return 5;
}

vec3 material(int m, vec2 uv, vec3 src, vec3 blurred, float id) {
  float lum = luminance(src);
  float blum = luminance(blurred);
  if (m == 0) return vec3(0.0);
  if (m == 1) { vec3 h = rgb2hsv(blurred); return hsv2rgb(vec3(h.x, clamp(h.y * 1.8 + 0.3, 0.0, 1.0), clamp(h.z * 1.2, 0.35, 1.0))); }
  if (m == 2) {
    vec3 a = vec3(0.75, 0.08, 0.05), b = vec3(1.0, 0.5, 0.1), c = vec3(1.0, 0.93, 0.7);
    return mix(mix(a, b, smoothstep(0.0, 0.5, blum)), c, smoothstep(0.5, 1.0, blum));
  }
  if (m == 3) return vec3(step(0.5, fract(lum * 24.0 + uv.y * 6.0)));
  if (m == 4) return hsv2rgb(vec3(fract(lum * 6.0 + uTime * 0.3 + hash(vec2(id, 3.0))), 0.9, 1.0));
  vec2 blk = vec2(20.0) / resolution;
  float g = luminance(texture2D(inputBuffer, (floor(uv / blk) + 0.5) * blk).rgb);
  return vec3(g * 0.9 + 0.05);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasBlur < 0.5) { outputColor = inputColor; return; }
  vec3 blurred = texture2D(blurTex, uv).rgb;
  float id = regionId(uv, blurred);
  int m = pickMaterial(id);
  if (m < 0) { outputColor = inputColor; return; }
  vec3 result = material(m, uv, inputColor.rgb, blurred, id);
  outputColor = vec4(mix(inputColor.rgb, result, effectMix), inputColor.a);
}
`

// 9-tap box blur while downsampling, so region bins follow objects, not texture
const blurFrag = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 srcTexel;
varying vec2 vUv;
void main() {
  vec3 s = vec3(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
    s += texture2D(tInput, vUv + vec2(float(x), float(y)) * srcTexel * ${BLUR_DIV.toFixed(1)}).rgb;
  gl_FragColor = vec4(s / 9.0, 1.0);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export class SegMatterEffect extends Effect {
  private seg: SegmentationService | null = null
  private blurTarget: THREE.WebGLRenderTarget | null = null
  private blurMat: THREE.ShaderMaterial | null = null
  private blurScene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private width = 1920
  private height = 1080
  private bpm = 120
  private baseSeed = DEFAULT_SEG_MATTER_PARAMS.seed
  private autoSeed = 0
  private auto = DEFAULT_SEG_MATTER_PARAMS.autoReshuffle
  private beats = DEFAULT_SEG_MATTER_PARAMS.reshuffleBeats
  private sinceShuffle = 0
  private elapsed = 0

  constructor(params: Partial<SegMatterParams> = {}) {
    const p = { ...DEFAULT_SEG_MATTER_PARAMS, ...params }
    super('SegMatterEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['blurTex', new THREE.Uniform(null)],
        ['hasBlur', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['seed', new THREE.Uniform(p.seed)],
        ['coverage', new THREE.Uniform(p.coverage)],
        ['w', new THREE.Uniform([p.wBlack, p.wSolid, p.wGradient, p.wZebra, p.wRainbow, p.wMosaic])],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.baseSeed = p.seed
    this.auto = p.autoReshuffle
    this.beats = p.reshuffleBeats
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setBpm(bpm: number) { this.bpm = bpm }

  /** Seconds between automatic reshuffles at the current BPM (≥ 0.2 s). */
  reshuffleInterval(): number { return beatsToSeconds(this.beats, this.bpm) }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(this.width, this.height)
    this.blurTarget?.setSize(Math.max(1, Math.round(this.width / BLUR_DIV)), Math.max(1, Math.round(this.height / BLUR_DIV)))
  }

  private ensureTargets() {
    if (this.blurTarget) return
    this.blurTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(this.width / BLUR_DIV)), Math.max(1, Math.round(this.height / BLUR_DIV)),
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat },
    )
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, srcTexel: { value: new THREE.Vector2(1 / this.width, 1 / this.height) } },
    })
    this.blurScene = new THREE.Scene()
    this.blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat))
    this.uniforms.get('blurTex')!.value = this.blurTarget.texture
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.ensureTargets()
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0

    if (this.auto) {
      this.sinceShuffle += deltaTime
      if (this.sinceShuffle >= this.reshuffleInterval()) { this.sinceShuffle = 0; this.autoSeed++ }
    }
    this.uniforms.get('seed')!.value = this.baseSeed + this.autoSeed * 17.0

    const mat = this.blurMat!
    mat.uniforms.tInput.value = inputBuffer.texture
    ;(mat.uniforms.srcTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height)
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(this.blurTarget)
    renderer.render(this.blurScene!, this.camera)
    renderer.setRenderTarget(prev)
    this.uniforms.get('hasBlur')!.value = 1
  }

  updateParams(params: Partial<SegMatterParams>) {
    if (params.seed !== undefined) this.baseSeed = params.seed
    if (params.coverage !== undefined) this.uniforms.get('coverage')!.value = params.coverage
    if (params.autoReshuffle !== undefined) this.auto = params.autoReshuffle
    if (params.reshuffleBeats !== undefined) this.beats = params.reshuffleBeats
    const w = this.uniforms.get('w')!.value as number[]
    if (params.wBlack !== undefined) w[0] = params.wBlack
    if (params.wSolid !== undefined) w[1] = params.wSolid
    if (params.wGradient !== undefined) w[2] = params.wGradient
    if (params.wZebra !== undefined) w[3] = params.wZebra
    if (params.wRainbow !== undefined) w[4] = params.wRainbow
    if (params.wMosaic !== undefined) w[5] = params.wMosaic
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  dispose() {
    this.blurTarget?.dispose()
    this.blurMat?.dispose()
    super.dispose()
  }
}
```

- [ ] **Step 3: Build and lint** — exit 0.

- [ ] **Step 4: Run the visual check**

`node .superpowers/sdd/seg-verify.mjs visual MATTER matter seed 1 500 12.0 none` → PASS (`seed` change reassigns materials, so low ≠ high).

- [ ] **Step 5: Eyeball**

Compare `shots/seg-MATTER-on.png` with reference t=12.0: whole regions (bowls, counter) swapped for rainbow bands, zebra, black, red/orange flats; hard region edges.

- [ ] **Step 6: No-person frame still works on colour regions (Review Focus 1)**

`node .superpowers/sdd/seg-verify.mjs visual MATTER matter coverage 0.1 0.9 7.0 none` → PASS (no person at 7.0; colour regions alone must still change the frame).

- [ ] **Step 7: BPM extremes (Review Focus 4)**

One-off puppeteer evaluate after enabling MATTER:
```js
const seqM = await import('/src/stores/sequencerStore.ts')
seqM.useSequencerStore.getState().setBpm(300)
const pipeOk = (await import('/src/effects/glitch-engine/segShared.ts')).beatsToSeconds(1, 300) >= 0.2
```
Assert `pipeOk === true` and `beatsToSeconds(1, 0) === 0.5` (0 BPM falls back to 120 → 0.5 s). Also check `beatsToSeconds(32, 20) === 96`.

- [ ] **Step 8: Commit**

```bash
git add src/effects/glitch-engine/SegMatterEffect.ts
git commit -m "fx: MATTER region material swap with beat reshuffle"
```

---

### Task 6: STALE conditional-refresh patches

**Files:**
- Modify: `src/effects/glitch-engine/SegStaleEffect.ts` (full replacement)

**Interfaces:**
- Consumes: `NOISE_GLSL` (`hash`, `fbm`), `COLOR_UTILS_GLSL` (`luminance`), `beatsToSeconds()`.
- Produces: same public methods as Task 2; `setBpm()` and `releaseTargets()` real.

- [ ] **Step 1: Confirm the visual check fails**

STALE needs motion to show, so the visual check for it plays the fixture. Add this mode to `seg-verify.mjs` (inside the file, before `say('no console errors', …)`):

```js
if (MODE === 'motion') {
  const [LABEL, KEY, PARAM, LOW, HIGH, SEEK] = ARGS
  await loadFixture(Number(SEEK))
  say('DESTROY tab', await click('DESTROY'))
  say('enable click', await click(LABEL))
  await seg(`s.update${cap(KEY)}Params({ ${PARAM}: Number(arg) })`, LOW)
  await p.evaluate(() => window.__segFixture.play())
  await new Promise((r) => setTimeout(r, 1500))
  await p.evaluate(() => window.__segFixture.pause())
  await new Promise((r) => setTimeout(r, 300))
  const withFx = await shot(`${LABEL}-motion-on`)
  await seg(`s.set${cap(KEY)}Enabled(false)`)
  await new Promise((r) => setTimeout(r, 500))
  const live = await shot(`${LABEL}-motion-live`)
  say('held patches differ from live frame after motion', diff(withFx, live) > 2)
  await seg(`s.set${cap(KEY)}Enabled(true)`)
  await seg(`s.update${cap(KEY)}Params({ ${PARAM}: Number(arg) })`, HIGH)
  await new Promise((r) => setTimeout(r, 800))
  const high = await shot(`${LABEL}-motion-high`)
  say(`param ${PARAM} changes visuals`, diff(high, withFx) > 1)
}
```

Fresh server: `node .superpowers/sdd/seg-verify.mjs motion STALE stale threshold 0.9 0.0 6.0`
Expected: FAIL at `held patches differ…`.

- [ ] **Step 2: Replace `SegStaleEffect.ts`**

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_STALE_PARAMS, type SegStaleParams } from '../../stores/segStore'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'
import { beatsToSeconds } from './segShared'

// Output samples the freshly written held buffer.
const fragmentShader = /* glsl */ `
uniform sampler2D heldTex;
uniform float hasHeld;
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasHeld < 0.5) { outputColor = inputColor; return; }
  vec3 h = texture2D(heldTex, uv).rgb;
  outputColor = vec4(mix(inputColor.rgb, h, effectMix), inputColor.a);
}
`

// held' = per ragged cell: refresh from input if changed enough (or by chance), else keep held
const stepFrag = NOISE_GLSL + COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D tInput;
uniform sampler2D tHeld;
uniform float first;
uniform vec2 resolution;
uniform float cellPx;
uniform float threshold;
uniform float refresh;
uniform float burst;
uniform float rag;
uniform float frameNo;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 live = texture2D(tInput, vUv);
  if (first > 0.5) { gl_FragColor = live; return; }
  float size = cellPx * (1.0 + burst * 3.0);
  vec2 px = vUv * resolution;
  vec2 warp = (vec2(fbm(px / (size * 2.0) + uTime * 0.05), fbm(px / (size * 2.0) + 17.0)) - 0.5) * 2.0 * rag;
  vec2 cell = floor(px / size + warp);
  vec2 c0 = (cell + 0.5) * size / resolution;
  vec2 o = vec2(size * 0.3) / resolution;
  float d = 0.0;
  d += abs(luminance(texture2D(tInput, c0).rgb) - luminance(texture2D(tHeld, c0).rgb));
  d += abs(luminance(texture2D(tInput, c0 + o).rgb) - luminance(texture2D(tHeld, c0 + o).rgb));
  d += abs(luminance(texture2D(tInput, c0 - o).rgb) - luminance(texture2D(tHeld, c0 - o).rgb));
  d += abs(luminance(texture2D(tInput, c0 + vec2(o.x, -o.y)).rgb) - luminance(texture2D(tHeld, c0 + vec2(o.x, -o.y)).rgb));
  d *= 0.25;
  float thr = threshold * (1.0 + burst * 8.0);
  float chance = refresh * (1.0 - burst);
  bool update = d > thr || hash(cell + frameNo * 0.618) < chance;
  gl_FragColor = update ? live : texture2D(tHeld, vUv);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const BURST_DECAY_S = 0.5

export class SegStaleEffect extends Effect {
  private a: THREE.WebGLRenderTarget | null = null
  private b: THREE.WebGLRenderTarget | null = null
  private stepMat: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private width = 1920
  private height = 1080
  private first = true
  private frame = 0
  private elapsed = 0
  private bpm = 120
  private params: SegStaleParams
  private sinceBurst = 0
  private autoPulse = 0

  constructor(params: Partial<SegStaleParams> = {}) {
    const p = { ...DEFAULT_SEG_STALE_PARAMS, ...params }
    super('SegStaleEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['heldTex', new THREE.Uniform(null)],
        ['hasHeld', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.params = p
  }

  setBpm(bpm: number) { this.bpm = bpm }
  burstInterval(): number { return beatsToSeconds(this.params.burstBeats, this.bpm) }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    this.a?.setSize(this.width, this.height)
    this.b?.setSize(this.width, this.height)
    this.first = true
  }

  private ensureTargets() {
    if (this.a) return
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    this.a = new THREE.WebGLRenderTarget(this.width, this.height, opts)
    this.b = new THREE.WebGLRenderTarget(this.width, this.height, opts)
    this.stepMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: stepFrag, depthTest: false, depthWrite: false,
      uniforms: {
        tInput: { value: null }, tHeld: { value: null }, first: { value: 1 },
        resolution: { value: new THREE.Vector2() }, cellPx: { value: 28 }, threshold: { value: 0.12 },
        refresh: { value: 0.04 }, burst: { value: 0 }, rag: { value: 0.5 }, frameNo: { value: 0 }, uTime: { value: 0 },
      },
    })
    this.scene = new THREE.Scene()
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.stepMat))
    this.first = true
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.ensureTargets()
    this.elapsed += deltaTime
    this.frame++
    const p = this.params
    if (p.autoBurst) {
      this.sinceBurst += deltaTime
      if (this.sinceBurst >= this.burstInterval()) { this.sinceBurst = 0; this.autoPulse = 1 }
    }
    this.autoPulse = Math.max(0, this.autoPulse - deltaTime / BURST_DECAY_S)
    const burst = Math.min(1, Math.max(p.burst, this.autoPulse))

    const u = this.stepMat!.uniforms
    u.tInput.value = inputBuffer.texture
    u.tHeld.value = this.a!.texture
    u.first.value = this.first ? 1 : 0
    ;(u.resolution.value as THREE.Vector2).set(this.width, this.height)
    u.cellPx.value = p.cellSize
    u.threshold.value = p.threshold
    u.refresh.value = p.refresh
    u.burst.value = burst
    u.rag.value = p.raggedness
    u.frameNo.value = this.frame % 9973
    u.uTime.value = this.elapsed

    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(this.b)
    renderer.render(this.scene!, this.camera)
    renderer.setRenderTarget(prev)
    const tmp = this.a; this.a = this.b; this.b = tmp
    this.first = false
    this.uniforms.get('heldTex')!.value = this.a!.texture
    this.uniforms.get('hasHeld')!.value = 1
  }

  updateParams(params: Partial<SegStaleParams>) {
    this.params = { ...this.params, ...params }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  releaseTargets() {
    this.a?.dispose(); this.a = null
    this.b?.dispose(); this.b = null
    this.stepMat?.dispose(); this.stepMat = null
    this.scene = null
    this.first = true
    this.uniforms.get('heldTex')!.value = null
    this.uniforms.get('hasHeld')!.value = 0
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }
}
```

- [ ] **Step 3: Build and lint** — exit 0.

- [ ] **Step 4: Run the motion check**

`node .superpowers/sdd/seg-verify.mjs motion STALE stale threshold 0.9 0.0 6.0` → PASS. (threshold 0.9 holds almost everything while the camera moves; 0.0 refreshes everything.)

- [ ] **Step 5: Burst + eyeball**

`node .superpowers/sdd/seg-verify.mjs motion STALE stale burst 0 1 9.5` → PASS. Compare `shots/seg-STALE-motion-on.png` with reference t=7.0: ragged torn patches holding older content.

- [ ] **Step 6: BPM extremes (Review Focus 4)**

One-off evaluate: enable STALE, `updateStaleParams({ autoBurst: true, burstBeats: 1 })`, `setBpm(300)`; run for 2 s and count bursts via a temporary `console.debug('[STALE] burst')` added inside the `autoPulse = 1` branch. Expect ≤ 11 bursts in 2 s (interval ≥ 0.2 s). Remove the debug line before committing.

- [ ] **Step 7: Commit**

```bash
git add src/effects/glitch-engine/SegStaleEffect.ts
git commit -m "fx: STALE ragged conditional-refresh patches with beat burst"
```

---

### Task 7: TORN border

**Files:**
- Modify: `src/effects/glitch-engine/SegTornEffect.ts` (full replacement)

**Interfaces:**
- Consumes: `NOISE_GLSL` (`hash`, `valueNoise`).
- Produces: same public methods as Task 2.

- [ ] **Step 1: Confirm the visual check fails**

Fresh server: `node .superpowers/sdd/seg-verify.mjs visual TORN torn depth 0.01 0.18 3.0 none`
Expected: FAIL at `effect changes canvas`.

- [ ] **Step 2: Replace `SegTornEffect.ts`**

```ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_TORN_PARAMS, type SegTornParams } from '../../stores/segStore'
import { NOISE_GLSL } from './glsl-utils'

const fragmentShader = NOISE_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float depth;
uniform float blockPx;
uniform float speed;
uniform float fillMode;
uniform float uTime;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 blk = floor(px / blockPx);
  vec2 bc = (blk + 0.5) * blockPx;   // decide per block → blocky bites
  float shortSide = min(resolution.x, resolution.y);
  float edgeDist = min(min(bc.x, resolution.x - bc.x), min(bc.y, resolution.y - bc.y)) / shortSide;
  float t = floor(uTime * speed * 8.0);
  float n = hash(blk + t * 0.37);
  float slow = valueNoise(blk * 0.15 + t * 0.05);
  float bite = depth * (0.3 + 0.7 * n) * (0.5 + 0.5 * slow);
  if (edgeDist >= bite) { outputColor = inputColor; return; }
  vec3 fill = vec3(0.0);
  if (fillMode > 0.5) {
    vec2 toCenter = normalize(vec2(0.5) - uv + 1e-5);
    fill = texture2D(inputBuffer, clamp(uv + toCenter * bite * 1.5, 0.0, 1.0)).rgb;
  }
  outputColor = vec4(mix(inputColor.rgb, fill, effectMix), inputColor.a);
}
`

export class SegTornEffect extends Effect {
  private elapsed = 0

  constructor(params: Partial<SegTornParams> = {}) {
    const p = { ...DEFAULT_SEG_TORN_PARAMS, ...params }
    super('SegTornEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['depth', new THREE.Uniform(p.depth)],
        ['blockPx', new THREE.Uniform(p.blockSize)],
        ['speed', new THREE.Uniform(p.speed)],
        ['fillMode', new THREE.Uniform(p.fill)],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(w: number, h: number) {
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h))
  }

  update(_r: THREE.WebGLRenderer, _i: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
  }

  updateParams(params: Partial<SegTornParams>) {
    if (params.depth !== undefined) this.uniforms.get('depth')!.value = params.depth
    if (params.blockSize !== undefined) this.uniforms.get('blockPx')!.value = Math.max(1, params.blockSize)
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.fill !== undefined) this.uniforms.get('fillMode')!.value = params.fill
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

- [ ] **Step 3: Build and lint** — exit 0.
- [ ] **Step 4: Run the visual check** — `node .superpowers/sdd/seg-verify.mjs visual TORN torn depth 0.01 0.18 3.0 none` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/effects/glitch-engine/SegTornEffect.ts
git commit -m "fx: TORN ragged frame border"
```

---

### Task 8: SEG_EXP factory preset

**Files:**
- Modify: `src/stores/presetLibraryStore.ts`
- Create: `src/presets/segExp.ts`

**Interfaces:**
- Consumes: `captureCurrentEffects()` (presetLibraryStore, exported in Task 2), `defaultEffectOrder` (routingStore), preset DB helpers `getAllFromStore` / `putInStore` and stores `PRESETS_STORE`, `FOLDERS_STORE`, `METADATA_STORE` (keyPath `key`) — all existing in presetLibraryStore; `Preset`, `Folder`, `BankSnapshot` types.
- Produces: `buildSegExpPreset(now: number, base: BankSnapshot): Preset`, `FACTORY_FOLDER_ID`, `SEG_EXP_PRESET_ID`, `SEG_EXP_SEEDED_KEY`.

- [ ] **Step 1: Write the failing check**

Append a `preset` mode to `.superpowers/sdd/seg-verify.mjs` (before the final `say('no console errors'…)`). The library DB is `segf4ult-presets` (`presetLibraryStore.ts:13`):

```js
if (MODE === 'preset') {
  // wipe the library DB to simulate a first run
  await p.evaluate(() => new Promise((res) => {
    const r = indexedDB.deleteDatabase('segf4ult-presets'); r.onsuccess = r.onerror = r.onblocked = res }))
  await p.reload({ waitUntil: 'networkidle2' }); await new Promise((r) => setTimeout(r, 1500))
  const lib = () => p.evaluate(async () => {
    const m = await import('/src/stores/presetLibraryStore.ts')
    await m.usePresetLibraryStore.getState().loadFromDB()
    const s = m.usePresetLibraryStore.getState()
    return { ids: s.presets.map((x) => x.id), folders: s.folders.map((f) => f.id) }
  })
  const first = await lib()
  say('factory preset seeded', first.ids.includes('factory_seg_exp') && first.folders.includes('folder_factory'))
  await p.evaluate(async () => {
    const m = await import('/src/stores/presetLibraryStore.ts')
    await m.usePresetLibraryStore.getState().deletePreset('factory_seg_exp')
  })
  const second = await lib()
  say('deleted factory preset stays deleted', !second.ids.includes('factory_seg_exp'))
}
```

(`deletePreset` exists at `presetLibraryStore.ts:372`.)

Fresh server: `node .superpowers/sdd/seg-verify.mjs preset` → Expected: FAIL at `factory preset seeded`.

- [ ] **Step 2: Create `src/presets/segExp.ts`**

```ts
import type { Preset } from '../stores/presetLibraryStore'
import type { BankSnapshot } from '../stores/bankStore'
import {
  DEFAULT_SEG_VOXEL_PARAMS, DEFAULT_SEG_ECHO_PARAMS, DEFAULT_SEG_MATTER_PARAMS,
  DEFAULT_SEG_STALE_PARAMS, DEFAULT_SEG_TORN_PARAMS,
} from '../stores/segStore'
import { defaultEffectOrder } from '../stores/routingStore'

export const FACTORY_FOLDER_ID = 'folder_factory'
export const SEG_EXP_PRESET_ID = 'factory_seg_exp'
export const SEG_EXP_SEEDED_KEY = 'factory_seg_exp_seeded'

const SEG_EXP_CHAIN = ['seg_stale', 'seg_matter', 'seg_voxel', 'seg_echo', 'seg_torn']

/**
 * The reference reel's look: torn stale background, swapped object
 * materials, cube-mosaic person with echoes, ragged border. Built from a
 * capture of the current state (passed in by presetLibraryStore, which
 * avoids a circular import) with every other effect switched off, so the
 * snapshot shape always matches the running app's BankSnapshot.
 */
export function buildSegExpPreset(now: number, base: BankSnapshot): Preset {
  const effects = structuredClone(base)

  // Turn off every *Enabled flag in every store section, then enable ours
  for (const section of Object.values(effects) as unknown[]) {
    if (section && typeof section === 'object') {
      for (const k of Object.keys(section as Record<string, unknown>)) {
        // sections use both `fooEnabled` and plain `enabled` (contour, landmarks, stipple…)
        if ((k === 'enabled' || k.endsWith('Enabled')) && typeof (section as Record<string, unknown>)[k] === 'boolean') {
          (section as Record<string, unknown>)[k] = false
        }
      }
    }
  }
  effects.seg = {
    voxelEnabled: true, echoEnabled: true, matterEnabled: true, staleEnabled: true, tornEnabled: true,
    voxelParams: { ...DEFAULT_SEG_VOXEL_PARAMS, size: 14, depth: 2.2, scatter: 0.5, shading: 0.7 },
    echoParams: { ...DEFAULT_SEG_ECHO_PARAMS, copies: 4, delay: 3, decay: 0.7, offsetX: 0.025, offsetY: -0.01 },
    matterParams: { ...DEFAULT_SEG_MATTER_PARAMS, coverage: 0.4, autoReshuffle: true, reshuffleBeats: 4 },
    staleParams: { ...DEFAULT_SEG_STALE_PARAMS, cellSize: 32, threshold: 0.18, refresh: 0.03, autoBurst: true, burstBeats: 8 },
    tornParams: { ...DEFAULT_SEG_TORN_PARAMS, depth: 0.035, blockSize: 18 },
  }
  // Our chain first in order, everything else after (effectOrder is top-level on BankSnapshot)
  effects.effectOrder = [...SEG_EXP_CHAIN, ...defaultEffectOrder.filter((id) => !SEG_EXP_CHAIN.includes(id))]

  return {
    id: SEG_EXP_PRESET_ID,
    name: 'SEG_EXP',
    folderId: FACTORY_FOLDER_ID,
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
    effects,
  }
}
```

- [ ] **Step 3: Seed in `loadFromDB`**

In `src/stores/presetLibraryStore.ts`, import `{ buildSegExpPreset, FACTORY_FOLDER_ID, SEG_EXP_SEEDED_KEY }` from `'../presets/segExp'`, and inside `loadFromDB` after the default-folder block and before `set({...})`:

```ts
// Factory presets: seed once. The "seeded" marker lives in the metadata
// store (keyPath 'key'), so a user-deleted factory preset stays deleted.
let finalPresets = presets
const meta = await getAllFromStore<{ key: string; value: unknown }>(METADATA_STORE)
if (!meta.some((m) => m.key === SEG_EXP_SEEDED_KEY)) {
  if (!finalFolders.some((f) => f.id === FACTORY_FOLDER_ID)) {
    const factory: Folder = { id: FACTORY_FOLDER_ID, name: 'Factory', parentId: null, order: 3 }
    await putInStore(FOLDERS_STORE, factory)
    finalFolders = [...finalFolders, factory]
  }
  const preset = buildSegExpPreset(Date.now(), captureCurrentEffects())
  await putInStore(PRESETS_STORE, preset)
  finalPresets = [...presets, preset]
  await putInStore(METADATA_STORE, { key: SEG_EXP_SEEDED_KEY, value: true })
}
```

Then use `finalPresets` instead of `presets` in the `set({...})` call.

- [ ] **Step 4: Build, lint, run the check**

`npm run build && npm run lint` → exit 0. Fresh server: `node .superpowers/sdd/seg-verify.mjs preset` → PASS.

- [ ] **Step 5: Load the preset end to end**

In the UI (or a one-off puppeteer run), load the reference clip, open Presets → Factory → SEG_EXP. Expect all five SEG cards in order STALE, MATTER, VOXEL, ECHO4D, TORN and nothing else enabled. Save a screenshot at t≈1.75 next to the reference frame.

- [ ] **Step 6: Commit**

```bash
git add src/presets/segExp.ts src/stores/presetLibraryStore.ts
git commit -m "fx: SEG_EXP factory preset seeded once into the library"
```

---

### Task 9: Lifecycle, failure path, performance, docs

**Files:**
- Modify: `.superpowers/sdd/seg-verify.mjs` (add `lifecycle`, `offline`, `perf` modes)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the three modes**

Append before the final `say('no console errors'…)`:

```js
if (MODE === 'lifecycle') {
  await loadFixture(0.5)
  say('DESTROY tab', await click('DESTROY'))
  for (let i = 0; i < 10; i++) {
    await seg(`s.setVoxelEnabled(true); s.setEchoEnabled(true); s.setStaleEnabled(true)`)
    await new Promise((r) => setTimeout(r, 400))
    await seg(`s.setVoxelEnabled(false); s.setEchoEnabled(false); s.setStaleEnabled(false)`)
    await new Promise((r) => setTimeout(r, 400))
  }
  const info = await p.evaluate(() => {
    const gl = document.querySelector('[data-video-canvas-container] canvas')?.getContext('webgl2')
    return { ok: !!gl }
  })
  say('webgl context alive after 10 toggles', info.ok)
  // Status bar must be back to Ready (service went idle, nothing stuck "loading")
  say('status idle', await p.evaluate(async () => (await import('/src/stores/uiStore.ts')).useUIStore.getState().statusText == null))
}

if (MODE === 'offline') {
  await p.setRequestInterception(true)
  p.on('request', (r) => (r.url().includes('selfie_multiclass') ? r.abort() : r.continue()))
  await loadFixture(12.0)
  say('DESTROY tab', await click('DESTROY'))
  say('enable MATTER', await click('MATTER'))
  say('enable VOXEL', await click('VOXEL'))
  await new Promise((r) => setTimeout(r, 6000))
  say('status shows unavailable', await p.evaluate(async () =>
    (await import('/src/stores/uiStore.ts')).useUIStore.getState().statusText === 'SEG: person mask unavailable'))
  const base = await shot('offline-on')
  await seg(`s.setMatterEnabled(false)`); await new Promise((r) => setTimeout(r, 600))
  const noMatter = await shot('offline-nomatter')
  say('MATTER still renders on colour regions', diff(base, noMatter) > 2)
  // the model abort is expected; drop it from the error list
  for (let i = errors.length - 1; i >= 0; i--) if (/selfie_multiclass|person model|Failed to fetch|net::ERR/.test(errors[i])) errors.splice(i, 1)
}

if (MODE === 'perf') {
  await loadFixture(0.0)
  await p.evaluate(async () => {
    const m = await import('/src/stores/presetLibraryStore.ts')
    const st = m.usePresetLibraryStore.getState()
    await st.loadFromDB()
    st.loadPreset('factory_seg_exp')
    window.__segFixture.play()
  })
  await new Promise((r) => setTimeout(r, 4000))
  const fps = await p.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now()
    const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(n / 5) }
    requestAnimationFrame(f)
  }))
  console.log('fps', fps)
  say('SEG_EXP holds >= 30 fps', fps >= 30)
}
```

(`loadPreset(id)` is synchronous, `presetLibraryStore.ts:365`.)

- [ ] **Step 2: Run lifecycle (Review Focus 3)** — fresh server: `node .superpowers/sdd/seg-verify.mjs lifecycle` → PASS.
- [ ] **Step 3: Run offline** — fresh server: `node .superpowers/sdd/seg-verify.mjs offline` → PASS.
- [ ] **Step 4: Run perf** — fresh server, **headed** for a real GPU: change `headless: 'new'` to `headless: false` for this run only, `node .superpowers/sdd/seg-verify.mjs perf` → PASS (≥ 30 fps). If it fails, profile with the status bar frame time, then lower costs in this order: VOXEL neighbourhood 5×5 → 3×3 when `scatter < 0.3`; MATTER `BLUR_DIV` 8 → 12; segmentation `TICK_MS` 33 → 50. Re-run after each change and record the fps.
- [ ] **Step 5: Re-run every earlier check on the final branch**

Fresh server before each: `wiring`, `visual VOXEL voxel size 6 48 0.5 l`, `visual ECHO4D echo offsetX -0.08 0.08 4.0 none`, `visual MATTER matter seed 1 500 12.0 none`, `motion STALE stale threshold 0.9 0.0 6.0`, `visual TORN torn depth 0.01 0.18 3.0 none`, `preset`. All PASS.

- [ ] **Step 6: Update CLAUDE.md**

In `CLAUDE.md` under "Adding New Effect Pages/Effects", add after section 10:

```markdown
### 11. Param Registry (`src/config/effectParams.ts`)
- Add an `EFFECT_PARAM_REGISTRY` entry (getParams, optional getSelectParams, setEnabled, getEnabled).
  The Expanded Parameter Panel and param locks are driven from this registry.

### 12. Continuous Modulation (`src/hooks/useContinuousModulation.ts`)
- Add a `case '<effectId>'` mapping 0–1 modulation values onto each param's real range.

### Presets/banks
- New stores need a `<store>?: Snapshot` key on `BankSnapshot` (`src/stores/bankStore.ts`) plus
  capture/apply lines in both `bankStore.ts` and `presetLibraryStore.ts`; `applySnapshot(undefined)`
  must reset to defaults so older banks load cleanly.

Note: `routingStore.defaultEffectOrder` is derived from the effect arrays automatically.
```

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document param-registry, modulation and snapshot wiring points"
```

---

## Self-Review Notes

- **Spec coverage:** service (T1), store + wiring + bank snapshot back-compat (T2), VOXEL incl. debug mask view + depth scaling + scatter (T3), ECHO4D (T4), MATTER incl. person classes + colour regions + 7 materials + coverage + reshuffle + weights (T5), STALE incl. burst + beat sync (T6), TORN (T7), factory preset seeded once in Factory folder (T8), testing items 1–6 (T3–T9), failure path (T9 offline), performance (T9 perf). Spec refinements 1–5 listed at the top.
- **Placeholders:** none; every existing name the plan relies on (`captureCurrentEffects`/`applyEffects`, `saveBank`/`loadBank`, DB name `segf4ult-presets`, `METADATA_STORE`, `deletePreset`, `loadPreset`, top-level `effectOrder`) was confirmed against the code while planning.
- **Type consistency:** store names `voxel/echo/matter/stale/torn` + `set<X>Enabled` / `update<X>Params` used identically in segStore, PerformanceGrid, hooks, registry, modulation, harness. Pipeline fields `segVoxel…segTorn`, `segmentation`. Effect ids `seg_*` match config, Canvas, pipeline, harness.
