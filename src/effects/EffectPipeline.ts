import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, Effect } from 'postprocessing'
import {
  RGBSplitEffect,
  BlockDisplaceEffect,
  ScanLinesEffect,
  NoiseEffect,
  PixelateEffect,
  EdgeDetectionEffect,
  MixEffect,
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
  mixEffect: MixEffect | null = null
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

  private effectPass: EffectPass | null = null
  private mixEffectPass: EffectPass | null = null

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
    this.mixEffect = new MixEffect()
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
    wetMix: number
    bypassActive: boolean
  }) {
    // Remove existing passes
    if (this.effectPass) {
      this.composer.removePass(this.effectPass)
      this.effectPass = null
    }
    if (this.mixEffectPass) {
      this.composer.removePass(this.mixEffectPass)
      this.mixEffectPass = null
    }

    // If bypass is active, don't add any effect passes - just render the input
    if (config.bypassActive) {
      return
    }

    // Update mix effect params
    if (this.mixEffect) {
      this.mixEffect.updateParams({ wetMix: config.wetMix })
      this.mixEffect.setOriginalTexture(this.inputTexture)
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
    }

    // Collect enabled effects in the specified order
    const effects: Effect[] = []
    const effectIds: string[] = []

    for (const effectId of config.effectOrder) {
      if (enabledMap[effectId]) {
        const effect = this.getEffectById(effectId)
        if (effect) {
          effects.push(effect)
          effectIds.push(effectId)
        }
      }
    }

    // Debug: log the effect order being applied
    if (effects.length > 0) {
      console.log('[EffectPipeline] Applying effect order:', effectIds.join(' → '))
    }

    // Add effect pass if there are effects
    if (effects.length > 0) {
      this.effectPass = new EffectPass(this.camera, ...effects)
      this.composer.addPass(this.effectPass)
    }

    // Add mix effect pass for wet/dry control (only if not fully wet and we have an input texture)
    if (this.mixEffect && config.wetMix < 1 && this.inputTexture) {
      // Ensure originalTexture is set before adding the pass
      this.mixEffect.setOriginalTexture(this.inputTexture)
      this.mixEffectPass = new EffectPass(this.camera, this.mixEffect)
      this.composer.addPass(this.mixEffectPass)
    }
  }

  setInputTexture(texture: THREE.Texture) {
    this.inputTexture = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).map = texture
    ;(this.quad.material as THREE.MeshBasicMaterial).needsUpdate = true

    // Update mix effect's original texture reference
    if (this.mixEffect) {
      this.mixEffect.setOriginalTexture(texture)
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

    // Update MixEffect with the quad scale for proper dry/wet blending
    if (this.mixEffect) {
      this.mixEffect.setQuadScale(scaleX, scaleY)
    }
  }

  render() {
    if (!this.inputTexture) return

    // Bypass mode now handled by not adding effect passes in updateEffects
    // The composer will just render the input quad without any post-processing

    this.composer.render()

    // Capture frames for temporal effects
    const renderer = this.composer.getRenderer()
    const outputBuffer = this.composer.outputBuffer

    if (renderer && outputBuffer) {
      this.feedbackLoop?.captureFrame(renderer, outputBuffer)
      this.motionExtract?.captureFrame(renderer, outputBuffer)
      this.echoTrail?.captureFrame(renderer, outputBuffer)
      this.timeSmear?.captureFrame(renderer, outputBuffer)
      this.freezeMask?.captureFrame(renderer, outputBuffer)
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
    this.mixEffect?.dispose()
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
