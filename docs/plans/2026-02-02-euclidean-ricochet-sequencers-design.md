# Euclidean & Ricochet Sequencers Design

Two new sequencer tabs alongside the existing slicer, each generating rhythmic modulation patterns for effect parameters.

## Overview

- **Euclidean**: Algorithmic pattern generator using Bjorklund's algorithm. Steps, hits, rotation.
- **Ricochet**: Physics-based sequencer with ball bouncing inside polygons. Collisions trigger output.

Both output 0-1 values that route to effect parameters using the existing drag-to-parameter system.

---

## Architecture

### Files Structure

```
src/
├── components/sequencer/
│   ├── EuclideanPanel.tsx      # Main panel component
│   ├── EuclideanDisplay.tsx    # Circular pattern visualization
│   ├── RicochetPanel.tsx       # Main panel component
│   └── RicochetDisplay.tsx     # Polygon + ball visualization
├── stores/
│   ├── euclideanStore.ts       # Pattern params, playback state, output value
│   └── ricochetStore.ts        # Shape params, physics state, output value
└── hooks/
    ├── useEuclideanEngine.ts   # Timing logic, pattern computation
    └── useRicochetEngine.ts    # Physics simulation, collision detection
```

### Integration Points

1. Update `SequencerType` in `sequencerContainerStore.ts`:
   ```typescript
   export type SequencerType = 'slicer' | 'euclidean' | 'ricochet'
   ```

2. Add icons to `SequencerIconBar.tsx` with accent colors:
   - Euclidean: `#FF9F43` (warm orange)
   - Ricochet: `#00D9FF` (cyan)

3. Add panel cases in `SequencerContainer.tsx`

4. Routing uses existing `sequencerStore` pattern - sequencers act as modulation sources

---

## Euclidean Sequencer

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Steps | 4-32 | Total steps in pattern |
| Hits | 1 to steps | Active triggers (Bjorklund distributed) |
| Rotation | 0 to steps-1 | Pattern rotation offset |
| Decay | 0-100% | Output falloff speed after trigger |

### Visual Layout

```
┌─────────────────────────────────────────┐
│ EUCLIDEAN                    [SYNC|FREE]│
├─────────────────────────────────────────┤
│                              Steps   16 │
│         ●   ●                           │
│       ○       ○              Hits  5/16 │
│      ○    ◉    ○                        │
│       ○       ○              Rotate   0 │
│         ○   ○                           │
│                              Decay  50% │
├─────────────────────────────────────────┤
│  ◉ Output                               │
└─────────────────────────────────────────┘
```

- Center: Circular ring of step dots
- Filled dots (●) = active hits
- Current step has glow (◉)
- Right side: Parameter values (click-drag to adjust)
- Bottom: Draggable output indicator

### Algorithm

Bjorklund's algorithm distributes hits as evenly as possible across steps:
- 5 hits in 16 steps → `[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0]`
- Rotation shifts the pattern start point

---

## Ricochet Sequencer

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Shape | 3-8 sides | Polygon geometry |
| Speed | 0.1-3x | Ball velocity multiplier |
| Gravity | 0-100% | Downward pull on ball |
| Bounce | 50-100% | Energy retained on collision |

### Visual Layout

```
┌─────────────────────────────────────────┐
│ RICOCHET                     [SYNC|FREE]│
├─────────────────────────────────────────┤
│ △ ○ □ ⬠ ⬡ ⬢              ║▌║  Speed    │
│                            ║▌║  Gravity │
│      ╱╲                    ║▌║  Bounce  │
│     ╱  ╲                   ║ ║          │
│    ╱ ●  ╲                              │
│   ╱______╲                              │
│                                         │
├─────────────────────────────────────────┤
│  ◉ Output                               │
└─────────────────────────────────────────┘
```

- Top left: Shape selector icons
- Center: Polygon with bouncing ball (●)
- Ball leaves subtle motion trail
- Walls flash on collision
- Right side: Vertical slider bars
- Bottom: Draggable output indicator

### Physics

- Ball moves with velocity vector
- Reflects off walls (angle of incidence = angle of reflection)
- Gravity adds constant downward acceleration
- Bounce < 100% causes gradual slowdown, auto-reset when too slow
- When SYNC mode: speed calibrated so collisions align with beat divisions

---

## Shared Behaviors

### Output Signal

- Trigger → output jumps to 1.0
- Decay controls exponential falloff toward 0
- Creates percussive hits (fast decay) or smooth LFO-like modulation (slow decay)

### Sync Modes

| Mode | Behavior |
|------|----------|
| SYNC | Pattern locked to transport BPM, runs only when playing |
| FREE | Runs continuously at independent rate (0.1-20Hz) |

Switching modes doesn't reset position - seamless transition.

### Bypass

- Green border when enabled (matches slicer)
- Bypassed: output = 0, visuals dimmed but still animate
- Double-click header to toggle

### Routing

- Same drag-to-parameter pattern as automation tracks
- Drag output indicator onto any SliderRow
- Depth control: drag up/down on routed indicator
- Double-click indicator to remove routing
- Stored in `sequencerStore` alongside existing routings

---

## Accent Colors

| Sequencer | Color | Hex |
|-----------|-------|-----|
| Slicer | Red | `#FF6B6B` |
| Euclidean | Orange | `#FF9F43` |
| Ricochet | Cyan | `#00D9FF` |

---

## Implementation Order

1. Euclidean store + engine (simpler, no physics)
2. Euclidean panel + display
3. Routing integration
4. Ricochet store + engine
5. Ricochet panel + display
6. Sync mode for both
