import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float crossfaderPosition;
uniform sampler2D sourceTexture;
uniform vec2 quadScale;
uniform vec2 sourceQuadScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Transform UV for source texture (original video) using its own scale
  vec2 sourceUv = (uv - 0.5) / sourceQuadScale + 0.5;

  // For letterbox/pillarbox areas, source should be black
  vec4 source;
  if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0) {
    source = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    source = texture2D(sourceTexture, sourceUv);
  }

  // Blend: SRC (0) = source, FX (1) = processed
  outputColor = mix(source, inputColor, crossfaderPosition);
}
`

export class CrossfaderEffect extends Effect {
  private sourceTexture: THREE.Texture | null = null

  constructor() {
    super('CrossfaderEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['crossfaderPosition', new THREE.Uniform(1.0)], // Default to fully processed
        ['sourceTexture', new THREE.Uniform(null)],
        ['quadScale', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['sourceQuadScale', new THREE.Uniform(new THREE.Vector2(1, 1))],
      ]),
    })
  }

  setCrossfaderPosition(position: number) {
    this.uniforms.get('crossfaderPosition')!.value = position
  }

  setSourceTexture(texture: THREE.Texture | null) {
    this.sourceTexture = texture
    this.uniforms.get('sourceTexture')!.value = texture
  }

  setQuadScale(scaleX: number, scaleY: number) {
    this.uniforms.get('quadScale')!.value = new THREE.Vector2(scaleX, scaleY)
  }

  setSourceQuadScale(scaleX: number, scaleY: number) {
    this.uniforms.get('sourceQuadScale')!.value = new THREE.Vector2(scaleX, scaleY)
  }

  getSourceTexture(): THREE.Texture | null {
    return this.sourceTexture
  }
}
