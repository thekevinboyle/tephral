import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { deriveEmotions, type EmotionScores } from '../../utils/faceEmotions'

const fragmentShader = /* glsl */ `
uniform sampler2D hudTexture;
uniform float scanLineIntensity;
uniform float effectMix;
uniform vec2 resolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 hud = texture2D(hudTexture, uv);

  // Scan lines
  float scanLine = 1.0;
  if (scanLineIntensity > 0.0) {
    float line = sin(uv.y * resolution.y * 1.5) * 0.5 + 0.5;
    scanLine = mix(1.0, line, scanLineIntensity * 0.3);
  }

  // Composite HUD over input
  vec3 result = mix(inputColor.rgb * scanLine, hud.rgb, hud.a);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export interface FaceHudParams {
  wireframeOpacity: number
  hudColor: string
  emotionDisplay: boolean
  scanLines: number
  detectionInterval: number
  smoothing: number
  mix: number
}

export const DEFAULT_FACE_HUD_PARAMS: FaceHudParams = {
  wireframeOpacity: 0.6,
  hudColor: '#00ffcc',
  emotionDisplay: true,
  scanLines: 0.3,
  detectionInterval: 2,
  smoothing: 0.5,
  mix: 1.0,
}

interface FaceLandmark {
  x: number
  y: number
  z?: number
}

// MediaPipe Face Mesh connections for wireframe rendering
const FACE_MESH_CONNECTIONS = [
  // Jaw
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  // Left eye
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
  [154, 155], [155, 133], [133, 173], [173, 157], [157, 158], [158, 159],
  [159, 160], [160, 161], [161, 246], [246, 33],
  // Right eye
  [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381],
  [381, 382], [382, 362], [362, 398], [398, 384], [384, 385], [385, 386],
  [386, 387], [387, 388], [388, 466], [466, 263],
  // Lips outer
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314],
  [314, 405], [405, 321], [321, 375], [375, 291], [291, 409], [409, 270],
  [270, 269], [269, 267], [267, 0], [0, 37], [37, 39], [39, 40],
  [40, 185], [185, 61],
  // Nose
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4],
  [4, 1], [1, 19], [19, 94], [94, 2],
]

export class FaceHudEffect extends Effect {
  private hudCanvas: HTMLCanvasElement
  private hudCtx: CanvasRenderingContext2D
  private hudTexture: THREE.CanvasTexture
  private faceLandmarker: any = null
  private initPromise: Promise<void> | null = null
  private frameCount = 0
  private lastTimestamp = -1
  private lastEmotions: EmotionScores = { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  private rawLandmarks: FaceLandmark[] = []
  private smoothedLandmarks: FaceLandmark[] = []
  private videoElement: HTMLVideoElement | null = null
  params: FaceHudParams

  constructor(params: Partial<FaceHudParams> = {}) {
    const p = { ...DEFAULT_FACE_HUD_PARAMS, ...params }

    const hudCanvas = document.createElement('canvas')
    hudCanvas.width = 1920
    hudCanvas.height = 1080
    const hudCtx = hudCanvas.getContext('2d')!
    const hudTexture = new THREE.CanvasTexture(hudCanvas)
    hudTexture.minFilter = THREE.LinearFilter
    hudTexture.magFilter = THREE.LinearFilter

    super('FaceHudEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['hudTexture', new THREE.Uniform(hudTexture)],
        ['scanLineIntensity', new THREE.Uniform(p.scanLines)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
      ]),
    })

    this.hudCanvas = hudCanvas
    this.hudCtx = hudCtx
    this.hudTexture = hudTexture
    this.params = p
  }

  async initFaceMesh() {
    if (this.faceLandmarker || this.initPromise) return
    this.initPromise = (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        })
      } catch (e) {
        console.warn('FaceHudEffect: Failed to init MediaPipe Face Mesh', e)
      }
    })()
    await this.initPromise
  }

  setVideoElement(video: HTMLVideoElement | null) {
    this.videoElement = video
  }

  private detectFaces() {
    if (!this.faceLandmarker || !this.videoElement || this.videoElement.readyState < 2) return

    this.frameCount++
    if (this.frameCount % this.params.detectionInterval !== 0) return

    // MediaPipe requires strictly increasing timestamps
    const now = performance.now()
    if (now <= this.lastTimestamp) return
    this.lastTimestamp = now

    try {
      const result = this.faceLandmarker.detectForVideo(this.videoElement, now)
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        this.rawLandmarks = result.faceLandmarks[0]
        this.lastEmotions = deriveEmotions(this.rawLandmarks)
      }
    } catch {
      // Skip frame on error
    }
  }

  private smoothLandmarks() {
    if (this.rawLandmarks.length === 0) return

    const alpha = 1 - this.params.smoothing

    if (this.smoothedLandmarks.length !== this.rawLandmarks.length) {
      // First frame or landmark count changed — snap to raw
      this.smoothedLandmarks = this.rawLandmarks.map(p => ({ x: p.x, y: p.y }))
      return
    }

    // Exponential moving average
    for (let i = 0; i < this.rawLandmarks.length; i++) {
      this.smoothedLandmarks[i].x += (this.rawLandmarks[i].x - this.smoothedLandmarks[i].x) * alpha
      this.smoothedLandmarks[i].y += (this.rawLandmarks[i].y - this.smoothedLandmarks[i].y) * alpha
    }
  }

  private renderHud() {
    const ctx = this.hudCtx
    const w = this.hudCanvas.width
    const h = this.hudCanvas.height
    ctx.clearRect(0, 0, w, h)

    if (this.smoothedLandmarks.length === 0) return

    const color = this.params.hudColor
    const landmarks = this.smoothedLandmarks

    // Draw wireframe mesh
    if (this.params.wireframeOpacity > 0) {
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 6
      ctx.lineWidth = 2
      ctx.globalAlpha = this.params.wireframeOpacity

      for (const [i, j] of FACE_MESH_CONNECTIONS) {
        if (i >= landmarks.length || j >= landmarks.length) continue
        const a = landmarks[i]
        const b = landmarks[j]
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }
    }

    // Reset shadow for other elements
    ctx.shadowBlur = 0

    // Draw bounding box with corner brackets
    ctx.globalAlpha = 1
    const xs = landmarks.map(p => p.x * w)
    const ys = landmarks.map(p => p.y * h)
    const minX = Math.min(...xs) - 20
    const maxX = Math.max(...xs) + 20
    const minY = Math.min(...ys) - 20
    const maxY = Math.max(...ys) + 20
    const bracketLen = 20

    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.lineWidth = 2.5

    // Top-left
    ctx.beginPath()
    ctx.moveTo(minX, minY + bracketLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bracketLen, minY)
    ctx.stroke()
    // Top-right
    ctx.beginPath()
    ctx.moveTo(maxX - bracketLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bracketLen)
    ctx.stroke()
    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(minX, maxY - bracketLen); ctx.lineTo(minX, maxY); ctx.lineTo(minX + bracketLen, maxY)
    ctx.stroke()
    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(maxX - bracketLen, maxY); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX, maxY - bracketLen)
    ctx.stroke()

    ctx.shadowBlur = 0

    // Draw emotion scores
    if (this.params.emotionDisplay) {
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9

      const emotions = Object.entries(this.lastEmotions) as [string, number][]
      emotions.sort((a, b) => b[1] - a[1])
      const dominant = emotions[0]

      // Large dominant label
      ctx.font = '18px monospace'
      ctx.fillText(`${dominant[0]}${dominant[1].toFixed(4)}`, minX, minY - 8)

      // Smaller breakdown
      ctx.font = '12px monospace'
      let yOff = minY + 18
      for (const [name, score] of emotions) {
        ctx.fillText(`${name}: ${score.toFixed(3)}`, minX + 4, yOff)
        yOff += 16
      }

      // Emotion bar
      const barY = maxY + 14
      const barW = maxX - minX
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3
      ctx.fillRect(minX, barY, barW, 6)
      ctx.globalAlpha = 0.9
      ctx.fillText('Emotion', minX, barY + 20)

      // Colored segments
      let barX = minX
      const emotionColors: Record<string, string> = {
        neutral: '#888888', happiness: '#00ff88', surprise: '#ffff00', anger: '#ff4444', sadness: '#4488ff',
      }
      for (const [name, score] of emotions) {
        const segW = score * barW
        ctx.fillStyle = emotionColors[name] || color
        ctx.globalAlpha = 0.8
        ctx.fillRect(barX, barY, segW, 6)
        barX += segW
      }
    }

    ctx.globalAlpha = 1
    this.hudTexture.needsUpdate = true
  }

  update() {
    // Run detection and rendering in the render loop, not React effects
    this.detectFaces()
    this.smoothLandmarks()
    this.renderHud()
  }

  updateParams(params: Partial<FaceHudParams>) {
    if (params.wireframeOpacity !== undefined) this.params.wireframeOpacity = params.wireframeOpacity
    if (params.hudColor !== undefined) this.params.hudColor = params.hudColor
    if (params.emotionDisplay !== undefined) this.params.emotionDisplay = params.emotionDisplay
    if (params.scanLines !== undefined) {
      this.params.scanLines = params.scanLines
      this.uniforms.get('scanLineIntensity')!.value = params.scanLines
    }
    if (params.detectionInterval !== undefined) this.params.detectionInterval = params.detectionInterval
    if (params.smoothing !== undefined) this.params.smoothing = params.smoothing
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  setResolution(width: number, height: number) {
    this.hudCanvas.width = width
    this.hudCanvas.height = height
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  dispose() {
    super.dispose()
    this.hudTexture.dispose()
    if (this.faceLandmarker) {
      this.faceLandmarker.close()
      this.faceLandmarker = null
    }
  }
}
