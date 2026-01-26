export interface EffectDefinition {
  id: string
  label: string
  color: string
  row: 'glitch' | 'render' | 'overlay' | 'vision'
  min: number
  max: number
}

export const EFFECTS: EffectDefinition[] = [
  // Row 1: Glitch effects (post-processing)
  {
    id: 'rgb_split',
    label: 'RGB',
    color: '#00d4ff', // glitch-cyan
    row: 'glitch',
    min: 0,
    max: 50,
  },
  {
    id: 'block_displace',
    label: 'BLOCK',
    color: '#ff00aa', // glitch-magenta
    row: 'glitch',
    min: 0,
    max: 100,
  },
  {
    id: 'scan_lines',
    label: 'SCAN',
    color: '#4444ff', // glitch-blue
    row: 'glitch',
    min: 100,
    max: 1000,
  },
  {
    id: 'noise',
    label: 'NOISE',
    color: '#aa44ff', // glitch-purple
    row: 'glitch',
    min: 0,
    max: 100,
  },

  // Row 2: Render effects (full-frame transforms)
  {
    id: 'ascii',
    label: 'ASCII',
    color: '#ffaa00', // render-amber
    row: 'render',
    min: 6,
    max: 20,
  },
  {
    id: 'matrix',
    label: 'MATRIX',
    color: '#00ff00', // matrix green
    row: 'render',
    min: 10,
    max: 300,
  },
  {
    id: 'stipple',
    label: 'STIPPLE',
    color: '#ff6600', // render-orange
    row: 'render',
    min: 1,
    max: 8,
  },
  {
    id: 'pixelate',
    label: 'PIXEL',
    color: '#ff6600', // render-orange
    row: 'render',
    min: 2,
    max: 32,
  },

  // Row 3: Overlay effects (detection-based)
  {
    id: 'detect_boxes',
    label: 'DETECT',
    color: '#88ff00', // vision-lime
    row: 'overlay',
    min: 1,
    max: 6,
  },
  {
    id: 'attach_to_objects',
    label: 'ATTACH',
    color: '#ffffff', // white - modifier
    row: 'overlay',
    min: 10,
    max: 90,
  },
  {
    id: 'point_network',
    label: 'NETWORK',
    color: '#00ffaa', // vision-teal
    row: 'overlay',
    min: 1,
    max: 10,
  },
  {
    id: 'edges',
    label: 'EDGES',
    color: '#00ffaa', // vision-teal
    row: 'overlay',
    min: 10,
    max: 100,
  },

  // Row 4: Vision/Landmark effects
  {
    id: 'face_mesh',
    label: 'FACE',
    color: '#ff3366', // pink
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'hands',
    label: 'HANDS',
    color: '#ff3366', // pink
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'pose',
    label: 'POSE',
    color: '#3366ff', // blue
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'holistic',
    label: 'HOLISTIC',
    color: '#3366ff', // blue
    row: 'vision',
    min: 10,
    max: 90,
  },
]

export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'glitch'),
  EFFECTS.filter(e => e.row === 'render'),
  EFFECTS.filter(e => e.row === 'overlay'),
  EFFECTS.filter(e => e.row === 'vision'),
]
