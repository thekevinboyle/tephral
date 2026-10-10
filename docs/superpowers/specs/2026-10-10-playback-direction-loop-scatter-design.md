# Playback direction, loop region and Scatter: design

Date: 2026-10-10. Status: approved in chat (2026-10-10), this file is the written spec.

## 1. What and where

Three playback controls for every line that has a playhead: the Warp line, every Lines track and the Lines
Master. Each line has its own set.

| Control | Values | Default |
| --- | --- | --- |
| Direction | Fwd, Rev, Ping-pong, Random | Fwd |
| Loop region | Start and End, 0..1 of the line's x axis, Start < End | 0 and 1 |
| Scatter | 0..1 (shown 0..100%) | 0 |

Defaults reproduce today's playback exactly (bit for bit in the level and the delay).

## 2. The playhead

One pure function turns the clock into the x the line is read at (the line's point space, the graph's x axis):

```
playPosition(loopPos, play) -> x
  cycle = floor(loopPos), ph = loopPos - cycle            // loopPos = absolute loops since the anchor
  u = skewPhase(ph, play.skew)                             // Skew first (unchanged meaning)
  Direction:
    fwd       u
    rev       1 - u
    pingpong  cycle even: u; cycle odd: 1 - u              // one round trip = 2 x Length
    random    slice k = floor(u N) plays slice R(seed, cycle, k) mod N (repeats allowed), same offset inside it
  Scatter (s > 0): slice k plays perm(seed, cycle)[k] when H(seed, cycle, k) < s, else k
  x = start + u (end - start)                              // the region, stretched over the whole Length
```

- **Slices**: N = round(1 / Quantize) (Quantize 1/4..1/64), 16 when Quantize is Off. They divide the region.
- **Randomness** is a pure hash of (seed, cycle, slice), never Math.random, so the picture and the sound
  compute the same order. `perm(seed, cycle)` is a Fisher-Yates shuffle driven by a mulberry32 seeded with
  hash(seed, cycle). Each pass (cycle) gets a new order. Seeds: the Warp a constant, the Master a constant,
  each Lines track a hash of its effect id (tracks scatter differently).
- Scatter 0 is in order, 1 is fully shuffled, in between moves that share of slices on average.
- **Edges**: u is clamped to 0..1; rev at u = 1 gives 0 (a jump the warp already handles as a step).
- **Warp time model** is unchanged in form: `delay = amount · f(x) · L`. Rev runs the line backwards, so a line
  that held the picture still now plays it reversed at double speed. Documented, not special-cased.

### Clock positions

- **Warp**: the shared warp clock gains the absolute position (`getWarpPosition(t)`, `getHeardWarpPosition()`,
  loops since the segment's t0). The worklet computes the same from its segments. The phase functions stay.
- **Lines**: the beat counter gives each line `loopPos = beats / line.beats` (Master the same with its beats).
  The playback pass stores the position (`setLinePos`) next to the phase it stores today.

## 3. Engines

- **Lines level**: `lineLevel` takes x (already mapped) instead of phase + skew; the playback pass maps each
  line with `playPosition`. Master likewise. The level formula (1 − amount × y) is unchanged.
- **Warp audio** (`public/worklets/warp-processor.js`): a port of `playPosition` and its hash and shuffle, kept in
  sync like the existing maths. Per sample: x = playPosition(posAt(t), play), delay = amount · lut(x) · L. The
  shuffle is cached per cycle (no allocation in process()). The existing click guard crossfades slice jumps.
  New params fields: direction, start, end, scatter, slices.
- **Warp picture** (`WarpCompositor`): render takes the absolute position; jump detection walks positions
  (mapped through `playPosition`) instead of phases, so a slice jump counts as a jump.
- **Warp modulation source** (`warpModValue`) reads y at the mapped x.

## 4. Editor UI

- **Bar**: two new fields after Skew, Direction (a Spin cycling Fwd, Rev, Ping-pong, Random) and Scatter
  (0..100%, drag like Amount). The Warp bar and the Lines bar both get them (Lines keeps Grid Y).
- **Loop handles** in `LinePlot` (shared, so both editors): two small handles on the plot's top edge at Start
  and End. Dragging snaps to Quantize (1/16 when Off); Alt drags freely; double-click resets that handle (Start
  0, End 1). Minimum region one slice (1/64 when free). The plot outside the region is dimmed. Handles carry
  `data-warp-loop` / `data-line-loop` = `start` | `end`.
- **Playheads** (Warp graph, Lines graph, Line lane preview, Lines side panel readout) show the mapped x, so they
  jump with Scatter and Random and run backwards with Rev.
- **Lines fill** ("what you hear"): sampled over the track's current pass in time, each sample drawn at its
  mapped x (track level × master level at that moment); the dashed master is drawn from the same samples. Plain
  settings give today's picture.
- **Warp thumbnails and waveform**: per column, the time the last completed pass read that column (sampled over
  the pass); a column the pass never read stays empty. The waveform bars index by the mapped x.

## 5. Saving, copying, Dice

- **Warp**: `direction`, `loopStart`, `loopEnd`, `scatter` in `WarpSnapshot` (banks and presets). `sanitize`:
  direction from the list, start and end clamped to 0..1 with start < end (else the full range), scatter 0..1;
  missing fields take the defaults, so older saves play as before.
- **Lines**: the same four fields on `TrackLine`, validated by `mergeLine`. Not in banks or presets (like the
  rest of Lines). Alt-drag tab copy copies them.
- **Dice** (Warp and Lines) never changes them.

## 6. Testing

- Unit checks (harness `playmath`): each direction over a few cycles, the region mapping, Scatter 0 = identity,
  Scatter 1 = a permutation per pass, different passes differ, Random repeats allowed, defaults = today's level
  and delay exactly, and the worklet port equals the TS function on 10 000 random inputs.
- Browser checks (`playui`): the bar fields and the loop handles (drag, snap, Alt, double-click reset), the
  Lines level follows the region and direction while playing, the warp's video and audio positions agree with
  Scatter on, saves load, older saves play as before, Dice leaves the fields.
- Existing warp and lines harness modes still pass. Screenshots on the progress page.

## Out of scope

Direction, region and Scatter for Steps tracks; Dice rolling these fields; per-slice probability editing.
