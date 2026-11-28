import { Vector2, Vector4, type ShaderMaterial, type Texture } from 'three'
import { drawAbyss } from '../abyss'
import { config } from '../config'
import { pass } from '../gpu'
import { surfaceFrag } from '../shaders/surface'
import { localRect, type System } from '../world'

/**
 * The water at the window, drawn to the canvas over the light, with the name
 * and title deep beyond it, refracted at full resolution.
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
      const { width: W, height: H } = world.viewport
      const pills = [new Vector4(), new Vector4()]
      document.querySelectorAll<HTMLElement>('.pills .btn').forEach((el, i) => {
        if (i > 1) return
        const b = localRect(world, el)
        pills[i].set(b.x, b.y, b.width, b.height)
      })
      // At the screen's pixel ratio (not the scene's capped one), so its
      // glyphs land where the DOM's do.
      const abyss = world.capture && !world.capture.name ? null : drawAbyss(world.container, devicePixelRatio, { glyphs: world.capture?.glyphs ?? true })
      nameTexture = abyss?.texture ?? null
      const r = abyss?.rect
      const nameRect = r ? new Vector4(r.x, r.y, r.width, r.height) : new Vector4()
      material = pass(surfaceFrag, {
        // The lamps' (shared) uniforms.
        ...world.light.uniforms,
        tUnder: { value: null },
        tChips: { value: null },
        tSim: { value: null },
        uSimScale: { value: 1 },
        uResolution: { value: new Vector2(W, H) },
        uRefract: { value: config.surface.refract },
        uPills: { value: pills },
        tName: { value: nameTexture },
        uNameRect: { value: nameRect },
        uNameDim: { value: config.abyss.dim },
        uGlint: { value: new Vector4(...config.surface.glint.slope, 0, config.surface.glint.strength) },
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
