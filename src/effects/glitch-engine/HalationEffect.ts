import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { HelperPass } from './HelperPass'

const BRIGHT_GLSL = COLOR_UTILS_GLSL + /* glsl */ `
uniform float threshold;

vec3 brightPassColor(vec3 c) {
  float lum = luminance(c);
  float mask = smoothstep(threshold - 0.12, threshold + 0.2, lum);
  return c * mask;
}
`

// Fast mode: the bright-pass at half resolution, read with linear filtering
const BRIGHT_SHADER = 'uniform sampler2D inputBuffer;\nuniform vec2 passSize;\n' + BRIGHT_GLSL + /* glsl */ `
void main() {
  gl_FragColor = vec4(brightPassColor(texture2D(inputBuffer, gl_FragCoord.xy / passSize).rgb), 1.0);
}
`

const fragmentShader = BRIGHT_GLSL + /* glsl */ `
uniform bool fastMode;
uniform sampler2D brightTexture;
uniform float radius;
uniform float redBias;
uniform float amount;
uniform vec2 resolution;
uniform float effectMix;

// Reference frame height the radius param is authored against, so the halo's
// physical size on screen stays consistent regardless of the actual render
// resolution (a 24px radius should look the same at 720p and 4K).
const float HALATION_REF_HEIGHT = 1080.0;

// Bright-pass: soft-thresholded highlight color. A wide-ish smoothstep band
// lets true highlights dominate while still pulling in a little energy from
// upper-midtones (skin, sky) so the halo has a visible base to bloom from,
// without ever touching shadows/midtones outright.
vec3 halationBrightPass(vec2 uv) {
  if (fastMode) return texture2D(brightTexture, clamp(uv, 0.0, 1.0)).rgb;
  return brightPassColor(texture2D(inputBuffer, clamp(uv, 0.0, 1.0)).rgb);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float aspect = resolution.x / max(resolution.y, 1.0);
  vec2 refScale = vec2(1.0 / aspect, 1.0) / HALATION_REF_HEIGHT;

  // Red channel blooms ~1.5x wider than green/blue at full redBias — this
  // warm fringe (rather than a symmetric colorless bloom) is what reads as
  // film halation instead of generic bloom.
  float baseRadius = radius;
  float redRadius = radius * mix(1.0, 1.5, redBias);

  vec3 glowRGB = vec3(0.0);
  float glowR = 0.0;
  float weightSum = 0.0;

  // 12-tap Vogel-disc (golden-angle spiral) sampling — fills a soft disc
  // rather than a hard ring, which reads as a diffuse glow.
  const int TAPS = 12;
  const float GOLDEN_ANGLE = 2.399963;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float t = sqrt((fi + 0.5) / float(TAPS));
    float theta = fi * GOLDEN_ANGLE;
    vec2 dir = vec2(cos(theta), sin(theta));

    vec2 offsetN = dir * t * baseRadius * refScale;
    vec2 offsetR = dir * t * redRadius * refScale;

    // Falloff weight so the center of the disc contributes more than the rim.
    float w = 1.0 - t * 0.5;

    vec3 sampleN = halationBrightPass(uv + offsetN);
    glowRGB += sampleN * w;
    // At redBias 0 the red taps are the same taps: reuse them
    glowR += (redBias == 0.0 ? sampleN.r : halationBrightPass(uv + offsetR).r) * w;
    weightSum += w;
  }

  glowRGB /= max(weightSum, 0.0001);
  glowR /= max(weightSum, 0.0001);

  vec3 glow = vec3(glowR, glowRGB.g, glowRGB.b);
  // Extra warm push on top of the wider red sampling so the halo edge reads
  // unmistakably red/orange rather than neutral white.
  glow.r *= 1.0 + redBias * 0.5;
  glow.gb *= 1.0 - redBias * 0.15;
  // Gain so the halo reads clearly at moderate amount values instead of
  // needing amount pinned near 1 to be visible.
  glow *= 2.4;

  // Screen-blend composite, scaled by amount, so the glow only ever adds
  // light (never darkens) and amount=0 is a true bypass.
  vec3 screened = 1.0 - (1.0 - inputColor.rgb) * (1.0 - clamp(glow * amount, 0.0, 1.0));

  vec4 effectColor = vec4(clamp(screened, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface HalationParams {
  threshold: number  // 0-1
  radius: number      // 4-64
  redBias: number     // 0-1
  amount: number       // 0-1
  mix: number
  fast?: number        // 1 = bright-pass at half resolution (cheaper, slightly softer)
}

export const DEFAULT_HALATION_PARAMS: HalationParams = {
  threshold: 0.75,
  radius: 24,
  redBias: 0.6,
  amount: 0.6,
  mix: 1,
}

export class HalationEffect extends Effect {
  constructor(params: Partial<HalationParams> = {}) {
    const p = { ...DEFAULT_HALATION_PARAMS, ...params }

    super('HalationEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['radius', new THREE.Uniform(p.radius)],
        ['redBias', new THREE.Uniform(p.redBias)],
        ['amount', new THREE.Uniform(p.amount)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['fastMode', new THREE.Uniform(!!p.fast)],
        ['brightTexture', new THREE.Uniform(null)],
      ]),
    })
  }

  // Fast mode's half-resolution bright-pass (allocated while fast, freed otherwise)
  private brightPass: HelperPass | null = null

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    if (!this.uniforms.get('fastMode')!.value) {
      this.releaseTargets()
      return
    }
    const w = Math.ceil(inputBuffer.width / 2)
    const h = Math.ceil(inputBuffer.height / 2)
    if (!this.brightPass) {
      this.brightPass = new HelperPass(BRIGHT_SHADER, {
        inputBuffer: { value: null },
        passSize: { value: new THREE.Vector2(w, h) },
        threshold: this.uniforms.get('threshold')!,
      }, w, h, THREE.HalfFloatType, THREE.LinearFilter)
      this.uniforms.get('brightTexture')!.value = this.brightPass.texture
    }
    this.brightPass.setSize(w, h)
    ;(this.brightPass.material.uniforms.passSize.value as THREE.Vector2).set(w, h)
    this.brightPass.material.uniforms.inputBuffer.value = inputBuffer.texture
    this.brightPass.render(renderer)
  }

  releaseTargets() {
    if (!this.brightPass) return
    this.brightPass.dispose()
    this.brightPass = null
    this.uniforms.get('brightTexture')!.value = null
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    res.set(width, height)
  }

  updateParams(params: Partial<HalationParams>) {
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.radius !== undefined) this.uniforms.get('radius')!.value = params.radius
    if (params.redBias !== undefined) this.uniforms.get('redBias')!.value = params.redBias
    if (params.amount !== undefined) this.uniforms.get('amount')!.value = params.amount
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
    if (params.fast !== undefined) this.uniforms.get('fastMode')!.value = params.fast >= 0.5
  }
}
