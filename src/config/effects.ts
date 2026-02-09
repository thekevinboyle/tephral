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
export const PAGE_NAMES = ['ACID', 'VISION', 'GLITCH', 'STRAND', 'MOTION']

export const EFFECTS: EffectDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PAGE 0: ACID (Data Visualization)
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Symbol Replacement
  { id: 'acid_dots', label: 'DOTS', color: '#e5e5e5', row: 'render', page: 0, min: 4, max: 32 },
  { id: 'acid_glyph', label: 'GLYPH', color: '#d4d4d4', row: 'render', page: 0, min: 8, max: 24 },
  { id: 'acid_icons', label: 'ICONS', color: '#c4c4c4', row: 'render', page: 0, min: 16, max: 48 },
  { id: 'acid_contour', label: 'CONTOUR', color: '#b4b4b4', row: 'render', page: 0, min: 4, max: 20 },

  // Row 2: Geometric Restructuring
  { id: 'acid_decomp', label: 'DECOMP', color: '#94a3b8', row: 'distortion', page: 0, min: 8, max: 64 },
  { id: 'acid_mirror', label: 'MIRROR', color: '#7dd3fc', row: 'distortion', page: 0, min: 2, max: 8 },
  { id: 'acid_slice', label: 'SLICE', color: '#67e8f9', row: 'distortion', page: 0, min: 4, max: 64 },
  { id: 'acid_thgrid', label: 'THGRID', color: '#a5f3fc', row: 'distortion', page: 0, min: 0, max: 255 },

  // Row 3: Hybrid/Data Viz
  { id: 'acid_cloud', label: 'CLOUD', color: '#f0abfc', row: 'render', page: 0, min: 1000, max: 50000 },
  { id: 'acid_led', label: 'LED', color: '#c084fc', row: 'render', page: 0, min: 4, max: 16 },
  { id: 'acid_slit', label: 'SLIT', color: '#a78bfa', row: 'render', page: 0, min: 1, max: 10 },
  { id: 'acid_voronoi', label: 'VORONOI', color: '#818cf8', row: 'render', page: 0, min: 16, max: 256 },

  // Row 4: Print/Geometric
  { id: 'acid_halftone', label: 'HALFTONE', color: '#fbbf24', row: 'render', page: 0, min: 4, max: 24 },
  { id: 'acid_hex', label: 'HEX', color: '#f59e0b', row: 'render', page: 0, min: 8, max: 48 },
  { id: 'acid_scan', label: 'SCAN', color: '#f97316', row: 'render', page: 0, min: 1, max: 10 },
  { id: 'acid_ripple', label: 'RIPPLE', color: '#ef4444', row: 'render', page: 0, min: 1, max: 20 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: VISION / TRACKING
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Blob Tracking Modes
  { id: 'track_bright', label: 'BRIGHT', color: '#eab308', row: 'vision', page: 1, min: 0, max: 255 },
  { id: 'track_edge', label: 'EDGE', color: '#06b6d4', row: 'vision', page: 1, min: 0, max: 255 },
  { id: 'track_color', label: 'COLOR', color: '#ec4899', row: 'vision', page: 1, min: 0, max: 100 },
  { id: 'track_motion', label: 'MOTION', color: '#22c55e', row: 'vision', page: 1, min: 0, max: 100 },

  // Row 2: Body Tracking
  { id: 'track_face', label: 'FACE', color: '#f97316', row: 'vision', page: 1, min: 10, max: 90 },
  { id: 'track_hands', label: 'HANDS', color: '#a855f7', row: 'vision', page: 1, min: 10, max: 90 },
  { id: 'contour', label: 'CONTOUR', color: '#00ffff', row: 'vision', page: 1, min: 0, max: 100 },
  { id: 'landmarks', label: 'LANDMARKS', color: '#FF0055', row: 'vision', page: 1, min: 10, max: 90 },

  // Row 3-4: Reserved
  { id: 'reserved_v3', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v4', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v5', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v6', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v7', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v8', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v9', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v10', label: '—', color: '#374151', row: 'reserved', page: 1, min: 0, max: 100 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: GLITCH CORE
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Color/Channel
  { id: 'rgb_split', label: 'RGB', color: '#0891b2', row: 'color', page: 2, min: 0, max: 50 },
  { id: 'chromatic', label: 'CHROMA', color: '#6366f1', row: 'color', page: 2, min: 0, max: 100 },
  { id: 'posterize', label: 'POSTER', color: '#dc2626', row: 'color', page: 2, min: 2, max: 16 },
  { id: 'color_grade', label: 'GRADE', color: '#ea580c', row: 'color', page: 2, min: 0, max: 200 },

  // Row 2: Distortion
  { id: 'block_displace', label: 'BLOCK', color: '#a855f7', row: 'distortion', page: 2, min: 0, max: 100 },
  { id: 'static_displace', label: 'STATIC', color: '#8b5cf6', row: 'distortion', page: 2, min: 0, max: 100 },
  { id: 'pixelate', label: 'PIXEL', color: '#d946ef', row: 'distortion', page: 2, min: 2, max: 32 },
  { id: 'lens', label: 'LENS', color: '#0284c7', row: 'distortion', page: 2, min: -100, max: 100 },

  // Row 3: Texture/Overlay
  { id: 'scan_lines', label: 'SCAN', color: '#65a30d', row: 'texture', page: 2, min: 100, max: 1000 },
  { id: 'vhs', label: 'VHS', color: '#059669', row: 'texture', page: 2, min: 0, max: 100 },
  { id: 'noise', label: 'NOISE', color: '#84cc16', row: 'texture', page: 2, min: 0, max: 100 },
  { id: 'dither', label: 'DITHER', color: '#22c55e', row: 'texture', page: 2, min: 2, max: 16 },

  // Row 4: Render Modes
  { id: 'edges', label: 'EDGES', color: '#f59e0b', row: 'render', page: 2, min: 10, max: 100 },
  { id: 'feedback', label: 'FEEDBACK', color: '#d97706', row: 'render', page: 2, min: 0, max: 100 },
  { id: 'ascii', label: 'ASCII', color: '#b45309', row: 'render', page: 2, min: 6, max: 20 },
  { id: 'stipple', label: 'STIPPLE', color: '#92400e', row: 'render', page: 2, min: 1, max: 8 },

]

// ═══════════════════════════════════════════════════════════════
// PAGE 3: STRAND (Death Stranding-inspired)
// ═══════════════════════════════════════════════════════════════

export const STRAND_EFFECTS: EffectDefinition[] = [
  // Row 1: Chiral/BT (dark purple)
  { id: 'strand_handprints', label: 'HANDPRINTS', color: '#1a1a1a', row: 'render', page: 3, min: 1, max: 20 },
  { id: 'strand_tar', label: 'TAR', color: '#8844CC', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_timefall', label: 'TIMEFALL', color: '#6633AA', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_voidout', label: 'VOID OUT', color: '#AA55FF', row: 'render', page: 3, min: 0, max: 100 },

  // Row 2: Strand/Connection (bright purple)
  { id: 'strand_web', label: 'STRAND WEB', color: '#AA55FF', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_bridge', label: 'BRIDGE', color: '#BB77FF', row: 'render', page: 3, min: 8, max: 64 },
  { id: 'strand_path', label: 'CHIRAL PATH', color: '#AA55FF', row: 'render', page: 3, min: 10, max: 200 },
  { id: 'strand_umbilical', label: 'UMBILICAL', color: '#9944EE', row: 'render', page: 3, min: 2, max: 12 },

  // Row 3: Chiralium/Tech (light purple)
  { id: 'strand_odradek', label: 'ODRADEK', color: '#CC88FF', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_chiralium', label: 'CHIRALIUM', color: '#BB77FF', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_beach', label: 'BEACH', color: '#D4A5FF', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_dooms', label: 'DOOMS', color: '#AA55FF', row: 'render', page: 3, min: 0, max: 100 },

  // Row 4: Atmosphere (muted purple)
  { id: 'strand_cloud', label: 'CHIRAL CLOUD', color: '#9966DD', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_bbpod', label: 'BB POD', color: '#8855CC', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_seam', label: 'SEAM', color: '#7744BB', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_extinction', label: 'EXTINCTION', color: '#AA55FF', row: 'render', page: 3, min: 0, max: 100 },
]

// ═══════════════════════════════════════════════════════════════
// PAGE 4: MOTION (Temporal / Motion-based effects)
// ═══════════════════════════════════════════════════════════════

export const MOTION_EFFECTS: EffectDefinition[] = [
  // Row 1: Core motion effects (lime theme)
  { id: 'motion_extract', label: 'EXTRACT', color: '#AAFF00', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'echo_trail', label: 'ECHO', color: '#88CC00', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'time_smear', label: 'SMEAR', color: '#99DD00', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'freeze_mask', label: 'FREEZE', color: '#BBFF33', row: 'render', page: 4, min: 0, max: 100 },

  // Row 2-4: Reserved
  { id: 'motion_reserved_5', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_6', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_7', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_8', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_9', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_10', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_11', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_12', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_13', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_14', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_15', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_16', label: '—', color: '#374151', row: 'reserved', page: 4, min: 0, max: 100 },
]

// Get effects for a specific page
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  if (page === 3) return STRAND_EFFECTS
  if (page === 4) return MOTION_EFFECTS
  return EFFECTS.filter(e => e.page === page)
}

// Legacy exports for compatibility - Glitch is now page 2
export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'color' && e.page === 2),
  EFFECTS.filter(e => e.row === 'distortion' && e.page === 2),
  EFFECTS.filter(e => e.row === 'texture' && e.page === 2),
  EFFECTS.filter(e => e.row === 'render' && e.page === 2),
]
