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
export const PAGE_NAMES = ['ACID', 'VISION', 'GLITCH', 'STRAND', 'MOTION', 'DESTROY']

export const EFFECTS: EffectDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PAGE 0: ACID (Data Visualization)
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Symbol Replacement
  { id: 'acid_dots', label: 'DOTS', color: '#FFA9F1', row: 'render', page: 0, min: 4, max: 32 },
  { id: 'acid_glyph', label: 'GLYPH', color: '#EE30FF', row: 'render', page: 0, min: 8, max: 24 },
  { id: 'acid_icons', label: 'ICONS', color: '#C4FA13', row: 'render', page: 0, min: 16, max: 48 },
  { id: 'acid_contour', label: 'CONTOUR', color: '#13FADE', row: 'render', page: 0, min: 4, max: 20 },

  // Row 2: Geometric Restructuring
  { id: 'acid_decomp', label: 'DECOMP', color: '#FFF618', row: 'distortion', page: 0, min: 8, max: 64 },
  { id: 'acid_mirror', label: 'MIRROR', color: '#FFA9F1', row: 'distortion', page: 0, min: 2, max: 8 },
  { id: 'acid_slice', label: 'SLICE', color: '#EE30FF', row: 'distortion', page: 0, min: 4, max: 64 },
  { id: 'acid_thgrid', label: 'THGRID', color: '#C4FA13', row: 'distortion', page: 0, min: 0, max: 255 },

  // Row 3: Hybrid/Data Viz
  { id: 'acid_cloud', label: 'CLOUD', color: '#13FADE', row: 'render', page: 0, min: 1000, max: 50000 },
  { id: 'acid_led', label: 'LED', color: '#FFF618', row: 'render', page: 0, min: 4, max: 16 },
  { id: 'acid_slit', label: 'SLIT', color: '#FFA9F1', row: 'render', page: 0, min: 1, max: 10 },
  { id: 'acid_voronoi', label: 'VORONOI', color: '#EE30FF', row: 'render', page: 0, min: 16, max: 256 },

  // Row 4: Print/Geometric
  { id: 'acid_halftone', label: 'HALF', color: '#C4FA13', row: 'render', page: 0, min: 4, max: 24 },
  { id: 'acid_hex', label: 'HEX', color: '#13FADE', row: 'render', page: 0, min: 8, max: 48 },
  { id: 'acid_scan', label: 'SCAN', color: '#FFF618', row: 'render', page: 0, min: 1, max: 10 },
  { id: 'acid_ripple', label: 'RIPPLE', color: '#FFA9F1', row: 'render', page: 0, min: 1, max: 20 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: VISION / TRACKING
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Blob Tracking Modes
  { id: 'track_bright', label: 'BRIGHT', color: '#EE30FF', row: 'vision', page: 1, min: 0, max: 255 },
  { id: 'track_edge', label: 'EDGE', color: '#C4FA13', row: 'vision', page: 1, min: 0, max: 255 },
  { id: 'track_color', label: 'COLOR', color: '#13FADE', row: 'vision', page: 1, min: 0, max: 100 },
  { id: 'track_motion', label: 'MOTION', color: '#FFF618', row: 'vision', page: 1, min: 0, max: 100 },

  // Row 2: Body Tracking
  { id: 'contour', label: 'CONTOUR', color: '#FFA9F1', row: 'vision', page: 1, min: 0, max: 100 },
  { id: 'landmarks', label: 'LNDMRK', color: '#EE30FF', row: 'vision', page: 1, min: 10, max: 90 },

  // Row 3: Detection/HUD
  { id: 'face_hud', label: 'FACE HUD', color: '#C4FA13', row: 'vision', page: 1, min: 0, max: 1 },
  { id: 'halation', label: 'HALATE', color: '#13FADE', row: 'color', page: 1, min: 0, max: 1 },
  { id: 'y2k_digicam', label: 'Y2K', color: '#FFF618', row: 'texture', page: 1, min: 0, max: 1 },
  { id: 'thermal', label: 'THERML', color: '#FFA9F1', row: 'color', page: 1, min: 0.5, max: 2 },
  { id: 'dreamcore', label: 'DREAM', color: '#EE30FF', row: 'color', page: 1, min: 0, max: 1 },
  { id: 'anamorphic', label: 'ANMRPH', color: '#C4FA13', row: 'texture', page: 1, min: 0, max: 1 },
  { id: 'reserved_v9', label: '—', color: '#13FADE', row: 'reserved', page: 1, min: 0, max: 100 },
  { id: 'reserved_v10', label: '—', color: '#FFF618', row: 'reserved', page: 1, min: 0, max: 100 },

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: GLITCH CORE
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Color/Channel
  { id: 'rgb_split', label: 'RGB', color: '#FFA9F1', row: 'color', page: 2, min: 0, max: 50 },
  { id: 'chromatic', label: 'CHROMA', color: '#EE30FF', row: 'color', page: 2, min: 0, max: 100 },
  { id: 'posterize', label: 'POSTER', color: '#C4FA13', row: 'color', page: 2, min: 2, max: 16 },
  { id: 'color_grade', label: 'GRADE', color: '#13FADE', row: 'color', page: 2, min: 0, max: 200 },

  // Row 2: Distortion
  { id: 'block_displace', label: 'BLOCK', color: '#FFF618', row: 'distortion', page: 2, min: 0, max: 100 },
  { id: 'static_displace', label: 'STATIC', color: '#FFA9F1', row: 'distortion', page: 2, min: 0, max: 100 },
  { id: 'pixelate', label: 'PIXEL', color: '#EE30FF', row: 'distortion', page: 2, min: 2, max: 32 },
  { id: 'lens', label: 'LENS', color: '#C4FA13', row: 'distortion', page: 2, min: -100, max: 100 },

  // Row 3: Texture/Overlay
  { id: 'scan_lines', label: 'SCAN', color: '#13FADE', row: 'texture', page: 2, min: 100, max: 1000 },
  { id: 'vhs', label: 'VHS', color: '#FFF618', row: 'texture', page: 2, min: 0, max: 100 },
  { id: 'noise', label: 'NOISE', color: '#FFA9F1', row: 'texture', page: 2, min: 0, max: 100 },
  { id: 'dither', label: 'DITHER', color: '#EE30FF', row: 'texture', page: 2, min: 2, max: 16 },

  // Row 4: Render Modes
  { id: 'edges', label: 'EDGES', color: '#C4FA13', row: 'render', page: 2, min: 10, max: 100 },
  { id: 'feedback', label: 'FDBK', color: '#13FADE', row: 'render', page: 2, min: 0, max: 100 },
  { id: 'ascii', label: 'ASCII', color: '#FFF618', row: 'render', page: 2, min: 6, max: 20 },
  { id: 'stipple', label: 'STIPPLE', color: '#FFA9F1', row: 'render', page: 2, min: 1, max: 8 },

]

// ═══════════════════════════════════════════════════════════════
// PAGE 3: STRAND (Death Stranding-inspired)
// ═══════════════════════════════════════════════════════════════

export const STRAND_EFFECTS: EffectDefinition[] = [
  // Row 1: Chiral/BT (dark purple)
  { id: 'strand_handprints', label: 'HANDS', color: '#EE30FF', row: 'render', page: 3, min: 1, max: 20 },
  { id: 'strand_tar', label: 'TAR', color: '#C4FA13', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_timefall', label: 'TIMEFALL', color: '#13FADE', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_voidout', label: 'VOID OUT', color: '#FFF618', row: 'render', page: 3, min: 0, max: 100 },

  // Row 2: Strand/Connection (bright purple)
  { id: 'strand_web', label: 'WEB', color: '#FFA9F1', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_bridge', label: 'BRIDGE', color: '#EE30FF', row: 'render', page: 3, min: 8, max: 64 },
  { id: 'strand_path', label: 'C-PATH', color: '#C4FA13', row: 'render', page: 3, min: 10, max: 200 },
  { id: 'strand_umbilical', label: 'UMBIL', color: '#13FADE', row: 'render', page: 3, min: 2, max: 12 },

  // Row 3: Chiralium/Tech (light purple)
  { id: 'strand_odradek', label: 'ODRADEK', color: '#FFF618', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_chiralium', label: 'CHIRAL', color: '#FFA9F1', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_beach', label: 'BEACH', color: '#EE30FF', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_dooms', label: 'DOOMS', color: '#C4FA13', row: 'render', page: 3, min: 0, max: 100 },

  // Row 4: Atmosphere (muted purple)
  { id: 'strand_cloud', label: 'C-CLOUD', color: '#13FADE', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_bbpod', label: 'BB POD', color: '#FFF618', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_seam', label: 'SEAM', color: '#FFA9F1', row: 'render', page: 3, min: 0, max: 100 },
  { id: 'strand_extinction', label: 'EXTINCT', color: '#EE30FF', row: 'render', page: 3, min: 0, max: 100 },
]

// ═══════════════════════════════════════════════════════════════
// PAGE 4: MOTION (Temporal / Motion-based effects)
// ═══════════════════════════════════════════════════════════════

export const MOTION_EFFECTS: EffectDefinition[] = [
  // Row 1: Core motion effects (lime theme)
  { id: 'motion_extract', label: 'EXTRACT', color: '#C4FA13', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'echo_trail', label: 'ECHO', color: '#13FADE', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'time_smear', label: 'SMEAR', color: '#FFF618', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'freeze_mask', label: 'FREEZE', color: '#FFA9F1', row: 'render', page: 4, min: 0, max: 100 },

  // Row 2-4: Reserved
  { id: 'flow_smear', label: 'FLOW', color: '#EE30FF', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'feedback_tunnel', label: 'TUNNEL', color: '#C4FA13', row: 'render', page: 4, min: 0.9, max: 1.1 },
  { id: 'opium_trails', label: 'OPIUM', color: '#13FADE', row: 'render', page: 4, min: 0, max: 1 },
  { id: 'rutt_etra', label: 'RUTT', color: '#FFF618', row: 'render', page: 4, min: 16, max: 128 },
  { id: 'reaction_diffusion', label: 'REACT', color: '#FFA9F1', row: 'render', page: 4, min: 0.01, max: 0.1 },
  { id: 'physarum', label: 'SLIME', color: '#EE30FF', row: 'render', page: 4, min: 10000, max: 300000 },
  { id: 'motion_reserved_11', label: '—', color: '#C4FA13', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_12', label: '—', color: '#13FADE', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_13', label: '—', color: '#FFF618', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_14', label: '—', color: '#FFA9F1', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_15', label: '—', color: '#EE30FF', row: 'reserved', page: 4, min: 0, max: 100 },
  { id: 'motion_reserved_16', label: '—', color: '#C4FA13', row: 'reserved', page: 4, min: 0, max: 100 },
]

// ═══════════════════════════════════════════════════════════════
// PAGE 5: DESTRUCTION (Datamosh, corruption, destructive effects)
// ═══════════════════════════════════════════════════════════════

export const DESTRUCTION_EFFECTS: EffectDefinition[] = [
  // Row 1: Core destruction effects (red theme)
  { id: 'datamosh', label: 'MOSH', color: '#13FADE', row: 'color', page: 5, min: 0, max: 1 },
  { id: 'pixelSort', label: 'SORT', color: '#FFF618', row: 'color', page: 5, min: 0, max: 1 },
  { id: 'sonify', label: 'SONIFY', color: '#FFA9F1', row: 'color', page: 5, min: 0, max: 1 },
  { id: 'point_cloud', label: 'PTCLD', color: '#EE30FF', row: 'color', page: 5, min: 0, max: 1 },

  // Row 2: Reserved
  { id: 'kaleidoscope', label: 'KALEID', color: '#C4FA13', row: 'distortion', page: 5, min: 2, max: 16 },
  { id: 'liquid_morph', label: 'LIQUID', color: '#13FADE', row: 'distortion', page: 5, min: 0, max: 1 },
  { id: 'crystallize', label: 'CRYSTL', color: '#FFF618', row: 'texture', page: 5, min: 8, max: 128 },
  { id: 'ripple_warp', label: 'RIPPLE', color: '#FFA9F1', row: 'distortion', page: 5, min: 1, max: 40 },

  // Row 3: Fractal
  { id: 'fractal_domain', label: 'FRACTL', color: '#EE30FF', row: 'distortion', page: 5, min: 1, max: 8 },

  // Row 3-4: SEG_EXP (subject-targeted glitch layers)
  { id: 'seg_voxel', label: 'VOXEL', color: '#C4FA13', row: 'render', page: 5, min: 4, max: 64 },
  { id: 'seg_echo', label: 'ECHO4D', color: '#13FADE', row: 'render', page: 5, min: 1, max: 8 },
  { id: 'seg_matter', label: 'MATTER', color: '#FFF618', row: 'render', page: 5, min: 0, max: 1 },
  { id: 'seg_stale', label: 'STALE', color: '#FFA9F1', row: 'distortion', page: 5, min: 8, max: 96 },
  { id: 'seg_torn', label: 'TORN', color: '#EE30FF', row: 'texture', page: 5, min: 0, max: 0.2 },

  // Row 4: Reserved
  { id: 'destruction_reserved_15', label: '—', color: '#C4FA13', row: 'reserved', page: 5, min: 0, max: 100 },
  { id: 'destruction_reserved_16', label: '—', color: '#13FADE', row: 'reserved', page: 5, min: 0, max: 100 },
]

// Get effects for a specific page
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  if (page === 3) return STRAND_EFFECTS
  if (page === 4) return MOTION_EFFECTS
  if (page === 5) return DESTRUCTION_EFFECTS
  return EFFECTS.filter(e => e.page === page)
}

// Legacy exports for compatibility - Glitch is now page 2
export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'color' && e.page === 2),
  EFFECTS.filter(e => e.row === 'distortion' && e.page === 2),
  EFFECTS.filter(e => e.row === 'texture' && e.page === 2),
  EFFECTS.filter(e => e.row === 'render' && e.page === 2),
]
