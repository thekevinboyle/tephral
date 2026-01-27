import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float scale;
uniform float speed;
uniform int direction; // 0=both, 1=horizontal, 2=vertical
uniform int noiseType; // 0=white, 1=perlin
uniform float time;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex-like noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 noiseCoord = uv * scale + time * speed;

  float noiseX, noiseY;

  if (noiseType == 0) {
    // White noise
    noiseX = random(noiseCoord) * 2.0 - 1.0;
    noiseY = random(noiseCoord + 100.0) * 2.0 - 1.0;
  } else {
    // Perlin-like noise
    noiseX = snoise(noiseCoord);
    noiseY = snoise(noiseCoord + 100.0);
  }

  vec2 offset = vec2(noiseX, noiseY) * intensity * 0.1;

  if (direction == 1) {
    offset.y = 0.0; // horizontal only
  } else if (direction == 2) {
    offset.x = 0.0; // vertical only
  }

  vec2 displacedUV = uv + offset;
  displacedUV = clamp(displacedUV, 0.0, 1.0);

  outputColor = texture2D(inputBuffer, displacedUV);
}
`

export type DisplacementDirection = 'both' | 'horizontal' | 'vertical'
export type DisplacementNoiseType = 'white' | 'perlin'

export interface StaticDisplacementParams {
  intensity: number             // 0-1
  scale: number                 // 1-100
  speed: number                 // 0-10
  direction: DisplacementDirection
  noiseType: DisplacementNoiseType
}

export const DEFAULT_STATIC_DISPLACEMENT_PARAMS: StaticDisplacementParams = {
  intensity: 0.3,
  scale: 20,
  speed: 1.0,
  direction: 'both',
  noiseType: 'perlin',
}

const DIRECTION_MAP: Record<DisplacementDirection, number> = {
  'both': 0,
  'horizontal': 1,
  'vertical': 2,
}

const NOISE_MAP: Record<DisplacementNoiseType, number> = {
  'white': 0,
  'perlin': 1,
}

export class StaticDisplacementEffect extends Effect {
  constructor(params: Partial<StaticDisplacementParams> = {}) {
    const p = { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS, ...params }

    super('StaticDisplacementEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['scale', new THREE.Uniform(p.scale)],
        ['speed', new THREE.Uniform(p.speed)],
        ['direction', new THREE.Uniform(DIRECTION_MAP[p.direction])],
        ['noiseType', new THREE.Uniform(NOISE_MAP[p.noiseType])],
        ['time', new THREE.Uniform(0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<StaticDisplacementParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.scale !== undefined) this.uniforms.get('scale')!.value = params.scale
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.direction !== undefined) this.uniforms.get('direction')!.value = DIRECTION_MAP[params.direction]
    if (params.noiseType !== undefined) this.uniforms.get('noiseType')!.value = NOISE_MAP[params.noiseType]
  }
}
