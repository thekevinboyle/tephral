import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float blockSize;
uniform float displaceChance;
uniform float displaceDistance;
uniform float time;
uniform float seed;
uniform float effectMix;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 blockCoord = floor(uv / blockSize) * blockSize;
  float rand = random(blockCoord + seed + floor(time * 10.0));

  vec2 sampleUv = uv;

  if (rand < displaceChance) {
    float displaceX = (random(blockCoord + 0.1 + seed) - 0.5) * 2.0 * displaceDistance;
    float displaceY = (random(blockCoord + 0.2 + seed) - 0.5) * 2.0 * displaceDistance;
    sampleUv += vec2(displaceX, displaceY);
  }

  vec4 effectColor = texture2D(inputBuffer, sampleUv);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface BlockDisplaceParams {
  blockSize: number
  displaceChance: number
  displaceDistance: number
  seed: number
  animated: boolean
  mix: number
}

export const DEFAULT_BLOCK_DISPLACE_PARAMS: BlockDisplaceParams = {
  blockSize: 0.05,
  displaceChance: 0.1,
  displaceDistance: 0.02,
  seed: 0,
  animated: true,
  mix: 1,
}

export class BlockDisplaceEffect extends Effect {
  private startTime: number

  constructor(params: Partial<BlockDisplaceParams> = {}) {
    const p = { ...DEFAULT_BLOCK_DISPLACE_PARAMS, ...params }

    super('BlockDisplaceEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['blockSize', new THREE.Uniform(p.blockSize)],
        ['displaceChance', new THREE.Uniform(p.displaceChance)],
        ['displaceDistance', new THREE.Uniform(p.displaceDistance)],
        ['time', new THREE.Uniform(0)],
        ['seed', new THREE.Uniform(p.seed)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.startTime = performance.now()
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = (performance.now() - this.startTime) / 1000
  }

  updateParams(params: Partial<BlockDisplaceParams>) {
    if (params.blockSize !== undefined) {
      this.uniforms.get('blockSize')!.value = params.blockSize
    }
    if (params.displaceChance !== undefined) {
      this.uniforms.get('displaceChance')!.value = params.displaceChance
    }
    if (params.displaceDistance !== undefined) {
      this.uniforms.get('displaceDistance')!.value = params.displaceDistance
    }
    if (params.seed !== undefined) {
      this.uniforms.get('seed')!.value = params.seed
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }

  randomize() {
    this.uniforms.get('seed')!.value = Math.random() * 1000
  }
}
