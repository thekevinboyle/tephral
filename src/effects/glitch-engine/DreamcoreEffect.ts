import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL, NOISE_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + NOISE_GLSL + /* glsl */ `
uniform float bloom;
uniform float radius;
uniform float pastel;
uniform float haze;
uniform float drift;
uniform vec2 resolution;
uniform float time;
uniform float effectMix;

// Reference frame height the radius param is authored against, so the
// bloom's physical size on screen stays consistent regardless of the
// actual render resolution.
const float DREAMCORE_REF_HEIGHT = 1080.0;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float aspect = resolution.x / max(resolution.y, 1.0);
  vec2 refScale = vec2(1.0 / aspect, 1.0) / DREAMCORE_REF_HEIGHT;

  // 13-tap Vogel-disc (golden-angle spiral) blur of the FULL frame — this is
  // the "duplicate + defocus" half of a classic Orton effect, not a
  // bright-pass bloom, so midtones glow too, not just highlights.
  const int TAPS = 13;
  const float GOLDEN_ANGLE = 2.399963;
  vec3 blurSum = vec3(0.0);
  float weightSum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float t = sqrt((fi + 0.5) / float(TAPS));
    float theta = fi * GOLDEN_ANGLE;
    vec2 dir = vec2(cos(theta), sin(theta));
    vec2 offset = dir * t * radius * refScale;
    // Falloff weight so the center of the disc contributes more than the rim.
    float w = 1.0 - t * 0.5;
    blurSum += texture2D(inputBuffer, clamp(uv + offset, 0.0, 1.0)).rgb * w;
    weightSum += w;
  }
  vec3 blurred = blurSum / max(weightSum, 0.0001);

  // Orton bloom: screen-blend the blurred duplicate over the sharp
  // original, scaled by bloom. Screen blending only ever adds light, so
  // crisp original detail survives underneath — this reads as a glow, not
  // a defocused blur.
  vec3 screened = blendScreen(inputColor.rgb, blurred);
  vec3 bloomed = mix(inputColor.rgb, screened, bloom);

  // Pastel grade: a single lift+compress mix squeezes the range toward
  // [0.15, 0.85] (raises shadows and pulls down highlights in one move),
  // then partially desaturates toward a lavender-biased gray so colors go
  // milky without erasing all hue information.
  vec3 lifted = mix(bloomed, bloomed * 0.7 + 0.15, pastel);
  vec3 gray = vec3(luminance(lifted));
  vec3 lavenderGray = gray * vec3(1.08, 0.98, 1.18);
  vec3 pastelColor = mix(lifted, lavenderGray, pastel * 0.5);

  // Haze: slow-drifting low-frequency fbm, screened on as a soft uneven
  // white veil. Capped well below full white so defaults stay hazy rather
  // than blown out.
  float hazeNoise = fbm(uv * 2.0 + vec2(time * drift * 0.05, time * drift * 0.03));
  vec3 hazed = mix(pastelColor, vec3(1.0), clamp(haze * hazeNoise * 0.5, 0.0, 0.85));

  vec4 effectColor = vec4(clamp(hazed, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface DreamcoreParams {
  bloom: number   // 0-1
  radius: number  // 4-64
  pastel: number  // 0-1
  haze: number    // 0-1
  drift: number   // 0-2
  mix: number
}

export const DEFAULT_DREAMCORE_PARAMS: DreamcoreParams = {
  bloom: 0.6,
  radius: 32,
  pastel: 0.5,
  haze: 0.3,
  drift: 0.5,
  mix: 1,
}

export class DreamcoreEffect extends Effect {
  constructor(params: Partial<DreamcoreParams> = {}) {
    const p = { ...DEFAULT_DREAMCORE_PARAMS, ...params }

    super('DreamcoreEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['bloom', new THREE.Uniform(p.bloom)],
        ['radius', new THREE.Uniform(p.radius)],
        ['pastel', new THREE.Uniform(p.pastel)],
        ['haze', new THREE.Uniform(p.haze)],
        ['drift', new THREE.Uniform(p.drift)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['time', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    res.set(width, height)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<DreamcoreParams>) {
    if (params.bloom !== undefined) this.uniforms.get('bloom')!.value = params.bloom
    if (params.radius !== undefined) this.uniforms.get('radius')!.value = params.radius
    if (params.pastel !== undefined) this.uniforms.get('pastel')!.value = params.pastel
    if (params.haze !== undefined) this.uniforms.get('haze')!.value = params.haze
    if (params.drift !== undefined) this.uniforms.get('drift')!.value = params.drift
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
