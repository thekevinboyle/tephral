# Anima Morph Effects — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new WebGL effects (Liquid Morph, Ripple Warp, Fractal Domain, Crystallize, Face HUD) on a new Page 6 "MORPH", with MediaPipe Face Mesh for the Face HUD effect.

**Architecture:** Each effect is a `postprocessing` Effect subclass with inline GLSL fragment shaders. A single Zustand store (`morphStore`) manages all 5 effects' state. Integration follows the established pattern across 11 touchpoints (config, pipeline, canvas, hooks, UI components).

**Tech Stack:** Three.js, postprocessing, Zustand, GLSL, @mediapipe/tasks-vision

**Design doc:** `docs/plans/2026-03-20-anima-morph-effects.md`

---

### Task 1: Install MediaPipe dependency

**Step 1: Install @mediapipe/tasks-vision**

```bash
npm install @mediapipe/tasks-vision
```

**Step 2: Verify installation**

```bash
npm ls @mediapipe/tasks-vision
```
Expected: Package listed in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @mediapipe/tasks-vision for Face HUD effect"
```

---

### Task 2: Create effect classes — Liquid Morph

**Files:**
- Create: `src/effects/morph/LiquidMorphEffect.ts`

**Step 1: Write the effect class**

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from '../glitch-engine/glsl-utils'

const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + /* glsl */ `
uniform float time;
uniform float speed;
uniform float scale;
uniform float intensity;
uniform float chromeAmount;
uniform float effectMix;
uniform vec2 resolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float t = time * speed;

  // Multi-octave curl noise displacement field
  vec2 noiseCoord = uv * scale;
  vec2 displacement = curlNoise(noiseCoord + t * 0.3);
  displacement += 0.5 * curlNoise(noiseCoord * 2.0 + t * 0.5);
  displacement += 0.25 * curlNoise(noiseCoord * 4.0 - t * 0.7);

  // Apply displacement
  vec2 displacedUv = uv + displacement * intensity * 0.15;
  displacedUv = clamp(displacedUv, 0.0, 1.0);

  vec4 displaced = texture2D(inputBuffer, displacedUv);

  // Metallic/chrome color treatment
  float lum = luminance(displaced.rgb);

  // Desaturate toward blue-teal
  vec3 tealTint = vec3(0.15, 0.35, 0.45);
  vec3 metallic = mix(displaced.rgb, mix(vec3(lum), tealTint * lum * 2.0, 0.6), chromeAmount);

  // Boost contrast for chrome look
  metallic = pow(metallic, vec3(1.0 + chromeAmount * 0.8));

  // Fake specular highlights from displacement gradient magnitude
  float gradMag = length(displacement);
  float specular = smoothstep(0.3, 1.5, gradMag) * chromeAmount;
  metallic += specular * vec3(0.6, 0.8, 1.0) * 0.4;

  vec4 effectColor = vec4(metallic, displaced.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface LiquidMorphParams {
  speed: number
  scale: number
  intensity: number
  chromeAmount: number
  mix: number
}

export const DEFAULT_LIQUID_MORPH_PARAMS: LiquidMorphParams = {
  speed: 0.8,
  scale: 6.0,
  intensity: 0.5,
  chromeAmount: 0.7,
  mix: 1.0,
}

export class LiquidMorphEffect extends Effect {
  private startTime: number

  constructor(params: Partial<LiquidMorphParams> = {}) {
    const p = { ...DEFAULT_LIQUID_MORPH_PARAMS, ...params }

    super('LiquidMorphEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['time', new THREE.Uniform(0)],
        ['speed', new THREE.Uniform(p.speed)],
        ['scale', new THREE.Uniform(p.scale)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['chromeAmount', new THREE.Uniform(p.chromeAmount)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
      ]),
    })
    this.startTime = performance.now()
  }

  update() {
    this.uniforms.get('time')!.value = (performance.now() - this.startTime) / 1000
  }

  updateParams(params: Partial<LiquidMorphParams>) {
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.scale !== undefined) this.uniforms.get('scale')!.value = params.scale
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.chromeAmount !== undefined) this.uniforms.get('chromeAmount')!.value = params.chromeAmount
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit src/effects/morph/LiquidMorphEffect.ts 2>&1 | head -20
```

---

### Task 3: Create effect classes — Ripple Warp

**Files:**
- Create: `src/effects/morph/RippleWarpEffect.ts`

**Step 1: Write the effect class**

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float frequency;
uniform float amplitude;
uniform float speed;
uniform float decay;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 center = vec2(0.5);
  vec2 delta = uv - center;
  float dist = length(delta);
  vec2 dir = normalize(delta + vec2(0.0001));

  // Concentric ripple wave
  float wave = sin(dist * frequency - time * speed) * amplitude;

  // Decay with distance
  float falloff = exp(-dist * decay * 5.0);
  wave *= falloff;

  vec2 displacedUv = uv + dir * wave;
  displacedUv = clamp(displacedUv, 0.0, 1.0);

  vec4 effectColor = texture2D(inputBuffer, displacedUv);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface RippleWarpParams {
  frequency: number
  amplitude: number
  speed: number
  decay: number
  mix: number
}

export const DEFAULT_RIPPLE_WARP_PARAMS: RippleWarpParams = {
  frequency: 15.0,
  amplitude: 0.05,
  speed: 1.5,
  decay: 0.5,
  mix: 1.0,
}

export class RippleWarpEffect extends Effect {
  private startTime: number

  constructor(params: Partial<RippleWarpParams> = {}) {
    const p = { ...DEFAULT_RIPPLE_WARP_PARAMS, ...params }

    super('RippleWarpEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['time', new THREE.Uniform(0)],
        ['frequency', new THREE.Uniform(p.frequency)],
        ['amplitude', new THREE.Uniform(p.amplitude)],
        ['speed', new THREE.Uniform(p.speed)],
        ['decay', new THREE.Uniform(p.decay)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.startTime = performance.now()
  }

  update() {
    this.uniforms.get('time')!.value = (performance.now() - this.startTime) / 1000
  }

  updateParams(params: Partial<RippleWarpParams>) {
    if (params.frequency !== undefined) this.uniforms.get('frequency')!.value = params.frequency
    if (params.amplitude !== undefined) this.uniforms.get('amplitude')!.value = params.amplitude
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

---

### Task 4: Create effect classes — Fractal Domain

**Files:**
- Create: `src/effects/morph/FractalDomainEffect.ts`

**Step 1: Write the effect class**

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float iterations;
uniform float foldScale;
uniform float rotationSpeed;
uniform float symmetry;
uniform float effectMix;

vec2 fold(vec2 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  p = abs(p);
  return p;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv - 0.5;

  float rotation = time * rotationSpeed;
  int iters = int(iterations);
  float angleStep = 3.14159265 / symmetry;

  // Iterative UV space folding
  for (int i = 0; i < 8; i++) {
    if (i >= iters) break;

    // Fold around symmetry axes
    p = fold(p, angleStep + rotation + float(i) * 0.2);

    // Scale
    p *= foldScale;

    // Translate back to keep centered
    p -= 0.5 * (foldScale - 1.0) * vec2(0.3, 0.3);
  }

  // Map folded UV back to texture coordinates
  vec2 foldedUv = fract(p + 0.5);

  vec4 effectColor = texture2D(inputBuffer, foldedUv);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface FractalDomainParams {
  iterations: number
  foldScale: number
  rotationSpeed: number
  symmetry: number
  mix: number
}

export const DEFAULT_FRACTAL_DOMAIN_PARAMS: FractalDomainParams = {
  iterations: 4,
  foldScale: 1.5,
  rotationSpeed: 0.3,
  symmetry: 6,
  mix: 1.0,
}

export class FractalDomainEffect extends Effect {
  private startTime: number

  constructor(params: Partial<FractalDomainParams> = {}) {
    const p = { ...DEFAULT_FRACTAL_DOMAIN_PARAMS, ...params }

    super('FractalDomainEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['time', new THREE.Uniform(0)],
        ['iterations', new THREE.Uniform(p.iterations)],
        ['foldScale', new THREE.Uniform(p.foldScale)],
        ['rotationSpeed', new THREE.Uniform(p.rotationSpeed)],
        ['symmetry', new THREE.Uniform(p.symmetry)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.startTime = performance.now()
  }

  update() {
    this.uniforms.get('time')!.value = (performance.now() - this.startTime) / 1000
  }

  updateParams(params: Partial<FractalDomainParams>) {
    if (params.iterations !== undefined) this.uniforms.get('iterations')!.value = params.iterations
    if (params.foldScale !== undefined) this.uniforms.get('foldScale')!.value = params.foldScale
    if (params.rotationSpeed !== undefined) this.uniforms.get('rotationSpeed')!.value = params.rotationSpeed
    if (params.symmetry !== undefined) this.uniforms.get('symmetry')!.value = params.symmetry
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

---

### Task 5: Create effect classes — Crystallize

**Files:**
- Create: `src/effects/morph/CrystallizeEffect.ts`

**Step 1: Write the effect class**

```typescript
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL } from '../glitch-engine/glsl-utils'

const fragmentShader = NOISE_GLSL + /* glsl */ `
uniform float cellSize;
uniform float edgeThickness;
uniform float shatter;
uniform float effectMix;
uniform vec2 resolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Scale UV to pixel-based cell grid
  vec2 scaledUv = uv * resolution / cellSize;
  vec2 cell = floor(scaledUv);

  float minDist = 1e10;
  float secondDist = 1e10;
  vec2 nearestCell = cell;

  // Search 3x3 neighborhood for nearest Voronoi cell center
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = cell + vec2(float(x), float(y));
      // Jitter cell center based on shatter amount
      vec2 cellCenter = neighbor + hash2(neighbor) * shatter;
      float dist = length(scaledUv - cellCenter);

      if (dist < minDist) {
        secondDist = minDist;
        minDist = dist;
        nearestCell = neighbor;
      } else if (dist < secondDist) {
        secondDist = dist;
      }
    }
  }

  // Sample texture at nearest cell center
  vec2 cellCenter = nearestCell + hash2(nearestCell) * shatter;
  vec2 sampleUv = cellCenter * cellSize / resolution;
  sampleUv = clamp(sampleUv, 0.0, 1.0);
  vec4 cellColor = texture2D(inputBuffer, sampleUv);

  // Edge detection between cells
  float edge = smoothstep(0.0, edgeThickness / cellSize, secondDist - minDist);
  vec4 effectColor = mix(vec4(0.0, 0.0, 0.0, 1.0), cellColor, edge);

  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface CrystallizeParams {
  cellSize: number
  edgeThickness: number
  shatter: number
  mix: number
}

export const DEFAULT_CRYSTALLIZE_PARAMS: CrystallizeParams = {
  cellSize: 30.0,
  edgeThickness: 1.5,
  shatter: 0.4,
  mix: 1.0,
}

export class CrystallizeEffect extends Effect {
  constructor(params: Partial<CrystallizeParams> = {}) {
    const p = { ...DEFAULT_CRYSTALLIZE_PARAMS, ...params }

    super('CrystallizeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['cellSize', new THREE.Uniform(p.cellSize)],
        ['edgeThickness', new THREE.Uniform(p.edgeThickness)],
        ['shatter', new THREE.Uniform(p.shatter)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<CrystallizeParams>) {
    if (params.cellSize !== undefined) this.uniforms.get('cellSize')!.value = params.cellSize
    if (params.edgeThickness !== undefined) this.uniforms.get('edgeThickness')!.value = params.edgeThickness
    if (params.shatter !== undefined) this.uniforms.get('shatter')!.value = params.shatter
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
```

---

### Task 6: Create Face Emotion Heuristics utility

**Files:**
- Create: `src/utils/faceEmotions.ts`

**Step 1: Write the emotion heuristics module**

```typescript
export interface EmotionScores {
  neutral: number
  happiness: number
  surprise: number
  anger: number
  sadness: number
}

interface Point {
  x: number
  y: number
  z?: number
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Derive approximate emotion scores from MediaPipe Face Mesh 468 landmarks.
 * Uses geometric heuristics — not accurate, but reactive and convincing.
 *
 * Key landmark indices (MediaPipe Face Mesh):
 * - 13, 14: upper/lower lip (mouth openness)
 * - 61, 291: left/right mouth corners
 * - 159, 145: left eye upper/lower lid
 * - 386, 374: right eye upper/lower lid
 * - 70, 63: left brow inner/outer
 * - 300, 293: right brow inner/outer
 * - 10: forehead top
 * - 152: chin bottom
 */
export function deriveEmotions(landmarks: Point[]): EmotionScores {
  if (landmarks.length < 468) {
    return { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  }

  // Face height for normalization
  const faceHeight = distance(landmarks[10], landmarks[152])
  if (faceHeight < 0.001) {
    return { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  }

  // Mouth openness (13=upper lip, 14=lower lip)
  const mouthOpen = distance(landmarks[13], landmarks[14]) / faceHeight

  // Mouth width (61=left corner, 291=right corner)
  const mouthWidth = distance(landmarks[61], landmarks[291]) / faceHeight

  // Eye openness (average of both eyes)
  const leftEyeOpen = distance(landmarks[159], landmarks[145]) / faceHeight
  const rightEyeOpen = distance(landmarks[386], landmarks[374]) / faceHeight
  const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2

  // Brow height (average distance from eye to brow)
  const leftBrowHeight = distance(landmarks[70], landmarks[159]) / faceHeight
  const rightBrowHeight = distance(landmarks[300], landmarks[386]) / faceHeight
  const browHeight = (leftBrowHeight + rightBrowHeight) / 2

  // Derive scores with simple heuristics
  const happiness = Math.min(1, Math.max(0, (mouthWidth - 0.25) * 4 + mouthOpen * 3))
  const surprise = Math.min(1, Math.max(0, (eyeOpen - 0.04) * 15 + (mouthOpen - 0.03) * 10))
  const anger = Math.min(1, Math.max(0, (0.06 - browHeight) * 20))
  const sadness = Math.min(1, Math.max(0, (0.22 - mouthWidth) * 5 + (0.035 - eyeOpen) * 10))

  // Neutral is inverse of other emotions
  const emotionSum = happiness + surprise + anger + sadness
  const neutral = Math.max(0, 1 - emotionSum)

  // Normalize to sum ~1
  const total = neutral + happiness + surprise + anger + sadness
  return {
    neutral: neutral / total,
    happiness: happiness / total,
    surprise: surprise / total,
    anger: anger / total,
    sadness: sadness / total,
  }
}
```

---

### Task 7: Create effect classes — Face HUD

**Files:**
- Create: `src/effects/morph/FaceHudEffect.ts`

**Step 1: Write the Face HUD effect class**

This effect is unique — it uses MediaPipe Face Mesh and Canvas2D to render HUD elements, then composites them as a texture.

```typescript
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
  mix: number
}

export const DEFAULT_FACE_HUD_PARAMS: FaceHudParams = {
  wireframeOpacity: 0.6,
  hudColor: '#00ffcc',
  emotionDisplay: true,
  scanLines: 0.3,
  detectionInterval: 3,
  mix: 1.0,
}

interface FaceLandmark {
  x: number
  y: number
  z?: number
}

// MediaPipe Face Mesh tessellation (subset of key triangles for wireframe)
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
  private lastEmotions: EmotionScores = { neutral: 1, happiness: 0, surprise: 0, anger: 0, sadness: 0 }
  private lastLandmarks: FaceLandmark[] = []
  private params: FaceHudParams

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

  detectFaces(videoElement: HTMLVideoElement) {
    if (!this.faceLandmarker || !videoElement || videoElement.readyState < 2) return

    this.frameCount++
    if (this.frameCount % this.params.detectionInterval !== 0) return

    try {
      const result = this.faceLandmarker.detectForVideo(videoElement, performance.now())
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        this.lastLandmarks = result.faceLandmarks[0]
        this.lastEmotions = deriveEmotions(this.lastLandmarks)
      }
    } catch {
      // Skip frame on error
    }
  }

  private renderHud() {
    const ctx = this.hudCtx
    const w = this.hudCanvas.width
    const h = this.hudCanvas.height
    ctx.clearRect(0, 0, w, h)

    if (this.lastLandmarks.length === 0) return

    const color = this.params.hudColor

    // Draw wireframe mesh
    if (this.params.wireframeOpacity > 0) {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.globalAlpha = this.params.wireframeOpacity

      for (const [i, j] of FACE_MESH_CONNECTIONS) {
        if (i >= this.lastLandmarks.length || j >= this.lastLandmarks.length) continue
        const a = this.lastLandmarks[i]
        const b = this.lastLandmarks[j]
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }
    }

    // Draw bounding box with corner brackets
    ctx.globalAlpha = 1
    const xs = this.lastLandmarks.map(p => p.x * w)
    const ys = this.lastLandmarks.map(p => p.y * h)
    const minX = Math.min(...xs) - 20
    const maxX = Math.max(...xs) + 20
    const minY = Math.min(...ys) - 20
    const maxY = Math.max(...ys) + 20
    const bracketLen = 20

    ctx.strokeStyle = color
    ctx.lineWidth = 2

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

    // Draw emotion scores
    if (this.params.emotionDisplay) {
      ctx.font = '14px monospace'
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9

      // Find dominant emotion
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
```

---

### Task 8: Create morph effects barrel export

**Files:**
- Create: `src/effects/morph/index.ts`

**Step 1: Write barrel export**

```typescript
export { LiquidMorphEffect, DEFAULT_LIQUID_MORPH_PARAMS } from './LiquidMorphEffect'
export type { LiquidMorphParams } from './LiquidMorphEffect'

export { RippleWarpEffect, DEFAULT_RIPPLE_WARP_PARAMS } from './RippleWarpEffect'
export type { RippleWarpParams } from './RippleWarpEffect'

export { FractalDomainEffect, DEFAULT_FRACTAL_DOMAIN_PARAMS } from './FractalDomainEffect'
export type { FractalDomainParams } from './FractalDomainEffect'

export { CrystallizeEffect, DEFAULT_CRYSTALLIZE_PARAMS } from './CrystallizeEffect'
export type { CrystallizeParams } from './CrystallizeEffect'

export { FaceHudEffect, DEFAULT_FACE_HUD_PARAMS } from './FaceHudEffect'
export type { FaceHudParams } from './FaceHudEffect'
```

**Step 2: Commit all effect classes**

```bash
git add src/effects/morph/ src/utils/faceEmotions.ts
git commit -m "feat(morph): add 5 morph effect classes (LiquidMorph, RippleWarp, FractalDomain, Crystallize, FaceHud)"
```

---

### Task 9: Create Morph Store

**Files:**
- Create: `src/stores/morphStore.ts`

Follow the exact pattern from `src/stores/destructionStore.ts`.

**Step 1: Write the store**

```typescript
import { create } from 'zustand'
import {
  DEFAULT_LIQUID_MORPH_PARAMS,
  DEFAULT_RIPPLE_WARP_PARAMS,
  DEFAULT_FRACTAL_DOMAIN_PARAMS,
  DEFAULT_CRYSTALLIZE_PARAMS,
  DEFAULT_FACE_HUD_PARAMS,
  type LiquidMorphParams,
  type RippleWarpParams,
  type FractalDomainParams,
  type CrystallizeParams,
  type FaceHudParams,
} from '../effects/morph'

export type { LiquidMorphParams, RippleWarpParams, FractalDomainParams, CrystallizeParams, FaceHudParams }

interface MorphState {
  // Enable states
  liquidMorphEnabled: boolean
  rippleWarpEnabled: boolean
  fractalDomainEnabled: boolean
  crystallizeEnabled: boolean
  faceHudEnabled: boolean

  // Parameters
  liquidMorphParams: LiquidMorphParams
  rippleWarpParams: RippleWarpParams
  fractalDomainParams: FractalDomainParams
  crystallizeParams: CrystallizeParams
  faceHudParams: FaceHudParams

  // Actions
  setLiquidMorphEnabled: (enabled: boolean) => void
  updateLiquidMorphParams: (params: Partial<LiquidMorphParams>) => void
  setRippleWarpEnabled: (enabled: boolean) => void
  updateRippleWarpParams: (params: Partial<RippleWarpParams>) => void
  setFractalDomainEnabled: (enabled: boolean) => void
  updateFractalDomainParams: (params: Partial<FractalDomainParams>) => void
  setCrystallizeEnabled: (enabled: boolean) => void
  updateCrystallizeParams: (params: Partial<CrystallizeParams>) => void
  setFaceHudEnabled: (enabled: boolean) => void
  updateFaceHudParams: (params: Partial<FaceHudParams>) => void

  // Snapshot for presets
  getSnapshot: () => MorphSnapshot
  applySnapshot: (snapshot: MorphSnapshot) => void
}

export interface MorphSnapshot {
  liquidMorphEnabled: boolean
  liquidMorphParams: LiquidMorphParams
  rippleWarpEnabled: boolean
  rippleWarpParams: RippleWarpParams
  fractalDomainEnabled: boolean
  fractalDomainParams: FractalDomainParams
  crystallizeEnabled: boolean
  crystallizeParams: CrystallizeParams
  faceHudEnabled: boolean
  faceHudParams: FaceHudParams
}

export const useMorphStore = create<MorphState>((set, get) => ({
  liquidMorphEnabled: false,
  liquidMorphParams: { ...DEFAULT_LIQUID_MORPH_PARAMS },

  rippleWarpEnabled: false,
  rippleWarpParams: { ...DEFAULT_RIPPLE_WARP_PARAMS },

  fractalDomainEnabled: false,
  fractalDomainParams: { ...DEFAULT_FRACTAL_DOMAIN_PARAMS },

  crystallizeEnabled: false,
  crystallizeParams: { ...DEFAULT_CRYSTALLIZE_PARAMS },

  faceHudEnabled: false,
  faceHudParams: { ...DEFAULT_FACE_HUD_PARAMS },

  setLiquidMorphEnabled: (enabled) => set({ liquidMorphEnabled: enabled }),
  updateLiquidMorphParams: (params) => set((state) => ({
    liquidMorphParams: { ...state.liquidMorphParams, ...params },
  })),

  setRippleWarpEnabled: (enabled) => set({ rippleWarpEnabled: enabled }),
  updateRippleWarpParams: (params) => set((state) => ({
    rippleWarpParams: { ...state.rippleWarpParams, ...params },
  })),

  setFractalDomainEnabled: (enabled) => set({ fractalDomainEnabled: enabled }),
  updateFractalDomainParams: (params) => set((state) => ({
    fractalDomainParams: { ...state.fractalDomainParams, ...params },
  })),

  setCrystallizeEnabled: (enabled) => set({ crystallizeEnabled: enabled }),
  updateCrystallizeParams: (params) => set((state) => ({
    crystallizeParams: { ...state.crystallizeParams, ...params },
  })),

  setFaceHudEnabled: (enabled) => set({ faceHudEnabled: enabled }),
  updateFaceHudParams: (params) => set((state) => ({
    faceHudParams: { ...state.faceHudParams, ...params },
  })),

  getSnapshot: () => {
    const state = get()
    return {
      liquidMorphEnabled: state.liquidMorphEnabled,
      liquidMorphParams: { ...state.liquidMorphParams },
      rippleWarpEnabled: state.rippleWarpEnabled,
      rippleWarpParams: { ...state.rippleWarpParams },
      fractalDomainEnabled: state.fractalDomainEnabled,
      fractalDomainParams: { ...state.fractalDomainParams },
      crystallizeEnabled: state.crystallizeEnabled,
      crystallizeParams: { ...state.crystallizeParams },
      faceHudEnabled: state.faceHudEnabled,
      faceHudParams: { ...state.faceHudParams },
    }
  },

  applySnapshot: (snapshot) => set({
    liquidMorphEnabled: snapshot.liquidMorphEnabled ?? false,
    liquidMorphParams: snapshot.liquidMorphParams ? { ...snapshot.liquidMorphParams } : { ...DEFAULT_LIQUID_MORPH_PARAMS },
    rippleWarpEnabled: snapshot.rippleWarpEnabled ?? false,
    rippleWarpParams: snapshot.rippleWarpParams ? { ...snapshot.rippleWarpParams } : { ...DEFAULT_RIPPLE_WARP_PARAMS },
    fractalDomainEnabled: snapshot.fractalDomainEnabled ?? false,
    fractalDomainParams: snapshot.fractalDomainParams ? { ...snapshot.fractalDomainParams } : { ...DEFAULT_FRACTAL_DOMAIN_PARAMS },
    crystallizeEnabled: snapshot.crystallizeEnabled ?? false,
    crystallizeParams: snapshot.crystallizeParams ? { ...snapshot.crystallizeParams } : { ...DEFAULT_CRYSTALLIZE_PARAMS },
    faceHudEnabled: snapshot.faceHudEnabled ?? false,
    faceHudParams: snapshot.faceHudParams ? { ...snapshot.faceHudParams } : { ...DEFAULT_FACE_HUD_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/morphStore.ts
git commit -m "feat(morph): add morphStore for morph effect state management"
```

---

### Task 10: Update effects config — Page 6 MORPH

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Add "MORPH" to PAGE_NAMES** (line 12)

Change:
```typescript
export const PAGE_NAMES = ['ACID', 'VISION', 'GLITCH', 'STRAND', 'MOTION', 'DESTROY']
```
To:
```typescript
export const PAGE_NAMES = ['ACID', 'VISION', 'GLITCH', 'STRAND', 'MOTION', 'DESTROY', 'MORPH']
```

**Step 2: Add MORPH_EFFECTS array** (after line 181, before `getEffectsForPage`)

```typescript
// ═══════════════════════════════════════════════════════════════
// PAGE 6: MORPH (Anima Morph face-morphing effects)
// ═══════════════════════════════════════════════════════════════

export const MORPH_EFFECTS: EffectDefinition[] = [
  // Row 1: Core morph effects
  { id: 'liquid_morph', label: 'LIQUID', color: '#4ecdc4', row: 'distortion', page: 6, min: 0, max: 1 },
  { id: 'ripple_warp', label: 'RIPPLE', color: '#7b68ee', row: 'distortion', page: 6, min: 0, max: 1 },
  { id: 'fractal_domain', label: 'FRACTAL', color: '#ff6b9d', row: 'distortion', page: 6, min: 0, max: 1 },
  { id: 'crystallize', label: 'CRYSTAL', color: '#a8e6cf', row: 'texture', page: 6, min: 0, max: 1 },

  // Row 2: Detection/HUD
  { id: 'face_hud', label: 'FACE HUD', color: '#00ffcc', row: 'render', page: 6, min: 0, max: 1 },
  { id: 'morph_reserved_6', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_7', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_8', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },

  // Row 3: Reserved
  { id: 'morph_reserved_9', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_10', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_11', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_12', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },

  // Row 4: Reserved
  { id: 'morph_reserved_13', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_14', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_15', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
  { id: 'morph_reserved_16', label: '—', color: '#374151', row: 'reserved', page: 6, min: 0, max: 100 },
]
```

**Step 3: Update getEffectsForPage** (line 184-189)

Change:
```typescript
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  if (page === 3) return STRAND_EFFECTS
  if (page === 4) return MOTION_EFFECTS
  if (page === 5) return DESTRUCTION_EFFECTS
  return EFFECTS.filter(e => e.page === page)
}
```
To:
```typescript
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  if (page === 3) return STRAND_EFFECTS
  if (page === 4) return MOTION_EFFECTS
  if (page === 5) return DESTRUCTION_EFFECTS
  if (page === 6) return MORPH_EFFECTS
  return EFFECTS.filter(e => e.page === page)
}
```

---

### Task 11: Update UI Store — bump max page to 6

**Files:**
- Modify: `src/stores/uiStore.ts`

**Step 1: Update page navigation limits** (lines 95-96)

Change `Math.min(5, ...)` to `Math.min(6, ...)` in both `setGridPage` and `nextGridPage`:

```typescript
setGridPage: (page) => set({ gridPage: Math.max(0, Math.min(6, page)) }),
nextGridPage: () => set((state) => ({ gridPage: Math.min(6, state.gridPage + 1) })),
```

---

### Task 12: Update Routing Store — add MORPH_EFFECTS to default order

**Files:**
- Modify: `src/stores/routingStore.ts`

**Step 1: Import MORPH_EFFECTS** (line 2)

Change:
```typescript
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../config/effects'
```
To:
```typescript
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS, MORPH_EFFECTS } from '../config/effects'
```

**Step 2: Add to defaultEffectOrder** (lines 77-82)

Change:
```typescript
const defaultEffectOrder = [
  ...EFFECTS.map(e => e.id),
  ...STRAND_EFFECTS.map(e => e.id),
  ...MOTION_EFFECTS.map(e => e.id),
  ...DESTRUCTION_EFFECTS.map(e => e.id),
]
```
To:
```typescript
const defaultEffectOrder = [
  ...EFFECTS.map(e => e.id),
  ...STRAND_EFFECTS.map(e => e.id),
  ...MOTION_EFFECTS.map(e => e.id),
  ...DESTRUCTION_EFFECTS.map(e => e.id),
  ...MORPH_EFFECTS.map(e => e.id),
]
```

**Step 3: Commit config + store changes**

```bash
git add src/config/effects.ts src/stores/uiStore.ts src/stores/routingStore.ts
git commit -m "feat(morph): add MORPH page to effects config, routing, and UI store"
```

---

### Task 13: Update EffectPipeline — add morph effects

**Files:**
- Modify: `src/effects/EffectPipeline.ts`

**Step 1: Add imports** (after line 36)

```typescript
import {
  LiquidMorphEffect,
  RippleWarpEffect,
  FractalDomainEffect,
  CrystallizeEffect,
  FaceHudEffect,
} from './morph'
```

**Step 2: Add effect instance properties** (after line 75, the destruction effects section)

```typescript
  // Morph effects
  liquidMorph: LiquidMorphEffect | null = null
  rippleWarp: RippleWarpEffect | null = null
  fractalDomain: FractalDomainEffect | null = null
  crystallize: CrystallizeEffect | null = null
  faceHud: FaceHudEffect | null = null
```

**Step 3: Initialize in constructor** (after line 149, before trace effects)

```typescript
    // Morph effects
    this.liquidMorph = new LiquidMorphEffect()
    this.rippleWarp = new RippleWarpEffect()
    this.fractalDomain = new FractalDomainEffect()
    this.crystallize = new CrystallizeEffect()
    this.faceHud = new FaceHudEffect()
```

**Step 4: Add to getEffectById switch** (before `default: return null` at line 194)

```typescript
      // Morph effects
      case 'liquid_morph': return this.liquidMorph
      case 'ripple_warp': return this.rippleWarp
      case 'fractal_domain': return this.fractalDomain
      case 'crystallize': return this.crystallize
      case 'face_hud': return this.faceHud
```

**Step 5: Add to updateEffects config type** (after line 226 `pointCloudEnabled`)

```typescript
    // Morph effects
    liquidMorphEnabled: boolean
    rippleWarpEnabled: boolean
    fractalDomainEnabled: boolean
    crystallizeEnabled: boolean
    faceHudEnabled: boolean
```

**Step 6: Add to enabledMap** (after line 285 `point_cloud`)

```typescript
      // Morph effects
      liquid_morph: config.liquidMorphEnabled,
      ripple_warp: config.rippleWarpEnabled,
      fractal_domain: config.fractalDomainEnabled,
      crystallize: config.crystallizeEnabled,
      face_hud: config.faceHudEnabled,
```

**Step 7: Add to dispose()** (after line 453 `this.pointCloud?.dispose()`)

```typescript
    // Morph effects
    this.liquidMorph?.dispose()
    this.rippleWarp?.dispose()
    this.fractalDomain?.dispose()
    this.crystallize?.dispose()
    this.faceHud?.dispose()
```

---

### Task 14: Update Canvas.tsx — integrate morph store

**Files:**
- Modify: `src/components/Canvas.tsx`

**Step 1: Add import** (after line 14, the destructionStore import)

```typescript
import { useMorphStore } from '../stores/morphStore'
```

**Step 2: Add store destructuring** (after line 46, the destruction store block)

```typescript
  // Morph effects state
  const {
    liquidMorphEnabled,
    liquidMorphParams,
    rippleWarpEnabled,
    rippleWarpParams,
    fractalDomainEnabled,
    fractalDomainParams,
    crystallizeEnabled,
    crystallizeParams,
    faceHudEnabled,
    faceHudParams,
  } = useMorphStore()
```

**Step 3: Add param sync** (after line 235, the freezeMask updateParams line, inside the main useEffect)

```typescript
    // Morph effects
    pipeline.liquidMorph?.updateParams({ ...liquidMorphParams, mix: getMix('liquid_morph') })
    pipeline.rippleWarp?.updateParams({ ...rippleWarpParams, mix: getMix('ripple_warp') })
    pipeline.fractalDomain?.updateParams({ ...fractalDomainParams, mix: getMix('fractal_domain') })
    pipeline.crystallize?.updateParams({ ...crystallizeParams, mix: getMix('crystallize') })
    pipeline.faceHud?.updateParams({ ...faceHudParams, mix: getMix('face_hud') })
```

**Step 4: Add to pipeline.updateEffects() call** (after line 286, the pointCloudEnabled line)

```typescript
      // Morph effects
      liquidMorphEnabled: getEffectiveEnabled('liquid_morph', liquidMorphEnabled && !effectBypassed['liquid_morph']),
      rippleWarpEnabled: getEffectiveEnabled('ripple_warp', rippleWarpEnabled && !effectBypassed['ripple_warp']),
      fractalDomainEnabled: getEffectiveEnabled('fractal_domain', fractalDomainEnabled && !effectBypassed['fractal_domain']),
      crystallizeEnabled: getEffectiveEnabled('crystallize', crystallizeEnabled && !effectBypassed['crystallize']),
      faceHudEnabled: getEffectiveEnabled('face_hud', faceHudEnabled && !effectBypassed['face_hud']),
```

**Step 5: Add Face HUD detection call** (after the point cloud updateParams block, around line 336)

```typescript
    // Face HUD - init face mesh and run detection
    if (pipeline.faceHud && faceHudEnabled) {
      pipeline.faceHud.initFaceMesh()
      if (videoElement) {
        pipeline.faceHud.detectFaces(videoElement)
      }
    }
```

**Step 6: Add to useEffect dependency array** (after line 494 `pointCloudParams,`)

```typescript
    // Morph effects
    liquidMorphEnabled,
    liquidMorphParams,
    rippleWarpEnabled,
    rippleWarpParams,
    fractalDomainEnabled,
    fractalDomainParams,
    crystallizeEnabled,
    crystallizeParams,
    faceHudEnabled,
    faceHudParams,
```

**Step 7: Commit pipeline + canvas integration**

```bash
git add src/effects/EffectPipeline.ts src/components/Canvas.tsx
git commit -m "feat(morph): integrate morph effects into pipeline and canvas"
```

---

### Task 15: Update useActiveEffects hook

**Files:**
- Modify: `src/hooks/useActiveEffects.ts`

**Step 1: Add import** (with the other store imports)

```typescript
import { useMorphStore } from '../stores/morphStore'
import { MORPH_EFFECTS } from '../config/effects'
```

**Step 2: Add store hook call** (inside the hook function, with the other store calls)

```typescript
const morph = useMorphStore()
```

**Step 3: Add effect checks** (before the sort/return, after the destruction effects block)

```typescript
  // Morph effects
  if (morph.liquidMorphEnabled) {
    const effect = MORPH_EFFECTS.find(e => e.id === 'liquid_morph')
    activeEffects.push({ id: 'liquid_morph', label: 'Liquid Morph', color: effect?.color || '#4ecdc4', primaryValue: Math.round(morph.liquidMorphParams.intensity * 100), primaryLabel: 'int' })
  }
  if (morph.rippleWarpEnabled) {
    const effect = MORPH_EFFECTS.find(e => e.id === 'ripple_warp')
    activeEffects.push({ id: 'ripple_warp', label: 'Ripple Warp', color: effect?.color || '#7b68ee', primaryValue: Math.round(morph.rippleWarpParams.amplitude * 1000), primaryLabel: 'amp' })
  }
  if (morph.fractalDomainEnabled) {
    const effect = MORPH_EFFECTS.find(e => e.id === 'fractal_domain')
    activeEffects.push({ id: 'fractal_domain', label: 'Fractal Domain', color: effect?.color || '#ff6b9d', primaryValue: morph.fractalDomainParams.iterations, primaryLabel: 'iter' })
  }
  if (morph.crystallizeEnabled) {
    const effect = MORPH_EFFECTS.find(e => e.id === 'crystallize')
    activeEffects.push({ id: 'crystallize', label: 'Crystallize', color: effect?.color || '#a8e6cf', primaryValue: Math.round(morph.crystallizeParams.cellSize), primaryLabel: 'cell' })
  }
  if (morph.faceHudEnabled) {
    const effect = MORPH_EFFECTS.find(e => e.id === 'face_hud')
    activeEffects.push({ id: 'face_hud', label: 'Face HUD', color: effect?.color || '#00ffcc', primaryValue: Math.round(morph.faceHudParams.wireframeOpacity * 100), primaryLabel: 'wire' })
  }
```

---

### Task 16: Update useEffectDisable hook

**Files:**
- Modify: `src/hooks/useEffectDisable.ts`

**Step 1: Add import** (with other store imports)

```typescript
import { useMorphStore } from '../stores/morphStore'
```

**Step 2: Add store hook** (inside the function, with other store calls)

```typescript
const morph = useMorphStore()
```

**Step 3: Add switch cases** (before the `default:` case)

```typescript
      // Morph effects
      case 'liquid_morph': morph.setLiquidMorphEnabled(false); break
      case 'ripple_warp': morph.setRippleWarpEnabled(false); break
      case 'fractal_domain': morph.setFractalDomainEnabled(false); break
      case 'crystallize': morph.setCrystallizeEnabled(false); break
      case 'face_hud': morph.setFaceHudEnabled(false); break
```

**Step 4: Commit hooks**

```bash
git add src/hooks/useActiveEffects.ts src/hooks/useEffectDisable.ts
git commit -m "feat(morph): add morph effects to active effects and disable hooks"
```

---

### Task 17: Update CompactEffectParams

**Files:**
- Modify: `src/components/performance/CompactEffectParams.tsx`

**Step 1: Add import** (with other store imports)

```typescript
import { useMorphStore } from '../../stores/morphStore'
```

**Step 2: Add store hook** (inside the function, with other store calls)

```typescript
const morph = useMorphStore()
```

**Step 3: Add switch cases** (before the `default:` return)

```typescript
    case 'liquid_morph':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={morph.liquidMorphParams.intensity} min={0} max={1} step={0.01}
            onChange={v => morph.updateLiquidMorphParams({ intensity: v })} paramId="liquid_morph.intensity" {...knobProps} />
          <Knob label="CHRM" value={morph.liquidMorphParams.chromeAmount} min={0} max={1} step={0.01}
            onChange={v => morph.updateLiquidMorphParams({ chromeAmount: v })} paramId="liquid_morph.chromeAmount" {...knobProps} />
          <Knob label="SPD" value={morph.liquidMorphParams.speed} min={0.1} max={3} step={0.1}
            onChange={v => morph.updateLiquidMorphParams({ speed: v })} paramId="liquid_morph.speed" {...knobProps} />
        </div>
      )
    case 'ripple_warp':
      return (
        <div className="flex gap-4">
          <Knob label="AMP" value={morph.rippleWarpParams.amplitude} min={0} max={0.2} step={0.001}
            onChange={v => morph.updateRippleWarpParams({ amplitude: v })} paramId="ripple_warp.amplitude" {...knobProps} />
          <Knob label="FREQ" value={morph.rippleWarpParams.frequency} min={1} max={50} step={0.5}
            onChange={v => morph.updateRippleWarpParams({ frequency: v })} paramId="ripple_warp.frequency" {...knobProps} />
          <Knob label="SPD" value={morph.rippleWarpParams.speed} min={0.1} max={5} step={0.1}
            onChange={v => morph.updateRippleWarpParams({ speed: v })} paramId="ripple_warp.speed" {...knobProps} />
        </div>
      )
    case 'fractal_domain':
      return (
        <div className="flex gap-4">
          <Knob label="ITER" value={morph.fractalDomainParams.iterations} min={1} max={8} step={1}
            onChange={v => morph.updateFractalDomainParams({ iterations: v })} paramId="fractal_domain.iterations" {...knobProps} />
          <Knob label="SYM" value={morph.fractalDomainParams.symmetry} min={2} max={12} step={1}
            onChange={v => morph.updateFractalDomainParams({ symmetry: v })} paramId="fractal_domain.symmetry" {...knobProps} />
          <Knob label="FOLD" value={morph.fractalDomainParams.foldScale} min={0.5} max={3} step={0.1}
            onChange={v => morph.updateFractalDomainParams({ foldScale: v })} paramId="fractal_domain.foldScale" {...knobProps} />
        </div>
      )
    case 'crystallize':
      return (
        <div className="flex gap-4">
          <Knob label="CELL" value={morph.crystallizeParams.cellSize} min={5} max={100} step={1}
            onChange={v => morph.updateCrystallizeParams({ cellSize: v })} paramId="crystallize.cellSize" {...knobProps} />
          <Knob label="SHTR" value={morph.crystallizeParams.shatter} min={0} max={1} step={0.01}
            onChange={v => morph.updateCrystallizeParams({ shatter: v })} paramId="crystallize.shatter" {...knobProps} />
          <Knob label="EDGE" value={morph.crystallizeParams.edgeThickness} min={0} max={5} step={0.1}
            onChange={v => morph.updateCrystallizeParams({ edgeThickness: v })} paramId="crystallize.edgeThickness" {...knobProps} />
        </div>
      )
    case 'face_hud':
      return (
        <div className="flex gap-4">
          <Knob label="WIRE" value={morph.faceHudParams.wireframeOpacity} min={0} max={1} step={0.01}
            onChange={v => morph.updateFaceHudParams({ wireframeOpacity: v })} paramId="face_hud.wireframeOpacity" {...knobProps} />
          <Knob label="SCAN" value={morph.faceHudParams.scanLines} min={0} max={1} step={0.01}
            onChange={v => morph.updateFaceHudParams({ scanLines: v })} paramId="face_hud.scanLines" {...knobProps} />
        </div>
      )
```

---

### Task 18: Update ExpandedParameterPanel

**Files:**
- Modify: `src/components/performance/ExpandedParameterPanel.tsx`

**Step 1: Add import** (with other store imports)

```typescript
import { useMorphStore } from '../../stores/morphStore'
```

**Step 2: Add to EFFECTS import** (line 18)

Change:
```typescript
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../../config/effects'
```
To:
```typescript
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS, MORPH_EFFECTS } from '../../config/effects'
```

**Step 3: Add store hook call** (inside EffectParameters function, with other store calls — these force re-renders)

```typescript
useMorphStore()
```

---

### Task 19: Update effectParams registry

**Files:**
- Modify: `src/config/effectParams.ts`

**Step 1: Add import for morph store** (with other store getter shortcuts, around line 54)

```typescript
import { useMorphStore } from '../stores/morphStore'
```

Add shortcut:
```typescript
const mor = () => useMorphStore.getState()
```

**Step 2: Add registry entries** (at the end of EFFECT_PARAM_REGISTRY, before the closing `}`)

```typescript
  // ═══════════════════════════════════════════════════════════════
  // MORPH EFFECTS
  // ═══════════════════════════════════════════════════════════════
  liquid_morph: {
    getParams: () => [
      { id: 'speed', label: 'SPD', min: 0.1, max: 3, step: 0.1,
        apply: (v) => mor().updateLiquidMorphParams({ speed: v }), read: () => mor().liquidMorphParams.speed },
      { id: 'scale', label: 'SCALE', min: 1, max: 20, step: 0.5,
        apply: (v) => mor().updateLiquidMorphParams({ scale: v }), read: () => mor().liquidMorphParams.scale },
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateLiquidMorphParams({ intensity: v }), read: () => mor().liquidMorphParams.intensity },
      { id: 'chromeAmount', label: 'CHRM', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateLiquidMorphParams({ chromeAmount: v }), read: () => mor().liquidMorphParams.chromeAmount },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateLiquidMorphParams({ mix: v }), read: () => mor().liquidMorphParams.mix },
    ],
    setEnabled: (v) => mor().setLiquidMorphEnabled(v),
    getEnabled: () => mor().liquidMorphEnabled,
  },
  ripple_warp: {
    getParams: () => [
      { id: 'frequency', label: 'FREQ', min: 1, max: 50, step: 0.5,
        apply: (v) => mor().updateRippleWarpParams({ frequency: v }), read: () => mor().rippleWarpParams.frequency },
      { id: 'amplitude', label: 'AMP', min: 0, max: 0.2, step: 0.001,
        apply: (v) => mor().updateRippleWarpParams({ amplitude: v }), read: () => mor().rippleWarpParams.amplitude },
      { id: 'speed', label: 'SPD', min: 0.1, max: 5, step: 0.1,
        apply: (v) => mor().updateRippleWarpParams({ speed: v }), read: () => mor().rippleWarpParams.speed },
      { id: 'decay', label: 'DECAY', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateRippleWarpParams({ decay: v }), read: () => mor().rippleWarpParams.decay },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateRippleWarpParams({ mix: v }), read: () => mor().rippleWarpParams.mix },
    ],
    setEnabled: (v) => mor().setRippleWarpEnabled(v),
    getEnabled: () => mor().rippleWarpEnabled,
  },
  fractal_domain: {
    getParams: () => [
      { id: 'iterations', label: 'ITER', min: 1, max: 8, step: 1, controlType: 'stepper' as const,
        apply: (v) => mor().updateFractalDomainParams({ iterations: v }), read: () => mor().fractalDomainParams.iterations },
      { id: 'foldScale', label: 'FOLD', min: 0.5, max: 3, step: 0.1,
        apply: (v) => mor().updateFractalDomainParams({ foldScale: v }), read: () => mor().fractalDomainParams.foldScale },
      { id: 'rotationSpeed', label: 'ROT', min: 0, max: 2, step: 0.05,
        apply: (v) => mor().updateFractalDomainParams({ rotationSpeed: v }), read: () => mor().fractalDomainParams.rotationSpeed },
      { id: 'symmetry', label: 'SYM', min: 2, max: 12, step: 1, controlType: 'stepper' as const,
        apply: (v) => mor().updateFractalDomainParams({ symmetry: v }), read: () => mor().fractalDomainParams.symmetry },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFractalDomainParams({ mix: v }), read: () => mor().fractalDomainParams.mix },
    ],
    setEnabled: (v) => mor().setFractalDomainEnabled(v),
    getEnabled: () => mor().fractalDomainEnabled,
  },
  crystallize: {
    getParams: () => [
      { id: 'cellSize', label: 'CELL', min: 5, max: 100, step: 1,
        apply: (v) => mor().updateCrystallizeParams({ cellSize: v }), read: () => mor().crystallizeParams.cellSize },
      { id: 'edgeThickness', label: 'EDGE', min: 0, max: 5, step: 0.1,
        apply: (v) => mor().updateCrystallizeParams({ edgeThickness: v }), read: () => mor().crystallizeParams.edgeThickness },
      { id: 'shatter', label: 'SHTR', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateCrystallizeParams({ shatter: v }), read: () => mor().crystallizeParams.shatter },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateCrystallizeParams({ mix: v }), read: () => mor().crystallizeParams.mix },
    ],
    setEnabled: (v) => mor().setCrystallizeEnabled(v),
    getEnabled: () => mor().crystallizeEnabled,
  },
  face_hud: {
    getParams: () => [
      { id: 'wireframeOpacity', label: 'WIRE', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ wireframeOpacity: v }), read: () => mor().faceHudParams.wireframeOpacity },
      { id: 'scanLines', label: 'SCAN', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ scanLines: v }), read: () => mor().faceHudParams.scanLines },
      { id: 'detectionInterval', label: 'DET', min: 1, max: 10, step: 1, controlType: 'stepper' as const,
        apply: (v) => mor().updateFaceHudParams({ detectionInterval: v }), read: () => mor().faceHudParams.detectionInterval },
      { id: 'emotionDisplay', label: 'EMO', min: 0, max: 1, step: 1,
        apply: (v) => mor().updateFaceHudParams({ emotionDisplay: v >= 0.5 }), read: () => mor().faceHudParams.emotionDisplay ? 1 : 0 },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ mix: v }), read: () => mor().faceHudParams.mix },
    ],
    setEnabled: (v) => mor().setFaceHudEnabled(v),
    getEnabled: () => mor().faceHudEnabled,
  },
```

**Step 3: Commit UI components**

```bash
git add src/components/performance/CompactEffectParams.tsx src/components/performance/ExpandedParameterPanel.tsx src/config/effectParams.ts
git commit -m "feat(morph): add morph effect params to UI components and registry"
```

---

### Task 20: Build verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 2: Run dev server**

```bash
npm run dev
```
Expected: Compiles successfully

**Step 3: Manual smoke test**

1. Open the app in browser
2. Navigate to page 6 (MORPH) using the page navigation
3. Enable Liquid Morph — verify flowing chrome distortion appears
4. Enable Ripple Warp — verify concentric rings appear
5. Enable Fractal Domain — verify kaleidoscope UV folding
6. Enable Crystallize — verify Voronoi cell pattern
7. Enable Face HUD with a webcam — verify bounding box and wireframe appear
8. Check compact knobs work for each effect
9. Check expanded parameter panel works for each effect
10. Check remove/disable works for each card

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(morph): complete Anima Morph effects integration — 5 new effects on Page 6 MORPH"
```
