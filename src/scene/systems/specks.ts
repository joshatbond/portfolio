import { BufferAttribute, BufferGeometry, CustomBlending, OneFactor, Points, ShaderMaterial, Vector2 } from 'three'
import { config } from '../config'
import { createFlow, sampleFlow, type Flow } from '../flow'
import { lightScale } from '../lamps'
import { random } from '../random'
import { specksFrag, specksVert } from '../shaders/specks'
import type { SceneWorld, System } from '../world'

/**
 * Marine snow in the deep. The specks ride the currents (src/scene/flow.ts),
 * each with a little inertia, while the whole view drifts slowly forward
 * through them; the pointer sweeps nearby ones along and a press pushes them
 * out. One that reaches the window, or drifts out of view, is replaced deep
 * in the dark. Drawn with the rest of the deep by the chip renderer.
 */
export function specksSystem(): System {
  let points: Points<BufferGeometry, ShaderMaterial> | null = null
  let flow: Flow | null = null
  let pos = new Float32Array(0)
  let vel = new Float32Array(0)
  let count = 0
  // Where they live: depth range (px), and half the area they fill, seen at the surface.
  const depth = new Vector2()
  const box = new Vector2()
  let scale = 1
  const v = { x: 0, y: 0, z: 0 }

  const dispose = () => {
    if (!points) return
    points.removeFromParent()
    points.geometry.dispose()
    points.material.dispose()
    points = null
  }

  /** Puts speck i somewhere in the layer, still with the water there. */
  const place = (world: SceneWorld, i: number, d: number) => {
    const k = (world.view.distance + d) / world.view.distance
    pos[i * 3] = (random() * 2 - 1) * box.x * k
    pos[i * 3 + 1] = (random() * 2 - 1) * box.y * k
    pos[i * 3 + 2] = -d
    sampleFlow(flow!, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], world.time.elapsed, v)
    vel[i * 3] = v.x
    vel[i * 3 + 1] = v.y
    vel[i * 3 + 2] = v.z + config.specks.approach * scale
  }

  return {
    resize(world) {
      dispose()
      const S = config.specks
      const { width: W, height: H, dpr } = world.viewport
      scale = lightScale(world)
      count = Math.min(S.max, Math.round((W * H * S.density) / 1e6))
      box.set((W / 2) * 1.15, (H / 2) * 1.15)
      depth.set(S.depth[0] * scale, S.depth[1] * scale)
      const { wavelength, speed, turnover, lift } = S.current
      flow = createFlow(random, { wavelength: [wavelength[0] * scale, wavelength[1] * scale], speed: speed * scale, turnover, lift })
      pos = new Float32Array(count * 3)
      vel = new Float32Array(count * 3)
      const seed = new Float32Array(count * 4)
      for (let i = 0; i < count; i++) {
        place(world, i, depth.x + random() * (depth.y - depth.x))
        seed[i * 4 + 2] = random() * 100
        seed[i * 4 + 3] = 0.5 + random() * random() * 1.2
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(pos, 3))
      geometry.setAttribute('aSeed', new BufferAttribute(seed, 4))
      const material = new ShaderMaterial({
        vertexShader: specksVert,
        fragmentShader: specksFrag,
        uniforms: {
          ...world.light.uniforms,
          uDepth: { value: depth.clone() },
          uSize: { value: S.size * dpr },
          uBright: { value: new Vector2(S.dark, S.lit) },
        },
        transparent: true,
        depthWrite: false,
        // Pure addition: the specks' alpha is 0 so they never hide anything.
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneFactor,
      })
      points = new Points(geometry, material)
      points.frustumCulled = false
      world.deep.scene.add(points)
    },
    update(world) {
      const dt = world.time.delta
      if (!points || !flow || dt === 0) return
      const S = config.specks
      const P = world.view.distance
      const t = world.time.elapsed
      const approach = S.approach * scale
      const take = 1 - Math.exp(-S.drag * dt)
      const { stroke, press } = world.input
      const reach = S.stir.radius
      const stirDepth = S.stir.depth * scale
      for (let i = 0; i < count; i++) {
        const o = i * 3
        const x = pos[o], y = pos[o + 1], z = pos[o + 2]
        // Taking up the water's motion, and the drift toward the window.
        sampleFlow(flow, x, y, z, t, v)
        vel[o] += (v.x - vel[o]) * take
        vel[o + 1] += (v.y - vel[o + 1]) * take
        vel[o + 2] += (v.z + approach - vel[o + 2]) * take
        // Stirring: the pointer works on what's near it, seen from above.
        if (stroke || press) {
          const k = P / (P - z)
          const sx = x * k, sy = y * k
          const near = Math.exp(z / stirDepth)
          if (stroke) {
            const d = Math.hypot(sx - stroke.x, sy - stroke.y)
            if (d < reach) {
              const w = (1 - d / reach) ** 2 * near * S.stir.sweep
              vel[o] += (stroke.vx / k - vel[o]) * w
              vel[o + 1] += (stroke.vy / k - vel[o + 1]) * w
            }
          }
          if (press) {
            const dx = sx - press.x, dy = sy - press.y
            const d = Math.hypot(dx, dy) || 1
            if (d < reach * 1.5) {
              const w = (1 - d / (reach * 1.5)) * near * S.stir.burst * scale
              vel[o] += (dx / d) * w
              vel[o + 1] += (dy / d) * w
            }
          }
        }
        pos[o] = x + vel[o] * dt
        pos[o + 1] = y + vel[o + 1] * dt
        pos[o + 2] = z + vel[o + 2] * dt
        // Reached the window, or out of view: a new one, deep in the dark.
        const d = -pos[o + 2]
        const k = P / (P + d)
        if (d < depth.x || d > depth.y || Math.abs(pos[o] * k) > box.x || Math.abs(pos[o + 1] * k) > box.y) {
          place(world, i, depth.y - random() * 60 * scale)
        }
      }
      points.geometry.attributes.position.needsUpdate = true
    },
    dispose,
  }
}
