import { BufferAttribute, BufferGeometry, CustomBlending, OneFactor, Points, ShaderMaterial, Vector2 } from 'three'
import { config } from '../config'
import { lightScale } from '../lamps'
import { random } from '../random'
import { specksFrag, specksVert } from '../shaders/specks'
import type { System } from '../world'

/**
 * Marine snow in the deep: a cloud of specks that drift and sink on the GPU
 * (shaders/specks.ts), lit by the lamps. Refilled when the window changes
 * size; drawn with the rest of the deep by the chip renderer.
 */
export function specksSystem(): System {
  let points: Points<BufferGeometry, ShaderMaterial> | null = null

  const dispose = () => {
    if (!points) return
    points.removeFromParent()
    points.geometry.dispose()
    points.material.dispose()
    points = null
  }

  return {
    resize(world) {
      dispose()
      const S = config.specks
      const { width: W, height: H, dpr } = world.viewport
      const scale = lightScale(world)
      const count = Math.min(S.max, Math.round((W * H * S.density) / 1e6))
      // They fill a box a little wider than the window (seen at the surface),
      // so drifting ones come and go out of sight.
      const box = new Vector2((W / 2) * 1.15, (H / 2) * 1.15)
      const depth = S.depth.map((d) => d * scale)
      const pos = new Float32Array(count * 3)
      const seed = new Float32Array(count * 4)
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (random() * 2 - 1) * box.x
        pos[i * 3 + 1] = (random() * 2 - 1) * box.y
        pos[i * 3 + 2] = depth[0] + random() * (depth[1] - depth[0])
        seed[i * 4] = random() * Math.PI * 2
        seed[i * 4 + 1] = (S.drift[0] + random() * (S.drift[1] - S.drift[0])) * scale
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
          uBox: { value: box },
          uDepth: { value: new Vector2(depth[0], depth[1]) },
          uSink: { value: S.sink * scale },
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
    update() {},
    dispose,
  }
}
