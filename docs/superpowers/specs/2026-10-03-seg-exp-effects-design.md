# SEG_EXP Effects — Design

**Date:** 2026-10-03
**Status:** Approved in conversation; awaiting written-spec review

## Goal

Recreate, live in SEG_F4ULT on a webcam or video source, the layered glitch look of a
reference reel (a person cooking, run through subject-targeted glitch layers). The
look must be reproducible as one preset **and** each layer must work as an
independent, sequenceable effect. Real-time in the browser, like the rest of the app.

The reference clip lives only on the developer's machine at
`.superpowers/sdd/fixtures/seg-exp-28-reference.mp4` (gitignored). It is never
committed.

## Reference analysis (what we are reproducing)

| Layer | Observed | Effect |
|---|---|---|
| A | Only the person becomes square blocks shaded like isometric cubes; blocks grow when the person is close; edge blocks detach and float away | VOXEL |
| B | Several delayed copies of the blocky arm stacked over the live image | ECHO4D |
| C | Whole objects swapped for materials: rainbow interference bands, black/white zebra, solid black, solid red, smooth warm gradient, grey mosaic — hard cutout edges | MATTER |
| D | Background torn into irregular patches that hold old frames as the camera moves; occasional full-frame shatter | STALE |
| E | Ragged, bitten-in frame border | TORN |

## Decisions

- **Person mask:** MediaPipe `selfie_multiclass_256x256` (classes: background, hair,
  body-skin, face-skin, clothes, others). One model serves both the person mask
  (= not background) and the per-class person regions for MATTER.
- **Object regions:** person classes from the model **plus** GPU colour regions for
  the rest of the scene.
- **Packaging:** five separate effects in DESTROY reserved slots 10–14, plus a
  `SEG_EXP` factory preset.

## 1. Architecture

### SegmentationService (`src/effects/vision/SegmentationService.ts`)

- Loads `@mediapipe/tasks-vision` `ImageSegmenter` with the multiclass model via
  `FilesetResolver.forVisionTasks` + `delegate: 'GPU'`, same CDN pattern as
  `src/hooks/useLandmarkDetection.ts`. Output: category mask only.
- **Ref-counted and lazy:** effects call `acquire()` / `release()`. The model loads on
  the first acquire and the segmenter is closed when the count reaches zero.
- **Own throttled loop:** runs `segmentForVideo` on the current source element at up
  to 30 fps on its own timer. It runs on the main thread between frames; it does not
  block a render in progress, but a long tick delays the next frame. Mitigations:
  unchanged video frames are skipped, the mask is read back one tick after submit
  (GPU work flushed first, so the readback doesn't stall), and the interval backs
  off to 66 ms while ticks take > 8 ms.
  A Worker + OffscreenCanvas port is a follow-up.
- **Output:** a 256×256 `THREE.DataTexture` (R8, nearest filtering) holding class IDs,
  re-uploaded per inference; plus a smoothed scalar `personCoverage` (fraction of
  non-background pixels, exponential smoothing) for VOXEL's depth scaling.
- **Aspect mapping:** exposes a `uvTransform` (vec4 scale/offset) mapping canvas UV →
  source-video UV for the app's cover/contain fit. Every consumer samples the mask
  through it.
- **Failure:** on load failure or unsupported source, sets a status message visible
  in the status bar, and the mask texture stays all-background. Consumers degrade:
  VOXEL/ECHO4D become pass-through, MATTER uses colour regions only. No throws reach
  the render loop.
- **Ownership:** `EffectPipeline` owns the single instance and hands it to the
  effects that need it; `dispose()` closes it.

### State and wiring

- New `src/stores/segStore.ts` following the `motionStore` / `destructionStore`
  pattern: `<effect>Enabled`, `<effect>Params`, setters, `getSnapshot()`.
- Each effect is wired into **all 10 locations** in `CLAUDE.md` ("Adding New Effect
  Pages/Effects"): effects config (replace `destruction_reserved_10..14`), uiStore
  (no page-count change — DESTROY already exists), PerformanceGrid, useActiveEffects,
  useEffectDisable, CompactEffectParams, Canvas.tsx structural effect + paramSync,
  EffectPipeline, ExpandedParameterPanel, routingStore `defaultEffectOrder`.
- `BankSnapshot` (`src/stores/bankStore.ts`) gains a `seg` section so presets and
  banks capture the new effects. Loading an older snapshot without `seg` leaves the
  effects disabled at defaults.
- STALE and ECHO4D are temporal: they register in `EffectPipeline.render()`'s
  `captureFrame` list and implement `releaseTargets()` like `TimeSmearEffect`.

## 2. Effects

Compact-card knobs in **bold** (2–3 per effect).

### VOXEL (`seg_voxel`) — person as shaded cubes

- Inside the person mask, quantise the frame into square cells; each cell takes its
  average colour (sampled at cell centre from a downsampled copy).
- Isometric cube shading per cell from the fragment's position inside the cell:
  lighter top face, darker side face, thin dark outline. Strength param.
- Cell size = **size** × (1 + **depth** × `personCoverage`), so close-ups get huge
  blocks.
- **Scatter:** cells whose neighbourhood straddles the mask edge are displaced
  outward along the mask gradient, with per-cell hash rotation and slow drift.
- Params: size (4–64 px), depth (0–4), scatter (0–1), shading (0–1),
  classes (`person` | `skin` | `hair` | `clothes`), mix.
- Outside the mask: original pixels untouched.

### ECHO4D (`seg_echo`) — delayed copies of the person

- Every **delay** frames, capture the current output cut to the person mask
  (alpha = mask) into a ring buffer of up to 8 RGBA targets.
- Composite older copies *under* the live frame: per-copy **decay**, optional
  per-copy offset (x/y) and zoom.
- Params: copies (1–8), delay (1–12 frames), decay (0–1), offset, zoom, mix.
- Placed after VOXEL in the chain, it echoes the cubes.

### MATTER (`seg_matter`) — materials swapped onto objects

- **Region ID** per pixel:
  - Person classes from the mask → IDs 1–5.
  - Elsewhere: blur the frame at quarter resolution, bin by hue (8) × luma (4) →
    colour-region IDs.
- Each region ID hashes (with a **seed**) to one of 7 materials:
  `none`, `black`, `solid` (colour picked from the frame's own palette via the
  region's mean colour, saturated), `gradient` (smooth red→orange→pale-yellow ramp on
  luma), `zebra` (high-frequency black/white stripes on luma), `rainbow` (cycling
  hue bands on luma + time), `mosaic` (grey low-res blocks).
- **Coverage** (0–1): fraction of regions that get a non-`none` material.
- **Reshuffle:** new seed every N beats (BPM from `sequencerStore`) or seconds, plus
  a manual trigger param the sequencer can fire.
- Material weights are params so the user can bias towards e.g. rainbow.

### STALE (`seg_stale`) — torn, frozen background patches

- Irregular cells: a grid warped by low-frequency noise → ragged-edged cells.
- Holds a previous-output buffer. Per cell, update to the live frame only when the
  mean difference exceeds **threshold** or by random refresh chance; otherwise keep
  the old pixels.
- **Burst** (0–1, momentary-friendly): drives refresh probability towards zero and
  cell size up for a full-frame shatter.
- Params: cell size, threshold, refresh rate, burst, edge raggedness, mix.

### TORN (`seg_torn`) — ragged frame border

- Blocky animated noise erodes inward from all four edges by **depth**; eroded area
  filled with black or with a held stale frame.
- Params: depth (0–0.2 of frame), block size, speed, fill (`black` | `stale`).

### SEG_EXP factory preset

- Chain order: STALE → MATTER → VOXEL → ECHO4D → TORN.
- Burst and reshuffle are beat-synced through each effect's own BPM-synced auto
  parameter, so the preset does not depend on sequencer-pattern state.
- Seeded into the preset library on `loadFromDB` with a fixed id
  (`factory_seg_exp`) in a "Factory" folder, only if never seeded before (a seeded
  marker is stored in the same IndexedDB), so deleting it is respected.

## 3. Testing and verification

The repo has no unit-test runner; verification follows the existing approach.

1. **Per effect:** `npm run build` (includes `tsc`) and `npm run lint` clean. Load the
   reference clip as the video source, enable the effect, capture puppeteer
   `page.screenshot()` at fixed times and compare against the reference:
   0:00.5 / 0:01.75 (VOXEL), 0:04 (ECHO4D), 0:12 (MATTER), 0:07 (STALE).
2. **Mask alignment:** VOXEL's debug view tints the raw mask; capture at two canvas
   sizes and confirm the tint sits on the person in both.
3. **Lifecycle:** toggle each effect on/off 10×; confirm the segmenter closes when the
   last consumer releases and render targets are freed (`releaseTargets`).
4. **Failure path:** block the model URL; status-bar message appears, no crash, MATTER
   still runs on colour regions.
5. **Performance:** full SEG_EXP preset holds ≥ 30 fps with the reference clip playing
   (status-bar frame-time readout).
6. **Wiring checklist:** for each effect — appears on the grid, appears as a card,
   remove works, compact and full controls change uniforms, present in preset order,
   survives a bank save/load.

Puppeteer gotchas from past work apply: restart the dev server before store-driven
tests; use real mouse input at element centres; use `page.screenshot()` for WebGL.

## Out of scope

- True object segmentation (SAM-style) — colour regions stand in for it.
- Depth estimation — `personCoverage` stands in for proximity.
- Mobile app (`segfault-mobile`) port.
