# Line tracks: sequence an effect's Dry/wet with a drawn line

**Date:** 2026-10-08

**Status:** The design and the mockup (`assets/2026-10-08-line-tracks/lines.png`) were approved in conversation. This written spec is awaiting review.

**Builds on:** the time warp v2 spec (`2026-10-08-time-warp-v2-design.md`): its line editor, quantize grid, skew, saved lines, and dice and locks. It also builds on the effect sequencer (`effectSequencerStore`, `useEffectSequencerPlayback`, `UnifiedSequencerPanel`) and `mixModulation.ts`.

## Why

The user wants to sequence the effects in the chain the way the warp line sequences time. Each effect gets its own drawn line over the loop, and the line's height is how much of that effect you get.

The user chose:
- **Amount per effect.** The line drives that effect's Dry/wet, nothing else.
- **A new mode in the Sequencer tab.** A track is either **Steps** (today's gates) or **Line**. The lines do not live in a separate tab.
- **The Sequencer's transport.** A line plays with Play/Stop, follows the BPM, spans the track's length and respects the track's time scale.
- **Every warp tool,** namely:
  - Draw, Steps, Curve, Erase, bend handles and Quantize (these come with any line);
  - built-in line presets;
  - Dice with per-track locks;
  - Skew;
  - saved lines.

Out of scope:
- lines for other parameters;
- lines on the warp's clock or free-running clocks;
- saving lines in banks or presets. Sequencer tracks are not saved there today, and Line tracks follow the same rule.

## 1. Model

- **Mode.** `EffectTrack.mode` becomes `'gate' | 'param' | 'line'`. (`'param'` exists in the store but has no UI; it is left as is.) The UI calls `'gate'` **Steps** and `'line'` **Line**.
- **Data.** Every track gains `line: TrackLine`, created with the track:

  ```ts
  interface TrackLine { points: WarpPoint[]; snap: number; skew: number }
  // default: { points: [{x:0,y:0},{x:1,y:0}], snap: 1/16, skew: 0 }
  ```

  - Points use the warp's format and convention: x is the phase from 0 to 1; y = 0 is drawn at the top, y = 1 at the bottom. They are normalised with `normalizePoints` and, when they come from outside (saved lines, dice), cleaned with `cleanPoints`. The cap is 512 points.
  - `snap` takes one of `SNAPS` (0 = Off, or 1/4 to 1/64 of the loop). `skew` runs from −1 to 1.
  - The track's steps stay in the store while it is in Line mode, so switching back to Steps restores them unchanged.
- **Value.** At phase `p`, the line's level is `level(p) = 1 − sampleLine(points, skewPhase(p, skew))`, from 0 to 1. The top is 1 (full) and the bottom is 0 (dry). A LUT is built with `buildLut` whenever the points change and is cached per track, so playback never samples the points directly.
- **Neutral rule.** The default line is flat along the top, so switching a track to Line changes nothing you can see or hear: the mix written equals the ceiling exactly (§3).

## 2. Clock

- **Phase.** A Line track's phase is `((trackStep + f) mod length) / length`, where `f = clamp01(elapsed since the track's last step / trackMsPerStep)`. It uses the same per-track timer and `timeScale` that steps use, so Steps and Line tracks stay locked together. For example, a 16-step track at 1/16 spans one bar, and at ½× it spans two.
- **What the line ignores.** Swing, Fill, step probability, retrigs and p-locks do not apply to a Line track: its step data is not executed in Line mode. `trackStep` still advances, so the phase carries on.
- **Stopped.** Nothing is written. The editor's playhead is hidden.
- **Exported phase.** The playback hook publishes each Line track's phase in a module-level map, read by the lane's rAF playhead: `getLinePhase(effectId): number | null`, where `null` means stopped.

## 3. Dry/wet: who writes it

The line writes `effectMix` once per animation frame while the Sequencer plays, through `mixModulation.ts`, alongside the gate and continuous modulation.

- **Ceiling.** The line scales a ceiling: `mix = ceiling × level(p)`.
  - The ceiling is `gateOpenLevel(effectId, base)`: the modulated Dry/wet when a route drives it (for example the Warp modulator), otherwise the user's own Dry/wet captured before play (`captureUserMix`).
  - So the card's Dry/wet bar is the top of the lane.
- **mixModulation additions:**
  - `setLineLevel(effectId, level)`;
  - `releaseLine(effectId)`;
  - `clearLines()` on Stop.
  - While a line level is set, `noteModulatedMix` returns `value × level` instead of `value`, so modulation and the line never fight.
- **Audio and MIDI gates win.** The line writes nothing in two cases, and the lane shows "Audio gate controls Dry/wet" or "MIDI gate controls Dry/wet" over it:
  - the track's audio gate (`A`) or audio-reactive stepping is on;
  - its MIDI gate (`N`) is on.

  This matches the rule that audio and MIDI gates own the mix.
- **Mute and solo** bypass the effect exactly as they do for Steps tracks.
- **Writes only on change.** Skip `setEffectMix` when the new value is within 1e-4 of the stored one.
- **Leaving Line mode during play.** The track calls `releaseLine` and its mix returns to the captured base. **Stop** restores every captured base, as today.
- **Entering Line mode during play.** The track captures its base the way a newly added effect does.
- **No Line tracks, no work.** The per-frame line pass only loops over tracks in Line mode. With none, it costs one `Object.values` scan, the same as today.

## 4. UI (mockup `lines.png`)

- **Track header.**
  - A **Steps / Line** segmented switch (`data-track-mode="gate"|"line"`) sits after M, S and A.
  - In lock mode, a padlock button appears on Line tracks (`data-line-lock`).
- **The lane.** A Line track's row draws a lane instead of the step cells:
  - It always spans the track's whole length; the step page does not apply.
  - It has a 16-column grid, the filled area under the line in the effect's colour, the line itself, and a `--live` playhead drawn by rAF from `getLinePhase`.
  - **Unselected:** 58 px tall. It shows the line in the effect's colour, with no points or handles. A click selects the track (`setSelectedEffect`) and adds no point.
  - **Selected:** 170 px tall. The line is white, with points and bend handles, and edits like the warp graph:
    - click empty space to add a point; drag to move; double-click to delete; drag a segment's middle to bend it;
    - Shift paints steps; Alt snaps the height;
    - arrow keys nudge; Delete removes;
    - all handled keys `stopPropagation`.
  - Edge labels:
    - `wet (card's Dry/wet)` at top right;
    - `dry` at bottom right;
    - the span at top left (for example `2 bars · ½×`).
  - The header shows Length, Scale and `Dry/wet ceiling NN%`.
- **One shared editor.**
  - The point-editing core moves out of `WarpGraph` into a generic `LinePlot` in `src/components/performance/lines/`. It takes `points`, `onChange`, `snap`, `tool`, `selected`, `onSelect` and overlay children, and handles the grid, line, points, bend handles, the tools and the keyboard.
  - `WarpGraph` becomes `LinePlot` plus its own layers: the stopped guide, waveform, thumbnails and the live/back edge labels. Its behaviour must not change; the existing `warpui` and `warpdice` harness modes must still pass unchanged.
  - The lane uses `LinePlot` with lane overlays.
- **Toolbar.** When the selected track is a Line track, the Sequencer toolbar replaces the step tools (Random, All tracks, P-locks, Clear) with the line tools for that track, prefixed with `<Effect> line`:
  - Draw, Steps, Curve, Erase;
  - Lines ▾ (saved lines first, then the built-ins: the same order as the warp's menu) | Save line | Clear;
  - Quantize, Skew (spinbuttons, as in the warp);
  - 🔒 lock mode | 🎲 Dice track | 🎲 Dice all lines.

  Swing and resolution stay at the right.
- **Narrow layouts** (under 1100 px): the toolbar wraps onto a second row. Nothing scrolls horizontally.

## 5. Lines, dice, locks

- **Built-in lines.** `LANE_PRESETS` in `src/effects/lines/lanePresets.ts`. The y values follow the warp convention (0 = full, 1 = dry):

| Name | Points |
|---|---|
| Ramp up | `{0,1} {1,0}` |
| Ramp down | `{0,0} {1,1}` |
| Stutter | 8 equal slices alternating full/dry, starting full (vertical steps on shared x) |
| Half on | `{0,0} {.5,0} {.5,1} {1,1}` |
| Swell | `{0,1} {1,0,bend:.6}` |
| Sidechain pump | per quarter q ∈ {0,.25,.5,.75}: `{q,0} {q,1} {q+.25,0,bend:−.5}`, normalised |
| Triangle | `{0,1} {.5,0} {1,1}` |
| Random steps | rolled on pick: `randomSteps(snap)` |

- **Saved lines.** The warp's `warpLines.ts` store (`seg.warp.lines`), shared both ways: a line saved in the warp can be loaded on a track, and the other way round. Built-in names refused when saving are the warp presets plus the lane presets. A line saved earlier under a name that is now a lane preset is kept, renamed "<name> (mine)" (or "(mine 2)", … when that is taken) when the list loads, so it survives the next save or delete.
- **Dice track.** Gives the selected Line track `randomSteps(snap)` or `randomCurves(snap)` with equal chance. Snap and skew are kept.
- **Dice all lines.** Does the same for every Line track that is not locked. It never touches Steps tracks.
- **Locks.** One flag per effect id, saved in `localStorage` under `seg.lines.locks` (a JSON object `{ [effectId]: true }`). Every read and write is wrapped in try/catch, so a blocked page still works for the session. Locks are a UI preference, never saved in banks. Lock mode outlines locked lanes in `--warp-lock`.

## 6. Errors and edge cases

- A track whose effect leaves the chain keeps its line, as it keeps its steps.
- A BPM change mid-play: the phase follows the per-track timer, which already resyncs when more than 4 steps behind.
- A line containing NaN is impossible: every external source goes through `cleanPoints`, and `level` is clamped to 0..1.
- A track length change mid-play: the phase uses the new length on the next frame, so the line stretches. No jump guard is needed for Dry/wet.
- A tab switch while playing: the lanes stop drawing; playback keeps writing the mix.

## 7. Testing

The puppeteer harness gets a new mode, `lines`, in `layout-check.mjs` (1440×900, the SEG_EXP preset):

1. Switching a track to Line hides its step cells, shows a lane spanning the whole track, and leaves `effectMix` equal to the base while playing (neutral rule).
2. With Ramp up on a 16-step track at 120 BPM, the mix sampled at four phases follows the line within ±0.05 of `base × level(p)`.
3. Half on: the mix is the base in the first half and 0 in the second.
4. With a Warp modulation route on the same Dry/wet, the mix equals `modulated × level`.
5. With the audio gate on, the line writes nothing.
6. Stop restores the user's base mix. Switching back to Steps restores the original steps.
7. Editing the selected lane:
   - a click adds a point;
   - a drag snaps x to the quantize grid;
   - a double-click deletes;
   - a bend drag sets `bend`;
   - clicking an unselected lane only selects it.
8. Dice track changes only that track's line. Dice all lines skips a locked track and every Steps track. Locks persist across a reload.
9. A saved line round-trips between the warp and a track.
10. With no Line tracks, the per-frame line pass does no work: a dev-only counter stays at 0.
11. `labels`, `devices`, `warpui`, `warpdice` and `warpmod` still pass, and the build and lint are clean (no new lint problems).

Screenshots go on the progress page as each visible task lands.
