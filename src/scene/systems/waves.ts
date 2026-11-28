import { Vector2, type ShaderMaterial, type WebGLRenderTarget } from 'three'
import { config } from '../config'
import { floatTarget, pass } from '../gpu'
import { curvatureFrag, dropFrag, normalFrag, swellFrag, updateFrag } from '../shaders/water'
import type { Drop, SceneWorld, System } from '../world'
import { stirDrop } from './stir'

/**
 * The water: a GPU heightfield sim. It covers the frame plus a margin, with
 * an absorbing border, so ripples roll out of view instead of bouncing. Each
 * frame it applies queued drops, steps the waves and publishes the height
 * (with normals) for the surface, and the curvature of its broad swells for
 * the light.
 */
export function wavesSystem(): System {
  let sim: WebGLRenderTarget[] = []
  /** The swells: the height blurred across, then down, at a coarser size. */
  let swell: WebGLRenderTarget[] = []
  let curvature: WebGLRenderTarget | null = null
  let mats: {
    drop: ShaderMaterial
    update: ShaderMaterial
    normal: ShaderMaterial
    swellX: ShaderMaterial
    swellY: ShaderMaterial
    curvature: ShaderMaterial
  } | null = null
  let toSim = 1

  const run = (world: SceneWorld, material: ShaderMaterial, target = sim[1]) => {
    material.uniforms.tSim.value = sim[0].texture
    world.gpu.quad.render(world.gpu.renderer, material, target)
    if (target === sim[1]) sim.reverse()
  }

  const step = (world: SceneWorld, drops: Drop[]) => {
    const m = mats!
    for (const d of drops) {
      // screen uv → sim uv (the sim is larger than the frame)
      m.drop.uniforms.uCenter.value.set(0.5 + (d.x - 0.5) * toSim, 0.5 + (d.y - 0.5) * toSim)
      m.drop.uniforms.uRadius.value = d.radius * toSim
      m.drop.uniforms.uStrength.value = d.strength
      run(world, m.drop)
    }
    for (let i = 0; i < config.water.stepsPerFrame; i++) run(world, m.update)
    run(world, m.normal)
  }

  const publish = (world: SceneWorld) => {
    const m = mats!
    const { renderer } = world.gpu
    m.swellX.uniforms.tSim.value = sim[0].texture
    world.gpu.quad.render(renderer, m.swellX, swell[0])
    m.swellY.uniforms.tSim.value = swell[0].texture
    world.gpu.quad.render(renderer, m.swellY, swell[1])
    m.curvature.uniforms.tSim.value = swell[1].texture
    world.gpu.quad.render(renderer, m.curvature, curvature!)
    world.water.height = sim[0].texture
    world.water.curvature = curvature!.texture
    world.water.simScale = toSim
  }

  const dispose = () => {
    sim.forEach((t) => t.dispose())
    swell.forEach((t) => t.dispose())
    curvature?.dispose()
    if (mats) Object.values(mats).forEach((m) => m.dispose())
    sim = []
    swell = []
    curvature = null
    mats = null
  }

  return {
    resize(world) {
      dispose()
      const { width: W, height: H } = world.viewport
      const { cells, margin, sponge, damping, prewarm, swell: sw } = config.water
      toSim = 1 / (1 + 2 * margin)
      const simW = W >= H ? cells : Math.round((cells * W) / H)
      const simH = W >= H ? Math.round((cells * H) / W) : cells
      sim = [floatTarget(simW, simH), floatTarget(simW, simH)]
      const swW = Math.max(4, Math.round(simW / sw.downsample))
      const swH = Math.max(4, Math.round(simH / sw.downsample))
      swell = [floatTarget(swW, swH), floatTarget(swW, swH)]
      curvature = floatTarget(swW, swH)
      const { renderer } = world.gpu
      for (const t of [...sim, ...swell, curvature]) {
        renderer.setRenderTarget(t)
        renderer.setClearColor(0x000000, 0)
        renderer.clear()
      }
      const delta = new Vector2(1 / simW, 1 / simH)
      mats = {
        drop: pass(dropFrag, {
          tSim: { value: null },
          uCenter: { value: new Vector2() },
          uRadius: { value: 0.02 },
          uStrength: { value: 0 },
          uAspect: { value: new Vector2(simW / cells, simH / cells) },
        }),
        update: pass(updateFrag, { tSim: { value: null }, uDelta: { value: delta }, uDamping: { value: damping }, uSponge: { value: sponge } }),
        normal: pass(normalFrag, { tSim: { value: null }, uDelta: { value: delta }, uCell: { value: new Vector2(2 / cells, 2 / cells) } }),
        // Taps every `spacing` sim cells: a blur about 2·spacing cells wide.
        swellX: pass(swellFrag, { tSim: { value: null }, uStep: { value: new Vector2(sw.spacing / simW, 0) } }),
        swellY: pass(swellFrag, { tSim: { value: null }, uStep: { value: new Vector2(0, sw.spacing / simH) } }),
        curvature: pass(curvatureFrag, { tSim: { value: null }, uDelta: { value: new Vector2(sw.stencil / swW, sw.stencil / swH) } }),
      }
      // Warm the water up so the light is already alive on the first frame
      // (and, held still, so a still shows real waves).
      for (let i = 0; i < prewarm; i++) step(world, [stirDrop(), stirDrop()])
      publish(world)
    },
    update(world) {
      // Reduced motion: the water holds the shape it warmed up to.
      if (!world.frozen) step(world, world.drops.splice(0, 32))
      world.drops.length = 0
      publish(world)
    },
    dispose,
  }
}
