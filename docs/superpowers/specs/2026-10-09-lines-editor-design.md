# Lines editor: a Warp-style editor per track, a master line, and Serum-style shortcuts

**Date:** 2026-10-09

**Status:** The design and the mockup (`assets/2026-10-09-lines-editor/lines2.png`) were approved in conversation. This written spec is awaiting review.

**Builds on:** Line tracks (`2026-10-08-line-tracks-design.md`, merged in PR #7). That spec still holds wherever this one is silent. In particular, these are unchanged:
- the Dry/wet rules: the card's Dry/wet is the ceiling; audio and MIDI gates win; Stop restores the user's value;
- dice, locks and saved lines;
- lines are not saved in banks or presets.

## Why

The user wants every sequencer track to get the full Warp tab layout instead of today's small lane:
- the tool row;
- a big graph;
- the Amount / Length / Quantize / Skew bar;
- a side panel with Dice, Presets and lock.

The user chose:
- **The line drives Dry/wet** on each track, as today. The Warp's Profile, knobs and Output are not included, because they only mean something for time.
- **A master line** that affects every track. It multiplies each track, Steps tracks included.
- **Track tabs, one big editor.** The tabs are Master, then one per effect. Each tab shows a mini line.
- **A Steps | Lines view switch** in the Sequencer. Steps is today's step grid. Lines is the new editor.
- **Warp-style Amount and Length.** Amount is how deep the line cuts. Length is the line's own loop, ½ to 16 beats.
- **Drawing shortcuts like the Serum 2 LFO editor,** plus Alt-dragging a tab onto another tab to copy it.

Out of scope:
- lines for parameters other than Dry/wet;
- per-track time warps;
- saving lines in banks or presets.

## 1. Model

`TrackLine` gains four fields:

```ts
interface TrackLine {
  points: WarpPoint[]; snap: number; skew: number   // unchanged
  amount: number   // 0..1, default 1
  beats: number    // one of LINE_BEATS = [0.5, 1, 2, 4, 8, 16], default 4
  gridY: number    // one of GRID_Y = [2, 3, 4, 6, 8, 12, 16], default 8
}
```

- `setTrackLine` validates the new fields:
  - `amount` is clamped to 0..1;
  - `beats` must be in `LINE_BEATS`;
  - `gridY` must be in `GRID_Y`.

  Invalid values are ignored, in the same way `snap` is today.
- **Master.** `effectSequencerStore` gains `master: { line: TrackLine; enabled: boolean }`, with a default line and `enabled: true`. It also gains `setMasterLine(patch)` and `setMasterEnabled(on)`, which validate exactly as `setTrackLine` does.
- **Level.** The level of a line at phase p is:

  ```
  level = 1 − amount × sampleLine(points, skewPhase(p, skew))
  ```

  At amount 0 the level is 1 everywhere, so the line does nothing. `lineLevel` takes the amount.
- **Neutral rule.** A flat line along the top, or amount 0, gives level 1 exactly. The default master is flat along the top, so it changes nothing.

## 2. Clock (replaces the Line tracks spec, §2)

- **Beat counter.** A line's phase comes from a transport beat counter, not from the track's step timer. `useEffectSequencerPlayback` keeps a `beats` counter:
  - it starts at 0 on Play;
  - each frame it adds `dt × bpm / 60000`, so a BPM change mid-play bends the tempo without a jump;
  - it is reset on Stop.
- **Phase.** Each line's phase is `(beats mod line.beats) / line.beats`. Track lines and the master use the same counter, so every line restarts together on Play.
- **Steps tracks keep their own clock.** Each line runs on the beat counter and each Steps track on its step timer. Both start at Play, so they stay aligned.
- **Ignored on lines.** A Line track's step length, time scale, Swing, Fill, probability, retrigs and p-locks do not apply to its line.
- **Phase lookups.**
  - `getLinePhase(effectId)` returns the phase, or null when stopped, as today.
  - `getMasterPhase()` is added for the master's playhead.

## 3. Master line: who writes Dry/wet

- **Master level.** `mixModulation` gains `setMasterLevel(level)` and `clearMaster()`. The master level is 1 when the master is off, when the sequencer is stopped, or when it is cleared.
- **Who it applies to.** The master multiplies the Dry/wet of every effect whose sequencer track is driving that effect's mix:
  - a Line track: `mix = ceiling × trackLevel × masterLevel`;
  - a Steps track with an open step: `mix = gateOpenLevel × masterLevel`. A closed step stays 0.
- **Steps tracks per frame.** Today an open step writes the mix only at the step. A per-frame pass now rewrites the mix of every open Steps track while the master is not 1, or has just returned to 1. It only writes when the value changes by more than 1e-4. With the master off, or flat at 1, this pass does no writes.
- **Modulation.** While a gate or line drives the effect, `noteModulatedMix` returns the modulated value × line × master. So modulation, the line and the master never fight.
- **Exceptions.** Audio and MIDI gates win: the master does not touch an effect while one of them owns its mix. A muted or soloed-out track is bypassed, as today.
- **Stop.** Stop restores every user value, as today, and clears the master.

## 4. UI (mockup `lines2.png`)

### 4.1 Sequencer view switch

The Sequencer header gets a **Steps | Lines** segmented switch (`data-seq-view="steps"|"lines"`). It is stored in `uiStore` as `sequencerView` and defaults to `steps`.

**Steps view** is today's step grid, with two changes:
- A Line track's row shows a 58 px, read-only preview of its line, with the playhead. Clicking the preview opens the Lines view on that track's tab.
- The current `LineToolbar` and the editable 170 px lane are removed. Their tools move to the Lines view.

  `SequencerTransport` always shows the step tools again.

### 4.2 Lines view

The Lines view has three parts.

**Tab row** (`[data-line-tabs]`):
- **Master** comes first, in `--warp` gold. Then there is one tab per chain effect, in signal order.
- Each tab shows:
  - the effect's colour and full name;
  - a `Line` or `Steps` badge (whichever plays);
  - 🔒 when the track is locked;
  - a 54×18 px mini line in the effect's colour.
- Clicking a tab opens it and selects that effect (`setSelectedEffect`).
- The open tab is stored in `uiStore` as `lineTab`, which is `'master'` or an effect id. If the effect leaves the chain, the tab falls back to Master.
- On narrow screens the tab row scrolls horizontally inside itself. The page never scrolls.

**Editor:** the Warp tab's layout, built from the shared `LinePlot`:
- **Tool row:** Draw, Steps, Curve, Erase | Random steps, Random curves, Clear | Lines ▾, Save line.
  - Random steps and Random curves fill the open line, keeping snap and skew.
- **Graph:** `LinePlot` with `attr="line"`, 190 px tall, with these layers:
  - **On a track tab:** the master line dashed in `--warp` (when the master is on), and a fill in the effect's colour showing what you hear: `trackLevel × masterLevel × ceiling`. Edge labels: `wet (card's Dry/wet)` at the top right, `dry` at the bottom right, and the loop at the top left (for example `1 bar loop`).
  - **On the Master tab:** every Line track's line, faint, in its colour.
  - The playhead is drawn in `--live` by rAF.
  - A horizontal grid line at every `1/gridY`.
- **Bar:** Amount, Length, Quantize, Grid Y and Skew, as spinbuttons in the Warp's style. Length shows `½ beat … 16 beats`.

**Side panel**, which depends on the open tab:
- **Track tab:**
  - the effect's colour and name;
  - the **Steps / Line** switch;
  - M, S, A, N (the same buttons as the track header);
  - the **Dry/wet** bar, which is the card's `effectMix`;
  - a readout: `Line 0.71 × master 0.62 × 80%` and `Now playing at 35%`, updated by rAF and shown only while playing;
  - at the bottom: 🔒 (this track's lock), 🎲 Dice (this track), Presets ▾ (the same menu as Lines ▾), and 🎲 Dice all lines.
- **Master tab:**
  - **On / Off**;
  - the readout `Multiplies every track's Dry/wet, Steps tracks included. Now ×0.62`;
  - 🔒 (master lock), 🎲 Dice (master), Presets ▾ and 🎲 Dice all lines.
- **Dice all lines** rolls every unlocked Line track. It also rolls the master when the master is unlocked.

**Height.** The Lines view fits the bottom panel's Sequencer height cap (40vh). Below that height the graph shrinks to a minimum of 110 px.

**Narrow (under 1100 px).** The side panel moves under the editor as a single wrapped row. Nothing scrolls horizontally.

## 5. Drawing shortcuts (Serum 2 style)

These apply to `LinePlot`, so the Warp graph gets them too. Keys are checked on each pointer event (`ev.shiftKey`, `ev.altKey`), so pressing or releasing a key mid-drag takes effect immediately.

The grids:
- **X grid:** Quantize. When Quantize is Off, the X grid is 1/16.
- **Y grid:** `gridY` divisions. The Warp, which has no Grid Y, uses 16.

| Gesture | Result |
|---|---|
| **Shift + drag** (empty space, Draw tool) | Paints steps snapped to the X grid. Heights are free. |
| **Alt + Shift + drag** (empty space) | Paints steps snapped to both grids. |
| **Alt + Shift + drag a bend handle** | Bends so the segment's midpoint lands on the Y grid. |
| **Alt + drag a point** | The point snaps to both grids. |
| **Drag a point** (no Alt) | x follows Quantize as today; y is free. |
| **Alt + drag a bend handle** | Every bendable segment's bend moves by the same amount, clamped to −1..1. Flat segments are skipped. |
| **Double-click empty space** | Adds one point at the cursor (x on the X grid). |
| **Double-click a point** | Removes it. Endpoints, and lines with 2 points, are kept. |
| **Alt + drag a tab onto another tab** | Copies the line and its settings (points, amount, beats, snap, gridY, skew) to the target, including to or from Master. It does not copy mode, steps, Dry/wet or locks. A locked target refuses the drop and shows a 🔒 flash. While dragging, a ghost tab follows the pointer and the target tab is outlined. A drop anywhere else does nothing. |

Other notes on the shortcuts:
- **Double-click on empty space.** Today a single click on empty space already adds a point. A double-click must not add and then remove that point: a point added by the double-click's first click is kept.
- **Changes to today's behaviour.**
  - Shift + drag stops rounding heights.
  - Alt alone on an empty-space drag snaps both axes, where today it snaps only the height.
- **Status bar text** for Draw becomes: `Click or double-click to add a point, drag to move, double-click a point to delete. Shift paints steps, Alt snaps to the grid, Alt-drag a curve handle moves every curve.`

## 6. Errors and edge cases

- **Effect leaves the chain.** Its tab disappears and its line is kept.
- **Old tracks.** Tracks with lines created before this change, which lack `amount`, `beats` or `gridY`, get the defaults from `defaultTrackLine()`. This happens in `ensureTrack` and in `setTrackLine`'s merge.
- **Many tabs.** With 12 or more effects, the tab row scrolls inside itself.
- **Copying onto the same tab** does nothing.
- **Master on with no tracks playing** writes nothing.
- **Bad input.** Every external source of points still goes through `cleanPoints`. `amount` and the master level are clamped to 0..1, so a NaN mix is impossible.

## 7. Testing

The puppeteer harness gets a new mode, `lineseditor`, at 1440×900 with the SEG_EXP preset:

1. The Steps | Lines switch shows and hides the two views. A Line track's row in the Steps view is a preview, and clicking it opens Lines on that tab.
2. Tabs list Master plus every chain effect in order. Mini lines match the points.
3. **Amount.** At amount 0.5 with a Half on line, the mix in the second half is base × 0.5.
4. **Length.** With beats 2 at 120 BPM, the phase wraps every 1 s, within ±30 ms.
5. **Master on a Steps track.** With a Ramp down master and a Steps track with every step open, the mix follows `base × masterLevel` within ±0.05 at four phases.
6. **Master on a Line track.** The mix = ceiling × track × master.
7. **Neutral and Stop.** Master off, or flat, writes nothing (no `setEffectMix` calls from the master pass). Stop restores the user's mix.
8. **Shortcuts:**
   - Alt + Shift + drag paints steps on both grids;
   - Alt + drag snaps a point to both grids;
   - Alt + drag on a bend handle moves every bend by the same amount;
   - double-click on empty space adds exactly one point;
   - double-click on a point removes it.
9. **Tab copy.** Alt-dragging a tab onto another copies the line and its settings. A locked target refuses.
10. **Dice all lines** respects locks, including the master's.
11. **Regression.** `lines*`, `warpui`, `warpdice`, `warpmod`, `labels` and `devices` still pass, after updating only the expectations that §5's changes to today's behaviour make obsolete. The build and lint are clean.

Screenshots go on the progress page as each visible task lands.
