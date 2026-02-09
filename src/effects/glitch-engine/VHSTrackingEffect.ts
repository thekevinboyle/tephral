import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float tearIntensity;
uniform float tearSpeed;
uniform float headSwitchNoise;
uniform float colorBleed;
uniform float jitter;
uniform float time;
uniform float effectMix;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 coord = uv;

  // Frame jitter
  float frameJitter = (random(vec2(floor(time * 30.0), 0.0)) - 0.5) * jitter * 0.01;
  coord.y += frameJitter;

  // Horizontal tear lines
  float tearLine = noise(vec2(uv.y * 50.0, time * tearSpeed * 10.0));
  float tearMask = step(0.98 - tearIntensity * 0.1, tearLine);
  coord.x += tearMask * (random(vec2(uv.y, time)) - 0.5) * tearIntensity * 0.1;

  // Color bleed (horizontal smear)
  float bleedOffset = colorBleed * 0.01;
  float r = texture2D(inputBuffer, coord + vec2(bleedOffset, 0.0)).r;
  float g = texture2D(inputBuffer, coord).g;
  float b = texture2D(inputBuffer, coord - vec2(bleedOffset, 0.0)).b;

  vec3 color = vec3(r, g, b);

  // Head switch noise at bottom
  float headSwitch = smoothstep(0.0, 0.08, uv.y);
  float headNoise = random(vec2(uv.x * 100.0, time * 60.0));
  color = mix(vec3(headNoise), color, mix(headSwitch, 1.0, 1.0 - headSwitchNoise));

  vec4 effectColor = vec4(color, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface VHSTrackingParams {
  tearIntensity: number    // 0-1
  tearSpeed: number        // 0.1-5
  headSwitchNoise: number  // 0-1
  colorBleed: number       // 0-1
  jitter: number           // 0-1
  mix: number              // 0-1
}

export const DEFAULT_VHS_TRACKING_PARAMS: VHSTrackingParams = {
  tearIntensity: 0.3,
  tearSpeed: 1.0,
  headSwitchNoise: 0.5,
  colorBleed: 0.2,
  jitter: 0.1,
  mix: 1,
}

export class VHSTrackingEffect extends Effect {
  constructor(params: Partial<VHSTrackingParams> = {}) {
    const p = { ...DEFAULT_VHS_TRACKING_PARAMS, ...params }

    super('VHSTrackingEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['tearIntensity', new THREE.Uniform(p.tearIntensity)],
        ['tearSpeed', new THREE.Uniform(p.tearSpeed)],
        ['headSwitchNoise', new THREE.Uniform(p.headSwitchNoise)],
        ['colorBleed', new THREE.Uniform(p.colorBleed)],
        ['jitter', new THREE.Uniform(p.jitter)],
        ['time', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<VHSTrackingParams>) {
    if (params.tearIntensity !== undefined) this.uniforms.get('tearIntensity')!.value = params.tearIntensity
    if (params.tearSpeed !== undefined) this.uniforms.get('tearSpeed')!.value = params.tearSpeed
    if (params.headSwitchNoise !== undefined) this.uniforms.get('headSwitchNoise')!.value = params.headSwitchNoise
    if (params.colorBleed !== undefined) this.uniforms.get('colorBleed')!.value = params.colorBleed
    if (params.jitter !== undefined) this.uniforms.get('jitter')!.value = params.jitter
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
