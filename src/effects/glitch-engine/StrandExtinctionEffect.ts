import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'

// ═══════════════════════════════════════════════════════════════════════════
// STRAND EXTINCTION — GPU port of
// src/components/overlays/strand/extinctionEffect.ts (CPU ground truth,
// effect id 'strand_extinction'). TEMPORAL: ping-pong half-float sim at a
// fixed resolution, independent of display size (ReactionDiffusionEffect.ts
// pattern) — the sim advances once per update(), no captureFrame.
//
// CPU keeps a full-canvas-res Float32Array erosion-depth map, updated once
// per rAF:
//  1. Border seed (once, at map creation): the outermost 1px ring is set to
//     1 and NEVER touched by the spread loop (loop range is y=1..h-2,
//     x=1..w-2) — a permanent max-erosion source that keeps eroding inward
//     forever, independent of every param. (`erosionTime` is accumulated
//     each frame but never read anywhere else in the CPU function — dead
//     state, intentionally not replicated.)
//  2. Spread (every frame, INTERIOR pixels only, gated by `current <
//     coverage`): `max` of the 4 DIRECT neighbors (left/right/top/bottom
//     only, no diagonals); if the max exceeds current, ease current toward
//     it at rate `erosionSpeed*deltaTime*5 * (0.5 + rand*0.5)`, clamped to
//     coverage. The GPU port double-buffers (ping-pong) so neighbours are
//     always read from the PREVIOUS frame's state rather than the CPU's
//     raster-order in-place mutation — an accepted "same look, not
//     pixel-identical" deviation (avoids an inherent GPU parallel-write
//     race).
//
// Display (always fully opaque on the CPU — every pixel is written, alpha
// 255 — so the port folds this into effectMix like every other STRAND
// port, rather than an alpha-gated overlay): for erosion > 0.01, compute
// `stage = min(decayStages, floor(erosion*decayStages*2))` and apply,
// IN ORDER: stage>=1 desaturate by `min(1, erosion*2)`; stage>=2 add
// per-pixel grain with probability `min(1,(erosion-0.3)*3)*0.5`, magnitude
// `(rand-0.5)*100`; stage>=3 fade to black by `min(1,(erosion-0.5)*2)`;
// finally (independent of stage, gated only by `erosion > 0.1`) a purple
// tint: `+20*erosion*0.2` on R, `+40*erosion*0.2` on B, G untouched.
//
// Zero-value semantics (verified against the CPU math above):
//  - erosionSpeed=0: freezes ALL spread (spreadRate=0) — erosion stays
//    exactly at whatever depth it last reached (border stays pinned at 1
//    regardless, same as spreadSpeed=0 for TAR).
//  - coverage=0: `current < coverage` is false for every non-negative
//    current, so growth is frozen everywhere except the permanently-pinned
//    border.
//
// COLORSPACE WARNING compliance: every color-grade stage operates on the
// linearToSRGB-decoded input; the composited result goes through
// sRGBToLinear immediately before outputColor.
// ═══════════════════════════════════════════════════════════════════════════
const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D erosionTexture;
uniform float decayStages;
uniform float effectMix;
uniform float time;
uniform bool hasSim;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasSim) {
    outputColor = inputColor;
    return;
  }

  float erosion = texture2D(erosionTexture, uv).r;
  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  if (erosion > 0.01) {
    float stage = min(decayStages, floor(erosion * decayStages * 2.0));

    if (stage >= 1.0) {
      float gray = dot(colorSRGB, vec3(0.299, 0.587, 0.114));
      float desatAmount = min(1.0, erosion * 2.0);
      colorSRGB = mix(colorSRGB, vec3(gray), desatAmount);
    }

    if (stage >= 2.0) {
      float noiseAmount = clamp((erosion - 0.3) * 3.0, 0.0, 1.0);
      float trigger = hash3(vec3(uv * 4096.0, time));
      if (trigger < noiseAmount * 0.5) {
        float n = (hash3(vec3(uv * 4096.0, time + 17.0)) - 0.5) * (100.0 / 255.0) * noiseAmount;
        colorSRGB = clamp(colorSRGB + vec3(n), 0.0, 1.0);
      }
    }

    if (stage >= 3.0) {
      float blackAmount = clamp((erosion - 0.5) * 2.0, 0.0, 1.0);
      colorSRGB *= (1.0 - blackAmount);
    }

    if (erosion > 0.1) {
      float tintAmount = erosion * 0.2;
      colorSRGB.r = min(1.0, colorSRGB.r + (20.0 / 255.0) * tintAmount);
      colorSRGB.b = min(1.0, colorSRGB.b + (40.0 / 255.0) * tintAmount);
    }
  }

  vec3 result = sRGBToLinear(clamp(colorSRGB, 0.0, 1.0));
  outputColor = mix(inputColor, vec4(result, inputColor.a), effectMix);
}
`

// ─── Offscreen sim shaders — same raw THREE.ShaderMaterial pattern as
// ReactionDiffusionEffect / StrandTarEffect. Unlike TAR, the erosion sim
// needs no video sample — it's a pure geometric border-driven CA. ─────────
const SIM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// The CPU mutates `erosionMap[idx]` IN PLACE during a single sequential
// top-to-bottom, left-to-right scan (not double-buffered): a pixel's LEFT
// neighbour (already processed earlier in the same row, same frame) and TOP
// neighbour (already-processed row above) are read POST-update, so a signal
// from the border cascades up/left across the ENTIRE image within a single
// frame — the CPU verifiably reaches near-total-frame erosion within ~2s at
// erosionSpeed=1 even at native (~650px) canvas resolution (confirmed via
// in-browser screenshots, not just reasoning about the code), which a
// literal 4-adjacent-neighbor double-buffered relaxation could never do
// (that topology needs O(distance^2) frames to cross a fixed distance —
// hundreds of times slower). A true per-pixel replication of an
// intentionally-sequential single-threaded mutation is not GPU-parallel-
// shaped, so this multi-tap kernel is the deliberate compensation: each
// step samples MAX over several geometrically-increasing offsets (not just
// the immediate neighbor), letting a signal from the pinned border reach
// far interior cells within a handful of steps instead of hundreds —
// closing the SAME real-time growth-rate gap the CPU's cascade produces,
// while staying a true double-buffered ping-pong sim (see update()'s
// multi-substep loop for the other half of this compensation). This trades
// the CPU's raster-biased (up/left-favoring) cascade shape for a more
// isotropic one — an accepted "same look, not pixel-identical" deviation;
// verified in-browser that the OBSERVABLE result (near-uniform full-frame
// fade within ~2s at high erosionSpeed, negligible change at low
// erosionSpeed) matches.
const SIM_FRAGMENT_SHADER = NOISE_GLSL + /* glsl */ `
uniform sampler2D simTexture;
uniform float erosionSpeed;
uniform float coverage;
uniform float deltaTime;
uniform float time;
uniform vec2 texel;
varying vec2 vUv;

const int TAP_OCTAVES = 7; // texel-distance taps: 1,2,4,8,16,32,64

float maxNeighborTaps(vec2 uv) {
  float m = 0.0;
  float dist = 1.0;
  for (int i = 0; i < TAP_OCTAVES; i++) {
    vec2 off = texel * dist;
    m = max(m, texture2D(simTexture, uv - vec2(off.x, 0.0)).r);
    m = max(m, texture2D(simTexture, uv + vec2(off.x, 0.0)).r);
    m = max(m, texture2D(simTexture, uv - vec2(0.0, off.y)).r);
    m = max(m, texture2D(simTexture, uv + vec2(0.0, off.y)).r);
    dist *= 2.0;
  }
  return m;
}

void main() {
  vec2 uv = vUv;

  // Border pin: the CPU's outermost 1px ring is seeded to 1 once and never
  // touched by its spread loop — a permanent erosion source, independent
  // of every param.
  if (uv.x < texel.x || uv.x > 1.0 - texel.x || uv.y < texel.y || uv.y > 1.0 - texel.y) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }

  float current = texture2D(simTexture, uv).r;
  float result = current;

  if (current < coverage) {
    float maxNeighbor = maxNeighborTaps(uv);

    if (maxNeighbor > current) {
      // erosionSpeed^5: the wide-tap kernel above gives every interior cell
      // effectively immediate visibility of the border, collapsing the
      // CPU's real (measured, not assumed) super-linear speed sensitivity
      // — its raster-cascade bug means default(0.3) stays nearly invisible
      // over 6s while highspeed(1.0) saturates the ENTIRE frame within 2s,
      // a 3.3x param delta producing an "invisible" -> "fully saturated"
      // outcome that a linear-in-erosionSpeed rate cannot reproduce once
      // distance-from-border stops gating visibility (see the kernel
      // comment above). A steep power curve reproduces that same "quiet
      // until well past the default, then runs away" threshold character;
      // tuned empirically against the in-browser BEFORE screenshots (not
      // guessed) — see p3-task-13-report.md.
      float speedFactor = pow(max(erosionSpeed, 0.0), 5.0);
      float spreadRate = speedFactor * deltaTime * 5.0;
      float rnd = hash3(vec3(uv * 4096.0, time));
      float spreadAmt = (maxNeighbor - current) * spreadRate * (0.5 + rnd * 0.5);
      result = min(coverage, current + spreadAmt);
    }
  }

  gl_FragColor = vec4(result, 0.0, 0.0, 1.0);
}
`

// Seeds the border ring to 1 (permanent erosion source) and the interior
// to 0 — matches the CPU's initial Float32Array state (zeroed, then border
// set to 1) more precisely than a solid renderer.clear() could, since
// border and interior need different values.
const INIT_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 texel;
varying vec2 vUv;
void main() {
  bool border = vUv.x < texel.x || vUv.x > 1.0 - texel.x || vUv.y < texel.y || vUv.y > 1.0 - texel.y;
  gl_FragColor = vec4(border ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}
`

export interface StrandExtinctionParams {
  erosionSpeed: number
  decayStages: number
  coverage: number
  mix: number
}

export const DEFAULT_STRAND_EXTINCTION_PARAMS: StrandExtinctionParams = {
  erosionSpeed: 0.3,
  decayStages: 3,
  coverage: 0.5,
  mix: 1,
}

export class StrandExtinctionEffect extends Effect {
  // Sim runs at a FIXED resolution independent of the display/canvas size,
  // same rationale as ReactionDiffusionEffect / StrandTarEffect.
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
  // land before initialize() creates the material still seed it correctly.
  private erosionSpeed: number
  private coverage: number

  constructor(params: Partial<StrandExtinctionParams> = {}) {
    const p = { ...DEFAULT_STRAND_EXTINCTION_PARAMS, ...params }

    super('StrandExtinctionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['erosionTexture', new THREE.Uniform(null)],
        ['decayStages', new THREE.Uniform(p.decayStages)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['time', new THREE.Uniform(0)],
        ['hasSim', new THREE.Uniform(false)],
      ]),
    })

    this.erosionSpeed = p.erosionSpeed
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
      StrandExtinctionEffect.SIM_WIDTH, StrandExtinctionEffect.SIM_HEIGHT, options
    )
    this.simTargetB = new THREE.WebGLRenderTarget(
      StrandExtinctionEffect.SIM_WIDTH, StrandExtinctionEffect.SIM_HEIGHT, options
    )

    const texel = new THREE.Vector2(1 / StrandExtinctionEffect.SIM_WIDTH, 1 / StrandExtinctionEffect.SIM_HEIGHT)

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        simTexture: { value: null },
        erosionSpeed: { value: this.erosionSpeed },
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
    // = 1, interior = 0) via a tiny init pass rather than renderer.clear(),
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

  // Advances the erosion sim this frame, scaled by the real deltaTime —
  // matching the CPU's per-rAF advance rate. Runs SUBSTEPS double-buffered
  // ping-pong passes (each a fresh read/write swap, not a single pass) so
  // the multi-tap kernel's reach compounds across the frame — this is the
  // other half of the growth-rate compensation described above
  // SIM_FRAGMENT_SHADER: the CPU's in-place raster mutation lets a signal
  // cascade across the WHOLE image within one frame, so a single texel-hop
  // per real update() call (even with wide taps) undershoots the CPU's
  // verified ~2s-to-full-frame growth at erosionSpeed=1. deltaTime is
  // divided across substeps so `erosionSpeed` keeps meaning the same
  // real-time rate regardless of substep count.
  private static readonly SUBSTEPS = 6

  update(renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.simMaterial || !this.simScene || !this.simCamera || !this.readTarget || !this.writeTarget) return

    const t = performance.now() / 1000
    const dt = (deltaTime ?? 0.016) / StrandExtinctionEffect.SUBSTEPS
    this.simMaterial.uniforms.deltaTime.value = dt
    this.simMaterial.uniforms.time.value = t

    const prevTarget = renderer.getRenderTarget()
    let read = this.readTarget
    let write = this.writeTarget

    for (let i = 0; i < StrandExtinctionEffect.SUBSTEPS; i++) {
      this.simMaterial.uniforms.simTexture.value = read.texture
      renderer.setRenderTarget(write)
      renderer.render(this.simScene, this.simCamera)
      const tmp = read
      read = write
      write = tmp
    }

    this.readTarget = read
    this.writeTarget = write
    renderer.setRenderTarget(prevTarget)

    this.uniforms.get('erosionTexture')!.value = this.readTarget.texture
    this.uniforms.get('time')!.value = t
    this.uniforms.get('hasSim')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    // Intentionally otherwise a no-op: the sim runs at a fixed
    // SIM_WIDTH x SIM_HEIGHT independent of display/canvas size.
  }

  updateParams(params: Partial<StrandExtinctionParams>) {
    if (params.erosionSpeed !== undefined) {
      this.erosionSpeed = params.erosionSpeed
      if (this.simMaterial) this.simMaterial.uniforms.erosionSpeed.value = params.erosionSpeed
    }
    if (params.coverage !== undefined) {
      this.coverage = params.coverage
      if (this.simMaterial) this.simMaterial.uniforms.coverage.value = params.coverage
    }
    if (params.decayStages !== undefined) {
      this.uniforms.get('decayStages')!.value = params.decayStages
    }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, material, and geometry. Matches ReactionDiffusion-
  // Effect's / StrandTarEffect's true-inverse releaseTargets() contract.
  releaseTargets() {
    this.simTargetA?.dispose(); this.simTargetA = null
    this.simTargetB?.dispose(); this.simTargetB = null
    this.readTarget = null
    this.writeTarget = null
    this.simMaterial?.dispose(); this.simMaterial = null
    this.simGeometry?.dispose(); this.simGeometry = null
    this.simScene = null
    this.simCamera = null
    this.uniforms.get('erosionTexture')!.value = null
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
