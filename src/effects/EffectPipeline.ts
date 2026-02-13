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
  // Trace effects
  BrightTraceEffect,
  MotionTraceEffect,
  EdgeTraceEffect,
  ColorTraceEffect,
  FaceTraceEffect,
  HandsTraceEffect,
} from './glitch-engine'

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

  // Trace effects (mask generation)
  brightTrace: BrightTraceEffect | null = null
  motionTrace: MotionTraceEffect | null = null
  edgeTrace: EdgeTraceEffect | null = null
  colorTrace: ColorTraceEffect | null = null
  faceTrace: FaceTraceEffect | null = null
  handsTrace: HandsTraceEffect | null = null

  // Crossfader for A/B blending (source vs processed)
  crossfaderEffect: CrossfaderEffect | null = null

  private effectPasses: EffectPass[] = []
  private crossfaderPass: EffectPass | null = null

  // Dimensions for aspect ratio
  private canvasWidth = 1
  private canvasHeight = 1
  private videoWidth = 1
  private videoHeight = 1


  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new THREE.Scene()
    this.quadScene.background = new THREE.Color(0x000000)

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ map: null })
    this.quad = new THREE.Mesh(geometry, material)
    this.quadScene.add(this.quad)

    this.composer = new EffectComposer(renderer)
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

    // Trace effects (for mask generation)
    this.brightTrace = new BrightTraceEffect()
    this.motionTrace = new MotionTraceEffect()
    this.edgeTrace = new EdgeTraceEffect()
    this.colorTrace = new ColorTraceEffect()
    this.faceTrace = new FaceTraceEffect()
    this.handsTrace = new HandsTraceEffect()
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
      // Trace effects
      case 'track_bright': return this.brightTrace
      case 'track_motion': return this.motionTrace
      case 'track_edge': return this.edgeTrace
      case 'track_color': return this.colorTrace
      case 'track_face': return this.faceTrace
      case 'track_hands': return this.handsTrace
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
    // Trace effects
    brightTraceEnabled: boolean
    motionTraceEnabled: boolean
    edgeTraceEnabled: boolean
    colorTraceEnabled: boolean
    faceTraceEnabled: boolean
    handsTraceEnabled: boolean
    bypassActive: boolean
    crossfaderPosition: number
    hasSourceTexture: boolean
    videoWidth: number
    videoHeight: number
  }) {
    // Remove existing passes
    for (const pass of this.effectPasses) {
      this.composer.removePass(pass)
    }
    this.effectPasses = []
    if (this.crossfaderPass) {
      this.composer.removePass(this.crossfaderPass)
      this.crossfaderPass = null
    }

    // If bypass is active, don't add any effect passes - just render the input
    if (config.bypassActive) {
      return
    }

    // Update crossfader position
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
      // Trace effects
      track_bright: config.brightTraceEnabled,
      track_motion: config.motionTraceEnabled,
      track_edge: config.edgeTraceEnabled,
      track_color: config.colorTraceEnabled,
      track_face: config.faceTraceEnabled,
      track_hands: config.handsTraceEnabled,
    }

    // Add individual effect passes in order (like guitar pedals in a chain)
    // Each effect processes the output of the previous one
    for (const effectId of config.effectOrder) {
      if (enabledMap[effectId]) {
        const effect = this.getEffectById(effectId)
        if (effect) {
          const pass = new EffectPass(this.camera, effect)
          this.composer.addPass(pass)
          this.effectPasses.push(pass)
        }
      }
    }

    // Add crossfader pass for A/B blending (source vs processed)
    // Always add the pass - source texture is set separately via setSourceTexture()
    // and may be called after updateEffects() due to React effect ordering
    if (this.crossfaderEffect) {
      // Calculate quad scale from config dimensions
      const canvasAspect = this.canvasWidth / this.canvasHeight
      const videoAspect = config.videoWidth / config.videoHeight
      let scaleX = 1, scaleY = 1
      if (videoAspect > canvasAspect) {
        scaleY = canvasAspect / videoAspect
      } else {
        scaleX = videoAspect / canvasAspect
      }
      this.crossfaderEffect.setQuadScale(scaleX, scaleY)
      this.crossfaderPass = new EffectPass(this.camera, this.crossfaderEffect)
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
    if (!this.crossfaderEffect) return

    const canvasAspect = this.canvasWidth / this.canvasHeight
    const sourceAspect = (width || 1) / (height || 1)

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

  setVideoSize(width: number, height: number) {
    this.videoWidth = width || 1
    this.videoHeight = height || 1
    this.updateQuadScale()
  }

  setSize(width: number, height: number) {
    this.canvasWidth = width || 1
    this.canvasHeight = height || 1
    this.composer.setSize(width, height)
    this.updateQuadScale()
  }

  private updateQuadScale() {
    const canvasAspect = this.canvasWidth / this.canvasHeight
    const videoAspect = this.videoWidth / this.videoHeight

    let scaleX = 1
    let scaleY = 1

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - fit to width, letterbox top/bottom
      scaleY = canvasAspect / videoAspect
    } else {
      // Video is taller than canvas - fit to height, pillarbox left/right
      scaleX = videoAspect / canvasAspect
    }

    this.quad.scale.set(scaleX, scaleY, 1)

    // Update CrossfaderEffect with the quad scale
    if (this.crossfaderEffect) {
      this.crossfaderEffect.setQuadScale(scaleX, scaleY)
    }
  }

  render() {
    if (!this.inputTexture) return

    this.composer.render()

    // Capture frames for temporal effects
    const renderer = this.composer.getRenderer()
    const outputBuffer = this.composer.outputBuffer

    if (renderer && outputBuffer) {
      this.feedbackLoop?.captureFrame(renderer, outputBuffer)
      this.datamosh?.captureFrame(renderer, outputBuffer)
      this.motionExtract?.captureFrame(renderer, outputBuffer)
      this.echoTrail?.captureFrame(renderer, outputBuffer)
      this.timeSmear?.captureFrame(renderer, outputBuffer)
      this.freezeMask?.captureFrame(renderer, outputBuffer)

      // Capture frames for trace effects (motion trace needs history)
      this.motionTrace?.captureFrame(renderer, outputBuffer)
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
    // Trace effects
    this.brightTrace?.dispose()
    this.motionTrace?.dispose()
    this.edgeTrace?.dispose()
    this.colorTrace?.dispose()
    this.faceTrace?.dispose()
    this.handsTrace?.dispose()
  }

  // Capture frame for temporal effects (call after render)
  captureFrameForMotionEffects(renderer: THREE.WebGLRenderer) {
    const outputBuffer = this.composer.outputBuffer
    if (!outputBuffer) return

    // Motion extract needs the input frame before effects
    if (this.motionExtract) {
      this.motionExtract.captureFrame(renderer, outputBuffer)
    }

    // Echo trail captures the output after effects
    if (this.echoTrail) {
      this.echoTrail.captureFrame(renderer, outputBuffer)
    }

    // Time smear accumulates frames
    if (this.timeSmear) {
      this.timeSmear.captureFrame(renderer, outputBuffer)
    }

    // Freeze mask updates its reference slowly
    if (this.freezeMask) {
      this.freezeMask.captureFrame(renderer, outputBuffer)
    }
  }
}
