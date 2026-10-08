# Time Warp Sequencer: Design

**Date:** 2026-10-08

**Status:** These were approved in conversation:
- direction A (a Warp tab in the bottom panel, plus a chain card);
- the audible audio is warped;
- the warp is applied to the source, before effects;
- the core plus 3 profiles.

This written spec is awaiting review.

**Reference:** HyperWarp by Baby Audio, studied frame by frame from a demo reel. The key frames are in `docs/superpowers/specs/assets/2026-10-08-time-warp/`:
- `ref-graph.png`
- `ref-freeze.png`
- `ref-reverse.png`
- `ref-scratch.png`
- `ref-controls.png`

**Mockup:** `assets/2026-10-08-time-warp/mockup.html?d=A`, rendered as `A-1440.png`.

## Goal

The user draws a line that says what happens to time over a short, tempo-synced loop. SEG_F4ULT then plays the video and the audio along that line, in sync:

| Drawn shape | Effect |
|---|---|
| Steps | Stutters and repeats |
| Gentle slope | Slow motion |
| Flat | Freeze |
| Rising | Reverse |
| Curve flattening out | Tape stop or scratch |

We borrow the interaction and the time model only. No Baby Audio names, assets or presets are used.

## 1. The time model

Each loop has a length of **L** beats: 1, 2, 4, 8 or 16. **x** is the phase within the loop, from 0 to 1. The warp line is a function **y = f(x)**, also from 0 to 1, where **y is the position in the loop to play from**. On screen, y = 0 is drawn at the top.

| Line shape | Result |
|---|---|
| y = x, the dashed diagonal | Normal playback |
| Flat (y constant) | Freeze |
| Slope between 0 and 1 | Slow motion (slope 0.5 is half speed) |
| Steps | Hold a slice, then jump: stutters and repeats |
| Slope greater than 1 | Fast forward |
| Falling y (line rising on screen) | Reverse |
| Smooth curve from the diagonal into flat | Tape stop |

**How far back it reads.** The output always comes from the past:

`delay = ((x − y) mod 1) · L_seconds`

So the read point is never more than one loop length behind real time.
- When y ≤ x, the frame or sample comes from the current pass of the loop.
- When y > x, it comes from the previous pass.
- When y = x, the delay is zero: true live, with no lag.

**Amount** blends the line toward the identity: `y′ = x + amount · (f(x) − x)`. At 0% the result is exactly live.

**Skew** bends the phase before the line is read: `x′ = x^(2^(−1.5·skew))`, with skew from −1 to +1. At 0 nothing changes. A positive value makes the early part of the loop play out faster.

**Clock.** Phase comes from the BPM in `useEffectSequencerStore`. While the sequencer is playing, x = 0 is aligned to the sequencer's step 0. While it is stopped, the warp loop runs freely at the same BPM. Video and audio read the phase from one shared clock based on the AudioContext time, so they cannot drift apart.

**Memory limit.** The video keeps up to **8 seconds** of history; the audio keeps 8 seconds as well. If L is longer than 8 s (16 beats below 120 BPM), delays are clamped to 8 s. The settings row then shows "Length limited to 8 s at this tempo".

## 2. Video

**Placement.** The warp sits on the **source, before the effect chain**. It feeds `pipeline.setInputTexture()` and `setSourceTexture()`. When the slicer is active, the warp applies to the slicer's output, so the slicer's frames get warped too.

**Frame memory.**
- Frames are kept in a ring of GPU render targets, captured at **30 fps**.
- They are downscaled so the long side is 512 px, at the source aspect ratio.
- At 8 s that is 240 frames, or about 140 MB of GPU memory at 16:9. The ring is allocated only while the warp is on, and released when it is turned off.
- Each frame carries the clock timestamp it was captured at.
- The output each frame is the stored frame closest to `now − delay`, rendered through the profile's shader at output size.
- At delay 0, the live texture is passed straight through at full resolution, so normal playback never looks soft.

**Profiles (video side):**

| Profile | Knobs | What happens to the picture |
|---|---|---|
| **Clean** | Smooth | The nearest stored frame. Smooth crossfades over 0 to 4 frames at jumps. |
| **Smear** | Grain, Blend | Blends 2 to 6 neighbouring frames around the read point: ghost trails that flange-shimmer on slow and stretched parts. |
| **Degrade** | Rate, Crunch | Holds frames at a reduced frame rate (Rate, 30 down to 4 fps) and crunches them (posterize and pixel-size growth). |

**Applies to** has three options: Video + audio, Video, or Audio. When the warp does not apply to video, the video passes straight through.

## 3. Audio

**What gets warped.** Whatever is audible:
- a loaded **audio file**, which plays through Web Audio today;
- a **video file's soundtrack**, which this feature makes audible for the first time. When Audio is set to Video and the source is a file, the video element is unmuted and its sound is routed through Web Audio. Previously it was muted and used for analysis only.

Microphone and system input stay analysis-only; they are never played back.

**Processor.** An AudioWorklet (`warp-processor`) sits between the source and the speakers:
- it keeps an 8 s stereo ring buffer;
- it reads at `now − delay` per sample, using the same model and the same line;
- the line is sent to it as a 1024-point lookup table whenever it changes;
- phase comes from the worklet's `currentTime` and the shared BPM and t0.

The audio-reactive analysers listen **after** the warp, so audio-reactive effects follow what you hear.

**Profiles (audio side):**

| Profile | What happens to the sound |
|---|---|
| **Clean** | Interpolated reads. Smooth sets a 0 to 30 ms crossfade at jumps, so there are no clicks. |
| **Smear** | Two overlapping grains around the read point. Grain sets their size (10 to 120 ms); Blend sets the grain mix. Flange-like on stretches. |
| **Degrade** | Sample-rate reduction (Rate) and bit-crush (Crunch). |

**Mix** is the dry/wet balance against the live signal. It is shared by video and audio.

**Bypass.** When the warp is off, the worklet is disconnected and the original graph is restored, so it costs nothing.

## 4. The editor (Warp tab)

It appears as a third tab in the bottom panel: **Devices · Warp · Sequencer**. The bottom panel is 300 px tall on the Warp tab.

**Graph area:**
- A grid of 16 columns, darker every quarter.
- The dashed identity diagonal, labelled "Normal" on hover.
- The line, drawn in white.
- A playhead in `--live`.
- **Behind the line:**
  - the output audio waveform, with the part already played lit in the warp colour;
  - a strip of 16 video thumbnails along the bottom, showing which frame each column plays.

**Line editing:**
- Click on empty space to add a point.
- Drag a point to move it. It snaps to the Snap grid horizontally, and to 1/16 of the height while Shift is held.
- Double-click a point to delete it.
- Drag the small handle at a segment's midpoint to bend it into a curve (a quadratic tension).
- Points can share an x position. That makes a vertical jump: a step.

**Tools:**

| Tool | What it does |
|---|---|
| Draw | Click-drag paints points along the drag path. |
| Steps | Click-drag paints a staircase at the Snap grid. |
| Curve | Drag bends segments. |
| Erase | Drag removes points. |

**Settings row:**
- **Amount** (0 to 100%)
- **Length** (1, 2, 4, 8 or 16 beats)
- **Snap** (1/4 to 1/64)
- **Skew** (−100 to +100%)

Each control can be dragged or stepped with the arrow keys, the same way as the BPM.

**Side panel:**
- the profile switch (Clean, Smear, Degrade) and that profile's knobs;
- Applies to;
- Mix;
- **Randomize**, which generates a musically sensible pattern on the snap grid from steps, holds, slopes and one curve;
- **Presets**: Straight, Stutter build, Half time, Freeze hits, Reverse, Tape stop, Scratch, Rearranger.

**Keyboard:**
- R randomizes.
- Delete removes the selected point.
- Arrow keys nudge the selected point by one grid step.

**Status bar:** hover text explains each element. The header text reads: "Flat = freeze, steps = repeats, slope = slow, rising = reverse".

## 5. The chain card and state

**Chain card.** A **Time warp** card sits first in the device chain whenever the warp is on:
- on/off;
- a mini view of the line;
- Amount;
- it is collapsible like the other cards.

Clicking it opens the Warp tab. When the warp is off, a dimmed "+ Time warp" slot sits in the same place.

**Store.** A new `warpStore` holds:
- `enabled`, `points`, `amount`, `lengthBeats`, `snap`, `skew`, `profile`, `profileParams`, `appliesTo`, `mix`;
- the lookup table, derived from the points.

It is saved in **presets and banks**, as a `warp?:` snapshot key in `BankSnapshot` and the preset library. `applySnapshot(undefined)` resets it to the defaults, so older presets load unchanged.

**Recording.** The recorded clip captures the canvas, so it includes the warped video. Recording audio is out of scope; recordings don't include audio today.

## Behaviour that must not change

The effect chain, the sequencer, modulation, audio bands, banks, presets, recording, export, the slicer and the SEG mask all keep working. With the warp off, video and audio are bit-identical to today: no extra GPU passes and no audio node.

## Testing and verification

The checks are puppeteer harnesses in `.superpowers/sdd/`, plus the build and lint with no new problems.

1. **Maths:**
   - lookup-table sampling;
   - the identity line gives zero delay at every phase;
   - flat at y = 0.25 gives delay = (x − 0.25)·L for x ≥ 0.25;
   - a rising line reads backwards;
   - Amount at 0 gives the identity;
   - the Skew endpoints are fixed;
   - the 8 s clamp.
2. **Video:** a synthetic source whose frames encode their index as a colour. With known lines (identity, freeze, step, reverse), check that the output frame indexes are correct within ±1 captured frame. With the warp off, the input texture is the live texture itself (same object).
3. **Audio:** run the worklet in an OfflineAudioContext on a ramp signal. Check that the identity output equals the input, a freeze holds a value, reverse gives a decreasing ramp, and a jump with Smooth on has no discontinuity above a threshold.
4. **Sync:** with video and audio both warped, both report the same phase within 1 video frame at 120 BPM.
5. **Editor:**
   - adding, moving, curving and deleting points;
   - the steps tool;
   - snap;
   - the settings row and keyboard;
   - randomize produces a valid line;
   - presets load;
   - the Warp tab and the chain card stay in step.
6. **Regressions:** the existing layout checks, seg-verify, bands-check and export-check.
7. **Screenshots** of the Warp tab with each profile, shown beside the mockup.

## Out of scope

- Modulating the warp parameters.
- More than 3 profiles.
- Warping live mic or system audio.
- Recording audio.
- Per-effect or post-effect warping.
- More than one warp lane.
