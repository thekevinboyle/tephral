import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D prevFrameTexture;
uniform float intensity;
uniform float blockSize;
uniform float keyframeChance;
uniform float time;
uniform vec2 resolution;
uniform bool hasPrevFrame;
uniform float effectMix;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hash function for block-based randomness
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Get block coordinates
vec2 getBlockCoord(vec2 uv, float size) {
  return floor(uv * resolution / size) * size / resolution;
}

// Calculate luminance
float luminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasPrevFrame || intensity <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec2 blockCoord = getBlockCoord(uv, blockSize);
  float blockHash = hash(blockCoord + floor(time * 2.0));
  float timeHash = hash(vec2(floor(time * 15.0), blockHash));

  // Random frame drops - entire screen flickers to prev frame
  if (random(vec2(floor(time * 20.0), 0.5)) < intensity * 0.15) {
    vec3 prev = texture2D(prevFrameTexture, uv).rgb;
    outputColor = vec4(prev, inputColor.a);
    return;
  }

  // Random block dropouts - blocks show corrupted data
  if (timeHash < intensity * 0.3) {
    // Severe block corruption
    vec2 corruptOffset = vec2(
      (random(blockCoord + time) - 0.5) * 0.3,
      (random(blockCoord - time) - 0.5) * 0.3
    );
    vec3 corrupt = texture2D(prevFrameTexture, uv + corruptOffset).rgb;

    // Color channel massacre
    float r = texture2D(prevFrameTexture, uv + corruptOffset + vec2(0.02, 0.0)).r;
    float g = corrupt.g;
    float b = texture2D(prevFrameTexture, uv + corruptOffset - vec2(0.02, 0.0)).b;

    outputColor = vec4(r, g, b, inputColor.a);
    return;
  }

  // Keyframe check - occasionally reset to current frame
  if (random(blockCoord + time * 0.1) < keyframeChance) {
    outputColor = inputColor;
    return;
  }

  // Sample current and previous frame
  vec3 current = inputColor.rgb;
  vec3 prev = texture2D(prevFrameTexture, uv).rgb;

  // Calculate luminance difference for motion-based corruption
  float lumDiff = abs(luminance(current) - luminance(prev));

  // CRANKED motion strength
  float motionStrength = lumDiff * intensity * 12.0;

  // Create chaotic motion vectors
  vec2 motionOffset = vec2(
    sin(blockHash * 6.28 + time * 5.0) * motionStrength,
    cos(blockHash * 6.28 + time * 4.0) * motionStrength
  );

  // Add extra chaos based on neighboring blocks
  vec2 neighborOffset = vec2(blockSize / resolution.x, blockSize / resolution.y);
  float neighborHash = hash(blockCoord + neighborOffset);
  motionOffset += vec2(
    cos(neighborHash * 6.28 + time * 3.0) * motionStrength,
    sin(neighborHash * 6.28 + time * 2.5) * motionStrength
  );

  // Random large jumps
  if (random(blockCoord + floor(time * 8.0)) < intensity * 0.2) {
    motionOffset += vec2(
      (random(blockCoord * time) - 0.5) * 0.4,
      (random(blockCoord / time) - 0.5) * 0.4
    );
  }

  // Sample previous frame with motion offset
  vec2 moshUV = uv + motionOffset * blockSize / resolution;
  moshUV = clamp(moshUV, 0.0, 1.0);

  vec3 moshColor = texture2D(prevFrameTexture, moshUV).rgb;

  // Block edge artifacts - MORE PRONOUNCED
  vec2 blockUV = fract(uv * resolution / blockSize);
  float edgeFactor = 1.0 - smoothstep(0.0, 0.15, min(min(blockUV.x, 1.0 - blockUV.x), min(blockUV.y, 1.0 - blockUV.y)));

  // EXTREME color channel separation
  vec2 channelOffset = motionOffset * intensity * 1.5;
  float r = texture2D(prevFrameTexture, moshUV + channelOffset * 1.5).r;
  float g = texture2D(prevFrameTexture, moshUV - channelOffset * 0.3).g;
  float b = texture2D(prevFrameTexture, moshUV - channelOffset * 1.2).b;

  vec3 separatedColor = vec3(r, g, b);

  // Mix based on motion and block edges
  float moshAmount = clamp(motionStrength + edgeFactor * intensity, 0.0, 1.0);

  // Blend mosh color with separated channels at edges
  vec3 corruptedColor = mix(moshColor, separatedColor, edgeFactor * intensity + 0.3);

  // Final blend - MORE CORRUPTION
  float blendFactor = clamp(lumDiff * intensity * 8.0 + intensity * 0.5, 0.0, 1.0);
  vec3 result = mix(current, corruptedColor, blendFactor);

  // Block discontinuity artifacts - MORE FREQUENT
  if (edgeFactor > 0.3 && blockHash > 0.5 * (1.0 - intensity)) {
    result = mix(result, prev, 0.7 * intensity);
  }

  // Random block inversions
  if (random(blockCoord + floor(time * 12.0)) < intensity * 0.08) {
    result = 1.0 - result;
  }

  // Horizontal line tears
  float linePos = fract(uv.y * 100.0 + time * 50.0);
  if (linePos < 0.02 && random(vec2(floor(uv.y * 100.0), time)) < intensity * 0.3) {
    result = texture2D(prevFrameTexture, uv + vec2(0.1, 0.0)).rgb;
  }

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface DatamoshParams {
  intensity: number      // 0-1: overall effect strength
  blockSize: number      // 4-32: size of corruption blocks
  keyframeChance: number // 0-0.1: chance to show current frame (simulates I-frames)
  mix: number           // 0-1: wet/dry mix
}

export const DEFAULT_DATAMOSH_PARAMS: DatamoshParams = {
  intensity: 0.5,
  blockSize: 16,
  keyframeChance: 0.02,
  mix: 1,
}

export class DatamoshEffect extends Effect {
  private prevFrameTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private time: number = 0

  constructor(params: Partial<DatamoshParams> = {}) {
    const p = { ...DEFAULT_DATAMOSH_PARAMS, ...params }

    super('DatamoshEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['prevFrameTexture', new THREE.Uniform(null)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['blockSize', new THREE.Uniform(p.blockSize)],
        ['keyframeChance', new THREE.Uniform(p.keyframeChance)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['hasPrevFrame', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.prevFrameTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.uniforms.get('resolution')!.value.set(size.x, size.y)

    // Setup copy material for capturing frames
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
    if (!this.prevFrameTarget) {
      return
    }

    // Update time for animation
    this.time += deltaTime || 0.016
    this.uniforms.get('time')!.value = this.time

    // Set previous frame texture
    this.uniforms.get('prevFrameTexture')!.value = this.prevFrameTarget.texture
    this.uniforms.get('hasPrevFrame')!.value = true
  }

  // Call this after the main render pass to capture the frame
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.prevFrameTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Copy current output to previous frame buffer
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.prevFrameTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.prevFrameTarget?.setSize(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<DatamoshParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.blockSize !== undefined) this.uniforms.get('blockSize')!.value = params.blockSize
    if (params.keyframeChance !== undefined) this.uniforms.get('keyframeChance')!.value = params.keyframeChance
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  dispose() {
    super.dispose()
    this.prevFrameTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
