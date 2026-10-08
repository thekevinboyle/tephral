// Centralized status bar descriptions for all interactive elements.
// Keyed by element identifier — components look up descriptions here
// rather than hardcoding tooltip strings.

// ═══════════════════════════════════════════════════════════════════
// EFFECT DESCRIPTIONS — keyed by effect ID
// ═══════════════════════════════════════════════════════════════════

export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  // ACID
  acid_dots: 'Dots: Grid-based dot pattern visualization',
  acid_glyph: 'Glyph: ASCII glyphs mapped to brightness grid',
  acid_icons: 'Icons: Symbol grid rendering with icon sets',
  acid_contour: 'Contour: Edge contour rendering with variable levels',
  acid_decomp: 'Decomposition: Recursive block decomposition',
  acid_mirror: 'Mirror: Radial kaleidoscope effect',
  acid_slice: 'Slice: Horizontal/vertical slice rendering',
  acid_thgrid: 'Threshold Grid: Threshold-based grid with glow lines',
  acid_cloud: 'Cloud: 3D particle cloud rendering',
  acid_led: 'LED Matrix: LED matrix display effect',
  acid_slit: 'Slit: Scanning slit aperture effect',
  acid_voronoi: 'Voronoi: Voronoi cell diagram effect',
  acid_halftone: 'Halftone: Halftone dot pattern print effect',
  acid_hex: 'Hex: Hexagonal grid mosaic effect',
  acid_scan: 'Scan: Animated scanning beam effect',
  acid_ripple: 'Ripple: Wave ripple distortion effect',

  // VISION
  track_bright: 'Bright: Track bright regions and blobs',
  track_edge: 'Edge: Track edge contours and outlines',
  track_color: 'Color: Track regions of specific color hue',
  track_motion: 'Motion: Track areas of pixel motion',
  track_face: 'Face: Track face regions by skin tone',
  track_hands: 'Hands: Track hand regions by skin tone',
  contour: 'Contour: Contour outline rendering',
  landmarks: 'Landmarks: Face/hand landmark detection',
  face_hud: 'Face HUD: Face mesh wireframe with HUD readouts',
  halation: 'Halation: Film glow bleeding around highlights',
  y2k_digicam: 'Y2K Digicam: Early 2000s digital camera look',
  thermal: 'Thermal: Heat camera false color',
  dreamcore: 'Dreamcore: Soft bloom and hazy dream tint',
  anamorphic: 'Anamorphic: Widescreen lens streaks and flares',

  // GLITCH
  rgb_split: 'RGB Split: RGB channel separation offset',
  chromatic: 'Chromatic: Chromatic aberration effect',
  posterize: 'Posterize: Color quantization/banding',
  color_grade: 'Color Grade: Professional color grading controls',
  block_displace: 'Block Displace: Block-based displacement glitch',
  static_displace: 'Static Displace: Static noise displacement',
  pixelate: 'Pixelate: Pixel mosaic effect',
  lens: 'Lens: Lens distortion and fresnel effects',
  scan_lines: 'Scan Lines: CRT scan line overlay',
  vhs: 'VHS Tape: VHS tape degradation effect',
  noise: 'Noise: Animated noise texture',
  dither: 'Dither: Dither pattern effect',
  edges: 'Edges: Edge detection overlay',
  feedback: 'Feedback: Recursive feedback loop',
  ascii: 'ASCII Art: ASCII/text rendering modes',
  stipple: 'Stipple: Stippled dot shading',

  // STRAND
  strand_handprints: 'Handprints: BT handprint visualization',
  strand_tar: 'Tar Spread: Tar-like spreading effect',
  strand_timefall: 'Timefall: Time-based degradation',
  strand_voidout: 'Void Out: Void entity manifestation',
  strand_web: 'Web: Connection web between objects',
  strand_bridge: 'Bridge: Link bridges between elements',
  strand_path: 'Chiral Path: Chiral path particle trails',
  strand_umbilical: 'Umbilical: Tendril/umbilical cord effect',
  strand_odradek: 'Odradek: Scanning sonar effect',
  strand_chiralium: 'Chiralium: Chiral matter visualization',
  strand_beach: 'Beach Static: Beach strand static noise',
  strand_dooms: 'Dooms: Timefall dooms effect',
  strand_cloud: 'Chiral Cloud: Chiral cloud effect',
  strand_bbpod: 'BB Pod: BB pod interior vignette',
  strand_seam: 'Seam: Dimensional seam/rift',
  strand_extinction: 'Extinction: Mass extinction effect',

  // MOTION
  motion_extract: 'Motion Extract: Motion detection and extraction',
  echo_trail: 'Echo Trail: Echo/motion trail effect',
  time_smear: 'Time Smear: Temporal smearing/ghosting',
  freeze_mask: 'Freeze Mask: Freeze frame masking',
  flow_smear: 'Flow Smear: Pixels smeared along the motion',
  feedback_tunnel: 'Feedback Tunnel: Zooming recursive frame tunnel',
  opium_trails: 'Opium Trails: Long fading color trails',
  rutt_etra: 'Rutt-Etra: Scan lines lifted by brightness',
  reaction_diffusion: 'Reaction Diffusion: Growing Turing patterns',
  physarum: 'Physarum: Slime mould agents tracing the image',

  // DESTRUCTION
  datamosh: 'Datamosh: Datamosh video glitch',
  pixelSort: 'Pixel Sort: Pixel sorting effect',
  sonify: 'Sonify: Audio-style pixel corruption',
  point_cloud: 'Point Cloud: 3D point cloud destruction',
  kaleidoscope: 'Kaleidoscope: Mirrored radial segments',
  liquid_morph: 'Liquid Morph: Fluid warping distortion',
  crystallize: 'Crystallize: Faceted crystal cells',
  ripple_warp: 'Ripple Warp: Concentric wave displacement',
  fractal_domain: 'Fractal Domain: Fractal domain-warp distortion',
  seg_voxel: 'Voxel: Person as extruded cubes',
  seg_echo: 'Echo 4D: Copies through time',
  seg_matter: 'Matter: Color fields in the mask',
  seg_stale: 'Stale: Freeze and decay areas',
  seg_torn: 'Torn: Ragged bites torn into the frame edges',

  // OVERLAYS
  texture_overlay: 'Texture Overlay: Film texture laid over the frame',
  data_overlay: 'Data Overlay: Readout text drawn over the frame',
  texture_grain: 'Grain: Film grain texture overlay',
  texture_dust: 'Dust: Dust particle overlay',
  texture_leak: 'Leak: Light leak/vignette overlay',
  texture_paper: 'Paper: Paper texture overlay',
  texture_canvas: 'Canvas: Canvas texture overlay',
  texture_vhs: 'VHS: VHS noise texture overlay',
  data_watermark: 'Watermark: Text watermark overlay',
  data_stats: 'Stats: Stats bar data overlay',
  data_title: 'Title: Title card overlay',
  data_social: 'Social: Social card overlay',
}

// ═══════════════════════════════════════════════════════════════════
// PARAMETER DESCRIPTIONS — keyed by param label (uppercase)
// Used by Knob/SliderRow/ToggleRow/SelectRow for auto-lookup
// ═══════════════════════════════════════════════════════════════════

export const PARAM_DESCRIPTIONS: Record<string, string> = {
  // Common params
  AMT: 'Amount: Effect intensity',
  MIX: 'Mix: Dry/wet blend (0=original, 1=effect)',
  INT: 'Intensity: Effect strength',
  SIZE: 'Size: Element size',
  GRID: 'Grid: Grid cell dimension',
  SCALE: 'Scale: Pattern scale',
  SPD: 'Speed: Animation speed',
  DEN: 'Density: Element density',
  OPAC: 'Opacity: Transparency level',
  WIDTH: 'Width: Line or element width',
  THRSH: 'Threshold: Detection/activation threshold',
  DECAY: 'Decay: Fade amount per frame',
  FREQ: 'Frequency: Wave frequency',
  AMP: 'Amplitude: Wave amplitude',
  TRAIL: 'Trail: Motion trail length',
  SMTH: 'Smooth: Smoothing amount',
  ROT: 'Rotation: Rotation angle',
  SEED: 'Seed: Random seed for reproducibility',
  ANGLE: 'Angle: Pattern angle',
  DEPTH: 'Depth: Depth/perspective scale',

  // RGB Split
  'RD.X': 'Red X: Red channel horizontal offset',
  'RD.Y': 'Red Y: Red channel vertical offset',
  'GN.X': 'Green X: Green channel horizontal offset',
  'GN.Y': 'Green Y: Green channel vertical offset',
  'BL.X': 'Blue X: Blue channel horizontal offset',
  'BL.Y': 'Blue Y: Blue channel vertical offset',

  // Block displace
  DIST: 'Distance: Maximum displacement distance',
  CHNC: 'Chance: Probability of displacement',

  // Scan lines
  CNT: 'Count: Number of elements',
  FLCK: 'Flicker: Flicker intensity',

  // Chromatic
  RAD: 'Radial: Radial vs linear aberration',
  DIR: 'Direction: Effect direction',
  'RD.O': 'Red Offset: Red channel offset',
  'BL.O': 'Blue Offset: Blue channel offset',

  // VHS
  TEAR: 'Tear: VHS tape tear effect',
  BLEED: 'Bleed: Color bleeding',
  JITTER: 'Jitter: Head jitter instability',
  TSPD: 'Tear Speed: Tear animation speed',
  HDSW: 'Head Switch: Head switch noise',

  // Lens
  CURVE: 'Curve: Lens curvature distortion',
  VIG: 'Vignette: Edge darkening',
  FRNG: 'Fresnel Rings: Number of fresnel rings',
  FINT: 'Fresnel Int: Fresnel ring intensity',
  FRNB: 'Rainbow: Rainbow effect on fresnel',
  VSHP: 'Vig Shape: Vignette shape (radial/square)',
  PHOS: 'Phosphor: Phosphor glow effect',

  // Dither
  MODE: 'Mode: Effect rendering mode',

  // Posterize
  LVL: 'Levels: Number of color levels',
  SAT: 'Saturation: Color saturation',
  EDGE: 'Edge: Edge contrast enhancement',

  // Color grade
  CONT: 'Contrast: Contrast adjustment',
  BRT: 'Brightness: Brightness adjustment',
  'LF.R': 'Lift R: Red lift adjustment',
  'LF.G': 'Lift G: Green lift adjustment',
  'LF.B': 'Lift B: Blue lift adjustment',
  'GM.R': 'Gamma R: Red gamma correction',
  'GM.G': 'Gamma G: Green gamma correction',
  'GM.B': 'Gamma B: Blue gamma correction',
  'GN.R': 'Gain R: Red gain',
  'GN.G': 'Gain G: Green gain',
  'GN.B': 'Gain B: Blue gain',
  TINT: 'Tint: Color tint strength',
  TMODE: 'Tint Mode: Overlay/Multiply/Screen',

  // Feedback
  ZOOM: 'Zoom: Zoom amount',
  HUE: 'Hue: Hue shift per iteration',
  'OF.X': 'Offset X: Feedback horizontal offset',
  'OF.Y': 'Offset Y: Feedback vertical offset',

  // ASCII
  RES: 'Resolution: Character grid resolution',
  MSPD: 'Matrix Speed: Matrix rain speed',
  MDEN: 'Matrix Density: Matrix character density',
  MTRL: 'Trail: Matrix trail length',
  COLOR: 'Color: Color mode',

  // Stipple
  SVAR: 'Size Var: Size variation between particles',
  BTHR: 'Bright Thr: Minimum brightness to render',
  JITR: 'Jitter: Random position jitter',

  // Acid specific
  DOT: 'Dot Size: Individual dot/LED size',
  CELLS: 'Cells: Number of cells',
  CHARS: 'Charset: Character set to use',
  FILL: 'Fill: Fill rendering mode',
  CONN: 'Connections: Maximum connections per point',
  PERSP: 'Perspective: Perspective distortion',
  BLEND: 'Blend: Blend with original',
  POS: 'Position: Element position',
  CELL: 'Cell: Cell size',
  MIN: 'Min: Minimum block size',
  MAX: 'Max: Maximum block size',
  SEG: 'Segments: Number of segments',
  OFF: 'Offset: Element offset',
  'CN.X': 'Center X: Horizontal center point',
  'CN.Y': 'Center Y: Vertical center point',

  // Contour
  GLOW: 'Glow: Glow effect intensity',
  MNSZ: 'Min Size: Minimum contour size',
  FADE: 'Fade: Fade mode',

  // Landmarks
  CONF: 'Confidence: Detection confidence threshold',
  TRCK: 'Tracking: Tracking confidence',
  FACE: 'Faces: Maximum faces to detect',
  HAND: 'Hands: Maximum hands to detect',

  // Vision tracking
  BLOBS: 'Blobs: Maximum blobs to track',
  FILTI: 'Filter Int: Smoothing filter intensity',
  TDCY: 'Trail Decay: Trail fade per frame',
  HUER: 'Hue Range: Hue tolerance range',
  SMIN: 'Sat Min: Minimum saturation filter',
  TSNS: 'Trace Sens: Trace sensitivity',

  // Motion
  FRMS: 'Frames: Number of frames to sample',
  OMIX: 'Orig Mix: Blend with original',
  SHOW: 'Show Orig: Show original image',
  CSHIFT: 'Color Shift: Color shift between echoes',
  ACC: 'Accumulate: Frame accumulation amount',
  'MOT ONLY': 'Motion Only: Show only motion areas',
  INVERT: 'Invert: Invert mask',

  // Strand
  COV: 'Coverage: Effect coverage area',
  AGE: 'Age: Aging effect amount',
  STRK: 'Streak: Length of the light streaks',
  RING: 'Ring: Ring width',
  FLOW: 'Flow: Particle flow speed',
  REACH: 'Reach: Tendril reach distance',
  PULSE: 'Pulse: Pulse animation speed',
  PING: 'Ping: Sonar ping intensity',
  RVDUR: 'Reveal: Reveal animation duration',
  SHMR: 'Shimmer: Shimmer effect intensity',
  GRAIN: 'Grain: Grain amount',
  INVP: 'Invert Prob: Invert probability',
  HALO: 'Halo: Halo size',
  SENS: 'Sensitivity: Detection sensitivity',
  RESP: 'Response: Responsiveness to audio',
  CAUST: 'Caustic: Caustic effect amount',
  PARA: 'Parallax: Parallax depth effect',
  EDIST: 'Edge Dist: Edge distortion',
  STGS: 'Stages: Number of decay stages',

  // Destruction
  CHAOS: 'Chaos: Randomness amount',
  BLKSZ: 'Block Size: Datamosh block size',
  KFCH: 'Keyframe: Keyframe chance',
  FDBK: 'Feedback: Feedback amount',
  RAND: 'Random: Randomness amount',
  RATE: 'Rate: Sample rate',
  BITS: 'Bits: Bit depth reduction',
  DRIVE: 'Drive: Digital drive/saturation',
  FILTER: 'Filter: Filter cutoff frequency',
  OFFSET: 'Offset: Byte offset in stream',
  CHAN: 'Channel: Color channel mode',
  DENS: 'Density: Point cloud density',
  NOISE: 'Noise: Noise displacement',
  'N.SCALE': 'Noise Scale: Noise pattern scale',
  'N.SPD': 'Noise Speed: Noise animation speed',
  'ROT.X': 'Rotate X: 3D rotation X axis',
  'ROT.Y': 'Rotate Y: 3D rotation Y axis',
  'SCL.X': 'Scale X: Horizontal scale',
  'SCL.Y': 'Scale Y: Vertical scale',

  // Audio gate
  THRESH: 'Threshold: Audio gate threshold level',
  GAIN: 'Gain: Input gain multiplier',
  ATK: 'Attack: Gate attack time',
  REL: 'Release: Gate release time',

  // LFO (for ModulationAssignPanel / LFOEditorPanel)
  Rate: 'LFO Rate: Modulation speed in Hz',
  Tilt: 'Tilt: Wave asymmetry',
  Curve: 'Curve: Wave curvature',
  Phase: 'Phase: Cycle offset in degrees',
}

// ═══════════════════════════════════════════════════════════════════
// UI ELEMENT DESCRIPTIONS — for non-effect interactive elements
// ═══════════════════════════════════════════════════════════════════

export const UI_DESCRIPTIONS: Record<string, string> = {
  // Transport
  record: 'Record: Capture effect automation',
  playPause: 'Play/Pause: Start or stop playback (Space)',
  clear: 'Clear: Reset source',

  // Source
  webcam: 'Webcam: Toggle live camera input',
  file: 'File: Load video or image file',

  // Header
  fps: 'FPS: Current frames per second',
  brand: 'SEG_F4ULT: Video effect performance system',

  // Crossfader
  crossfader: 'Crossfader: drag to blend the dry source with the processed (wet) output',
  snapSource: 'Dry: snap the crossfader to the unprocessed source',
  snapProcessed: 'Wet: snap the crossfader to the fully processed output',

  // Bank panel
  bankA: 'Bank A: Click to save/load, right-click to clear',
  bankB: 'Bank B: Click to save/load, right-click to clear',
  bankC: 'Bank C: Click to save/load, right-click to clear',
  bankD: 'Bank D: Click to save/load, right-click to clear',
  randomize: 'Randomize: Shuffle effect parameters',
  undo: 'Undo: Revert last randomize',
  rekt: 'REKT: Hold for momentary chaos, tap to lock',

  // Effect card stack
  bypass: 'Bypass: Temporarily disable effect',
  remove: 'Remove: Disable and remove from chain',
  expand: 'Expand: Show full parameter controls',
  collapse: 'Collapse: Show compact view',
  presets: 'Presets: Open preset library',

  // LFO / Modulation
  assign: 'Assign: Map LFO to effect parameters',
  waveform: 'Waveform Preview: Current LFO shape',
  syncFree: 'Free: Free-running LFO',
  syncBpm: 'Sync: Sync LFO to BPM',

  // Bottom panel tabs
  tabMixer: 'Mixer: Effect dry/wet levels',
  tabModulation: 'Modulation: LFO and modulation sources',
  tabModMatrix: 'Mod Matrix: Modulation routing overview',
  tabAutomation: 'Automation: Parameter automation lanes',

  // Bottom panel icons
  iconRandomize: 'Randomize: Shuffle parameters',
  iconSettings: 'Settings: Panel options',
  iconSliders: 'Sliders: View as sliders',
  prevPage: 'Previous page',
  nextPage: 'Next page',

  // Shell (browser, inspector, bottom panel, footer)
  browserList: 'List: effects by category with a description each. Click one to add or remove it',
  browserPads: 'Pads: the performance grid. Click to toggle, drag for mix, hold to solo',
  browserCategory: 'Click to fold or unfold this category',
  deviceBypass: 'Bypass: switch this device off without removing it from the chain',
  tabDevices: 'Devices: the effect chain and its modulators',
  tabWarp: 'Warp: draw what happens to time over a short loop, for the video and the sound',
  tabSequencer: 'Sequencer: step lanes for the effects in the chain',
  toggleBrowser: 'Browser: show or hide the effects browser',
  toggleInspector: 'Inspector: show or hide the settings of the selected device or modulator',
  toggleBottom: 'Bottom panel: show or hide the chain and the sequencer',
  modSlot: 'Click to edit this modulator in the inspector',
  modRoute: 'Click, then click or drag a control to route this modulator to it. You can also drag this dot onto a control',
  modRouteStop: 'Routing: click a control to route it. Click here or press Escape to stop',
  routeRemove: 'Remove this modulation route',

  // Sequencer
  seqEffects: 'Steps: the effect step sequencer with parameter locks',
  seqSlicer: 'Slicer: the audio and video slicing sequencer',
  clearAll: 'Clear All. Remove all active effects',
  bypassAll: 'Bypass All. Temporarily disable all effects',
  randomizeSteps: 'Randomize: Randomize steps on selected track',
  randomizeLocks: 'Randomize P-Locks: Randomize parameter locks',
  clearTrack: 'Clear Track: Clear all steps on selected track',

  // Audio source
  audioVid: 'VID: Use video audio as source',
  audioFile: 'FILE: Use imported audio file',
  audioMic: 'MIC: Use microphone input',
  audioImport: 'Import: Load an audio file',
  gateToggle: 'Gate: Audio gate/envelope settings',
  gateMode: 'Mode: Gate (binary) or Envelope (scaling)',

  // Presets
  presetSave: 'Save: Save current state as preset',
  presetImport: 'Import: Import preset pack',
  presetExport: 'Export All: Export all presets as pack',
  presetSearch: 'Search: Filter presets by name',
  presetFolder: 'Folder: Click to expand/collapse, right-click for options',
  presetRow: 'Preset: Click to load, Shift+click for details',

  // Sequencer transport
  seqPlayStop: 'Play/Stop: Start or stop step sequencer',
  seqBpm: 'BPM: Drag up/down to change tempo',
  seqResolution: 'Resolution: Click to cycle step rate',
  seqSwing: 'Swing: Drag up/down to adjust shuffle feel',
  seqSync: 'MIDI Sync: Lock tempo to external MIDI clock',
  seqPageDot: 'Page: Switch step sequencer page',

  // Modulator tabs
  modLFO: 'LFO: Low-frequency oscillator modulation',
  modRandom: 'Random: Random value modulation',
  modStep: 'Step: Step sequencer modulation',
  modEnvelope: 'Envelope: ADSR envelope modulation',
  modSH: 'S&H: Sample and hold modulation',
  modMIDI: 'MIDI: MIDI CC controller mapping',
  modAudio: 'Audio: Audio-reactive frequency band mapping',

  // Modulation lane cards
  modCardLFO: 'LFO: Click to select/enable, double-click to disable',
  modCardRandom: 'Random: Click to select/enable, double-click to disable',
  modCardStep: 'Step: Click to select/enable, double-click to disable',
  modCardEnvelope: 'Envelope: Click to select/enable, double-click to disable',
  modCardSH: 'S&H: Click to select/enable, double-click to disable',
  modAssign: 'Assign: Click then click knobs to create modulation routing',

  // Modulation content
  modTrigger: 'Trigger: Hold to fire envelope, release to start decay',
  modLearnCC: 'Learn CC: Turn a MIDI knob to detect CC number',
  modAssignCC: 'Assign: Map detected CC to effect parameters',
  modAutoRoute: 'Auto-Route: Automatically assign bands to active effects',
  modClearRouting: 'Clear: Remove all audio routings',
  modBandAssign: 'Assign: Click then click a knob to route this band',
  modToggle: 'Enable/Disable: Toggle modulator on or off',

  // ModulatorSection
  modSectionLFO: 'LFO: Click to expand, LED toggles on/off',
  modSectionRandom: 'Random: Click to expand, LED toggles on/off',
  modSectionStep: 'Step: Click to expand, LED toggles on/off',
  modSectionEnvelope: 'Envelope: Click to expand, LED toggles on/off',
  modSectionSH: 'S&H: Click to expand, LED toggles on/off',

  // Slicer controls
  slicerSliceCount: 'Slice Count: Number of video slices',
  slicerAutoScan: 'Scan: Auto-scan through slices',
  slicerScanMode: 'Scan Mode: Loop or pendulum scanning',
  slicerOutputMode: 'Output Mode: Replace, mix, or layer slices',
  slicerBlendMode: 'Blend Mode: Layer compositing mode',
  slicerFreeze: 'Freeze: Lock current slice frame',

  // XY Pad
  xyPad: 'XY Pad: Drag to control two parameters at once',
  xyParamX: 'X Param: Select parameter for horizontal axis',
  xyParamY: 'Y Param: Select parameter for vertical axis',

  // Mix Controls
  mixFader: 'Dry/Wet: Drag to blend original and processed signal',

  // Clip Bin
  clipImport: 'Import: Add a video clip to the bin',
  clipStack: 'Clip Bin: Click to browse clips, drag to preview',
  clipAdd: 'Add Clip: Import another video clip',

  // Effect tabs bar (sequencer)
  effectTab: 'Effect Track: Click to select, Shift+click to bypass, double-click to remove',
  effectTabDrag: 'Drag to reorder effect processing chain',

  // Step cells
  stepCell: 'Step: Click to toggle, right-drag for parameter lock value',
}

// ═══════════════════════════════════════════════════════════════════
// PAGE DESCRIPTIONS — for effect grid page tabs
// ═══════════════════════════════════════════════════════════════════

export const PAGE_DESCRIPTIONS: Record<string, string> = {
  ACID: 'Acid: Data visualization effects',
  VISION: 'Vision: Computer vision tracking',
  GLITCH: 'Glitch: Digital distortion effects',
  STRAND: 'Strand: Death Stranding-inspired',
  MOTION: 'Motion: Temporal/motion effects',
  DESTRUCTION: 'Destruction: Destructive/corruption',
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
  return `LFO ${index + 1}: Select modulator`
}

/** Get bank button status text */
export function getBankStatusText(label: string, isEmpty: boolean): string {
  return isEmpty
    ? `Bank ${label}: Click to save current state`
    : `Bank ${label}: Click to load, double-click to overwrite, right-click to clear`
}

/** Get audio source status text */
export function getAudioSourceStatusText(sourceId: string): string {
  const map: Record<string, string> = {
    video: 'VID: Use video audio as source',
    file: 'FILE: Use imported audio file',
    mic: 'MIC: Use microphone input',
    system: 'SYS: Capture system/tab audio',
  }
  return map[sourceId] ?? sourceId
}

/** Get page tab status text */
export function getPageStatusText(pageName: string): string {
  return PAGE_DESCRIPTIONS[pageName] ?? `${pageName}: Navigate effect pages`
}
