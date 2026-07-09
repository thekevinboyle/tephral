import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, Effect } from 'postprocessing'
import {
  RGBSplitEffect,
  BlockDisplaceEffect,
  ScanLinesEffect,
  NoiseEffect,
  PixelateEffect,
  EdgeDetectionEffect,
  CrossfaderEffect,
  ChromaticAberrationEffect,
  VHSTrackingEffect,
  LensDistortionEffect,
  DitherEffect,
  PosterizeEffect,
  StaticDisplacementEffect,
  ColorGradeEffect,
  FeedbackLoopEffect,
  MotionExtractEffect,
  EchoTrailEffect,
  TimeSmearEffect,
  FreezeMaskEffect,
  DotsEffect,
  AsciiEffect,
  DatamoshEffect,
  PixelSortEffect,
  SonifyEffect,
  PointCloudEffect,
  // Trace effects
  BrightTraceEffect,
  MotionTraceEffect,
  EdgeTraceEffect,
  ColorTraceEffect,
  FaceTraceEffect,
  HandsTraceEffect,
  // Trend effects
  KaleidoscopeEffect,
  RippleWarpEffect,
  FractalDomainEffect,
  ThermalEffect,
  Y2kDigicamEffect,
  HalationEffect,
  AnamorphicEffect,
  DreamcoreEffect,
  LiquidMorphEffect,
  CrystallizeEffect,
} from './glitch-engine'
import { FaceHudEffect } from './morph'

export class EffectPipeline {
  private composer: EffectComposer
  private inputTexture: THREE.Texture | null = null
  private quad: THREE.Mesh
  private quadScene: THREE.Scene
  private camera: THREE.OrthographicCamera

  // Effect instances
  rgbSplit: RGBSplitEffect | null = null
  blockDisplace: BlockDisplaceEffect | null = null
  scanLines: ScanLinesEffect | null = null
  noise: NoiseEffect | null = null
  pixelate: PixelateEffect | null = null
  edgeDetection: EdgeDetectionEffect | null = null
  chromaticAberration: ChromaticAberrationEffect | null = null
  vhsTracking: VHSTrackingEffect | null = null
  lensDistortion: LensDistortionEffect | null = null
  dither: DitherEffect | null = null
  posterize: PosterizeEffect | null = null
  staticDisplacement: StaticDisplacementEffect | null = null
  colorGrade: ColorGradeEffect | null = null
  feedbackLoop: FeedbackLoopEffect | null = null

  // Motion effects
  motionExtract: MotionExtractEffect | null = null
  echoTrail: EchoTrailEffect | null = null
  timeSmear: TimeSmearEffect | null = null
  freezeMask: FreezeMaskEffect | null = null

  // Vision effects (GPU versions of overlays)
  dotsEffect: DotsEffect | null = null
  asciiEffect: AsciiEffect | null = null

  // Destruction effects
  datamosh: DatamoshEffect | null = null
  pixelSort: PixelSortEffect | null = null
  sonify: SonifyEffect | null = null
  pointCloud: PointCloudEffect | null = null

  // Face HUD effect
  faceHud: FaceHudEffect | null = null

  // Trace effects (mask generation)
  brightTrace: BrightTraceEffect | null = null
  motionTrace: MotionTraceEffect | null = null
  edgeTrace: EdgeTraceEffect | null = null
  colorTrace: ColorTraceEffect | null = null
  faceTrace: FaceTraceEffect | null = null
  handsTrace: HandsTraceEffect | null = null

  // Trend effects (Phase 2)
  kaleidoscope: KaleidoscopeEffect | null = null
  rippleWarp: RippleWarpEffect | null = null
  fractalDomain: FractalDomainEffect | null = null
  thermal: ThermalEffect | null = null
  y2kDigicam: Y2kDigicamEffect | null = null
  halation: HalationEffect | null = null
  anamorphic: AnamorphicEffect | null = null
  dreamcore: DreamcoreEffect | null = null
  liquidMorph: LiquidMorphEffect | null = null
  crystallize: CrystallizeEffect | null = null

  // Crossfader for A/B blending (source vs processed)
  crossfaderEffect: CrossfaderEffect | null = null

  private effectPasses: EffectPass[] = []
  private crossfaderPass: EffectPass | null = null
  // Cache one EffectPass per Effect for the pipeline's lifetime, so param
  // changes never recompile shaders. Passes are NEVER disposed on eviction —
  // pass.dispose() (postprocessing) cascades into effect.dispose(), which
  // shallow-disposes ANY texture-valued own property on the effect,
  // including borrowed/live textures (e.g. the crossfader's source texture,
  // trace-mask textures) and temporal render targets. The cache is bounded
  // (one entry per effect id, ~30 max), so lifetime retention is cheap.
  // Every cached pass, including crossfaderPass, is disposed exactly once,
  // in dispose().
  private passCache = new Map<Effect, EffectPass>()
  private lastChainKey = '#UNINITIALIZED#'
  // Tracks which temporal (frame-capturing) effects were enabled as of the
  // last updateEffects() call. Read by render() to gate captureFrame() calls
  // and updated/reconciled every call — including calls where the active
  // chain (chainKey) is unchanged — so a disable+re-enable of a temporal
  // effect between two unrelated chain changes still releases/reacquires
  // its GPU render targets.
  private temporalEnabled: Record<string, boolean> = {}

  // Canvas dimensions
  private canvasWidth = 1
  private canvasHeight = 1

  // Source video dimensions (for crossfader aspect ratio recalculation on resize)
  private sourceVideoWidth = 0
  private sourceVideoHeight = 0


  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new THREE.Scene()
    this.quadScene.background = new THREE.Color(0x000000)

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ map: null })
    this.quad = new THREE.Mesh(geometry, material)
    this.quadScene.add(this.quad)

    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    })
    const renderPass = new RenderPass(this.quadScene, this.camera)
    this.composer.addPass(renderPass)

    // Initialize effects
    this.rgbSplit = new RGBSplitEffect()
    this.blockDisplace = new BlockDisplaceEffect()
    this.scanLines = new ScanLinesEffect()
    this.noise = new NoiseEffect()
    this.pixelate = new PixelateEffect()
    this.edgeDetection = new EdgeDetectionEffect()
    this.chromaticAberration = new ChromaticAberrationEffect()
    this.vhsTracking = new VHSTrackingEffect()
    this.lensDistortion = new LensDistortionEffect()
    this.dither = new DitherEffect()
    this.posterize = new PosterizeEffect()
    this.staticDisplacement = new StaticDisplacementEffect()
    this.colorGrade = new ColorGradeEffect()
    this.feedbackLoop = new FeedbackLoopEffect()

    // Motion effects
    this.motionExtract = new MotionExtractEffect()
    this.echoTrail = new EchoTrailEffect()
    this.timeSmear = new TimeSmearEffect()
    this.freezeMask = new FreezeMaskEffect()

    // Vision effects (GPU versions of overlays)
    this.dotsEffect = new DotsEffect()
    this.asciiEffect = new AsciiEffect()

    // Crossfader for A/B source blending
    this.crossfaderEffect = new CrossfaderEffect()

    // Destruction effects
    this.datamosh = new DatamoshEffect()
    this.pixelSort = new PixelSortEffect()
    this.sonify = new SonifyEffect()
    this.pointCloud = new PointCloudEffect()

    // Face HUD effect
    this.faceHud = new FaceHudEffect()

    // Trace effects (for mask generation)
    this.brightTrace = new BrightTraceEffect()
    this.motionTrace = new MotionTraceEffect()
    this.edgeTrace = new EdgeTraceEffect()
    this.colorTrace = new ColorTraceEffect()
    this.faceTrace = new FaceTraceEffect()
    this.handsTrace = new HandsTraceEffect()

    // Trend effects (Phase 2)
    this.kaleidoscope = new KaleidoscopeEffect()
    this.rippleWarp = new RippleWarpEffect()
    this.fractalDomain = new FractalDomainEffect()
    this.thermal = new ThermalEffect()
    this.y2kDigicam = new Y2kDigicamEffect()
    this.halation = new HalationEffect()
    this.anamorphic = new AnamorphicEffect()
    this.dreamcore = new DreamcoreEffect()
    this.liquidMorph = new LiquidMorphEffect()
    this.crystallize = new CrystallizeEffect()
  }

  // Map effect IDs to effect instances
  private getEffectById(id: string): Effect | null {
    switch (id) {
      case 'rgb_split': return this.rgbSplit
      case 'chromatic': return this.chromaticAberration
      case 'posterize': return this.posterize
      case 'color_grade': return this.colorGrade
      case 'block_displace': return this.blockDisplace
      case 'static_displace': return this.staticDisplacement
      case 'pixelate': return this.pixelate
      case 'lens': return this.lensDistortion
      case 'scan_lines': return this.scanLines
      case 'vhs': return this.vhsTracking
      case 'noise': return this.noise
      case 'dither': return this.dither
      case 'edges': return this.edgeDetection
      case 'feedback': return this.feedbackLoop
      case 'motion_extract': return this.motionExtract
      case 'echo_trail': return this.echoTrail
      case 'time_smear': return this.timeSmear
      case 'freeze_mask': return this.freezeMask
      case 'acid_dots': return this.dotsEffect
      case 'ascii': return this.asciiEffect
      case 'datamosh': return this.datamosh
      case 'pixelSort': return this.pixelSort
      case 'sonify': return this.sonify
      case 'point_cloud': return this.pointCloud
      case 'face_hud': return this.faceHud
      // Trace effects
      case 'track_bright': return this.brightTrace
      case 'track_motion': return this.motionTrace
      case 'track_edge': return this.edgeTrace
      case 'track_color': return this.colorTrace
      case 'track_face': return this.faceTrace
      case 'track_hands': return this.handsTrace
      // Trend effects (Phase 2)
      case 'kaleidoscope': return this.kaleidoscope
      case 'ripple_warp': return this.rippleWarp
      case 'fractal_domain': return this.fractalDomain
      case 'thermal': return this.thermal
      case 'y2k_digicam': return this.y2kDigicam
      case 'halation': return this.halation
      case 'anamorphic': return this.anamorphic
      case 'dreamcore': return this.dreamcore
      case 'liquid_morph': return this.liquidMorph
      case 'crystallize': return this.crystallize
      default: return null
    }
  }

  updateEffects(config: {
    effectOrder: string[]
    rgbSplitEnabled: boolean
    chromaticAberrationEnabled: boolean
    posterizeEnabled: boolean
    colorGradeEnabled: boolean
    blockDisplaceEnabled: boolean
    staticDisplacementEnabled: boolean
    pixelateEnabled: boolean
    lensDistortionEnabled: boolean
    scanLinesEnabled: boolean
    vhsTrackingEnabled: boolean
    noiseEnabled: boolean
    ditherEnabled: boolean
    edgeDetectionEnabled: boolean
    feedbackLoopEnabled: boolean
    // Motion effects
    motionExtractEnabled: boolean
    echoTrailEnabled: boolean
    timeSmearEnabled: boolean
    freezeMaskEnabled: boolean
    // Vision effects (GPU overlays)
    dotsEnabled: boolean
    asciiEnabled: boolean
    // Destruction effects
    datamoshEnabled: boolean
    pixelSortEnabled: boolean
    sonifyEnabled: boolean
    pointCloudEnabled: boolean
    faceHudEnabled: boolean
    // Trace effects
    brightTraceEnabled: boolean
    motionTraceEnabled: boolean
    edgeTraceEnabled: boolean
    colorTraceEnabled: boolean
    faceTraceEnabled: boolean
    handsTraceEnabled: boolean
    // Trend effects (Phase 2) — enabled flags only; getEffectById cases land
    // one per effect task, so these are inert (null-filtered) until then.
    halationEnabled: boolean
    y2kEnabled: boolean
    thermalEnabled: boolean
    dreamcoreEnabled: boolean
    anamorphicEnabled: boolean
    flowSmearEnabled: boolean
    feedbackTunnelEnabled: boolean
    opiumTrailsEnabled: boolean
    ruttEtraEnabled: boolean
    reactionDiffusionEnabled: boolean
    physarumEnabled: boolean
    kaleidoscopeEnabled: boolean
    liquidMorphEnabled: boolean
    crystallizeEnabled: boolean
    rippleWarpEnabled: boolean
    fractalDomainEnabled: boolean
    bypassActive: boolean
    crossfaderPosition: number
    hasSourceTexture: boolean
    videoWidth: number
    videoHeight: number
  }) {
    // Update crossfader position (cheap uniform write, safe on every call)
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setCrossfaderPosition(config.crossfaderPosition)
    }

    // Map effect IDs to enabled state
    const enabledMap: Record<string, boolean> = {
      rgb_split: config.rgbSplitEnabled,
      chromatic: config.chromaticAberrationEnabled,
      posterize: config.posterizeEnabled,
      color_grade: config.colorGradeEnabled,
      block_displace: config.blockDisplaceEnabled,
      static_displace: config.staticDisplacementEnabled,
      pixelate: config.pixelateEnabled,
      lens: config.lensDistortionEnabled,
      scan_lines: config.scanLinesEnabled,
      vhs: config.vhsTrackingEnabled,
      noise: config.noiseEnabled,
      dither: config.ditherEnabled,
      edges: config.edgeDetectionEnabled,
      feedback: config.feedbackLoopEnabled,
      motion_extract: config.motionExtractEnabled,
      echo_trail: config.echoTrailEnabled,
      time_smear: config.timeSmearEnabled,
      freeze_mask: config.freezeMaskEnabled,
      acid_dots: config.dotsEnabled,
      ascii: config.asciiEnabled,
      datamosh: config.datamoshEnabled,
      pixelSort: config.pixelSortEnabled,
      sonify: config.sonifyEnabled,
      point_cloud: config.pointCloudEnabled,
      face_hud: config.faceHudEnabled,
      // Trace effects
      track_bright: config.brightTraceEnabled,
      track_motion: config.motionTraceEnabled,
      track_edge: config.edgeTraceEnabled,
      track_color: config.colorTraceEnabled,
      track_face: config.faceTraceEnabled,
      track_hands: config.handsTraceEnabled,
      // Trend effects (Phase 2)
      halation: config.halationEnabled,
      y2k_digicam: config.y2kEnabled,
      thermal: config.thermalEnabled,
      dreamcore: config.dreamcoreEnabled,
      anamorphic: config.anamorphicEnabled,
      flow_smear: config.flowSmearEnabled,
      feedback_tunnel: config.feedbackTunnelEnabled,
      opium_trails: config.opiumTrailsEnabled,
      rutt_etra: config.ruttEtraEnabled,
      reaction_diffusion: config.reactionDiffusionEnabled,
      physarum: config.physarumEnabled,
      kaleidoscope: config.kaleidoscopeEnabled,
      liquid_morph: config.liquidMorphEnabled,
      crystallize: config.crystallizeEnabled,
      ripple_warp: config.rippleWarpEnabled,
      fractal_domain: config.fractalDomainEnabled,
    }

    // Gate temporal frame-captures + release GPU targets on disable. This
    // runs before the structural short-circuit below (and therefore before
    // any `return`) so capture gating stays correct even on calls where the
    // active effect chain itself doesn't change.
    const temporalIds = [
      'feedback', 'datamosh', 'motion_extract', 'echo_trail',
      'time_smear', 'freeze_mask', 'track_motion',
    ] as const
    const temporalEffects: Record<string, { releaseTargets(): void } | null> = {
      feedback: this.feedbackLoop, datamosh: this.datamosh,
      motion_extract: this.motionExtract, echo_trail: this.echoTrail,
      time_smear: this.timeSmear, freeze_mask: this.freezeMask,
      track_motion: this.motionTrace,
    }
    for (const id of temporalIds) {
      const nowEnabled = !config.bypassActive && enabledMap[id]
      if (this.temporalEnabled[id] && !nowEnabled) {
        temporalEffects[id]?.releaseTargets()
      }
      this.temporalEnabled[id] = nowEnabled
    }

    // Compute the active chain (empty when bypassed). Deduped via Set so a
    // duplicate id in effectOrder can't add the same cached EffectPass twice.
    const activeIds = config.bypassActive
      ? []
      : Array.from(
          new Set(config.effectOrder.filter((id) => enabledMap[id] && this.getEffectById(id)))
        )

    // Structural short-circuit: same chain -> nothing to rebuild.
    // Bypass gets its own sentinel key, distinct from the empty/no-effects
    // chain (''). Without this, "bypass on" and "zero effects enabled" would
    // collide on chainKey === '', so toggling bypass while no effects are
    // enabled would short-circuit and never add/remove the crossfader pass.
    const chainKey = config.bypassActive ? '#BYPASS#' : activeIds.join('|')
    if (chainKey === this.lastChainKey) return
    this.lastChainKey = chainKey

    // Remove all current effect passes from the composer (they stay cached
    // for the pipeline's lifetime — see the passCache field comment).
    for (const pass of this.effectPasses) {
      this.composer.removePass(pass)
    }
    this.effectPasses = []
    if (this.crossfaderPass) {
      this.composer.removePass(this.crossfaderPass)
    }

    // If bypass is active, don't add any effect passes - just render the input
    if (config.bypassActive) return

    // Add effect passes in order, reusing cached passes (guitar-pedal chain)
    for (const effectId of activeIds) {
      const effect = this.getEffectById(effectId)!
      let pass = this.passCache.get(effect)
      if (!pass) {
        pass = new EffectPass(this.camera, effect)
        this.passCache.set(effect, pass)
      }
      this.composer.addPass(pass)
      this.effectPasses.push(pass)
    }

    // Add crossfader pass for A/B blending (source vs processed).
    // Cached for the pipeline's lifetime — created once, then just
    // re-added to the composer on each rebuild (never disposed here).
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setQuadScale(1, 1)
      if (!this.crossfaderPass) {
        this.crossfaderPass = new EffectPass(this.camera, this.crossfaderEffect)
      }
      this.composer.addPass(this.crossfaderPass)
    }
  }

  setInputTexture(texture: THREE.Texture) {
    this.inputTexture = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).map = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).needsUpdate = true
  }

  // Set the original source texture for crossfader A side
  setSourceTexture(texture: THREE.Texture | null) {
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setSourceTexture(texture)
    }
  }

  // Set source video dimensions (for crossfader aspect ratio when different from main input)
  setSourceVideoSize(width: number, height: number) {
    this.sourceVideoWidth = width
    this.sourceVideoHeight = height
    this.updateSourceQuadScale()
  }

  private updateSourceQuadScale() {
    if (!this.crossfaderEffect || !this.sourceVideoWidth || !this.sourceVideoHeight) return

    const canvasAspect = this.canvasWidth / this.canvasHeight
    const sourceAspect = this.sourceVideoWidth / this.sourceVideoHeight

    let scaleX = 1
    let scaleY = 1

    if (sourceAspect > canvasAspect) {
      scaleY = canvasAspect / sourceAspect
    } else {
      scaleX = sourceAspect / canvasAspect
    }

    this.crossfaderEffect.setSourceQuadScale(scaleX, scaleY)
  }

  // Update crossfader position (0 = source, 1 = processed)
  setCrossfaderPosition(position: number) {
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setCrossfaderPosition(position)
    }
  }


  setVideoSize(_width: number, _height: number) {
    // No-op: container matches video aspect ratio via CSS, quad always fills
  }

  setSize(width: number, height: number) {
    this.canvasWidth = width || 1
    this.canvasHeight = height || 1
    this.composer.setSize(width, height)
    this.updateQuadScale()
    this.updateSourceQuadScale()
    const aspect = this.canvasWidth / this.canvasHeight
    this.kaleidoscope?.setAspect(aspect)
    this.rippleWarp?.setAspect(aspect)
    this.fractalDomain?.setAspect(aspect)
    this.thermal?.setAspect(aspect)
    this.y2kDigicam?.setAspect(aspect)
    this.liquidMorph?.setAspect(aspect)
    this.crystallize?.setAspect(aspect)
  }

  private updateQuadScale() {
    // Container matches video aspect ratio via CSS aspect-ratio,
    // so the quad always fills 100% — no letterboxing needed
    this.quad.scale.set(1, 1, 1)

    if (this.crossfaderEffect) {
      this.crossfaderEffect.setQuadScale(1, 1)
    }
  }

  render() {
    if (!this.inputTexture) return

    this.composer.render()

    // Capture frames for temporal effects
    const renderer = this.composer.getRenderer()
    const outputBuffer = this.composer.outputBuffer

    if (renderer && outputBuffer) {
      if (this.temporalEnabled['feedback']) this.feedbackLoop?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['datamosh']) this.datamosh?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['motion_extract']) this.motionExtract?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['echo_trail']) this.echoTrail?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['time_smear']) this.timeSmear?.captureFrame(renderer, outputBuffer)
      if (this.temporalEnabled['freeze_mask']) this.freezeMask?.captureFrame(renderer, outputBuffer)

      // Capture frames for trace effects (motion trace needs history)
      if (this.temporalEnabled['track_motion']) this.motionTrace?.captureFrame(renderer, outputBuffer)
    }
  }

  /**
   * Get trace mask texture by effect ID.
   * Returns the mask texture that can be used by other effects.
   */
  getTraceMask(id: string): THREE.Texture | null {
    switch (id) {
      case 'track_bright': return this.brightTrace?.getTraceMask() ?? null
      case 'track_motion': return this.motionTrace?.getTraceMask() ?? null
      case 'track_edge': return this.edgeTrace?.getTraceMask() ?? null
      case 'track_color': return this.colorTrace?.getTraceMask() ?? null
      case 'track_face': return this.faceTrace?.getTraceMask() ?? null
      case 'track_hands': return this.handsTrace?.getTraceMask() ?? null
      default: return null
    }
  }

  dispose() {
    // Detach the borrowed source texture BEFORE disposing any passes.
    // pass.dispose() cascades into effect.dispose(), which shallow-disposes
    // any texture-valued own property — we don't own the live source
    // texture, so it must be cleared first or the cascade would destroy it.
    this.crossfaderEffect?.setSourceTexture(null)
    for (const [, pass] of this.passCache) pass.dispose()
    this.passCache.clear()
    if (this.crossfaderPass) {
      this.crossfaderPass.dispose()
      this.crossfaderPass = null
    }
    this.composer.dispose()
    this.quad.geometry.dispose()
    ;(this.quad.material as THREE.Material).dispose()
    this.rgbSplit?.dispose()
    this.blockDisplace?.dispose()
    this.scanLines?.dispose()
    this.noise?.dispose()
    this.pixelate?.dispose()
    this.edgeDetection?.dispose()
    this.chromaticAberration?.dispose()
    this.vhsTracking?.dispose()
    this.lensDistortion?.dispose()
    this.dither?.dispose()
    this.posterize?.dispose()
    this.staticDisplacement?.dispose()
    this.colorGrade?.dispose()
    this.feedbackLoop?.dispose()
    this.motionExtract?.dispose()
    this.echoTrail?.dispose()
    this.timeSmear?.dispose()
    this.freezeMask?.dispose()
    this.dotsEffect?.dispose()
    this.asciiEffect?.dispose()
    this.datamosh?.dispose()
    this.pixelSort?.dispose()
    this.sonify?.dispose()
    this.pointCloud?.dispose()
    this.faceHud?.dispose()
    // Trace effects
    this.brightTrace?.dispose()
    this.motionTrace?.dispose()
    this.edgeTrace?.dispose()
    this.colorTrace?.dispose()
    this.faceTrace?.dispose()
    this.handsTrace?.dispose()
    // Trend effects (Phase 2)
    this.kaleidoscope?.dispose()
    this.rippleWarp?.dispose()
    this.fractalDomain?.dispose()
    this.thermal?.dispose()
    this.y2kDigicam?.dispose()
    this.halation?.dispose()
    this.anamorphic?.dispose()
    this.dreamcore?.dispose()
    this.liquidMorph?.dispose()
    this.crystallize?.dispose()
  }
}
