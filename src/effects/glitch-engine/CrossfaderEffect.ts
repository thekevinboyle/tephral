import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float crossfaderPosition;
uniform sampler2D sourceTexture;
uniform vec2 quadScale;
uniform vec2 sourceQuadScale;
uniform float sourceTextureValid;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // If no source texture is set or fully at FX position, just output the processed video
  if (sourceTextureValid < 0.5 || crossfaderPosition >= 0.999) {
    outputColor = inputColor;
    return;
  }

  // Sample source texture at the same UV
  vec4 source = texture2D(sourceTexture, uv);

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
        ['sourceTextureValid', new THREE.Uniform(0.0)], // Use float instead of bool for GLSL compatibility
      ]),
    })
  }

  setCrossfaderPosition(position: number) {
    this.uniforms.get('crossfaderPosition')!.value = position
  }

  setSourceTexture(texture: THREE.Texture | null) {
    this.sourceTexture = texture
    this.uniforms.get('sourceTexture')!.value = texture
    this.uniforms.get('sourceTextureValid')!.value = texture ? 1.0 : 0.0
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
