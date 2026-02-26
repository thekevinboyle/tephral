# Audio-Reactive Clip Sequencer Redesign

## Problem

The current clip sequencer is functional but feels like a basic video editor — small colored blocks, hard cuts between clips, no visual feedback during performance. For live VJ-style performance, clips need audio-reactive transitions, visual thumbnails, and controls that support improvisation without looking away from the output.

## Design Decisions

- **Sequential single-track** — not multi-deck. Clips play one after another on a single pipeline. Simpler mental model, matches how most performances flow.
- **Audio-reactive transitions** — the audio signal drives transition speed, not just triggering. High energy = fast crossfade, low energy = slow dissolve.
- **Horizontal strip** — enhanced version of the existing timeline, not a grid or dual-deck layout.
- **Existing trigger modes unchanged** — kick, threshold, timed, manual still determine *when* to advance. The new system determines *how* the transition looks and feels.

## Architecture

### Audio-Reactive Transition Engine

Two video elements exist during a transition: the outgoing clip (`currentVideo`) and the incoming clip (`nextVideo`). Both feed textures into a `TransitionShader` that blends them based on a `progress` uniform (0 = fully A, 1 = fully B).

**Progress driven by audio energy:**
- `useUnifiedAudioAnalysis` already outputs amplitude/energy values every frame
- During a transition, each frame: `progress += audioAmplitude * speedMultiplier * dt`
- High amplitude = large steps = fast transition. Low amplitude = slow, lingering crossfade.
- Progress clamps at 1.0, at which point the transition completes and `nextVideo` becomes `currentVideo`.

**Adaptive duration:**
- `transitionBaseDuration` (default 2s) sets the expected duration at "medium" audio levels
- Actual duration varies based on real-time audio — a loud kick section might resolve in 0.3s, a quiet ambient section might take 5s
- Speed knob in transport scales the base duration (0.5x to 3x multiplier)

**Transition types (shader programs):**
- **Cut** — instant switch at progress = 0.5, no blending
- **Dissolve** — `mix(textureA, textureB, progress)` — simple alpha crossfade
- **Wipe** — horizontal wipe driven by progress, with soft edge
- **Luma** — uses brightness of textureA as a matte, dark areas reveal textureB first

Each type is a different fragment shader. The `TransitionShader` class swaps programs based on type.

**State additions to `timelineStore`:**

```typescript
transitionType: 'cut' | 'dissolve' | 'wipe' | 'luma'  // default: 'dissolve'
transitionBaseDuration: number                           // default: 2 (seconds)
transitionProgress: number                               // 0-1, driven by audio
isTransitioning: boolean
// Per clip-pair overrides (optional)
transitionOverrides: Record<string, TransitionType>      // key: `${clipAId}-${clipBId}`
```

**EffectPipeline additions:**

```typescript
renderTransition(textureA: WebGLTexture, textureB: WebGLTexture, progress: number, type: TransitionType): void
```

This renders to the output framebuffer using the transition shader, then the normal effect chain runs on the result.

### Timeline Strip Redesign

The existing `TimelinePanel` clip blocks get a visual upgrade.

**Clip blocks (80px tall):**
- Video thumbnail as CSS background (captured on load: seek to frame 0, draw to offscreen canvas, `toDataURL()`)
- Semi-transparent dark overlay with: clip name (top-left), duration (top-right), effect dots (bottom edge)
- Active clip: bright accent border + subtle pulse animation on the border
- "Up next" clip: dimmer accent border (20% opacity) so performer can see the queue
- Selected clip (for editing): thicker accent border, distinct from active

**Transition zones (~20px wide, between clips):**
- Small widget showing transition type via icon (diagonal line = wipe, gradient = dissolve, hard edge = cut, wave = luma)
- Click to cycle type, or right-click for a picker
- During live transition: zone fills with accent color proportional to `transitionProgress`
- Stores override in `transitionOverrides[clipA.id + '-' + clipB.id]`

**Playhead:**
- Thin vertical accent line spanning strip height
- Moves across the active clip during playback (maps clip elapsed time to clip block width)
- During transition, spans across the transition zone
- Current time / total time in transport area

**Auto-scroll:**
- During playback, strip scrolls to keep active clip centered
- Manual scroll (wheel/drag) overrides auto-scroll
- Auto-scroll resumes after 3 seconds of no manual input

### Performance Controls

Enhanced transport bar between canvas and timeline strip.

**New transport elements:**
- Current clip name + thin progress bar (accent color, shows position within clip)
- Next clip label (dimmer) with transition type icon between them
- Audio energy meter: small horizontal bar showing real-time amplitude feeding the transition engine
- Threshold line on meter (visible in threshold trigger mode)
- "FORCE" button: momentary press instantly triggers next transition (for improv)
- Transition speed knob: scales `transitionBaseDuration` (0.5x to 3x)
- Transition type selector: 4 buttons (cut/dissolve/wipe/luma), sets global default

**Keyboard shortcuts:**
- `Space` — play/pause (existing)
- `Right Arrow` — force next clip
- `Left Arrow` — go back to previous clip
- `T` — cycle transition type
- `1-4` — select transition type directly

**Audio energy visualization:**
- Meter pulses brighter during active transitions
- Shows the direct relationship between audio level and transition speed
- Performer can "see" how audio is driving the visual flow

### Effects Visualization on Clips

Ties into the existing `individualEffects` system and `ClipEffectBrowser`.

**Effect dots on clip blocks:**
- Bottom edge of each clip block shows a row of small colored dots (one per assigned effect)
- Colors from `effect.color` config — visually identify effect types at a glance
- Max 5 dots visible + "+N" overflow count
- Replaces the current `FX N` text badge on `TimelineClipBlock`

**Active effect feedback:**
- When a clip is playing and its effects are applied, dots glow (subtle `box-shadow` pulse)
- During transition, both clips' dots are visible — outgoing dots fade as transition progresses

**Editing shortcuts:**
- Right-click clip block → sets `effectsScope: 'clip'`, selects that clip, focuses `ClipEffectBrowser`
- Fast path for assigning effects without manual scope switching

**Scope mode visual cue:**
- When `effectsScope === 'clip'`, timeline strip gets subtle accent top border
- Selected clip gets thicker accent border
- When `effectsScope === 'master'`, no special treatment

## Implementation Phases

### Phase 1 — Transition Engine (core)

Files: `useTimelinePlayback.ts`, `EffectPipeline.ts`, `timelineStore.ts`, `useUnifiedAudioAnalysis.ts`

- Add `nextVideo` element to video pool in `useTimelinePlayback`
- Create `TransitionShader` class in `src/effects/` (two-texture blend with progress uniform)
- Add `renderTransition()` to `EffectPipeline`
- Add transition state to `timelineStore` (`transitionProgress`, `transitionType`, `isTransitioning`)
- Drive progress from audio amplitude output in the playback loop
- Start with dissolve only (`mix(a, b, progress)`)

Deliverable: clips crossfade driven by audio energy instead of hard-cutting.

### Phase 2 — Transition Types

Files: `src/effects/TransitionShader.ts`, `timelineStore.ts`, transport UI

- Add wipe, cut, and luma transition shaders
- Per-clip-pair transition type stored in `timelineStore.transitionOverrides`
- Transition type selector in transport bar
- Keyboard shortcuts (`T` to cycle, `1-4` direct select)

Deliverable: multiple transition styles, selectable globally and per-transition.

### Phase 3 — Timeline Strip Visual Upgrade

Files: `TimelinePanel.tsx`, `timelineStore.ts`

- Increase clip block height to 80px with thumbnail backgrounds
- Thumbnail capture on clip load (offscreen canvas snapshot of first frame)
- Transition zone widgets between clips (clickable, shows type icon, animates during transition)
- Active clip highlighting + "up next" indicator
- Playhead animation mapped to clip progress
- Auto-scroll with manual override

Deliverable: professional VJ-style timeline strip.

### Phase 4 — Performance Controls

Files: `TransportBar.tsx`, `timelineStore.ts`

- Audio energy meter in transport area
- Force-next button (momentary)
- Transition speed knob
- Current clip progress bar + next clip label
- Transition type quick-select buttons

Deliverable: complete live performance transport.

### Phase 5 — Effects Visualization

Files: `TimelinePanel.tsx`, `ClipEffectBrowser.tsx`, `uiStore.ts`

- Colored effect dots on clip blocks (replace `FX N` badge)
- Glow animation for active effects during playback
- Right-click shortcut to enter clip effect scope
- Scope-mode accent border on timeline strip

Deliverable: visual polish connecting effects system to timeline.

## What Stays the Same

- `timelineStore.ts` clip model — `individualEffects`, `setClipEffects`, clip CRUD operations
- `useTimelinePlayback.ts` trigger logic — kick, threshold, timed, manual modes unchanged
- `ClipEffectBrowser.tsx` — already built, works for per-clip effect assignment
- `EffectCardStack.tsx` — dual-scope (master/clip) already working
- All effect stores and `EFFECT_PARAM_REGISTRY` — untouched
- Single mode (`appMode === 'single'`) — entirely unaffected
