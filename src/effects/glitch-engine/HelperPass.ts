import * as THREE from 'three'

/**
 * A full-target shader pass an effect runs from its update(): a small table or
 * pre-pass (per-cell brightness, per-seed data) computed once instead of in
 * every pixel of the effect's own pass. The fragment shader writes gl_FragColor
 * and can locate its texel with gl_FragCoord. Callers dispose() it when the
 * effect is disabled. It is a RawShaderMaterial (no three.js prelude), so
 * shared GLSL such as COLOR_UTILS_GLSL can be included without name clashes.
 */
export class HelperPass {
  readonly target: THREE.WebGLRenderTarget
  readonly material: THREE.RawShaderMaterial
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  constructor(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
    width: number,
    height: number,
    type: THREE.TextureDataType = THREE.FloatType
  ) {
    this.target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type,
      depthBuffer: false,
    })
    this.material = new THREE.RawShaderMaterial({
      uniforms,
      vertexShader: `attribute vec3 position;\nvoid main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `precision highp float;\n${fragmentShader}`,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(this.geometry, this.material)
    mesh.frustumCulled = false
    this.scene.add(mesh)
  }

  get texture(): THREE.Texture {
    return this.target.texture
  }

  /** Resize the target (no-op when unchanged). */
  setSize(width: number, height: number) {
    width = Math.max(1, width)
    height = Math.max(1, height)
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height)
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.setRenderTarget(this.target)
    renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
    this.geometry.dispose()
  }
}
