import { Vector2, type ShaderMaterial, type WebGLRenderTarget } from 'three'
import { config } from '../config'
import { floatTarget, pass } from '../gpu'
import { curvatureFrag, dropFrag, normalFrag, updateFrag } from '../shaders/water'
import type { Drop, SceneWorld, System } from '../world'
import { stirDrop } from './stir'

/**
 * The water: a GPU heightfield sim. It covers the frame plus a margin, with
 * an absorbing border, so ripples roll out of view instead of bouncing. Each
 * frame it applies queued drops, steps the waves and publishes the height
 * (with normals) and the curvature for the light and the surface.
 */
export function wavesSystem(): System {
  let sim: WebGLRenderTarget[] = []
  let curvature: WebGLRenderTarget | null = null
  let mats: { drop: ShaderMaterial; update: ShaderMaterial; normal: ShaderMaterial; curvature: ShaderMaterial } | null = null
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
    run(world, mats!.curvature, curvature!)
    world.water.height = sim[0].texture
    world.water.curvature = curvature!.texture
    world.water.simScale = toSim
  }

  const dispose = () => {
    sim.forEach((t) => t.dispose())
    curvature?.dispose()
    if (mats) Object.values(mats).forEach((m) => m.dispose())
    sim = []
    curvature = null
    mats = null
  }

  return {
    resize(world) {
      dispose()
      const { width: W, height: H } = world.viewport
      const { cells, margin, sponge, damping, prewarm } = config.water
      toSim = 1 / (1 + 2 * margin)
      const simW = W >= H ? cells : Math.round((cells * W) / H)
      const simH = W >= H ? Math.round((cells * H) / W) : cells
      sim = [floatTarget(simW, simH), floatTarget(simW, simH)]
      curvature = floatTarget(simW, simH)
      const { renderer } = world.gpu
      for (const t of [...sim, curvature]) {
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
        curvature: pass(curvatureFrag, { tSim: { value: null }, uDelta: { value: delta } }),
      }
      // Warm the water up so the light is already alive on the first frame.
      for (let i = 0; i < prewarm; i++) step(world, [stirDrop(), stirDrop()])
      publish(world)
    },
    update(world) {
      step(world, world.drops.splice(0, 32))
      world.drops.length = 0
      publish(world)
    },
    dispose,
  }
}
