# Time Warp v2: HyperWarp line, 7 profiles, dice and locks, warp as modulator

**Date:** 2026-10-08

**Status:** The design and the mockup (`assets/2026-10-08-time-warp/warp2.png`) were approved in conversation. This written spec is awaiting review.

**Builds on:** `2026-10-08-time-warp-design.md` (v1). Everything in v1 still holds unless this document replaces it.

**Reference:** the HyperWarp manual (babyaud.io/docs/hyperwarp-manual) and the reference frame `ref-graph.png`. We borrow the interaction model only. No Baby Audio names, assets or presets are used. The seven profile names describe what each profile does; the user chose to keep them.

## Why

v1 read the line backwards compared with HyperWarp. In v1, the dashed diagonal meant normal playback and flat meant freeze. In HyperWarp, the **top edge is live**, the **height of the line is how far back you hear**, and the dashed 45° line means **stopped**. A line copied from HyperWarp therefore did something different in v1. v2 switches to HyperWarp's meaning and adds the features the user picked:
- all 7 profiles;
- the graph tools and the Output section;
- dice with locks;
- the warp line as a modulation source.

The user did **not** pick the Warp panel (Resolution, Pitch, Scatter, Feedback), so it is out of scope.

## 1. Time model (replaces v1 §1 "How far back it reads", Amount and Skew)

- **x** is the loop phase, from 0 to 1. **y = f(x)**, from 0 to 1, is **how far back** to read, as a fraction of the loop. y = 0 is drawn at the top and means live; y = 1 is drawn at the bottom and means one loop ago.
- **Skew** stays as in v1: `x′ = x^(2^(−1.5·skew))`, applied to the line's input.
- **Amount** squashes the line toward the top: `y′ = amount · f(x′)`.
- The delay is `delay = y′ · L_seconds`, clamped to 8 s. There is no wrap and no modulo.
- **Playback speed** is `1 − dy′/dx` in loop units:

| Line shape | Speed | Result |
|---|---|---|
| Flat, at any height | 1 | Normal playback, delayed by that height |
| Gentle downward slope | 0 to 1 | Slow motion |
| Along the 45° guide y = x | 0 | Stopped (freeze) |
| Steeper than the guide | below 0 | Reverse |
| Rising | above 1 | Faster than normal |
| Vertical step down | (jump) | Jump back: repeats and stutters |
| Curve into the guide | slowing to 0 | Tape stop |

- **Defaults.** The default line is flat along the top, `[{0,0},{1,0}]`, so turning the warp on changes nothing until you draw. `normalizePoints`, bends and shared-x steps work exactly as in v1.
- **Presets are rebuilt in the new meaning.**
  - Straight is flat along the top.
  - Every other preset must produce the same delay over time as its v1 version, using `y_new = (x − y_old) mod 1`. Insert a vertical step wherever the mod wraps.
  - The tests compare the two delay curves at 1024 phases. Allow a small tolerance near the inserted steps.
- **Migration.** v1 never left the feature branch, so stored v1 points need no migration.

## 2. Graph editor changes (amends v1 §4)

- The **guide line** is the dashed 45° y = x line, labelled "stopped". The edges are labelled "live" (top) and "1 loop back" (bottom).
- **Header hint:** "Top = live · lower = further back · flat = normal · along the dashed line = stopped · steeper = reverse".
- **Tools:** Draw, Steps, Curve and Erase.
  - **Holding Shift while in Draw switches to step drawing.** This replaces v1's Shift-snaps-y. **Alt snaps y to 1/16.**
- **New buttons:**
  - **Random steps**: a staircase-heavy pattern on the quantize grid.
  - **Random curves**: curve and slope heavy.
  - **Clear**: flat along the top.
  - **Lines ▾**: user line presets, then the built-ins.
  - **Save line**: prompts inline for a name. No modal; it uses an inline text field.
- **User lines** are saved in `localStorage` (`seg.warp.lines`). Every access goes through try/catch. If storage is unavailable the list is just empty.
- **R** now means Random steps.
- **Length:** ½, 1, 2, 4, 8 or 16 beats.
- **Quantize:** Off, 1/4, 1/8, 1/16, 1/32 or 1/64 of the loop. The settings row label changes from "Snap" to "Quantize".
  - With Off, x does not snap and the random generators use 1/16.
  - The store keeps the key `snap`; `0` means Off.

## 3. Profiles (replaces v1 §2 and §3 profile tables)

There are seven profiles: `clean`, `flange`, `degrade`, `filterspam`, `harmonicer`, `fauxcoder` and `lofizzly`.
- Each has **four knobs, 0 to 1**. The same four knob values drive the sound and the picture.
- The store keeps `profileParams: Record<ProfileId, [number, number, number, number]>`, so each profile remembers its own knobs.

**Neutral rule.** For every profile, there is a knob setting called its **neutral**. At the neutral setting, with a flat line at the top and Mix at 100%:
- the audio equals the input to within 1e-4;
- the video is the live texture object itself.

The default knobs differ from the neutral settings so that each profile is audible.

**Audio engine.** It is a two-stream grain player in the worklet, reading from the delay line at `now − delay`, with per-grain processing.

| Profile (UI name) | Knob 1 | Knob 2 | Knob 3 | Knob 4 |
|---|---|---|---|---|
| Clean | Vibrato | Vib speed | Echo | Circuit-bend |
| Flange | Modulation | Physics | Grain size | Width |
| Degrade | Degrade | Cutoff | Grain size | Chaos |
| Filter Spam | Cutoff | Randomness | Resonance | Octaves |
| Harmo-nicer | Harmonize | Detune | Speed | Reverse |
| Fauxcoder | Amount | Squelch | Cutoff | Magic |
| Lo-fizzly | Degrade | Dirt | Radio | Rate |

**Clean** (neutral 0, 0, 0, 0)
- **Sound:**
  - an interpolated read with a 15 ms crossfade at jumps;
  - Vibrato modulates the delay by up to ±6 ms; Vib speed runs from 0.5 to 12 Hz;
  - Echo is a feedback echo of the wet signal, fixed at ⅛ of a beat, with feedback from 0 to 0.85;
  - Circuit-bend replaces random 5–40 ms chunks with chunks read from a wrong offset. Its probability scales with the knob.
- **Picture:** Vibrato and Vib speed give a sinusoidal UV wobble. Echo fades the previous output into the current frame. Circuit-bend makes random 16–64 px blocks read from neighbouring frames.

**Flange** (neutral 0, 1, any, 0)
- **Sound:**
  - Grain size runs from 10 to 120 ms.
  - Modulation adds random pitch and rate jitter per grain, up to ±1 semitone.
  - Physics sets the grain playback rate. At 1 the rate follows speed (tape); at 0, grains play at normal pitch while the read point moves (pitch held).
  - Width offsets the left and right grain streams in time, by up to half a grain.
- **Picture:** smear taps of 2 to 6 frames come from Grain size. Modulation jitters the taps. Width reads R, G and B at time offsets. Physics blends the taps toward the single read frame.

**Degrade** (neutral 0, 1, any, 0)
- **Sound:**
  - Degrade applies sample-rate reduction (down to 2 kHz) and a bit-crush (down to 4 bits).
  - Cutoff is a per-grain one-pole lowpass from 200 Hz to 20 kHz.
  - Grain size runs from 10 to 120 ms.
  - Chaos adds random per-grain pitch, up to ±7 semitones.
- **Picture:** Degrade holds frames at a lower rate (30 down to 4 fps) and posterizes. Cutoff adds blur. Grain size sets the pixel block size. Chaos adds random frame jitter.

**Filter Spam** (neutral 1, 0, 0, 0)
- **Sound:**
  - per-grain resonant lowpass (biquad);
  - Cutoff sets the base cutoff, from 200 Hz to 18 kHz;
  - Randomness randomizes cutoff and Q per grain;
  - Resonance sets Q from 0.7 to 12;
  - Octaves is the probability that a grain plays an octave up.
- **Picture:** each 1/16 slice of the loop gets a random blur and tint, with the strength set by Randomness. The base blur comes from Cutoff. Resonance gives an edge halo (unsharp mask). Octaves is the chance that a slice plays at double speed.

**Harmo-nicer** (neutral 0, 0, any, 0)
- **Sound:**
  - Harmonize sets the level of extra grain voices at the octave (2×) and the fifth (1.5×), plus their feedback.
  - Detune offsets those voices by up to ±30 cents.
  - Speed is the arpeggio rate between the octave and the fifth, from 0.5 to 8 Hz.
  - Reverse is the probability that a grain plays backwards.
- **Picture:** zoomed copies at 2× and 1.5× are layered over the frame, with opacity from Harmonize. Detune offsets and rotates the copies. Speed cycles which copy is emphasised. Reverse mirrors the copies.

**Fauxcoder** (neutral 0, 0, any, 0)
- **Sound:**
  - a bank of 8 resonant band-pass filters on the harmonic series of a base frequency;
  - Cutoff sets the base, from 80 to 800 Hz;
  - Amount is the wet resonance mix;
  - Squelch is a fast modulation of the filter frequencies, from 4 to 40 Hz;
  - Magic randomizes that modulation.
- **Picture:** a luminance band rings in false colour, with strength from Amount. Cutoff sets which luminance band. Squelch flickers the band. Magic randomizes the flicker.

**Lo-fizzly** (neutral 0, 0, 0, any)
- **Sound:**
  - Degrade is sample-rate reduction modulated by an LFO;
  - Rate sets that LFO's speed, from 0.2 to 30 Hz (slow wobble up to FM-like);
  - Dirt adds per-grain noise and random level;
  - Radio is a 300 Hz to 3 kHz band-pass with some resonance (boxy).
- **Picture:** Degrade drops the horizontal resolution, with Rate as its wobble. Dirt adds noise and line jitter. Radio adds chroma bleed and a vignette.

**Old v1 profile values.** A v1 snapshot with profile `smear` becomes `flange`. `clean` and `degrade` keep their names. Old 1–2 knob values map onto the first knobs.

## 4. Output (new)

- **Band** is a low-cut and a high-cut on the **wet** signal.
  - Sound: the low cut runs from 20 Hz to 2 kHz and the high cut from 500 Hz to 20 kHz, with 12 dB/oct high-pass and low-pass filters.
  - Picture: the wet picture shows only inside a luminance band (`low` to `high`). Outside it the dry picture shows, with soft edges. This matches "process only part of the range".
- **Level** applies wet gain from −24 to +6 dB. On the picture it is the wet brightness gain.
- **Mix** is as in v1.
- **Neutral:** Band fully open and Level 0 dB leave the signal untouched.

## 5. Dice and locks (new)

- **Dice** randomizes every unlocked group:
  - **Graph:** Random steps or Random curves, 50/50.
  - **Settings:** Length, Quantize and Skew.
  - **Knobs:** the current profile's four knobs.
  - **Output:** Band, Level and Mix. Mix is drawn from 0.5 to 1, and Level from −6 to +3 dB.
- Dice never changes Applies to or On/Off.
- **Locks** apply per group: `amount`, `profile`, `graph`, `settings`, `knobs` and `output`. By default `amount` and `profile` are locked.
- The 🔒 button switches lock mode on and off. In lock mode, each group shows a lock you can click.
- Locks are a UI preference saved in `localStorage` (`seg.warp.locks`), with try/catch around access. They are not saved in banks or presets.

## 6. The warp line as a modulation source (new)

- **Slot.** A new **Warp** slot (`id 'warp'`) sits in the Modulators card, with a line-shaped icon. It is armed and routed exactly like an LFO: press ●, then click or drag any dial or bar.
- **Value.** The value is **y′ at the heard playhead**: `amount · f(skewPhase(getHeardWarpPhase(), skew))`, from 0 to 1. It is 0 at the top and 1 at the bottom.
  - It is computed every frame whenever a route uses it, regardless of whether the warp's own audio/video effect is on. This lets the line work purely as a modulation sequencer.
  - It follows the same clock as the warp, so it stays in sync with the picture and sound.
- **Inspector.** In modulator mode, Warp shows:
  - a mini line;
  - Amount;
  - an "Open Warp tab" button;
  - the note "Modulation follows the line even when the warp effect is off".
- **Dry/wet becomes routable for every modulator.**
  - The device card's Dry/wet bar takes part in the arm-and-assign flow with the param id `<effectId>.effectMix`.
  - Modulation writes it through `setEffectMix`, the same way other params are written, so the existing semantics are kept.
  - The Inspector's Modulation list shows such routes as "Dry/wet".
- **Persistence.** Routes are still not saved in banks or presets, the same as for every modulator today. That is a separate fix and out of scope.

## Behaviour that must not change

- Everything in the v1 "must not change" list, and every v1 bypass guarantee: warp off means no capture, no pass and no worklet.
- The chain card and saving in banks and presets (v1 Task 5).
- Existing modulator routes and their depth behaviour.
- The frame rate with the warp on stays within 5% of the warp off.
- The audio worklet renders 10 s of stereo at 48 kHz in under 1.5 s of an OfflineAudioContext on every profile, as a CPU budget check.

## Testing

All checks are puppeteer harnesses in `.superpowers/sdd/`, plus the build and lint with no new problems.

1. **Maths:**
   - a flat line at h gives a constant delay of h·L;
   - y = x gives a constant read time, which is stopped;
   - a line steeper than the guide reads backwards;
   - a rising line reads faster;
   - Amount 0 gives live;
   - the 8 s clamp;
   - the presets' delay curves equal v1's;
   - Random steps and Random curves return valid normalized lines on every quantize setting, including Off.
2. **Audio:** for each profile:
   - the neutral setting is bit-close to the input;
   - the defaults produce a different, finite, non-silent output;
   - no NaN;
   - the CPU budget.
   - Also: the Output Band and Level are neutral when open; a 1 kHz tone is attenuated by at least 12 dB with the high cut at 500 Hz.
3. **Video:** each profile shader compiles and renders; the neutral rule holds (same object); the frame-rate check; the Output band with the luminance key.
4. **Editor:** Shift step-drawing, Alt y-snap, Random steps/curves, Clear, Save line and loading it back (and a storage-blocked page still works), ½-beat length, quantize Off, the hint copy, and the guide label.
5. **Dice and locks:** locked groups are unchanged after 20 rolls; unlocked groups change; the default locks; locks persist across reloads.
6. **Modulation:**
   - Warp routed to Stale's Cell size follows the line; for a flat line at 0.5, the value equals 0.5 × depth mapping;
   - it still works with the warp effect off;
   - an LFO routed to Dry/wet changes `effectMix`;
   - the Dry/wet route shows in the Inspector as "Dry/wet".
7. **Regressions:** warpui, warpcard, warpvideo, warpaudio, devices, inspector, shell2, labels, menus, seg-verify wiring, bands-check, and export-check.
8. **Screenshots:** the Warp tab with each of the 7 profiles, lock mode, and the Devices tab with Warp routed. Compare them with the mockup.

## Out of scope

- The Warp panel (Resolution, Pitch, Scatter, Feedback).
- Saving modulation routes in banks and presets.
- Warp speed or jump-trigger modulation outputs.
- A separate modulation lane.
- More than one warp line.
- Recording audio.
