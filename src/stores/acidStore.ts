import { create } from 'zustand'

// ============================================================================
// Effect Parameter Types
// ============================================================================

export interface DotsParams {
  gridSize: number
  dotScale: number
  threshold: number
  shape: 'circle' | 'square' | 'diamond'
}

export interface GlyphParams {
  gridSize: number
  charset: 'geometric' | 'arrows' | 'blocks' | 'math'
  density: number
  invert: boolean
}

export interface IconsParams {
  gridSize: number
  iconSet: 'tech' | 'nature' | 'abstract' | 'faces'
  rotation: number
  colorMode: 'mono' | 'tint' | 'original'
}

export interface ContourParams {
  levels: number
  lineWidth: number
  smooth: number
  animate: boolean
}

export interface DecompParams {
  minBlock: number
  maxBlock: number
  threshold: number
  showGrid: boolean
  fillMode: 'solid' | 'average' | 'original'
}

export interface MirrorParams {
  segments: number
  centerX: number
  centerY: number
  rotation: number
}

export interface SliceParams {
  sliceCount: number
  direction: 'horizontal' | 'vertical' | 'both'
  offset: number
  wave: boolean
}

export interface ThGridParams {
  threshold: number
  gridSize: number
  lineWidth: number
  invert: boolean
  cornerMarks: boolean
}

export interface CloudParams {
  density: number
  depthScale: number
  perspective: number
  rotate: boolean
}

export interface LedParams {
  gridSize: number
  dotSize: number
  brightness: number
  bleed: number
}

export interface SlitParams {
  slitPosition: number
  direction: 'horizontal' | 'vertical'
  speed: number
  blend: number
}

export interface VoronoiParams {
  cellCount: number
  seedMode: 'random' | 'brightness' | 'edges'
  showEdges: boolean
  fillMode: 'average' | 'centroid' | 'original'
}

export interface HalftoneParams {
  dotSize: number
  angle: number
  colorMode: 'mono' | 'cmyk' | 'rgb'
  contrast: number
}

export interface HexParams {
  cellSize: number
  fillMode: 'average' | 'center' | 'original'
  showEdges: boolean
  rotation: number
}

export interface ScanParams {
  speed: number
  width: number
  direction: 'horizontal' | 'vertical' | 'radial'
  trail: number
}

export interface RippleParams {
  frequency: number
  amplitude: number
  speed: number
  decay: number
}

// ============================================================================
// Default Parameters
// ============================================================================

export const DEFAULT_DOTS_PARAMS: DotsParams = {
  gridSize: 16,
  dotScale: 0.8,
  threshold: 0.5,
  shape: 'circle',
}

export const DEFAULT_GLYPH_PARAMS: GlyphParams = {
  gridSize: 12,
  charset: 'geometric',
  density: 0.7,
  invert: false,
}

export const DEFAULT_ICONS_PARAMS: IconsParams = {
  gridSize: 32,
  iconSet: 'tech',
  rotation: 0,
  colorMode: 'mono',
}

export const DEFAULT_CONTOUR_PARAMS: ContourParams = {
  levels: 8,
  lineWidth: 1,
  smooth: 0.5,
  animate: false,
}

export const DEFAULT_DECOMP_PARAMS: DecompParams = {
  minBlock: 4,
  maxBlock: 64,
  threshold: 0.1,
  showGrid: false,
  fillMode: 'average',
}

export const DEFAULT_MIRROR_PARAMS: MirrorParams = {
  segments: 4,
  centerX: 0.5,
  centerY: 0.5,
  rotation: 0,
}

export const DEFAULT_SLICE_PARAMS: SliceParams = {
  sliceCount: 20,
  direction: 'horizontal',
  offset: 50,
  wave: true,
}

export const DEFAULT_THGRID_PARAMS: ThGridParams = {
  threshold: 0.5,
  gridSize: 8,
  lineWidth: 1,
  invert: false,
  cornerMarks: true,
}

export const DEFAULT_CLOUD_PARAMS: CloudParams = {
  density: 5000,
  depthScale: 1.0,
  perspective: 0.5,
  rotate: false,
}

export const DEFAULT_LED_PARAMS: LedParams = {
  gridSize: 8,
  dotSize: 0.7,
  brightness: 1.0,
  bleed: 0.2,
}

export const DEFAULT_SLIT_PARAMS: SlitParams = {
  slitPosition: 0.5,
  direction: 'vertical',
  speed: 1.0,
  blend: 0.5,
}

export const DEFAULT_VORONOI_PARAMS: VoronoiParams = {
  cellCount: 100,
  seedMode: 'brightness',
  showEdges: true,
  fillMode: 'average',
}

export const DEFAULT_HALFTONE_PARAMS: HalftoneParams = {
  dotSize: 8,
  angle: 45,
  colorMode: 'mono',
  contrast: 1.0,
}

export const DEFAULT_HEX_PARAMS: HexParams = {
  cellSize: 16,
  fillMode: 'average',
  showEdges: false,
  rotation: 0,
}

export const DEFAULT_SCAN_PARAMS: ScanParams = {
  speed: 2,
  width: 20,
  direction: 'horizontal',
  trail: 0.5,
}

export const DEFAULT_RIPPLE_PARAMS: RippleParams = {
  frequency: 5,
  amplitude: 20,
  speed: 2,
  decay: 0.5,
}

// ============================================================================
// Snapshot Type
// ============================================================================

export interface AcidSnapshot {
  preserveVideo: boolean

  dotsEnabled: boolean
  dotsParams: DotsParams

  glyphEnabled: boolean
  glyphParams: GlyphParams

  iconsEnabled: boolean
  iconsParams: IconsParams

  contourEnabled: boolean
  contourParams: ContourParams

  decompEnabled: boolean
  decompParams: DecompParams

  mirrorEnabled: boolean
  mirrorParams: MirrorParams

  sliceEnabled: boolean
  sliceParams: SliceParams

  thGridEnabled: boolean
  thGridParams: ThGridParams

  cloudEnabled: boolean
  cloudParams: CloudParams

  ledEnabled: boolean
  ledParams: LedParams

  slitEnabled: boolean
  slitParams: SlitParams

  voronoiEnabled: boolean
  voronoiParams: VoronoiParams

  halftoneEnabled: boolean
  halftoneParams: HalftoneParams

  hexEnabled: boolean
  hexParams: HexParams

  scanEnabled: boolean
  scanParams: ScanParams

  rippleEnabled: boolean
  rippleParams: RippleParams
}

// ============================================================================
// Store Interface
// ============================================================================

interface AcidState {
  // Global state
  preserveVideo: boolean
  setPreserveVideo: (v: boolean) => void

  // DOTS
  dotsEnabled: boolean
  dotsParams: DotsParams
  setDotsEnabled: (v: boolean) => void
  updateDotsParams: (p: Partial<DotsParams>) => void

  // GLYPH
  glyphEnabled: boolean
  glyphParams: GlyphParams
  setGlyphEnabled: (v: boolean) => void
  updateGlyphParams: (p: Partial<GlyphParams>) => void

  // ICONS
  iconsEnabled: boolean
  iconsParams: IconsParams
  setIconsEnabled: (v: boolean) => void
  updateIconsParams: (p: Partial<IconsParams>) => void

  // CONTOUR
  contourEnabled: boolean
  contourParams: ContourParams
  setContourEnabled: (v: boolean) => void
  updateContourParams: (p: Partial<ContourParams>) => void

  // DECOMP
  decompEnabled: boolean
  decompParams: DecompParams
  setDecompEnabled: (v: boolean) => void
  updateDecompParams: (p: Partial<DecompParams>) => void

  // MIRROR
  mirrorEnabled: boolean
  mirrorParams: MirrorParams
  setMirrorEnabled: (v: boolean) => void
  updateMirrorParams: (p: Partial<MirrorParams>) => void

  // SLICE
  sliceEnabled: boolean
  sliceParams: SliceParams
  setSliceEnabled: (v: boolean) => void
  updateSliceParams: (p: Partial<SliceParams>) => void

  // THGRID
  thGridEnabled: boolean
  thGridParams: ThGridParams
  setThGridEnabled: (v: boolean) => void
  updateThGridParams: (p: Partial<ThGridParams>) => void

  // CLOUD
  cloudEnabled: boolean
  cloudParams: CloudParams
  setCloudEnabled: (v: boolean) => void
  updateCloudParams: (p: Partial<CloudParams>) => void

  // LED
  ledEnabled: boolean
  ledParams: LedParams
  setLedEnabled: (v: boolean) => void
  updateLedParams: (p: Partial<LedParams>) => void

  // SLIT
  slitEnabled: boolean
  slitParams: SlitParams
  setSlitEnabled: (v: boolean) => void
  updateSlitParams: (p: Partial<SlitParams>) => void

  // VORONOI
  voronoiEnabled: boolean
  voronoiParams: VoronoiParams
  setVoronoiEnabled: (v: boolean) => void
  updateVoronoiParams: (p: Partial<VoronoiParams>) => void

  // HALFTONE
  halftoneEnabled: boolean
  halftoneParams: HalftoneParams
  setHalftoneEnabled: (v: boolean) => void
  updateHalftoneParams: (p: Partial<HalftoneParams>) => void

  // HEX
  hexEnabled: boolean
  hexParams: HexParams
  setHexEnabled: (v: boolean) => void
  updateHexParams: (p: Partial<HexParams>) => void

  // SCAN
  scanEnabled: boolean
  scanParams: ScanParams
  setScanEnabled: (v: boolean) => void
  updateScanParams: (p: Partial<ScanParams>) => void

  // RIPPLE
  rippleEnabled: boolean
  rippleParams: RippleParams
  setRippleEnabled: (v: boolean) => void
  updateRippleParams: (p: Partial<RippleParams>) => void

  // Utility methods
  reset: () => void
  getSnapshot: () => AcidSnapshot
  applySnapshot: (snapshot: AcidSnapshot) => void
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAcidStore = create<AcidState>((set, get) => ({
  // Global state
  preserveVideo: false,
  setPreserveVideo: (v) => set({ preserveVideo: v }),

  // DOTS
  dotsEnabled: false,
  dotsParams: { ...DEFAULT_DOTS_PARAMS },
  setDotsEnabled: (v) => set({ dotsEnabled: v }),
  updateDotsParams: (p) => set((state) => ({
    dotsParams: { ...state.dotsParams, ...p },
  })),

  // GLYPH
  glyphEnabled: false,
  glyphParams: { ...DEFAULT_GLYPH_PARAMS },
  setGlyphEnabled: (v) => set({ glyphEnabled: v }),
  updateGlyphParams: (p) => set((state) => ({
    glyphParams: { ...state.glyphParams, ...p },
  })),

  // ICONS
  iconsEnabled: false,
  iconsParams: { ...DEFAULT_ICONS_PARAMS },
  setIconsEnabled: (v) => set({ iconsEnabled: v }),
  updateIconsParams: (p) => set((state) => ({
    iconsParams: { ...state.iconsParams, ...p },
  })),

  // CONTOUR
  contourEnabled: false,
  contourParams: { ...DEFAULT_CONTOUR_PARAMS },
  setContourEnabled: (v) => set({ contourEnabled: v }),
  updateContourParams: (p) => set((state) => ({
    contourParams: { ...state.contourParams, ...p },
  })),

  // DECOMP
  decompEnabled: false,
  decompParams: { ...DEFAULT_DECOMP_PARAMS },
  setDecompEnabled: (v) => set({ decompEnabled: v }),
  updateDecompParams: (p) => set((state) => ({
    decompParams: { ...state.decompParams, ...p },
  })),

  // MIRROR
  mirrorEnabled: false,
  mirrorParams: { ...DEFAULT_MIRROR_PARAMS },
  setMirrorEnabled: (v) => set({ mirrorEnabled: v }),
  updateMirrorParams: (p) => set((state) => ({
    mirrorParams: { ...state.mirrorParams, ...p },
  })),

  // SLICE
  sliceEnabled: false,
  sliceParams: { ...DEFAULT_SLICE_PARAMS },
  setSliceEnabled: (v) => set({ sliceEnabled: v }),
  updateSliceParams: (p) => set((state) => ({
    sliceParams: { ...state.sliceParams, ...p },
  })),

  // THGRID
  thGridEnabled: false,
  thGridParams: { ...DEFAULT_THGRID_PARAMS },
  setThGridEnabled: (v) => set({ thGridEnabled: v }),
  updateThGridParams: (p) => set((state) => ({
    thGridParams: { ...state.thGridParams, ...p },
  })),

  // CLOUD
  cloudEnabled: false,
  cloudParams: { ...DEFAULT_CLOUD_PARAMS },
  setCloudEnabled: (v) => set({ cloudEnabled: v }),
  updateCloudParams: (p) => set((state) => ({
    cloudParams: { ...state.cloudParams, ...p },
  })),

  // LED
  ledEnabled: false,
  ledParams: { ...DEFAULT_LED_PARAMS },
  setLedEnabled: (v) => set({ ledEnabled: v }),
  updateLedParams: (p) => set((state) => ({
    ledParams: { ...state.ledParams, ...p },
  })),

  // SLIT
  slitEnabled: false,
  slitParams: { ...DEFAULT_SLIT_PARAMS },
  setSlitEnabled: (v) => set({ slitEnabled: v }),
  updateSlitParams: (p) => set((state) => ({
    slitParams: { ...state.slitParams, ...p },
  })),

  // VORONOI
  voronoiEnabled: false,
  voronoiParams: { ...DEFAULT_VORONOI_PARAMS },
  setVoronoiEnabled: (v) => set({ voronoiEnabled: v }),
  updateVoronoiParams: (p) => set((state) => ({
    voronoiParams: { ...state.voronoiParams, ...p },
  })),

  // HALFTONE
  halftoneEnabled: false,
  halftoneParams: { ...DEFAULT_HALFTONE_PARAMS },
  setHalftoneEnabled: (v) => set({ halftoneEnabled: v }),
  updateHalftoneParams: (p) => set((state) => ({
    halftoneParams: { ...state.halftoneParams, ...p },
  })),

  // HEX
  hexEnabled: false,
  hexParams: { ...DEFAULT_HEX_PARAMS },
  setHexEnabled: (v) => set({ hexEnabled: v }),
  updateHexParams: (p) => set((state) => ({
    hexParams: { ...state.hexParams, ...p },
  })),

  // SCAN
  scanEnabled: false,
  scanParams: { ...DEFAULT_SCAN_PARAMS },
  setScanEnabled: (v) => set({ scanEnabled: v }),
  updateScanParams: (p) => set((state) => ({
    scanParams: { ...state.scanParams, ...p },
  })),

  // RIPPLE
  rippleEnabled: false,
  rippleParams: { ...DEFAULT_RIPPLE_PARAMS },
  setRippleEnabled: (v) => set({ rippleEnabled: v }),
  updateRippleParams: (p) => set((state) => ({
    rippleParams: { ...state.rippleParams, ...p },
  })),

  // Utility methods
  reset: () => set({
    preserveVideo: false,
    dotsEnabled: false,
    dotsParams: { ...DEFAULT_DOTS_PARAMS },
    glyphEnabled: false,
    glyphParams: { ...DEFAULT_GLYPH_PARAMS },
    iconsEnabled: false,
    iconsParams: { ...DEFAULT_ICONS_PARAMS },
    contourEnabled: false,
    contourParams: { ...DEFAULT_CONTOUR_PARAMS },
    decompEnabled: false,
    decompParams: { ...DEFAULT_DECOMP_PARAMS },
    mirrorEnabled: false,
    mirrorParams: { ...DEFAULT_MIRROR_PARAMS },
    sliceEnabled: false,
    sliceParams: { ...DEFAULT_SLICE_PARAMS },
    thGridEnabled: false,
    thGridParams: { ...DEFAULT_THGRID_PARAMS },
    cloudEnabled: false,
    cloudParams: { ...DEFAULT_CLOUD_PARAMS },
    ledEnabled: false,
    ledParams: { ...DEFAULT_LED_PARAMS },
    slitEnabled: false,
    slitParams: { ...DEFAULT_SLIT_PARAMS },
    voronoiEnabled: false,
    voronoiParams: { ...DEFAULT_VORONOI_PARAMS },
    halftoneEnabled: false,
    halftoneParams: { ...DEFAULT_HALFTONE_PARAMS },
    hexEnabled: false,
    hexParams: { ...DEFAULT_HEX_PARAMS },
    scanEnabled: false,
    scanParams: { ...DEFAULT_SCAN_PARAMS },
    rippleEnabled: false,
    rippleParams: { ...DEFAULT_RIPPLE_PARAMS },
  }),

  getSnapshot: () => {
    const state = get()
    return {
      preserveVideo: state.preserveVideo,
      dotsEnabled: state.dotsEnabled,
      dotsParams: { ...state.dotsParams },
      glyphEnabled: state.glyphEnabled,
      glyphParams: { ...state.glyphParams },
      iconsEnabled: state.iconsEnabled,
      iconsParams: { ...state.iconsParams },
      contourEnabled: state.contourEnabled,
      contourParams: { ...state.contourParams },
      decompEnabled: state.decompEnabled,
      decompParams: { ...state.decompParams },
      mirrorEnabled: state.mirrorEnabled,
      mirrorParams: { ...state.mirrorParams },
      sliceEnabled: state.sliceEnabled,
      sliceParams: { ...state.sliceParams },
      thGridEnabled: state.thGridEnabled,
      thGridParams: { ...state.thGridParams },
      cloudEnabled: state.cloudEnabled,
      cloudParams: { ...state.cloudParams },
      ledEnabled: state.ledEnabled,
      ledParams: { ...state.ledParams },
      slitEnabled: state.slitEnabled,
      slitParams: { ...state.slitParams },
      voronoiEnabled: state.voronoiEnabled,
      voronoiParams: { ...state.voronoiParams },
      halftoneEnabled: state.halftoneEnabled,
      halftoneParams: { ...state.halftoneParams },
      hexEnabled: state.hexEnabled,
      hexParams: { ...state.hexParams },
      scanEnabled: state.scanEnabled,
      scanParams: { ...state.scanParams },
      rippleEnabled: state.rippleEnabled,
      rippleParams: { ...state.rippleParams },
    }
  },

  applySnapshot: (snapshot) => set({
    preserveVideo: snapshot.preserveVideo ?? false,
    dotsEnabled: snapshot.dotsEnabled ?? false,
    dotsParams: snapshot.dotsParams ? { ...snapshot.dotsParams } : { ...DEFAULT_DOTS_PARAMS },
    glyphEnabled: snapshot.glyphEnabled ?? false,
    glyphParams: snapshot.glyphParams ? { ...snapshot.glyphParams } : { ...DEFAULT_GLYPH_PARAMS },
    iconsEnabled: snapshot.iconsEnabled ?? false,
    iconsParams: snapshot.iconsParams ? { ...snapshot.iconsParams } : { ...DEFAULT_ICONS_PARAMS },
    contourEnabled: snapshot.contourEnabled ?? false,
    contourParams: snapshot.contourParams ? { ...snapshot.contourParams } : { ...DEFAULT_CONTOUR_PARAMS },
    decompEnabled: snapshot.decompEnabled ?? false,
    decompParams: snapshot.decompParams ? { ...snapshot.decompParams } : { ...DEFAULT_DECOMP_PARAMS },
    mirrorEnabled: snapshot.mirrorEnabled ?? false,
    mirrorParams: snapshot.mirrorParams ? { ...snapshot.mirrorParams } : { ...DEFAULT_MIRROR_PARAMS },
    sliceEnabled: snapshot.sliceEnabled ?? false,
    sliceParams: snapshot.sliceParams ? { ...snapshot.sliceParams } : { ...DEFAULT_SLICE_PARAMS },
    thGridEnabled: snapshot.thGridEnabled ?? false,
    thGridParams: snapshot.thGridParams ? { ...snapshot.thGridParams } : { ...DEFAULT_THGRID_PARAMS },
    cloudEnabled: snapshot.cloudEnabled ?? false,
    cloudParams: snapshot.cloudParams ? { ...snapshot.cloudParams } : { ...DEFAULT_CLOUD_PARAMS },
    ledEnabled: snapshot.ledEnabled ?? false,
    ledParams: snapshot.ledParams ? { ...snapshot.ledParams } : { ...DEFAULT_LED_PARAMS },
    slitEnabled: snapshot.slitEnabled ?? false,
    slitParams: snapshot.slitParams ? { ...snapshot.slitParams } : { ...DEFAULT_SLIT_PARAMS },
    voronoiEnabled: snapshot.voronoiEnabled ?? false,
    voronoiParams: snapshot.voronoiParams ? { ...snapshot.voronoiParams } : { ...DEFAULT_VORONOI_PARAMS },
    halftoneEnabled: snapshot.halftoneEnabled ?? false,
    halftoneParams: snapshot.halftoneParams ? { ...snapshot.halftoneParams } : { ...DEFAULT_HALFTONE_PARAMS },
    hexEnabled: snapshot.hexEnabled ?? false,
    hexParams: snapshot.hexParams ? { ...snapshot.hexParams } : { ...DEFAULT_HEX_PARAMS },
    scanEnabled: snapshot.scanEnabled ?? false,
    scanParams: snapshot.scanParams ? { ...snapshot.scanParams } : { ...DEFAULT_SCAN_PARAMS },
    rippleEnabled: snapshot.rippleEnabled ?? false,
    rippleParams: snapshot.rippleParams ? { ...snapshot.rippleParams } : { ...DEFAULT_RIPPLE_PARAMS },
  }),
}))
