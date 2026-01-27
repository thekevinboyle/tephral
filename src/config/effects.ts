export interface EffectDefinition {
  id: string
  label: string
  color: string
  row: 'color' | 'distortion' | 'texture' | 'render'
  min: number
  max: number
}

export const EFFECTS: EffectDefinition[] = [
  // Row 1: Color/Channel
  { id: 'rgb_split', label: 'RGB', color: '#0891b2', row: 'color', min: 0, max: 50 },
  { id: 'chromatic', label: 'CHROMA', color: '#6366f1', row: 'color', min: 0, max: 100 },
  { id: 'posterize', label: 'POSTER', color: '#dc2626', row: 'color', min: 2, max: 16 },
  { id: 'color_grade', label: 'GRADE', color: '#ea580c', row: 'color', min: 0, max: 200 },

  // Row 2: Distortion
  { id: 'block_displace', label: 'BLOCK', color: '#a855f7', row: 'distortion', min: 0, max: 100 },
  { id: 'static_displace', label: 'STATIC', color: '#8b5cf6', row: 'distortion', min: 0, max: 100 },
  { id: 'pixelate', label: 'PIXEL', color: '#d946ef', row: 'distortion', min: 2, max: 32 },
  { id: 'lens', label: 'LENS', color: '#0284c7', row: 'distortion', min: -100, max: 100 },

  // Row 3: Texture/Overlay
  { id: 'scan_lines', label: 'SCAN', color: '#65a30d', row: 'texture', min: 100, max: 1000 },
  { id: 'vhs', label: 'VHS', color: '#059669', row: 'texture', min: 0, max: 100 },
  { id: 'noise', label: 'NOISE', color: '#84cc16', row: 'texture', min: 0, max: 100 },
  { id: 'dither', label: 'DITHER', color: '#22c55e', row: 'texture', min: 2, max: 16 },

  // Row 4: Render Modes
  { id: 'edges', label: 'EDGES', color: '#f59e0b', row: 'render', min: 10, max: 100 },
  { id: 'ascii', label: 'ASCII', color: '#d97706', row: 'render', min: 6, max: 20 },
  { id: 'stipple', label: 'STIPPLE', color: '#b45309', row: 'render', min: 1, max: 8 },
  { id: 'feedback', label: 'FEEDBACK', color: '#92400e', row: 'render', min: 0, max: 100 },
]

export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'color'),
  EFFECTS.filter(e => e.row === 'distortion'),
  EFFECTS.filter(e => e.row === 'texture'),
  EFFECTS.filter(e => e.row === 'render'),
]
