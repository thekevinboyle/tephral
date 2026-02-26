// Centralized status bar descriptions for all interactive elements.
// Keyed by element identifier — components look up descriptions here
// rather than hardcoding tooltip strings.

// ═══════════════════════════════════════════════════════════════════
// EFFECT DESCRIPTIONS — keyed by effect ID
// ═══════════════════════════════════════════════════════════════════

export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  // ACID
  acid_dots: 'Dots \u2014 Grid-based dot pattern visualization',
  acid_glyph: 'Glyph \u2014 ASCII glyphs mapped to brightness grid',
  acid_icons: 'Icons \u2014 Symbol grid rendering with icon sets',
  acid_contour: 'Contour \u2014 Edge contour rendering with variable levels',
  acid_decomp: 'Decomp \u2014 Recursive block decomposition',
  acid_mirror: 'Mirror \u2014 Radial kaleidoscope effect',
  acid_slice: 'Slice \u2014 Horizontal/vertical slice rendering',
  acid_thgrid: 'ThGrid \u2014 Threshold-based grid with glow lines',
  acid_cloud: 'Cloud \u2014 3D particle cloud point rendering',
  acid_led: 'LED \u2014 LED matrix display effect',
  acid_slit: 'Slit \u2014 Scanning slit aperture effect',
  acid_voronoi: 'Voronoi \u2014 Voronoi cell diagram effect',
  acid_halftone: 'Halftone \u2014 Halftone dot pattern print effect',
  acid_hex: 'Hex \u2014 Hexagonal grid mosaic effect',
  acid_scan: 'Scan \u2014 Animated scanning beam effect',
  acid_ripple: 'Ripple \u2014 Wave ripple distortion effect',

  // VISION
  track_bright: 'Bright \u2014 Track bright regions and blobs',
  track_edge: 'Edge \u2014 Track edge contours and outlines',
  track_color: 'Color \u2014 Track regions of specific color hue',
  track_motion: 'Motion \u2014 Track areas of pixel motion',
  track_face: 'Face \u2014 Track face regions by skin tone',
  track_hands: 'Hands \u2014 Track hand regions by skin tone',
  contour: 'Contour \u2014 Contour outline rendering',
  landmarks: 'Landmarks \u2014 Face/hand landmark detection',

  // GLITCH
  rgb_split: 'RGB \u2014 RGB channel separation offset',
  chromatic: 'Chroma \u2014 Chromatic aberration effect',
  posterize: 'Posterize \u2014 Color quantization/banding',
  color_grade: 'Grade \u2014 Professional color grading controls',
  block_displace: 'Block \u2014 Block-based displacement glitch',
  static_displace: 'Static \u2014 Static noise displacement',
  pixelate: 'Pixel \u2014 Pixel mosaic effect',
  lens: 'Lens \u2014 Lens distortion and fresnel effects',
  scan_lines: 'Scan \u2014 CRT scan line overlay',
  vhs: 'VHS \u2014 VHS tape degradation effect',
  noise: 'Noise \u2014 Animated noise texture',
  dither: 'Dither \u2014 Dither pattern effect',
  edges: 'Edges \u2014 Edge detection overlay',
  feedback: 'Feedback \u2014 Recursive feedback loop',
  ascii: 'ASCII \u2014 ASCII/text rendering modes',
  stipple: 'Stipple \u2014 Pointillist stipple effect',

  // STRAND
  strand_handprints: 'Hands \u2014 BT handprint visualization',
  strand_tar: 'Tar \u2014 Tar-like spreading effect',
  strand_timefall: 'Timefall \u2014 Time-based degradation',
  strand_voidout: 'Void Out \u2014 Void entity manifestation',
  strand_web: 'Web \u2014 Connection web between objects',
  strand_bridge: 'Bridge \u2014 Link bridges between elements',
  strand_path: 'C-Path \u2014 Chiral path particle trails',
  strand_umbilical: 'Umbil \u2014 Tendril/umbilical cord effect',
  strand_odradek: 'Odradek \u2014 Scanning sonar effect',
  strand_chiralium: 'Chiral \u2014 Chiral matter visualization',
  strand_beach: 'Beach \u2014 Beach strand static noise',
  strand_dooms: 'Dooms \u2014 Timefall dooms effect',
  strand_cloud: 'C-Cloud \u2014 Chiral cloud effect',
  strand_bbpod: 'BB Pod \u2014 BB pod interior vignette',
  strand_seam: 'Seam \u2014 Dimensional seam/rift',
  strand_extinction: 'Extinct \u2014 Mass extinction effect',

  // MOTION
  motion_extract: 'Extract \u2014 Motion detection and extraction',
  echo_trail: 'Echo \u2014 Echo/motion trail effect',
  time_smear: 'Smear \u2014 Temporal smearing/ghosting',
  freeze_mask: 'Freeze \u2014 Freeze frame masking',

  // DESTRUCTION
  datamosh: 'Mosh \u2014 Datamosh video glitch',
  pixelSort: 'Sort \u2014 Pixel sorting effect',
  sonify: 'Sonify \u2014 Audio-style pixel corruption',
  point_cloud: 'PtCld \u2014 3D point cloud destruction',

  // OVERLAYS
  texture_grain: 'Grain \u2014 Film grain texture overlay',
  texture_dust: 'Dust \u2014 Dust particle overlay',
  texture_leak: 'Leak \u2014 Light leak/vignette overlay',
  texture_paper: 'Paper \u2014 Paper texture overlay',
  texture_canvas: 'Canvas \u2014 Canvas texture overlay',
  texture_vhs: 'VHS \u2014 VHS noise texture overlay',
  data_watermark: 'Watermark \u2014 Text watermark overlay',
  data_stats: 'Stats \u2014 Stats bar data overlay',
  data_title: 'Title \u2014 Title card overlay',
  data_social: 'Social \u2014 Social card overlay',
}

// ═══════════════════════════════════════════════════════════════════
// PARAMETER DESCRIPTIONS — keyed by param label (uppercase)
// Used by Knob/SliderRow/ToggleRow/SelectRow for auto-lookup
// ═══════════════════════════════════════════════════════════════════

export const PARAM_DESCRIPTIONS: Record<string, string> = {
  // Common params
  AMT: 'Amount \u2014 Effect intensity',
  MIX: 'Mix \u2014 Dry/wet blend (0=original, 1=effect)',
  INT: 'Intensity \u2014 Effect strength',
  SIZE: 'Size \u2014 Element size',
  GRID: 'Grid \u2014 Grid cell dimension',
  SCALE: 'Scale \u2014 Pattern scale',
  SPD: 'Speed \u2014 Animation speed',
  DEN: 'Density \u2014 Element density',
  OPAC: 'Opacity \u2014 Transparency level',
  WIDTH: 'Width \u2014 Line or element width',
  THRSH: 'Threshold \u2014 Detection/activation threshold',
  DECAY: 'Decay \u2014 Fade amount per frame',
  FREQ: 'Frequency \u2014 Wave frequency',
  AMP: 'Amplitude \u2014 Wave amplitude',
  TRAIL: 'Trail \u2014 Motion trail length',
  SMTH: 'Smooth \u2014 Smoothing amount',
  ROT: 'Rotation \u2014 Rotation angle',
  SEED: 'Seed \u2014 Random seed for reproducibility',
  ANGLE: 'Angle \u2014 Pattern angle',
  DEPTH: 'Depth \u2014 Depth/perspective scale',

  // RGB Split
  'RD.X': 'Red X \u2014 Red channel horizontal offset',
  'RD.Y': 'Red Y \u2014 Red channel vertical offset',
  'GN.X': 'Green X \u2014 Green channel horizontal offset',
  'GN.Y': 'Green Y \u2014 Green channel vertical offset',
  'BL.X': 'Blue X \u2014 Blue channel horizontal offset',
  'BL.Y': 'Blue Y \u2014 Blue channel vertical offset',

  // Block displace
  DIST: 'Distance \u2014 Maximum displacement distance',
  CHNC: 'Chance \u2014 Probability of displacement',

  // Scan lines
  CNT: 'Count \u2014 Number of elements',
  FLCK: 'Flicker \u2014 Flicker intensity',

  // Chromatic
  RAD: 'Radial \u2014 Radial vs linear aberration',
  DIR: 'Direction \u2014 Effect direction',
  'RD.O': 'Red Offset \u2014 Red channel offset',
  'BL.O': 'Blue Offset \u2014 Blue channel offset',

  // VHS
  TEAR: 'Tear \u2014 VHS tape tear effect',
  BLEED: 'Bleed \u2014 Color bleeding',
  JITTER: 'Jitter \u2014 Head jitter instability',
  TSPD: 'Tear Speed \u2014 Tear animation speed',
  HDSW: 'Head Switch \u2014 Head switch noise',

  // Lens
  CURVE: 'Curve \u2014 Lens curvature distortion',
  VIG: 'Vignette \u2014 Edge darkening',
  FRNG: 'Fresnel Rings \u2014 Number of fresnel rings',
  FINT: 'Fresnel Int \u2014 Fresnel ring intensity',
  FRNB: 'Rainbow \u2014 Rainbow effect on fresnel',
  VSHP: 'Vig Shape \u2014 Vignette shape (radial/square)',
  PHOS: 'Phosphor \u2014 Phosphor glow effect',

  // Dither
  MODE: 'Mode \u2014 Effect rendering mode',

  // Posterize
  LVL: 'Levels \u2014 Number of color levels',
  SAT: 'Saturation \u2014 Color saturation',
  EDGE: 'Edge \u2014 Edge contrast enhancement',

  // Color grade
  CONT: 'Contrast \u2014 Contrast adjustment',
  BRT: 'Brightness \u2014 Brightness adjustment',
  'LF.R': 'Lift R \u2014 Red lift adjustment',
  'LF.G': 'Lift G \u2014 Green lift adjustment',
  'LF.B': 'Lift B \u2014 Blue lift adjustment',
  'GM.R': 'Gamma R \u2014 Red gamma correction',
  'GM.G': 'Gamma G \u2014 Green gamma correction',
  'GM.B': 'Gamma B \u2014 Blue gamma correction',
  'GN.R': 'Gain R \u2014 Red gain',
  'GN.G': 'Gain G \u2014 Green gain',
  'GN.B': 'Gain B \u2014 Blue gain',
  TINT: 'Tint \u2014 Color tint strength',
  TMODE: 'Tint Mode \u2014 Overlay/Multiply/Screen',

  // Feedback
  ZOOM: 'Zoom \u2014 Feedback zoom scale',
  HUE: 'Hue \u2014 Hue shift per iteration',
  'OF.X': 'Offset X \u2014 Feedback horizontal offset',
  'OF.Y': 'Offset Y \u2014 Feedback vertical offset',

  // ASCII
  RES: 'Resolution \u2014 Character grid resolution',
  MSPD: 'Matrix Speed \u2014 Matrix rain speed',
  MDEN: 'Matrix Density \u2014 Matrix character density',
  MTRL: 'Trail \u2014 Matrix trail length',
  COLOR: 'Color \u2014 Color mode',

  // Stipple
  SVAR: 'Size Var \u2014 Size variation between particles',
  BTHR: 'Bright Thr \u2014 Minimum brightness to render',
  JITR: 'Jitter \u2014 Random position jitter',

  // Acid specific
  DOT: 'Dot Size \u2014 Individual dot/LED size',
  CELLS: 'Cells \u2014 Number of cells',
  CHARS: 'Charset \u2014 Character set to use',
  FILL: 'Fill \u2014 Fill rendering mode',
  CONN: 'Connections \u2014 Maximum connections per point',
  PERSP: 'Perspective \u2014 Perspective distortion',
  BLEND: 'Blend \u2014 Blend with original',
  POS: 'Position \u2014 Element position',
  CELL: 'Cell \u2014 Cell size',
  MIN: 'Min \u2014 Minimum block size',
  MAX: 'Max \u2014 Maximum block size',
  SEG: 'Segments \u2014 Number of segments',
  OFF: 'Offset \u2014 Element offset',
  'CN.X': 'Center X \u2014 Horizontal center point',
  'CN.Y': 'Center Y \u2014 Vertical center point',

  // Contour
  GLOW: 'Glow \u2014 Glow effect intensity',
  MNSZ: 'Min Size \u2014 Minimum contour size',
  FADE: 'Fade \u2014 Fade mode',

  // Landmarks
  CONF: 'Confidence \u2014 Detection confidence threshold',
  TRCK: 'Tracking \u2014 Tracking confidence',
  FACE: 'Faces \u2014 Maximum faces to detect',
  HAND: 'Hands \u2014 Maximum hands to detect',

  // Vision tracking
  BLOBS: 'Blobs \u2014 Maximum blobs to track',
  FINT: 'Filter Int \u2014 Smoothing filter intensity',
  TDCY: 'Trail Decay \u2014 Trail fade per frame',
  HUER: 'Hue Range \u2014 Hue tolerance range',
  SMIN: 'Sat Min \u2014 Minimum saturation filter',
  TSNS: 'Trace Sens \u2014 Trace sensitivity',

  // Motion
  FRMS: 'Frames \u2014 Number of frames to sample',
  OMIX: 'Orig Mix \u2014 Blend with original',
  SHOW: 'Show Orig \u2014 Show original image',
  CSHIFT: 'Color Shift \u2014 Color shift between echoes',
  ACC: 'Accumulate \u2014 Frame accumulation amount',
  'MOT ONLY': 'Motion Only \u2014 Show only motion areas',
  INVERT: 'Invert \u2014 Invert mask',

  // Strand
  COV: 'Coverage \u2014 Effect coverage area',
  AGE: 'Age \u2014 Aging effect amount',
  STRK: 'Streaks \u2014 Number of streaks',
  RING: 'Ring \u2014 Ring width',
  FLOW: 'Flow \u2014 Particle flow speed',
  REACH: 'Reach \u2014 Tendril reach distance',
  PULSE: 'Pulse \u2014 Pulse animation speed',
  PING: 'Ping \u2014 Sonar ping intensity',
  RVDUR: 'Reveal \u2014 Reveal animation duration',
  SHMR: 'Shimmer \u2014 Shimmer effect intensity',
  GRAIN: 'Grain \u2014 Sand grain amount',
  INVP: 'Invert Prob \u2014 Invert probability',
  HALO: 'Halo \u2014 Halo size',
  SENS: 'Sensitivity \u2014 Detection sensitivity',
  RESP: 'Response \u2014 Responsiveness to audio',
  CAUST: 'Caustic \u2014 Caustic effect amount',
  PARA: 'Parallax \u2014 Parallax depth effect',
  EDIST: 'Edge Dist \u2014 Edge distortion',
  STGS: 'Stages \u2014 Number of decay stages',

  // Destruction
  CHAOS: 'Chaos \u2014 Randomness amount',
  BLKSZ: 'Block Size \u2014 Datamosh block size',
  KFCH: 'Keyframe \u2014 Keyframe chance',
  FDBK: 'Feedback \u2014 Feedback amount',
  RAND: 'Random \u2014 Randomness amount',
  RATE: 'Rate \u2014 Sample rate',
  BITS: 'Bits \u2014 Bit depth reduction',
  DRIVE: 'Drive \u2014 Digital drive/saturation',
  FILTER: 'Filter \u2014 Filter cutoff frequency',
  OFFSET: 'Offset \u2014 Byte offset in stream',
  CHAN: 'Channel \u2014 Color channel mode',
  DENS: 'Density \u2014 Point cloud density',
  NOISE: 'Noise \u2014 Noise displacement',
  'N.SCALE': 'Noise Scale \u2014 Noise pattern scale',
  'N.SPD': 'Noise Speed \u2014 Noise animation speed',
  'ROT.X': 'Rotate X \u2014 3D rotation X axis',
  'ROT.Y': 'Rotate Y \u2014 3D rotation Y axis',
  'SCL.X': 'Scale X \u2014 Horizontal scale',
  'SCL.Y': 'Scale Y \u2014 Vertical scale',

  // Audio gate
  THRESH: 'Threshold \u2014 Audio gate threshold level',
  GAIN: 'Gain \u2014 Input gain multiplier',
  ATK: 'Attack \u2014 Gate attack time',
  REL: 'Release \u2014 Gate release time',

  // LFO (for ModulationAssignPanel / LFOEditorPanel)
  Rate: 'LFO Rate \u2014 Modulation speed in Hz',
  Tilt: 'Tilt \u2014 Wave asymmetry',
  Curve: 'Curve \u2014 Wave curvature',
  Phase: 'Phase \u2014 Cycle offset in degrees',
}

// ═══════════════════════════════════════════════════════════════════
// UI ELEMENT DESCRIPTIONS — for non-effect interactive elements
// ═══════════════════════════════════════════════════════════════════

export const UI_DESCRIPTIONS: Record<string, string> = {
  // Transport
  record: 'Record \u2014 Capture effect automation',
  playPause: 'Play/Pause \u2014 Start or stop playback (Space)',
  clear: 'Clear \u2014 Reset source',

  // Source
  webcam: 'Webcam \u2014 Toggle live camera input',
  file: 'File \u2014 Load video or image file',

  // Header
  fps: 'FPS \u2014 Current frames per second',
  brand: 'SEG_F4ULT \u2014 Video effect performance system',

  // Crossfader
  crossfader: 'Crossfader \u2014 Blend between source and processed',
  snapSource: 'Source \u2014 Snap to unprocessed signal',
  snapProcessed: 'FX \u2014 Snap to fully processed signal',

  // Bank panel
  bankA: 'Bank A \u2014 Click to save/load, right-click to clear',
  bankB: 'Bank B \u2014 Click to save/load, right-click to clear',
  bankC: 'Bank C \u2014 Click to save/load, right-click to clear',
  bankD: 'Bank D \u2014 Click to save/load, right-click to clear',
  randomize: 'Randomize \u2014 Shuffle effect parameters',
  undo: 'Undo \u2014 Revert last randomize',
  rekt: 'REKT \u2014 Hold for momentary chaos, tap to lock',

  // Effect card stack
  bypass: 'Bypass \u2014 Temporarily disable effect',
  remove: 'Remove \u2014 Disable and remove from chain',
  expand: 'Expand \u2014 Show full parameter controls',
  collapse: 'Collapse \u2014 Show compact view',
  presets: 'Presets \u2014 Open preset library',

  // LFO / Modulation
  assign: 'Assign \u2014 Map LFO to effect parameters',
  waveform: 'Waveform Preview \u2014 Current LFO shape',
  syncFree: 'Free \u2014 Free-running LFO',
  syncBpm: 'Sync \u2014 Sync LFO to BPM',

  // Bottom panel tabs
  tabMixer: 'Mixer \u2014 Effect dry/wet levels',
  tabModulation: 'Modulation \u2014 LFO and modulation sources',
  tabModMatrix: 'Mod Matrix \u2014 Modulation routing overview',
  tabAutomation: 'Automation \u2014 Parameter automation lanes',

  // Bottom panel icons
  iconRandomize: 'Randomize \u2014 Shuffle parameters',
  iconSettings: 'Settings \u2014 Panel options',
  iconSliders: 'Sliders \u2014 View as sliders',
  prevPage: 'Previous page',
  nextPage: 'Next page',

  // Sequencer
  seqEffects: 'P-Lock \u2014 Effect step sequencer',
  seqSlicer: 'Slicer \u2014 Audio/video slicing sequencer',
  clearAll: 'Clear All \u2014 Remove all active effects',
  bypassAll: 'Bypass All \u2014 Temporarily disable all effects',
  randomizeSteps: 'Randomize \u2014 Randomize steps on selected track',
  randomizeLocks: 'Randomize P-Locks \u2014 Randomize parameter locks',
  clearTrack: 'Clear Track \u2014 Clear all steps on selected track',

  // Audio source
  audioVid: 'VID \u2014 Use video audio as source',
  audioFile: 'FILE \u2014 Use imported audio file',
  audioMic: 'MIC \u2014 Use microphone input',
  audioImport: 'Import \u2014 Load an audio file',
  gateToggle: 'Gate \u2014 Audio gate/envelope settings',
  gateMode: 'Mode \u2014 Gate (binary) or Envelope (scaling)',

  // Presets
  presetSave: 'Save \u2014 Save current state as preset',
  presetImport: 'Import \u2014 Import preset pack',
  presetExport: 'Export All \u2014 Export all presets as pack',
  presetSearch: 'Search \u2014 Filter presets by name',
  presetFolder: 'Folder \u2014 Click to expand/collapse, right-click for options',
  presetRow: 'Preset \u2014 Click to load, Shift+click for details',

  // Sequencer transport
  seqPlayStop: 'Play/Stop \u2014 Start or stop step sequencer',
  seqBpm: 'BPM \u2014 Drag up/down to change tempo',
  seqResolution: 'Resolution \u2014 Click to cycle step rate',
  seqSwing: 'Swing \u2014 Drag up/down to adjust shuffle feel',
  seqSync: 'MIDI Sync \u2014 Lock tempo to external MIDI clock',
  seqPageDot: 'Page \u2014 Switch step sequencer page',

  // Modulator tabs
  modLFO: 'LFO \u2014 Low-frequency oscillator modulation',
  modRandom: 'Random \u2014 Random value modulation',
  modStep: 'Step \u2014 Step sequencer modulation',
  modEnvelope: 'Envelope \u2014 ADSR envelope modulation',
  modSH: 'S&H \u2014 Sample and hold modulation',
  modMIDI: 'MIDI \u2014 MIDI CC controller mapping',
  modAudio: 'Audio \u2014 Audio-reactive frequency band mapping',

  // Modulation lane cards
  modCardLFO: 'LFO \u2014 Click to select/enable, double-click to disable',
  modCardRandom: 'Random \u2014 Click to select/enable, double-click to disable',
  modCardStep: 'Step \u2014 Click to select/enable, double-click to disable',
  modCardEnvelope: 'Envelope \u2014 Click to select/enable, double-click to disable',
  modCardSH: 'S&H \u2014 Click to select/enable, double-click to disable',
  modAssign: 'Assign \u2014 Click then click knobs to create modulation routing',

  // Modulation content
  modTrigger: 'Trigger \u2014 Hold to fire envelope, release to start decay',
  modLearnCC: 'Learn CC \u2014 Turn a MIDI knob to detect CC number',
  modAssignCC: 'Assign \u2014 Map detected CC to effect parameters',
  modAutoRoute: 'Auto-Route \u2014 Automatically assign bands to active effects',
  modClearRouting: 'Clear \u2014 Remove all audio routings',
  modBandAssign: 'Assign \u2014 Click then click a knob to route this band',
  modToggle: 'Enable/Disable \u2014 Toggle modulator on or off',

  // ModulatorSection
  modSectionLFO: 'LFO \u2014 Click to expand, LED toggles on/off',
  modSectionRandom: 'Random \u2014 Click to expand, LED toggles on/off',
  modSectionStep: 'Step \u2014 Click to expand, LED toggles on/off',
  modSectionEnvelope: 'Envelope \u2014 Click to expand, LED toggles on/off',
  modSectionSH: 'S&H \u2014 Click to expand, LED toggles on/off',

  // Slicer controls
  slicerSliceCount: 'Slice Count \u2014 Number of video slices',
  slicerAutoScan: 'Scan \u2014 Auto-scan through slices',
  slicerScanMode: 'Scan Mode \u2014 Loop or pendulum scanning',
  slicerOutputMode: 'Output Mode \u2014 Replace, mix, or layer slices',
  slicerBlendMode: 'Blend Mode \u2014 Layer compositing mode',
  slicerFreeze: 'Freeze \u2014 Lock current slice frame',

  // XY Pad
  xyPad: 'XY Pad \u2014 Drag to control two parameters at once',
  xyParamX: 'X Param \u2014 Select parameter for horizontal axis',
  xyParamY: 'Y Param \u2014 Select parameter for vertical axis',

  // Mix Controls
  mixFader: 'Dry/Wet \u2014 Drag to blend original and processed signal',

  // Clip Bin
  clipImport: 'Import \u2014 Add a video clip to the bin',
  clipStack: 'Clip Bin \u2014 Click to browse clips, drag to preview',
  clipAdd: 'Add Clip \u2014 Import another video clip',

  // Effect tabs bar (sequencer)
  effectTab: 'Effect Track \u2014 Click to select, Shift+click to bypass, double-click to remove',
  effectTabDrag: 'Drag to reorder effect processing chain',

  // Step cells
  stepCell: 'Step \u2014 Click to toggle, right-drag for parameter lock value',
}

// ═══════════════════════════════════════════════════════════════════
// PAGE DESCRIPTIONS — for effect grid page tabs
// ═══════════════════════════════════════════════════════════════════

export const PAGE_DESCRIPTIONS: Record<string, string> = {
  ACID: 'Acid \u2014 Data visualization effects',
  VISION: 'Vision \u2014 Computer vision tracking',
  GLITCH: 'Glitch \u2014 Digital distortion effects',
  STRAND: 'Strand \u2014 Death Stranding-inspired',
  MOTION: 'Motion \u2014 Temporal/motion effects',
  DESTRUCTION: 'Destruction \u2014 Destructive/corruption',
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/** Get status text for an effect button in the grid */
export function getEffectStatusText(effectId: string): string {
  return EFFECT_DESCRIPTIONS[effectId] ?? effectId
}

/** Get status text for a parameter knob/slider by its label */
export function getParamStatusText(label: string): string | undefined {
  return PARAM_DESCRIPTIONS[label]
}

/** Get status text for a UI element */
export function getUIStatusText(key: string): string {
  return UI_DESCRIPTIONS[key] ?? key
}

/** Get LFO cell status text */
export function getLFOStatusText(index: number): string {
  return `LFO ${index + 1} \u2014 Select modulator`
}

/** Get bank button status text */
export function getBankStatusText(label: string, isEmpty: boolean): string {
  return isEmpty
    ? `Bank ${label} \u2014 Click to save current state`
    : `Bank ${label} \u2014 Click to load, double-click to overwrite, right-click to clear`
}

/** Get audio source status text */
export function getAudioSourceStatusText(sourceId: string): string {
  const map: Record<string, string> = {
    video: 'VID \u2014 Use video audio as source',
    file: 'FILE \u2014 Use imported audio file',
    mic: 'MIC \u2014 Use microphone input',
  }
  return map[sourceId] ?? sourceId
}

/** Get page tab status text */
export function getPageStatusText(pageName: string): string {
  return PAGE_DESCRIPTIONS[pageName] ?? `${pageName} \u2014 Navigate effect pages`
}
