export interface EffectDefinition {
  id: string
  label: string
  color: string
  row: 'color' | 'distortion' | 'texture' | 'render' | 'vision' | 'reserved'
  page: number  // 0-3 for 4 pages
  min: number
  max: number
}

// Page names for UI
export const PAGE_NAMES = ['GLITCH', 'VISION', 'RESERVED', 'RESERVED']

export const EFFECTS: EffectDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PAGE 0: GLITCH CORE
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Color/Channel
  { id: 'rgb_split', label: 'RGB', color: '#0891b2', row: 'color', page: 0, min: 0, max: 50 },
  { id: 'chromatic', label: 'CHROMA', color: '#6366f1', row: 'color', page: 0, min: 0, max: 100 },
  { id: 'posterize', label: 'POSTER', color: '#dc2626', row: 'color', page: 0, min: 2, max: 16 },
  { id: 'color_grade', label: 'GRADE', color: '#ea580c', row: 'color', page: 0, min: 0, max: 200 },

  // Row 2: Distortion
  { id: 'block_displace', label: 'BLOCK', color: '#a855f7', row: 'distortion', page: 0, min: 0, max: 100 },
  { id: 'static_displace', label: 'STATIC', color: '#8b5cf6', row: 'distortion', page: 0, min: 0, max: 100 },
  { id: 'pixelate', label: 'PIXEL', color: '#d946ef', row: 'distortion', page: 0, min: 2, max: 32 },
  { id: 'lens', label: 'LENS', color: '#0284c7', row: 'distortion', page: 0, min: -100, max: 100 },

  // Row 3: Texture/Overlay
  { id: 'scan_lines', label: 'SCAN', color: '#65a30d', row: 'texture', page: 0, min: 100, max: 1000 },
  { id: 'vhs', label: 'VHS', color: '#059669', row: 'texture', page: 0, min: 0, max: 100 },
  { id: 'noise', label: 'NOISE', color: '#84cc16', row: 'texture', page: 0, min: 0, max: 100 },
  { id: 'dither', label: 'DITHER', color: '#22c55e', row: 'texture', page: 0, min: 2, max: 16 },

  // Row 4: Render Modes
  { id: 'edges', label: 'EDGES', color: '#f59e0b', row: 'render', page: 0, min: 10, max: 100 },
  { id: 'feedback', label: 'FEEDBACK', color: '#d97706', row: 'render', page: 0, min: 0, max: 100 },
  { id: 'ascii', label: 'ASCII', color: '#b45309', row: 'render', page: 0, min: 6, max: 20 },
  { id: 'stipple', label: 'STIPPLE', color: '#92400e', row: 'render', page: 0, min: 1, max: 8 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: VISION / TRACKING
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Detection
  { id: 'contour', label: 'CONTOUR', color: '#10b981', row: 'vision', page: 1, min: 0, max: 100 },
  { id: 'face_mesh', label: 'FACE', color: '#14b8a6', row: 'vision', page: 1, min: 10, max: 90 },
  { id: 'hands', label: 'HANDS', color: '#06b6d4', row: 'vision', page: 1, min: 10, max: 90 },
  { id: 'pose', label: 'POSE', color: '#0ea5e9', row: 'vision', page: 1, min: 10, max: 90 },

  // Row 2-4: Reserved for future vision effects
  { id: 'reserved_v1', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v2', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v3', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v4', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v5', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v6', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v7', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v8', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v9', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v10', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v11', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v12', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: RESERVED
  // ═══════════════════════════════════════════════════════════════
  { id: 'reserved_2_1', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_2', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_3', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_4', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_5', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_6', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_7', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_8', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_9', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_10', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_11', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_12', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_13', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_14', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_15', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'reserved_2_16', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 3: RESERVED
  // ═══════════════════════════════════════════════════════════════
  { id: 'reserved_3_1', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_2', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_3', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_4', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_5', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_6', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_7', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_8', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_9', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_10', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_11', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_12', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_13', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_14', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_15', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
  { id: 'reserved_3_16', label: '—', color: '#374151', row: 'reserved', page: 3, min: 0, max: 100 },
]

// Get effects for a specific page
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  return EFFECTS.filter(e => e.page === page)
}

// Legacy exports for compatibility
export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'color' && e.page === 0),
  EFFECTS.filter(e => e.row === 'distortion' && e.page === 0),
  EFFECTS.filter(e => e.row === 'texture' && e.page === 0),
  EFFECTS.filter(e => e.row === 'render' && e.page === 0),
]
