import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'

// ═══════════════════════════════════════════════════════════════════════════
// STRAND TAR — GPU port of src/components/overlays/strand/tarSpreadEffect.ts
// (CPU ground truth, effect id 'strand_tar'). TEMPORAL: ping-pong half-float
// sim at a fixed resolution, independent of display size (ReactionDiffusion-
// Effect.ts pattern) — the sim advances once per update(), no captureFrame.
//
// CPU keeps a full-canvas-res Float32Array tar mask, updated once per rAF:
//  1. Border seed (once, at mask creation): the outermost 1px ring is set to
//     0.5 and NEVER touched by the spread loop (loop range is y=1..h-2,
//     x=1..w-2) — a permanent max-neighbor source that keeps diffusing
//     inward forever, independent of every param.
//  2. Dark-region reseed (every frame, every pixel): if the composite's
//     luminance at a pixel is below `threshold` AND that pixel's current
//     mask value is < 0.1, it's freshly seeded to `Math.random()*0.3`. This
//     reseed is NOT gated by `coverage` or `spreadSpeed` — it fires every
//     frame regardless of either param's value.
//  3. Spread (every frame, INTERIOR pixels only): `max` of the 4 DIRECT
//     neighbors (left/right/top/bottom only — no diagonals, despite the
//     task brief's "3x3 max filter" framing, which describes the net look
//     of many overlapping 4-neighbor steps, not the literal CPU code); if
//     current < coverage, ease current toward maxNeighbor at rate
//     `spreadSpeed*deltaTime*10`, clamped to coverage; otherwise unchanged.
//     The GPU port double-buffers (ping-pong), so neighbours are always read
//     from the PREVIOUS frame's state rather than the CPU's raster-order
//     in-place mutation — an accepted "same look, not pixel-identical"
//     deviation (avoids an inherent GPU parallel-write race).
//
// Display: any sim texel with mask > 0.05 draws near-black tar
// (`rgb(10-15,5-8,15-20)/255` with slight per-pixel grain, matching the
// CPU's `10+rand*5` etc.) at `alpha = mask*300/255`, everything else fully
// transparent. The CPU draws this onto a cleared overlay canvas layered over
// the video via normal DOM stacking (source-over) — NOT a shader "screen"
// blend against the bright composited video — so the port alpha-blends the
// tar color directly onto the sRGB-decoded input color.
//
// Zero-value semantics (verified against the CPU math above):
//  - spreadSpeed=0: freezes ONLY the neighbor-diffusion term — dark-region
//    reseeding keeps happening every frame regardless.
//  - coverage=0: freezes ALL growth beyond whatever a pixel's last reseed
//    left it at (seeded values already fail `current < coverage`), but the
//    border stays pinned at 0.5 regardless — the CPU's spread loop range
//    never includes border pixels, so coverage never gates them either.
//
// COLORSPACE WARNING compliance: the luminance seed sample and the display
// blend both go through linearToSRGB before use; the composited result goes
// through sRGBToLinear immediately before outputColor.
// ═══════════════════════════════════════════════════════════════════════════
const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D tarTexture;
uniform float effectMix;
uniform float time;
uniform bool hasSim;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasSim) {
    outputColor = inputColor;
    return;
  }

  float tar = texture2D(tarTexture, uv).r;
  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  if (tar > 0.05) {
    float grain = hash3(vec3(uv * 4096.0, time));
    vec3 tarColor = vec3(10.0 + grain * 5.0, 5.0 + grain * 3.0, 15.0 + grain * 5.0) / 255.0;
    float alpha = clamp(tar * 300.0 / 255.0, 0.0, 1.0);
    colorSRGB = mix(colorSRGB, tarColor, alpha);
  }

  vec3 result = sRGBToLinear(clamp(colorSRGB, 0.0, 1.0));
  outputColor = mix(inputColor, vec4(result, inputColor.a), effectMix);
}
`

// ─── Offscreen sim shaders — raw THREE.ShaderMaterial, same pattern as
// ReactionDiffusionEffect: never touch the postprocessing composer's
// input/output chain, only read/write their own ping-pong state plus the
// effect chain's current input buffer (upstream effects included). ────────
const SIM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// NOTE: this raw THREE.ShaderMaterial does NOT get COLOR_UTILS_GLSL — three's
// WebGLProgram injects its OWN builtin `luminance(vec3)` into every fragment
// shader's boilerplate (colorspace/tonemapping helpers), so redeclaring it
// here throws "function already has a body" / "already has same parameter
// qualifiers" compile errors. (postprocessing's Effect-composed shaders,
// e.g. this file's own `fragmentShader` above, don't hit this — only raw
// ShaderMaterial does; ReactionDiffusionEffect's sim shader sidesteps the
// same trap by never importing COLOR_UTILS_GLSL either.) Locally-scoped,
// uniquely-named equivalents below avoid the collision.
const SIM_FRAGMENT_SHADER = NOISE_GLSL + /* glsl */ `
uniform sampler2D simTexture;
uniform sampler2D videoTexture;
uniform float threshold;
uniform float spreadSpeed;
uniform float coverage;
uniform float deltaTime;
uniform float time;
uniform vec2 texel;
varying vec2 vUv;

vec3 tarLinearToSRGB(vec3 c) {
  return pow(max(c, 0.0), vec3(1.0 / 2.2));
}

float tarLuminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;

  // Border pin: the CPU's outermost 1px ring is seeded to 0.5 once and
  // never touched by its spread loop — a permanent diffusion source,
  // independent of every param.
  if (uv.x < texel.x || uv.x > 1.0 - texel.x || uv.y < texel.y || uv.y > 1.0 - texel.y) {
    gl_FragColor = vec4(0.5, 0.0, 0.0, 1.0);
    return;
  }

  float current = texture2D(simTexture, uv).r;

  // Dark-region reseed — independent of coverage/spreadSpeed, matching CPU.
  float lum = tarLuminance(tarLinearToSRGB(clamp(texture2D(videoTexture, uv).rgb, 0.0, 1.0)));
  float seeded = current;
  if (lum < threshold && current < 0.1) {
    seeded = hash3(vec3(uv * 4096.0, time)) * 0.3;
  }

  // 4-neighbor max spread (left/right/top/bottom only, matching CPU).
  // Neighbours are read from the previous frame's state (double-buffered),
  // not this frame's freshly-seeded value.
  float nL = texture2D(simTexture, uv - vec2(texel.x, 0.0)).r;
  float nR = texture2D(simTexture, uv + vec2(texel.x, 0.0)).r;
  float nU = texture2D(simTexture, uv + vec2(0.0, texel.y)).r;
  float nD = texture2D(simTexture, uv - vec2(0.0, texel.y)).r;
  float maxNeighbor = max(max(nL, nR), max(nU, nD));

  float spread = spreadSpeed * deltaTime * 10.0;
  float result = seeded;
  if (seeded < coverage) {
    result = min(coverage, seeded + (maxNeighbor - seeded) * spread);
  }

  gl_FragColor = vec4(result, 0.0, 0.0, 1.0);
}
`

// Seeds the border ring to 0.5 (permanent diffusion source) and the
// interior to 0 — matches the CPU's initial Float32Array state (zeroed,
// then border set to 0.5) more precisely than a solid renderer.clear()
// could, since border and interior need different values.
const INIT_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 texel;
varying vec2 vUv;
void main() {
  bool border = vUv.x < texel.x || vUv.x > 1.0 - texel.x || vUv.y < texel.y || vUv.y > 1.0 - texel.y;
  gl_FragColor = vec4(border ? 0.5 : 0.0, 0.0, 0.0, 1.0);
}
`

export interface StrandTarParams {
  spreadSpeed: number
  threshold: number
  coverage: number
  mix: number
}

export const DEFAULT_STRAND_TAR_PARAMS: StrandTarParams = {
  spreadSpeed: 0.5,
  threshold: 0.3,
  coverage: 0.5,
  mix: 1,
}

export class StrandTarEffect extends Effect {
  // Sim runs at a FIXED resolution independent of the display/canvas size,
  // same rationale as ReactionDiffusionEffect — pattern scale and perf stay
  // constant regardless of output resolution.
  private static readonly SIM_WIDTH = 480
  private static readonly SIM_HEIGHT = 270

  private simTargetA: THREE.WebGLRenderTarget | null = null
  private simTargetB: THREE.WebGLRenderTarget | null = null
  private readTarget: THREE.WebGLRenderTarget | null = null
  private writeTarget: THREE.WebGLRenderTarget | null = null
  private simMaterial: THREE.ShaderMaterial | null = null
  private simGeometry: THREE.PlaneGeometry | null = null
  private simScene: THREE.Scene | null = null
  private simCamera: THREE.OrthographicCamera | null = null

  // Pending sim params — kept on the instance so updateParams() calls that
  // land before initialize() creates the material (store hydration /
  // paramSync run order) still seed the material correctly once it exists.
  private spreadSpeed: number
  private threshold: number
  private coverage: number

  constructor(params: Partial<StrandTarParams> = {}) {
    const p = { ...DEFAULT_STRAND_TAR_PARAMS, ...params }

    super('StrandTarEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['tarTexture', new THREE.Uniform(null)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['time', new THREE.Uniform(0)],
        ['hasSim', new THREE.Uniform(false)],
      ]),
    })

    this.spreadSpeed = p.spreadSpeed
    this.threshold = p.threshold
    this.coverage = p.coverage
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.simTargetA) return

    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    }

    this.simTargetA = new THREE.WebGLRenderTarget(
      StrandTarEffect.SIM_WIDTH, StrandTarEffect.SIM_HEIGHT, options
    )
    this.simTargetB = new THREE.WebGLRenderTarget(
      StrandTarEffect.SIM_WIDTH, StrandTarEffect.SIM_HEIGHT, options
    )

    const texel = new THREE.Vector2(1 / StrandTarEffect.SIM_WIDTH, 1 / StrandTarEffect.SIM_HEIGHT)

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        simTexture: { value: null },
        videoTexture: { value: null },
        threshold: { value: this.threshold },
        spreadSpeed: { value: this.spreadSpeed },
        coverage: { value: this.coverage },
        deltaTime: { value: 0.016 },
        time: { value: 0 },
        texel: { value: texel },
      },
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: SIM_FRAGMENT_SHADER,
    })

    this.simGeometry = new THREE.PlaneGeometry(2, 2)
    this.simScene = new THREE.Scene()
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.simScene.add(new THREE.Mesh(this.simGeometry, this.simMaterial))

    // Seed both ping-pong targets with the CPU's initial state (border ring
    // = 0.5, interior = 0) via a tiny init pass rather than renderer.clear(),
    // since border and interior need different values.
    const initMaterial = new THREE.ShaderMaterial({
      uniforms: { texel: { value: texel } },
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: INIT_FRAGMENT_SHADER,
    })
    const initScene = new THREE.Scene()
    initScene.add(new THREE.Mesh(this.simGeometry, initMaterial))

    const prevTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.simTargetA)
    renderer.render(initScene, this.simCamera)
    renderer.setRenderTarget(this.simTargetB)
    renderer.render(initScene, this.simCamera)
    renderer.setRenderTarget(prevTarget)
    initMaterial.dispose()

    this.readTarget = this.simTargetA
    this.writeTarget = this.simTargetB
  }

  // Advances the tar-spread sim ONE step this frame, scaled by the real
  // deltaTime — matching the CPU, which also advances its CA once per rAF
  // (not a fixed-step-count loop like Gray-Scott's `speed` param).
  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.simMaterial || !this.simScene || !this.simCamera || !this.readTarget || !this.writeTarget) return

    const t = performance.now() / 1000
    this.simMaterial.uniforms.videoTexture.value = inputBuffer.texture
    this.simMaterial.uniforms.deltaTime.value = deltaTime ?? 0.016
    this.simMaterial.uniforms.time.value = t
    this.simMaterial.uniforms.simTexture.value = this.readTarget.texture

    const prevTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.writeTarget)
    renderer.render(this.simScene, this.simCamera)
    renderer.setRenderTarget(prevTarget)

    const tmp = this.readTarget
    this.readTarget = this.writeTarget
    this.writeTarget = tmp

    this.uniforms.get('tarTexture')!.value = this.readTarget.texture
    this.uniforms.get('time')!.value = t
    this.uniforms.get('hasSim')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    // Intentionally otherwise a no-op: the sim runs at a fixed
    // SIM_WIDTH x SIM_HEIGHT independent of display/canvas size.
  }

  updateParams(params: Partial<StrandTarParams>) {
    if (params.spreadSpeed !== undefined) {
      this.spreadSpeed = params.spreadSpeed
      if (this.simMaterial) this.simMaterial.uniforms.spreadSpeed.value = params.spreadSpeed
    }
    if (params.threshold !== undefined) {
      this.threshold = params.threshold
      if (this.simMaterial) this.simMaterial.uniforms.threshold.value = params.threshold
    }
    if (params.coverage !== undefined) {
      this.coverage = params.coverage
      if (this.simMaterial) this.simMaterial.uniforms.coverage.value = params.coverage
    }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, material, and geometry. Matches ReactionDiffusion-
  // Effect's true-inverse releaseTargets() contract.
  releaseTargets() {
    this.simTargetA?.dispose(); this.simTargetA = null
    this.simTargetB?.dispose(); this.simTargetB = null
    this.readTarget = null
    this.writeTarget = null
    this.simMaterial?.dispose(); this.simMaterial = null
    this.simGeometry?.dispose(); this.simGeometry = null
    this.simScene = null
    this.simCamera = null
    this.uniforms.get('tarTexture')!.value = null
    this.uniforms.get('hasSim')!.value = false
  }

  dispose() {
    super.dispose()
    this.simTargetA?.dispose()
    this.simTargetB?.dispose()
    this.simMaterial?.dispose()
    this.simGeometry?.dispose()
  }
}
