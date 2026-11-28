import { Vector2, Vector4, type ShaderMaterial } from 'three'
import { config } from '../config'
import { pass } from '../gpu'
import { surfaceFrag } from '../shaders/surface'
import type { System } from '../world'

/** The water surface and the frame's LEDs, drawn to the canvas over the light. */
export function surfaceSystem(): System {
  let material: ShaderMaterial | null = null
  return {
    resize(world) {
      material?.dispose()
      const { width: W, height: H } = world.viewport
      const pills = [new Vector4(), new Vector4()]
      document.querySelectorAll<HTMLElement>('.pills .btn').forEach((el, i) => {
        if (i > 1) return
        const b = el.getBoundingClientRect()
        pills[i].set(b.x, b.y, b.width, b.height)
      })
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
    dispose() {
      material?.dispose()
      material = null
    },
  }
}
