# Strand Tracer - Development Notes

## Adding New Effect Pages/Effects

When adding a new effect page or new effects, you MUST update ALL of the following locations:

### 1. Effects Config (`src/config/effects.ts`)
- Add effect definitions to appropriate array (EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, etc.)
- Update `PAGE_NAMES` array if adding a new page
- Update `getEffectsForPage()` if adding a new effects array

### 2. UI Store (`src/stores/uiStore.ts`)
- Update `setGridPage` max value to include new page index
- Update `nextGridPage` max value
- Example: `Math.min(5, page)` for 6 pages (0-5)

### 3. Active and toggle logic (`EFFECT_ENTRIES` in `src/hooks/useEffectToggle.ts`)
- Add an `EFFECT_ENTRIES[effectId]` entry with `active()` (read the enabled flag) and `toggle(effectId)` (call `moveToEndOfChain` when turning on, then flip the store's setter).
  The pad grid, the browser list and the device chain all read it; `PerformanceGrid.tsx` needs no store imports.
- If the effect uses a NEW store, add it to `ENABLE_STORES` in the same file so `useEnabledEffectIds` / `useChainIds` re-render when it flips.
- An effect with a lane but no pad (like `track_face` or the overlays) goes in `EXTRA_IDS` there, so it still gets a device card.
- Update `PerformanceGrid.tsx` only for a NEW page: `pageHasActiveEffects()` and the navigation button max page index.

### 4. Active Effects Hook (`src/hooks/useActiveEffects.ts`)
- Import the new store
- Add enabled check and `activeEffects.push()` for each new effect
- Include primaryValue/primaryLabel

### 5. Effect Disable Hook (`src/hooks/useEffectDisable.ts`)
- Add case to the switch statement mapping effectId to store setter

### 6. Canvas (`src/components/Canvas.tsx`) + Param Sync (`src/effects/paramSync.ts`)
Enabled flags/order and per-frame params are split across two files:
- **Canvas.tsx's structural effect**: import the new store (e.g.
  `useMotionStore`, `useTrendStore`), subscribe to its *enabled* state only,
  pass to `pipeline.updateEffects()`. This effect should only re-run on
  enable/disable/reorder — not on every param change.
- **paramSync.ts**: add the effect's params to (or add a new) `push*()`
  function that calls `pipeline.<effect>?.updateParams(...)`, call it once
  in the initial push list, and add a reference-equality slice check for
  its store slot to the matching `subscribe()` callback (or add a new
  `store.subscribe()` entry) so the uniform updates on every param change
  without going through React.

### 7. Effect Pipeline (`src/effects/EffectPipeline.ts`)
- Import new effect classes
- Add effect instance properties
- Initialize effects in constructor
- Add to `getEffectById()` switch
- Add to `updateEffects()` config type and enabledMap
- Add to `dispose()` cleanup
- If temporal effect: add to `render()` captureFrame calls

### 8. Routing Store (`src/stores/routingStore.ts`)
- `defaultEffectOrder` is built from `EFFECTS`, `STRAND_EFFECTS`, `MOTION_EFFECTS` and `DESTRUCTION_EFFECTS`.
  Effects added to one of those existing arrays need no edit here.
- Only a NEW effects array (a new page) must be imported and spread into `defaultEffectOrder`.

### 9. Param Registry (`src/config/effectParams.ts`)
- Add an `EFFECT_PARAM_REGISTRY` entry (getParams, optional getSelectParams, setEnabled, getEnabled).
  Param locks are driven from this registry.
- The registry entry drives the device card and the inspector: the first four numeric params become the device-card dials and the inspector "Main" bars, the rest render as "More" bars, and 0/1 integer params render as toggles. Selects come from `getSelectParams`; bespoke colour/texture controls live in `BlockExtras`.

### 10. Continuous Modulation (`src/hooks/useContinuousModulation.ts`)
- Add a `case '<effectId>'` mapping 0–1 modulation values onto each param's real range.

### 11. Names and descriptions (`EFFECT_DESCRIPTIONS` in `src/config/statusDescriptions.ts`)
- Add `<effectId>: 'Full Name: one-line description'`. `src/config/effectNames.ts` reads it for the device card, browser and inspector names, so no short codes appear in the UI.
- An effect with no `src/config/effects.ts` entry also needs a colour in `EXTRA_COLORS` in `effectNames.ts`.

### 12. Param display names (`src/config/paramNames.ts`)
- Give params a readable name (`PARAM_NAME_OVERRIDES`, `<effectId>.<paramId>`) and, where a shared code means something different, a hover text (`PARAM_DESCRIPTION_OVERRIDES`). Dial names are at most 10 characters.

### 13. Live param values (`STORES` in `src/hooks/useParamValue.ts`)
- If the effect uses a NEW store, add it to `STORES`, or its bars and dials won't update.

### Presets/banks
- New stores need a `<store>?: Snapshot` key on `BankSnapshot` (`src/stores/bankStore.ts`) plus
  capture/apply lines in both `bankStore.ts` and `presetLibraryStore.ts`; `applySnapshot(undefined)`
  must reset to defaults so older banks load cleanly.

## Architecture

### Layout Shell (`src/components/performance/PerformanceLayout.tsx` + `layout.css`)
`.seg-shell` is a CSS grid whose children carry `data-area`: `header`, `browser`, `stage`, `inspector`, `bottom`, `footer`. Footer toggles show or hide the browser, inspector and bottom panel (hidden by CSS, never unmounted, so the canvas is never remounted).
- **Sizes**: header 44px, footer 30px. Browser 250px / inspector 300px, and 300px / 340px at ≥2200px. Bottom panel 172px on Devices; on Sequencer it follows the content up to 40vh.
- **Narrow (< 1100px)**: the browser and inspector become drawers over the stage (one at a time).
- `PerformanceLayout` re-renders every engine tick, so `HeaderBar`, `EffectBrowser`, `StageArea`, `Inspector` and `BottomPanel2` are `React.memo`. Keep their props stable and their store selectors narrow.

### Header (`src/components/performance/HeaderBar.tsx`)
VIDEO/AUDIO source menus (portalled, `position: fixed`), the preset picker, and REC (`useRecordingControl`, red `--rec` token).

### Stage (`src/components/performance/StageArea.tsx`)
Aspect-locked output frame that fits the free space, with corner ticks, ruler, ClipBin and four HUD readouts (`StageReadouts`): LIVE/REC + FPS, preset name (or bank), timecode, active band. The frame is a container; under 380px the readouts re-stack.

### Browser (`src/components/performance/EffectBrowser.tsx`)
Left panel: every effect by category with its full name and description (`src/config/effectNames.ts`), a search box, and List/Pads views. Clicking a row adds the effect to the end of the chain (or removes it).

### Inspector (`src/components/performance/Inspector.tsx`)
Right panel, contextual on `uiStore`. Its root carries `data-inspector-mode`:
- `effect` (a device is selected): header (colour, full name, "· 3 of 5 in chain", Bypass), then `EffectSettings` (every numeric param as a `ParamBar`, in "Main" and "More" sections, with `useParamControl` supplying drag, p-lock, reset, context menu and modulation drop), then the Modulation list (`[data-inspector-routes]`: routes whose `targetParam` starts with `${effectId}.`, named via `resolveRoutingSource`, × removes), then the audio band (`TrackAudioReactivePanel`).
- `modulator` (a slot in the Modulators card is selected): that modulator's editor. LFO slots open `ModulationAssignPanel` on that LFO (`selectedLFOIndex`); Random/Step/Envelope/S&H/MIDI use `ModulationContent` (`sampleHold` maps to `sh`); Audio shows `TrackAudioReactivePanel` with a device picker; Warp shows the mini line, Amount and "Open Warp tab".
- `empty`: "Select a device or modulator to edit it."

### Device chain (`src/components/performance/BottomPanel2.tsx`, `DeviceChain.tsx`, `DeviceCard.tsx`, `ModulatorsCard.tsx`, `WarpCard.tsx`)
Bottom panel with Devices, Warp and Sequencer tabs (all stay mounted; the title reads "Chain", "Warp" or "Sequencer"). Devices: the Modulators card (● arms routing, then click or drag any control), then the Time warp card (`WarpCard`: dimmed "+ Time warp" slot when off; power, mini line and Amount when on; clicking it opens the Warp tab without changing the device selection; it is not an effect, so it is outside `EFFECT_ENTRIES`, reorder and drag), then one card per active effect in signal order with 4 dials and a Dry/wet bar (`effectMix`; a modulation target `<effectId>.effectMix`, written through `setEffectMix`). `DeviceChain` owns `ensureTrack`, drag/keyboard reorder, bypass, remove, and selection: it auto-selects a device unless a modulator is selected, and when the selected device is removed it selects the next device (else the previous, else none). Sequencer: `SequencerContainer` > `UnifiedSequencerPanel`.

### Time warp (`src/effects/warp/*`, `public/worklets/warp-processor.js`, `src/stores/warpStore.ts`, `src/components/performance/warp/*`, `WarpCard`)
Files: `src/effects/warp/` holds warpMath, warpClock, audioWarp, WarpFrameBuffer, WarpCompositor, warpShaders and warpRegistry; the worklet is `public/worklets/warp-processor.js`; state is `warpStore`; the editor is the Warp tab (`components/performance/warp/*`: graph, line tools, side panel, `warpLines.ts`, `warpLocks.ts`, `WarpLock.tsx` for the padlock icon and lock buttons); the chain card is `WarpCard`.
- **Time model**: the line y = f(x) gives, at loop phase x, how far back to read: `delay = amount·f(x′)·L` (x′ is the skewed phase), with the top = live, lower = further back and y = x (the dashed guide) = stopped (steeper reads backwards); delay is capped at 8 s (`MAX_DELAY_SECONDS`). Loop length is 1/2, 1, 2, 4, 8 or 16 beats; Quantize is Off or 1/4 to 1/64 of the loop. Built-in lines: Straight, Stutter build, Half time, Freeze hits, Reverse, Tape stop, Scratch, Rearranger. They are listed in Lines ▾; the side panel footer's Presets ▾ opens the same menu (`WarpLinesMenu variant="presets"`).
- **Position**: the warp sits on the source BEFORE the effect chain, so chain effects process the warped picture.
- **Audio**: warped through an AudioWorklet; the analysers (and so the audio bands) sit after it. The video ring is captured at 30 fps.
- **Clock**: video and audio read one shared clock (`warpClock`), so they report the same phase. The picture uses `getHeardWarpPhase()` (the clock minus output and base latency) so it lines up with the sound.
- **Profiles (v2)**: one profile at a time, the same 7 on picture and sound (`PROFILE_IDS`, `KNOB_NAMES`, `PROFILE_DEFAULTS` in `warpStore.ts`). Each has 4 knobs, kept per profile in `profileParams`:
  - Clean: Vibrato, Vib speed, Echo, Circuit-bend (the default profile; its defaults are neutral, so turning the warp on changes nothing until you draw).
  - Flange: Modulation, Physics, Grain size, Width.
  - Degrade: Degrade, Cutoff, Grain size, Chaos.
  - Filter Spam: Cutoff, Randomness, Resonance, Octaves.
  - Harmo-nicer: Harmonize, Detune, Speed, Reverse.
  - Fauxcoder: Amount, Squelch, Cutoff, Magic.
  - Lo-fizzly: Degrade, Dirt, Radio, Rate.
  `PROFILE_NEUTRAL` lists the knob settings that leave the signal untouched; `isProfileNeutral` uses it. The worklet runs all 7 itself and gets the profile, its 4 knobs and the Output section in one params message; the video side has one shader per profile in `warpShaders.ts`, all compiled when the compositor is built (the first time the warp is on, so a first profile switch never compiles) and kept when the warp goes off. The video ring holds the loop plus the profile's read-past margin (Filter Spam L/16, Degrade 0.3 s), capped at 8 s / 240 frames. An audio-source switch moves the clock's time base; the compositor shifts its stored frame times by that delta, so the history survives.
- **Output**: `output = { low, high, levelDb }` plus the warp's own `mix`. Band is a low cut (20 Hz to 2 kHz) and a high cut (500 Hz to 20 kHz) on the wet signal; on the picture it is a luminance key on a log scale (20 Hz = black, 20 kHz = white) with the dry pixel showing outside the band. Level is -24 to +6 dB. An open Output (20 Hz, 20 kHz, 0 dB) with a neutral profile and delay 0 makes `WarpCompositor.render` return the live texture itself (no pass).
- **Dice and locks**: Dice rolls the unlocked groups of amount, profile, graph, settings (length, quantize, skew), knobs (the current profile's 4) and output (band, level, mix). Lock groups (`LockGroup` and `WarpLocks`, defined once in `warpStore.ts`, re-exported by `warpLocks.ts`): amount, profile, graph, settings, knobs, output; Amount and Profile are locked by default. Lock mode (`useWarpLockStore.lockMode`) outlines locked groups and lets you click a group's lock to flip it. Locks are a UI preference saved in `localStorage` under `seg.warp.locks`, never in banks or presets.
- **Saved lines**: Save line stores the drawn line by name in `localStorage` under `seg.warp.lines` (max 100 lines, 512 points each, names up to 40 characters, built-in names refused). Every storage access is wrapped in try/catch, so a blocked page still works for the session. They are not in banks or presets.
- **Bypass guarantee**: off means no frame capture, no GPU pass and no worklet node; the pipeline input is the original texture and the output is bit-identical to no warp. Switching off on a live graph fades the warped sound out over about 20 ms, then restores the direct audio connections. Checked in the `warpfinal` harness: off gives 0 worklet processors, `targetCount` 0 and the original texture, and 10 on/off toggles leave the processor and program counts unchanged.
- **Modulation source**: the gold Warp slot (`trackId 'warp'`) routes the line's height at the heard playhead (`warpModValue`). `useContinuousModulation` computes it once per frame, only when a route uses it, whether or not the warp effect is on. Dry/wet of every effect is also a target (`<effectId>.effectMix`).
- **Dry/wet modulation and gates** (`src/effects/mixModulation.ts`): while a gate-mode sequencer track plays, a modulated Dry/wet becomes the gate's open-step level: closed steps stay at 0, open steps play at the modulated value (modulation keeps writing it while the step is open). With no gate active, modulation writes `effectMix` directly. Audio gates and MIDI gates own the mix, and modulation does not write it while one is on. The sequencer's pre-play snapshot is the user's own value (`captureUserMix`), never a modulated one, so Stop restores what the user set.
- **Saved as** `warp` in `BankSnapshot` and in presets (enabled, line, amount, length, quantize, skew, profile, `profileParams`, output, applies-to, mix); `applySnapshot(undefined)` resets to defaults (off), and factory presets such as SEG_EXP leave it off. `sanitize` migrates v1 saves: profile `smear` becomes `flange`, and the single `params` object maps onto the first knobs of Clean, Flange and Degrade. Points are not converted, only cleaned (`cleanPoints` in `warpMath.ts`: x, y and a finite bend clamped to -1..1, non-finite points dropped, at most 512), so an imported preset file can never produce a NaN delay. Missing v2 fields take the defaults.

Effect params flow through `src/effects/paramSync.ts` (zustand subscribe → uniform writes); Canvas.tsx's structural effect only rebuilds the pass chain on enable/disable/reorder.

## Common Issues

### Page navigation doesn't reach new pages
Check `uiStore.ts` - the `setGridPage`, `nextGridPage`, `prevGridPage` functions have hardcoded max values.

### Effects don't appear in grid
Check `getEffectsForPage()` returns the right array and `pageHasActiveEffects()` includes the new page.

### Effects don't appear in the device chain
Check `isEffectActive` in `useEffectToggle.ts` (what `useChainIds` reads) and `useActiveEffects.ts` both have the enabled check for the new effect, and the effect ID is in `routingStore.defaultEffectOrder`.

### Remove button doesn't work on a device card
Check `useEffectDisable.ts` has a case for the effect ID mapping to the correct store setter.
