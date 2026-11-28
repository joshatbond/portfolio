import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'

export const quadVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Draws a full-screen material into a target (or the canvas). */
export class FullscreenQuad {
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly scene = new Scene()
  private readonly mesh = new Mesh(new PlaneGeometry(2, 2))

  constructor() {
    this.scene.add(this.mesh)
  }

  render(renderer: WebGLRenderer, material: ShaderMaterial, target: WebGLRenderTarget | null) {
    this.mesh.material = material
    renderer.setRenderTarget(target)
    renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.mesh.geometry.dispose()
  }
}

/** A half-float target for sim data. */
export function floatTarget(width: number, height: number) {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
  })
}

/** A full-screen shader pass. */
export function pass(fragmentShader: string, uniforms: Record<string, { value: unknown }>) {
  return new ShaderMaterial({ vertexShader: quadVert, fragmentShader, uniforms, depthTest: false, depthWrite: false })
}
