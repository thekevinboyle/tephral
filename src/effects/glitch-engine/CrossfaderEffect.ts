import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float crossfaderPosition;
uniform sampler2D sourceTexture;
uniform vec2 quadScale;
uniform vec2 sourceQuadScale;
uniform bool hasSourceTexture;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // If no source texture or fully at FX position, just output processed
  if (!hasSourceTexture || crossfaderPosition >= 1.0) {
    outputColor = inputColor;
    return;
  }

  // The processed video (inputColor) is already letterboxed by the quad geometry
  // The source texture needs to be sampled to match the same letterboxing

  // First, check if we're in the visible area (inside the letterbox)
  // The visible area in UV space is centered, with size = quadScale
  vec2 visibleMin = (1.0 - quadScale) * 0.5;
  vec2 visibleMax = visibleMin + quadScale;

  // If we're outside the visible area, both source and processed should be black
  if (uv.x < visibleMin.x || uv.x > visibleMax.x || uv.y < visibleMin.y || uv.y > visibleMax.y) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Map UV from visible area to 0-1 range for source texture sampling
  vec2 sourceUv = (uv - visibleMin) / quadScale;

  // Sample source texture
  vec4 source = texture2D(sourceTexture, sourceUv);

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
        ['hasSourceTexture', new THREE.Uniform(false)],
      ]),
    })
  }

  setCrossfaderPosition(position: number) {
    this.uniforms.get('crossfaderPosition')!.value = position
  }

  setSourceTexture(texture: THREE.Texture | null) {
    this.sourceTexture = texture
    this.uniforms.get('sourceTexture')!.value = texture
    this.uniforms.get('hasSourceTexture')!.value = texture !== null
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
