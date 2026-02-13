import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIC DATAMOSH - Messy, destroyed, irregular like real codec corruption
// ═══════════════════════════════════════════════════════════════════════════
const fragmentShader = `
uniform sampler2D prevFrameTexture;
uniform sampler2D feedbackTexture;
uniform sampler2D freezeFrameTexture;
uniform float intensity;
uniform float blockSize;
uniform float keyframeChance;
uniform float chaos;
uniform float feedback;
uniform float time;
uniform vec2 resolution;
uniform bool hasPrevFrame;
uniform bool hasFreezeFrame;
uniform float effectMix;
uniform sampler2D traceMask;
uniform bool useTraceMask;
uniform bool invertTraceMask;

// ═══════════════════════════════════════════════════════════════════════════
// NOISE FUNCTIONS - For organic irregularity
// ═══════════════════════════════════════════════════════════════════════════

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

// Value noise for organic shapes
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise for more organic texture
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// ═══════════════════════════════════════════════════════════════════════════
// IRREGULAR BLOCK COORDINATES - Not perfect grid
// ═══════════════════════════════════════════════════════════════════════════

vec2 getMessyBlockCoord(vec2 uv, float size) {
  // Add noise to block boundaries so they're not perfect
  vec2 noiseOffset = vec2(
    noise(uv * 10.0 + time * 0.1) - 0.5,
    noise(uv * 10.0 + 50.0 + time * 0.1) - 0.5
  ) * (size * 0.3) / resolution;

  vec2 messyUV = uv + noiseOffset * intensity;
  return floor(messyUV * resolution / size) * size / resolution;
}

// Irregular pixelation - not uniform grid
vec2 messyPixelate(vec2 uv, float size) {
  // Vary block size organically
  float sizeVar = size * (0.7 + noise(uv * 5.0) * 0.6);
  vec2 pixelSize = sizeVar / resolution;

  // Add jitter
  vec2 jitter = vec2(
    (hash(floor(uv * resolution / sizeVar)) - 0.5) * 0.3,
    (hash(floor(uv * resolution / sizeVar) + 100.0) - 0.5) * 0.3
  ) * pixelSize;

  return floor(uv / pixelSize) * pixelSize + pixelSize * 0.5 + jitter * intensity;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIC MOTION ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════

vec2 getOrganicMotion(vec2 uv, vec2 blockCoord) {
  // Sample multiple points for noisy motion estimate
  vec2 texel = 1.0 / resolution;

  float lumCurrent = luminance(texture2D(inputBuffer, uv).rgb);
  float lumPrev = luminance(texture2D(prevFrameTexture, uv).rgb);
  float lumFeedback = luminance(texture2D(feedbackTexture, uv).rgb);

  float diff = lumCurrent - lumPrev;
  float feedbackDiff = lumCurrent - lumFeedback;

  // Base motion from luminance difference
  vec2 motion = vec2(0.0);

  // Sample neighbors with irregular offsets
  for (float i = 0.0; i < 5.0; i++) {
    float angle = hash(blockCoord + i) * 6.28318;
    float dist = (hash(blockCoord + i + 10.0) * 0.5 + 0.5) * blockSize * texel.x * 3.0;
    vec2 offset = vec2(cos(angle), sin(angle)) * dist;

    float sampleDiff = luminance(texture2D(inputBuffer, uv + offset).rgb) -
                       luminance(texture2D(prevFrameTexture, uv + offset).rgb);

    // Accumulate motion direction based on gradient
    motion += offset * sampleDiff * 10.0;
  }
  motion /= 5.0;

  // Add organic noise to motion
  float noiseAngle = fbm(blockCoord * 20.0 + time) * 6.28318;
  float noiseMag = fbm(blockCoord * 15.0 - time * 0.5) * 0.05;
  motion += vec2(cos(noiseAngle), sin(noiseAngle)) * noiseMag * chaos;

  // Corrupt motion based on feedback
  if (feedback > 0.3) {
    motion += vec2(feedbackDiff * 0.1, feedbackDiff * 0.08);
  }

  return motion * intensity * 4.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN - ORGANIC DESTROYED DATAMOSH
// ═══════════════════════════════════════════════════════════════════════════

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasPrevFrame || intensity <= 0.0) {
    outputColor = inputColor;
    return;
  }

  // Calculate mask value (1.0 = full effect, 0.0 = no effect)
  float mask = 1.0;
  if (useTraceMask) {
    mask = texture2D(traceMask, uv).r;
    if (invertTraceMask) mask = 1.0 - mask;
  }

  // Scale intensity by mask
  float maskedIntensity = intensity * mask;

  // If mask is very low, skip processing
  if (maskedIntensity < 0.01) {
    outputColor = inputColor;
    return;
  }

  // Irregular block coordinates
  vec2 blockCoord = getMessyBlockCoord(uv, blockSize);
  float blockHash = hash(blockCoord + floor(time * 0.3));
  float blockHash2 = hash(blockCoord * 1.7 - time * 0.2);
  float blockHash3 = hash(blockCoord * 2.3 + time * 0.15);
  float timeSlice = floor(time * 6.0);

  vec3 current = inputColor.rgb;

  // ═══════════════════════════════════════════════════════════════
  // SPORADIC KEYFRAMES - Irregular clean spots
  // ═══════════════════════════════════════════════════════════════

  float keyframeNoise = fbm(uv * 30.0 + time * 2.0);
  if (keyframeNoise < keyframeChance * 3.0) {
    outputColor = mix(inputColor, vec4(current, 1.0), effectMix);
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIC MOTION VECTORS
  // ═══════════════════════════════════════════════════════════════

  vec2 motionVector = getOrganicMotion(uv, blockCoord);

  // Add per-pixel noise to motion for organic smearing
  vec2 pixelNoise = vec2(
    noise(uv * resolution * 0.1 + time) - 0.5,
    noise(uv * resolution * 0.1 + 100.0 + time) - 0.5
  ) * 0.02 * intensity * chaos;
  motionVector += pixelNoise;

  // Some regions get wildly wrong motion
  if (blockHash < chaos * 0.5) {
    float wrongAngle = hash(blockCoord + timeSlice) * 6.28318;
    float wrongMag = hash(blockCoord - timeSlice) * 0.15 * intensity;
    motionVector = vec2(cos(wrongAngle), sin(wrongAngle)) * wrongMag;
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSY DISPLACEMENT - Not snapped to grid
  // ═══════════════════════════════════════════════════════════════

  vec2 displacedUV = uv + motionVector;

  // Sometimes snap to messy blocks, sometimes not (organic mix)
  float snapAmount = hash(blockCoord + time * 0.1);
  if (snapAmount < 0.4 * intensity) {
    displacedUV = messyPixelate(displacedUV, blockSize);
  }
  displacedUV = clamp(displacedUV, 0.001, 0.999);

  // ═══════════════════════════════════════════════════════════════
  // RECURSIVE CORRUPTION
  // ═══════════════════════════════════════════════════════════════

  vec3 result;

  // Mix sources organically based on noise
  float sourceMix = fbm(uv * 20.0 + time * 0.5);

  if (hasFreezeFrame && feedback > 0.0) {
    vec3 prev = texture2D(prevFrameTexture, displacedUV).rgb;
    vec3 fb = texture2D(feedbackTexture, displacedUV).rgb;
    vec3 frozen = texture2D(freezeFrameTexture, displacedUV).rgb;

    // Organic blend between sources
    float fbMix = feedback * (0.5 + sourceMix * 0.5);
    result = mix(prev, fb, fbMix);

    // Some areas stuck on freeze frame
    if (sourceMix < chaos * 0.3) {
      result = mix(result, frozen, chaos);
    }
  } else {
    result = texture2D(prevFrameTexture, displacedUV).rgb;
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIC SMEARING - Irregular trails
  // ═══════════════════════════════════════════════════════════════

  float motionMag = length(motionVector);
  if (motionMag > 0.003) {
    vec3 smear = result;
    float samples = 0.0;

    // Variable number of samples based on motion
    for (float i = 1.0; i <= 8.0; i++) {
      // Irregular sample positions
      float t = i / 8.0;
      float noiseT = t + (noise(blockCoord * 10.0 + i) - 0.5) * 0.3;

      vec2 smearUV = uv + motionVector * noiseT * (1.5 + chaos);

      // Add perpendicular scatter for organic look
      vec2 perp = vec2(-motionVector.y, motionVector.x);
      smearUV += perp * (noise(uv * 50.0 + i * 10.0) - 0.5) * 0.02 * chaos;

      smearUV = clamp(smearUV, 0.001, 0.999);

      vec3 samp;
      if (feedback > 0.4 && hash(blockCoord + i) < feedback) {
        samp = texture2D(feedbackTexture, smearUV).rgb;
      } else {
        samp = texture2D(prevFrameTexture, smearUV).rgb;
      }

      // Weight by noise for organic falloff
      float weight = 1.0 - t * (0.5 + noise(blockCoord + i) * 0.5);
      smear += samp * weight;
      samples += weight;
    }
    smear /= samples;

    result = mix(result, smear, min(motionMag * 15.0, 0.85) * intensity);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIC BLOCK CORRUPTION
  // ═══════════════════════════════════════════════════════════════

  float corruptNoise = fbm(blockCoord * 30.0 + time * 0.3);

  // Irregular frozen regions
  if (corruptNoise < 0.15 * intensity * chaos) {
    vec2 frozenUV = uv + vec2(
      (noise(blockCoord * 5.0) - 0.5) * 0.1,
      (noise(blockCoord * 5.0 + 50.0) - 0.5) * 0.1
    ) * intensity;
    if (hasFreezeFrame) {
      result = texture2D(freezeFrameTexture, clamp(frozenUV, 0.0, 1.0)).rgb;
    }
  }

  // Organic displaced regions (not rectangular)
  if (corruptNoise > 0.7 && corruptNoise < 0.7 + 0.15 * chaos) {
    vec2 wrongUV = vec2(
      fbm(uv * 10.0 + time),
      fbm(uv * 10.0 + 100.0 - time)
    );
    result = texture2D(prevFrameTexture, wrongUV).rgb;
  }

  // Color destruction in organic patches
  float colorCorrupt = fbm(uv * 40.0 + time * 0.7);
  if (colorCorrupt < 0.1 * intensity * chaos) {
    // Harsh quantization
    result = floor(result * 3.0) / 3.0;
  } else if (colorCorrupt > 0.9 - 0.05 * chaos) {
    // Color inversion in patches
    result = mix(result, vec3(1.0) - result, chaos * 0.7);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBTLE EDGE VARIATION - No visible grid lines
  // ═══════════════════════════════════════════════════════════════

  // Only very subtle color variation at edges, no hard lines
  float edgeNoise = fbm(uv * 50.0 + time * 0.3);
  if (edgeNoise < 0.15 * chaos) {
    // Occasional soft color shift, not tied to block grid
    vec3 shiftedColor = texture2D(feedbackTexture, uv + vec2(edgeNoise * 0.01, 0.0)).rgb;
    result = mix(result, shiftedColor, edgeNoise * 0.3);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIC DUPLICATION - Blobs not blocks
  // ═══════════════════════════════════════════════════════════════

  float dupNoise = fbm(uv * 15.0 + time * 0.2);
  if (dupNoise < chaos * 0.25) {
    // Copy from organic offset
    vec2 dupOffset = vec2(
      fbm(blockCoord * 8.0 + 10.0) - 0.5,
      fbm(blockCoord * 8.0 + 20.0) - 0.5
    ) * 0.3 * intensity;

    vec2 dupUV = clamp(uv + dupOffset, 0.0, 1.0);
    vec3 dupColor = texture2D(feedbackTexture, dupUV).rgb;
    result = mix(result, dupColor, 0.7 + chaos * 0.3);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIC TEARING - Wavy not straight
  // ═══════════════════════════════════════════════════════════════

  float tearNoise = noise(vec2(uv.y * 20.0 + time, timeSlice));
  if (tearNoise < chaos * intensity * 0.2) {
    // Wavy horizontal tear
    float tearOffset = (noise(vec2(uv.y * 50.0, time * 2.0)) - 0.5) * 0.2 * intensity;
    tearOffset += sin(uv.y * 100.0 + time * 5.0) * 0.01 * chaos; // Add wobble

    vec2 tornUV = vec2(uv.x + tearOffset, uv.y);
    tornUV.x = clamp(tornUV.x, 0.0, 1.0);
    result = texture2D(prevFrameTexture, tornUV).rgb;

    // Corrupt the torn area
    result = floor(result * 5.0) / 5.0;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHANNEL BLEEDING - Organic color separation
  // ═══════════════════════════════════════════════════════════════

  if (chaos > 0.2) {
    float channelNoise = fbm(uv * 25.0 + time);
    if (channelNoise > 0.7) {
      // Organic channel offset
      float rOffset = (noise(uv * 80.0) - 0.5) * 0.015 * intensity;
      float bOffset = (noise(uv * 80.0 + 100.0) - 0.5) * 0.015 * intensity;

      result.r = texture2D(prevFrameTexture, clamp(displacedUV + vec2(rOffset, 0.0), 0.0, 1.0)).r;
      result.b = texture2D(prevFrameTexture, clamp(displacedUV + vec2(bOffset, 0.0), 0.0, 1.0)).b;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIXEL DESTRUCTION - Random destroyed pixels
  // ═══════════════════════════════════════════════════════════════

  float pixelDestroy = hash3(vec3(uv * resolution, timeSlice));
  if (pixelDestroy < intensity * chaos * 0.08) {
    // This pixel is destroyed
    float destroyType = hash(uv * resolution + time);
    if (destroyType < 0.3) {
      // Wrong color from elsewhere
      vec2 wrongPixel = vec2(hash(uv * resolution), hash(uv * resolution + 1.0));
      result = texture2D(feedbackTexture, wrongPixel).rgb;
    } else if (destroyType < 0.5) {
      // Stuck on one channel
      float ch = result.r;
      result = vec3(ch);
    } else if (destroyType < 0.7) {
      // Extreme value
      result = step(0.5, result);
    } else {
      // Color from nearby but wrong
      vec2 nearWrong = uv + (vec2(hash(uv * 1000.0), hash(uv * 1000.0 + 1.0)) - 0.5) * 0.05;
      result = texture2D(prevFrameTexture, clamp(nearWrong, 0.0, 1.0)).rgb;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BLEND - Organic transition to clean
  // ═══════════════════════════════════════════════════════════════

  // Motion-based clean blend with noise
  float cleanNoise = fbm(uv * 30.0 - time);
  float cleanBlend = (1.0 - smoothstep(0.0, 0.03, motionMag)) * cleanNoise;
  result = mix(result, current, cleanBlend * (1.0 - maskedIntensity * 0.9));

  vec4 effectColor = vec4(result, inputColor.a);
  // Apply mask to final mix
  outputColor = mix(inputColor, effectColor, effectMix * mask);
}
`

export interface DatamoshParams {
  intensity: number      // 0-1: overall effect strength
  blockSize: number      // 4-32: macro-block size (16 is standard for H.264)
  keyframeChance: number // 0-0.1: chance of clean frame (I-frame)
  chaos: number          // 0-1: additional random corruption
  feedback: number       // 0-1: recursive feedback amount (higher = more melt)
  mix: number           // 0-1: wet/dry mix
}

export const DEFAULT_DATAMOSH_PARAMS: DatamoshParams = {
  intensity: 0.6,
  blockSize: 16,
  keyframeChance: 0.02,
  chaos: 0.5,
  feedback: 0.7,        // High feedback for cascading corruption
  mix: 1,
}

export class DatamoshEffect extends Effect {
  // Frame buffers
  private prevFrameTarget: THREE.WebGLRenderTarget | null = null
  private feedbackTarget1: THREE.WebGLRenderTarget | null = null
  private feedbackTarget2: THREE.WebGLRenderTarget | null = null
  private freezeFrameTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private time: number = 0
  private frameCount: number = 0
  private feedbackSwap: boolean = false
  private hasCapturedFreezeFrame: boolean = false

  constructor(params: Partial<DatamoshParams> = {}) {
    const p = { ...DEFAULT_DATAMOSH_PARAMS, ...params }

    super('DatamoshEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['prevFrameTexture', new THREE.Uniform(null)],
        ['feedbackTexture', new THREE.Uniform(null)],
        ['freezeFrameTexture', new THREE.Uniform(null)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['blockSize', new THREE.Uniform(p.blockSize)],
        ['keyframeChance', new THREE.Uniform(p.keyframeChance)],
        ['chaos', new THREE.Uniform(p.chaos)],
        ['feedback', new THREE.Uniform(p.feedback)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['hasPrevFrame', new THREE.Uniform(false)],
        ['hasFreezeFrame', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['traceMask', new THREE.Uniform(null)],
        ['useTraceMask', new THREE.Uniform(false)],
        ['invertTraceMask', new THREE.Uniform(false)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }

    // Previous clean frame (for optical flow calculation)
    this.prevFrameTarget = new THREE.WebGLRenderTarget(size.x, size.y, options)

    // Double-buffered feedback (ping-pong for recursive corruption)
    this.feedbackTarget1 = new THREE.WebGLRenderTarget(size.x, size.y, options)
    this.feedbackTarget2 = new THREE.WebGLRenderTarget(size.x, size.y, options)

    // Freeze frame (the "stuck" reference)
    this.freezeFrameTarget = new THREE.WebGLRenderTarget(size.x, size.y, options)

    this.uniforms.get('resolution')!.value.set(size.x, size.y)

    // Copy material for buffer operations
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.prevFrameTarget) return

    this.time += deltaTime || 0.016
    this.uniforms.get('time')!.value = this.time

    // Set textures for shader
    this.uniforms.get('prevFrameTexture')!.value = this.prevFrameTarget.texture

    // Feedback uses ping-pong buffers
    const readFeedback = this.feedbackSwap ? this.feedbackTarget2 : this.feedbackTarget1
    this.uniforms.get('feedbackTexture')!.value = readFeedback?.texture

    this.uniforms.get('freezeFrameTexture')!.value = this.freezeFrameTarget?.texture
    this.uniforms.get('hasPrevFrame')!.value = true
    this.uniforms.get('hasFreezeFrame')!.value = this.hasCapturedFreezeFrame
  }

  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.prevFrameTarget || !this.feedbackTarget1 || !this.feedbackTarget2 ||
        !this.freezeFrameTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    this.frameCount++

    // Capture freeze frame once at the start (or periodically based on keyframeChance)
    if (!this.hasCapturedFreezeFrame || (this.frameCount % 120 === 0 && Math.random() < 0.1)) {
      this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
      renderer.setRenderTarget(this.freezeFrameTarget)
      renderer.render(this.copyScene, this.copyCamera)
      this.hasCapturedFreezeFrame = true
    }

    // Store current output as feedback for next frame (ping-pong)
    const writeFeedback = this.feedbackSwap ? this.feedbackTarget1 : this.feedbackTarget2
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(writeFeedback)
    renderer.render(this.copyScene, this.copyCamera)
    this.feedbackSwap = !this.feedbackSwap

    // Update previous clean frame (for optical flow - use input, not corrupted output)
    // We need to capture from inputBuffer ideally, but we'll use output for now
    // This creates recursive corruption which is actually desired for datamosh
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.prevFrameTarget)
    renderer.render(this.copyScene, this.copyCamera)

    renderer.setRenderTarget(null)
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.prevFrameTarget?.setSize(width, height)
    this.feedbackTarget1?.setSize(width, height)
    this.feedbackTarget2?.setSize(width, height)
    this.freezeFrameTarget?.setSize(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<DatamoshParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.blockSize !== undefined) this.uniforms.get('blockSize')!.value = params.blockSize
    if (params.keyframeChance !== undefined) this.uniforms.get('keyframeChance')!.value = params.keyframeChance
    if (params.chaos !== undefined) this.uniforms.get('chaos')!.value = params.chaos
    if (params.feedback !== undefined) this.uniforms.get('feedback')!.value = params.feedback
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Reset freeze frame - call this to capture new reference
  resetFreezeFrame() {
    this.hasCapturedFreezeFrame = false
  }

  /**
   * Set trace mask texture for selective effect application.
   */
  setTraceMask(texture: THREE.Texture | null, invert: boolean = false) {
    this.uniforms.get('traceMask')!.value = texture
    this.uniforms.get('useTraceMask')!.value = texture !== null
    this.uniforms.get('invertTraceMask')!.value = invert
  }

  dispose() {
    super.dispose()
    this.prevFrameTarget?.dispose()
    this.feedbackTarget1?.dispose()
    this.feedbackTarget2?.dispose()
    this.freezeFrameTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
