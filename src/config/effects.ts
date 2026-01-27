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
    color: '#0891b2', // muted cyan
    row: 'glitch',
    min: 0,
    max: 50,
  },
  {
    id: 'block_displace',
    label: 'BLOCK',
    color: '#a855f7', // muted purple
    row: 'glitch',
    min: 0,
    max: 100,
  },
  {
    id: 'scan_lines',
    label: 'SCAN',
    color: '#6366f1', // indigo
    row: 'glitch',
    min: 100,
    max: 1000,
  },
  {
    id: 'noise',
    label: 'NOISE',
    color: '#8b5cf6', // violet
    row: 'glitch',
    min: 0,
    max: 100,
  },

  // Row 2: Render effects (full-frame transforms)
  {
    id: 'ascii',
    label: 'ASCII',
    color: '#d97706', // amber
    row: 'render',
    min: 6,
    max: 20,
  },
  {
    id: 'matrix',
    label: 'MATRIX',
    color: '#059669', // emerald
    row: 'render',
    min: 10,
    max: 300,
  },
  {
    id: 'stipple',
    label: 'STIPPLE',
    color: '#ea580c', // orange
    row: 'render',
    min: 1,
    max: 8,
  },
  {
    id: 'pixelate',
    label: 'PIXEL',
    color: '#dc2626', // red
    row: 'render',
    min: 2,
    max: 32,
  },

  // Row 3: Overlay effects (detection-based)
  {
    id: 'blob_detect',
    label: 'DETECT',
    color: '#65a30d', // lime
    row: 'overlay',
    min: 0,
    max: 1,
  },
  {
    id: 'edges',
    label: 'EDGES',
    color: '#0284c7', // sky
    row: 'overlay',
    min: 10,
    max: 100,
  },

  // Row 4: Vision/Landmark effects
  {
    id: 'face_mesh',
    label: 'FACE',
    color: '#e11d48', // rose
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'hands',
    label: 'HANDS',
    color: '#db2777', // pink
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'pose',
    label: 'POSE',
    color: '#2563eb', // blue
    row: 'vision',
    min: 10,
    max: 90,
  },
  {
    id: 'holistic',
    label: 'HOLISTIC',
    color: '#7c3aed', // purple
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
