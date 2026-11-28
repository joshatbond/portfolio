import { Vector2, Vector4, type ShaderMaterial, type Texture } from 'three'
import { drawAbyss } from '../abyss'
import { config } from '../config'
import { pass } from '../gpu'
import { surfaceFrag } from '../shaders/surface'
import { localRect, type System } from '../world'

/**
 * The water surface and the frame's LEDs, drawn to the canvas over the light,
 * with the name and title deep below it, refracted at full resolution.
 */
export function surfaceSystem(): System {
  let material: ShaderMaterial | null = null
  let nameTexture: Texture | null = null
  const dispose = () => {
    material?.dispose()
    nameTexture?.dispose()
    material = null
    nameTexture = null
  }
  return {
    resize(world) {
      dispose()
      const { width: W, height: H, dpr } = world.viewport
      const pills = [new Vector4(), new Vector4()]
      document.querySelectorAll<HTMLElement>('.pills .btn').forEach((el, i) => {
        if (i > 1) return
        const b = localRect(world, el)
        pills[i].set(b.x, b.y, b.width, b.height)
      })
      const abyss = world.capture && !world.capture.name ? null : drawAbyss(world.container, dpr, { glyphs: world.capture?.glyphs ?? true })
      nameTexture = abyss?.texture ?? null
      const r = abyss?.rect
      const nameRect = r ? new Vector4(r.x, r.y, r.width, r.height) : new Vector4()
      const { min, max, ofShortSide } = config.surface.edgeFalloff
      material = pass(surfaceFrag, {
        tUnder: { value: null },
        tChips: { value: null },
        tSim: { value: null },
        uSimScale: { value: 1 },
        uResolution: { value: new Vector2(W, H) },
        uRefract: { value: config.surface.refract },
        uEdgeFalloff: { value: Math.min(max, Math.max(min, Math.min(W, H) * ofShortSide)) },
        uPills: { value: pills },
        tName: { value: nameTexture },
        uNameRect: { value: nameRect },
        uNameDim: { value: config.abyss.dim },
        uLed: { value: world.capture && !world.capture.led ? 0 : 1 },
        uGlint: { value: new Vector4(...config.surface.glint.slope, config.surface.glint.midWater, config.surface.glint.strength) },
      })
    },
    update(world) {
      if (!material) return
      material.uniforms.tUnder.value = world.light.target?.texture ?? null
      material.uniforms.tChips.value = world.chips.target?.texture ?? null
      material.uniforms.tSim.value = world.water.height
      material.uniforms.uSimScale.value = world.water.simScale
      world.gpu.quad.render(world.gpu.renderer, material, null)
    },
    dispose,
  }
}
