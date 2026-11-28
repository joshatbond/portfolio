import { Vector2, type ShaderMaterial, type WebGLRenderTarget } from 'three'
import { config } from '../config'
import { floatTarget, pass } from '../gpu'
import { lightScale, updateLampUniforms } from '../lamps'
import { lightBlurFrag, lightFrag } from '../shaders/light'
import type { System } from '../world'

/**
 * The lamps' light in the murky deep, rendered at low resolution into
 * world.light.target. Each frame is blended into a running average
 * (half-float, so faint light accumulates without banding), then softened
 * with a blur. It also keeps the lamps' shared uniforms up to date.
 */
export function lightSystem(): System {
  let targets: WebGLRenderTarget[] = []
  let blurred: WebGLRenderTarget[] = []
  let material: ShaderMaterial | null = null
  let blurX: ShaderMaterial | null = null
  let blurY: ShaderMaterial | null = null
  let frame = 0

  const dispose = () => {
    for (const t of [...targets, ...blurred]) t.dispose()
    for (const m of [material, blurX, blurY]) m?.dispose()
    targets = []
    blurred = []
    material = blurX = blurY = null
  }

  return {
    resize(world) {
      dispose()
      updateLampUniforms(world)
      const { width: W, height: H, dpr, mobile } = world.viewport
      const c = config.light
      const w = Math.max(1, Math.round(W * dpr * c.resolution))
      const h = Math.max(1, Math.round(H * dpr * c.resolution))
      targets = [floatTarget(w, h), floatTarget(w, h)]
      blurred = [floatTarget(w, h), floatTarget(w, h)]
      frame = 0
      const scale = lightScale(world)
      material = pass(lightFrag, {
        // The lamps' (shared) uniforms, and the march's own.
        ...world.light.uniforms,
        tCurv: { value: null },
        tPrev: { value: null },
        uBlend: { value: 1 },
        uSimScale: { value: 1 },
        uMaxDepth: { value: c.maxDepth * scale },
        uLensGain: { value: c.lensGain },
        uLensMax: { value: c.lensMax },
        // A shorter march gathers less light; keep the pools about as bright.
        uIntensity: { value: c.intensity / Math.sqrt(scale) },
        uSeed: { value: 0 },
      })
      material.defines = { STEPS: mobile ? c.steps.mobile : c.steps.desktop }
      blurX = pass(lightBlurFrag, { tLight: { value: null }, uStep: { value: new Vector2(c.blur / 2 / w, 0) } })
      blurY = pass(lightBlurFrag, { tLight: { value: blurred[0].texture }, uStep: { value: new Vector2(0, c.blur / 2 / h) } })
      world.light.target = blurred[1]
    },
    update(world) {
      if (!material || !blurX || !blurY) return
      const { renderer, quad } = world.gpu
      const u = material.uniforms
      ;(world.light.uniforms.uTime as { value: number }).value = world.time.elapsed
      u.tCurv.value = world.water.curvature
      u.uSimScale.value = world.water.simScale
      // A fresh jitter each frame; averaged over frames it vanishes.
      u.uSeed.value = (frame % 64) * 17.0
      u.tPrev.value = targets[0].texture
      // Live: a moving average that follows the water. Frozen: the exact mean
      // of every frame so far, which settles in a couple of dozen frames.
      u.uBlend.value = world.frozen ? 1 / (frame + 1) : frame === 0 ? 1 : config.light.temporalBlend
      frame++
      quad.render(renderer, material, targets[1])
      targets.reverse()
      blurX.uniforms.tLight.value = targets[0].texture
      quad.render(renderer, blurX, blurred[0])
      quad.render(renderer, blurY, blurred[1])
    },
    dispose,
  }
}
