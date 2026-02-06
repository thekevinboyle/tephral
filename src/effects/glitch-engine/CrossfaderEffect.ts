import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float crossfaderPosition;
uniform sampler2D sourceTexture;
uniform vec2 quadScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Transform UV to account for aspect ratio scaling
  vec2 adjustedUv = (uv - 0.5) / quadScale + 0.5;

  // Check if UV is outside the valid range (letterbox/pillarbox area)
  if (adjustedUv.x < 0.0 || adjustedUv.x > 1.0 || adjustedUv.y < 0.0 || adjustedUv.y > 1.0) {
    // Outside video area - blend black with processed
    outputColor = mix(vec4(0.0, 0.0, 0.0, 1.0), inputColor, crossfaderPosition);
  } else {
    // A side = source, B side = processed (inputColor)
    vec4 source = texture2D(sourceTexture, adjustedUv);
    outputColor = mix(source, inputColor, crossfaderPosition);
  }
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
    const scale = this.uniforms.get('quadScale')!.value as THREE.Vector2
    scale.set(scaleX, scaleY)
  }

  getSourceTexture(): THREE.Texture | null {
    return this.sourceTexture
  }
}
