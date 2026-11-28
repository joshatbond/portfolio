import { Vector2, Vector4, WebGLRenderTarget, type ShaderMaterial, type Texture } from 'three'
import { drawAbyss } from '../abyss'
import { config } from '../config'
import { pass } from '../gpu'
import { lightFrag } from '../shaders/light'
import type { System } from '../world'

/**
 * The frame LEDs' light falling into the murky water (and the deep text
 * behind it), rendered at reduced resolution into world.light.target.
 */
export function lightSystem(): System {
  let targets: WebGLRenderTarget[] = []
  let material: ShaderMaterial | null = null
  let nameTexture: Texture | null = null
  let frame = 0

  const dispose = () => {
    targets.forEach((t) => t.dispose())
    material?.dispose()
    nameTexture?.dispose()
    targets = []
    material = null
    nameTexture = null
  }

  return {
    resize(world) {
      dispose()
      const { width: W, height: H, dpr, mobile } = world.viewport
      const { distance: P, nameDepth } = world.view
      const c = config.light
      const w = Math.max(1, Math.round(W * dpr * c.resolution))
      const h = Math.max(1, Math.round(H * dpr * c.resolution))
      targets = [new WebGLRenderTarget(w, h, { depthBuffer: false }), new WebGLRenderTarget(w, h, { depthBuffer: false })]
      frame = 0
      const abyss = drawAbyss()
      nameTexture = abyss?.texture ?? null
      // The DOM rect, carried down to the deep text's depth.
      const rect = new Vector4(0, 0, 0, 0)
      if (abyss) {
        const k = (P + nameDepth) / P
        const r = abyss.rect
        const cx = (r.x + r.width / 2 - W / 2) * k
        const cy = (H / 2 - (r.y + r.height / 2)) * k
        rect.set(cx - (r.width * k) / 2, cy - (r.height * k) / 2, cx + (r.width * k) / 2, cy + (r.height * k) / 2)
      }
      material = pass(lightFrag, {
        tCurv: { value: null },
        tPrev: { value: null },
        uBlend: { value: 1 },
        tName: { value: nameTexture },
        uNameRect: { value: rect },
        uNameDepth: { value: nameDepth },
        uNameDim: { value: abyss ? config.abyss.dim : 0 },
        uHalf: { value: new Vector2(W / 2, H / 2) },
        uSimScale: { value: 1 },
        uCamZ: { value: P },
        uMaxDepth: { value: c.maxDepth },
        uReach: { value: c.reach },
        uLedHeight: { value: c.ledHeight },
        uLobe: { value: c.lobe },
        uLensGain: { value: c.lensGain },
        uExtinction: { value: c.extinction },
        uFalloff: { value: c.falloff },
        uIntensity: { value: c.intensity },
        uSeed: { value: 0 },
      })
      material.defines = { STEPS: mobile ? c.steps.mobile : c.steps.desktop }
      world.light.target = targets[0]
    },
    update(world) {
      if (!material || targets.length < 2) return
      material.uniforms.tCurv.value = world.water.curvature
      material.uniforms.uSimScale.value = world.water.simScale
      // A fresh jitter each frame; averaged over frames it vanishes.
      material.uniforms.uSeed.value = (frame % 64) * 17.0
      material.uniforms.tPrev.value = targets[0].texture
      material.uniforms.uBlend.value = frame === 0 ? 1 : config.light.temporalBlend
      frame++
      world.gpu.quad.render(world.gpu.renderer, material, targets[1])
      targets.reverse()
      world.light.target = targets[0]
    },
    dispose,
  }
}
