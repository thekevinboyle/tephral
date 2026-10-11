import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { HelperPass } from './HelperPass'

const BRIGHT_GLSL = COLOR_UTILS_GLSL + /* glsl */ `
uniform float threshold;

vec3 brightPassColor(vec3 c) {
  float lum = luminance(c);
  float mask = smoothstep(threshold, threshold + 0.15, lum);
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
uniform float streak;
uniform float tint;
uniform float squeeze;
uniform vec2 resolution;
uniform float effectMix;

vec3 anamorphicBrightPass(vec2 uv) {
  if (fastMode) return texture2D(brightTexture, clamp(uv, 0.0, 1.0)).rgb;
  return brightPassColor(texture2D(inputBuffer, clamp(uv, 0.0, 1.0)).rgb);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Lens-squeeze: scale UV.x about center BEFORE all sampling below, so the
  // streak-gathering itself happens in "squeezed" space — this is what
  // makes the streaks read as anamorphic-lens artifacts rather than a
  // plain horizontal blur.
  vec2 suv = uv;
  suv.x = 0.5 + (uv.x - 0.5) * (1.0 - squeeze);

  vec2 texel = 1.0 / resolution;
  // stride in texels per tap, per the brief: streak * 48 / 16
  float stride = streak * 3.0;

  const int TAPS = 16;
  vec3 streakSum = anamorphicBrightPass(suv);
  float weightSum = 1.0;

  for (int i = 1; i <= TAPS; i++) {
    float fi = float(i);
    // Fast: every other tap of the half-resolution bright-pass, weighted for two
    if (fastMode && mod(fi, 2.0) > 0.5) continue;
    float w = (1.0 - fi / float(TAPS + 1)) * (fastMode ? 2.0 : 1.0);
    vec2 offset = vec2(fi * stride * texel.x, 0.0);
    streakSum += anamorphicBrightPass(suv + offset) * w;
    streakSum += anamorphicBrightPass(suv - offset) * w;
    weightSum += 2.0 * w;
  }
  streakSum /= max(weightSum, 0.0001);

  // Blue-biased tint — a true anamorphic streak carries a cool cyan/blue
  // cast rather than staying neutral white.
  vec3 tintColor = mix(vec3(1.0), vec3(0.35, 0.55, 1.0), tint);
  vec3 glow = streakSum * tintColor * streak * 3.0;

  // Additive composite — streaks only ever add light.
  vec3 result = inputColor.rgb + glow;

  vec4 effectColor = vec4(clamp(result, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface AnamorphicParams {
  threshold: number  // 0-1
  streak: number       // 0-1
  tint: number          // 0-1
  squeeze: number        // 0-0.3
  mix: number
  fast?: number          // 1 = bright-pass at half resolution (cheaper, slightly softer)
}

export const DEFAULT_ANAMORPHIC_PARAMS: AnamorphicParams = {
  threshold: 0.8,
  streak: 0.7,
  tint: 0.7,
  squeeze: 0.1,
  mix: 1,
}

export class AnamorphicEffect extends Effect {
  constructor(params: Partial<AnamorphicParams> = {}) {
    const p = { ...DEFAULT_ANAMORPHIC_PARAMS, ...params }

    super('AnamorphicEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['streak', new THREE.Uniform(p.streak)],
        ['tint', new THREE.Uniform(p.tint)],
        ['squeeze', new THREE.Uniform(p.squeeze)],
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

  updateParams(params: Partial<AnamorphicParams>) {
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.streak !== undefined) this.uniforms.get('streak')!.value = params.streak
    if (params.tint !== undefined) this.uniforms.get('tint')!.value = params.tint
    if (params.squeeze !== undefined) this.uniforms.get('squeeze')!.value = params.squeeze
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
    if (params.fast !== undefined) this.uniforms.get('fastMode')!.value = params.fast >= 0.5
  }
}
