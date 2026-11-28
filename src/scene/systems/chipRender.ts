import { query } from 'bitecs'
import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  LessEqualDepth,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Points,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three'
import { Bubble, Chip, MAX_BUBBLES, Position, Rotation } from '../chips/components'
import { chipGeometry } from '../chips/geometry'
import { config } from '../config'
import { bubbleFrag, bubbleVert, chipFrag, chipVert } from '../shaders/chips'
import type { System } from '../world'

/**
 * Keeps a mesh for every chip and a point for every bubble in the deep, and
 * draws the deep (with anything else in it, like the specks) at full
 * resolution, antialiased, into world.chips.target.
 *
 * Chips in the clear water just under the surface are opaque. Deeper ones
 * fade into the water, so they're drawn after those, farthest first, each
 * laying down its own depth (so only its nearest faces show) and then
 * blending over whatever is behind it, a farther chip included.
 */
export function chipRenderSystem(): System {
  const geometries = new Map<string, BufferGeometry>()
  const meshes = new Map<number, Mesh>()
  let target: WebGLRenderTarget | null = null
  const material = new ShaderMaterial({
    vertexShader: chipVert,
    fragmentShader: chipFrag,
    vertexColors: true,
    uniforms: { uFogDepth: { value: config.chips.fogDepth }, uClear: { value: config.chips.clearDepth } },
  })
  // Fading chips: their depth first, then their colour over what's behind
  // (premultiplied). The same program both times, so the depths match exactly.
  const depthOnly = new ShaderMaterial({
    vertexShader: chipVert,
    fragmentShader: chipFrag,
    vertexColors: true,
    uniforms: material.uniforms,
    colorWrite: false,
    transparent: true,
  })
  const faded = new ShaderMaterial({
    vertexShader: chipVert,
    fragmentShader: chipFrag,
    vertexColors: true,
    uniforms: material.uniforms,
    transparent: true,
    depthWrite: false,
    depthFunc: LessEqualDepth,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
  })

  // Bubbles: one Points object, refilled from the bubble entities each frame.
  const bubbleGeometry = new BufferGeometry()
  const bubblePos = new BufferAttribute(new Float32Array(MAX_BUBBLES * 3), 3)
  const bubbleFade = new BufferAttribute(new Float32Array(MAX_BUBBLES), 1)
  bubbleGeometry.setAttribute('position', bubblePos)
  bubbleGeometry.setAttribute('aFade', bubbleFade)
  const bubbleMaterial = new ShaderMaterial({
    vertexShader: bubbleVert,
    fragmentShader: bubbleFrag,
    uniforms: { uSize: { value: config.chips.bubbles.size }, uDistance: { value: 1240 } },
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
  })
  const bubblePoints = new Points(bubbleGeometry, bubbleMaterial)
  bubblePoints.frustumCulled = false

  const geometryFor = (key: string) => {
    let g = geometries.get(key)
    if (!g) geometries.set(key, (g = chipGeometry(key)))
    return g
  }

  return {
    resize(world) {
      const { width: W, height: H, dpr } = world.viewport
      const { scene, camera } = world.deep
      if (!bubblePoints.parent) scene.add(bubblePoints)
      const P = world.view.distance
      camera.position.set(0, 0, P)
      camera.fov = (2 * Math.atan(H / 2 / P) * 180) / Math.PI
      camera.aspect = W / H
      camera.near = 1
      camera.far = P + 2000
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      // The lamps' (shared) uniforms, refreshed for this window.
      Object.assign(material.uniforms, world.light.uniforms)
      bubbleMaterial.uniforms.uSize.value = config.chips.bubbles.size * dpr
      bubbleMaterial.uniforms.uDistance.value = P
      target?.dispose()
      target = new WebGLRenderTarget(Math.round(W * dpr), Math.round(H * dpr), { samples: 4 })
      world.chips.target = target
      for (const m of meshes.values()) scene.remove(m)
      meshes.clear()
    },
    update(world) {
      if (!target) return
      const { scene, camera } = world.deep
      const live = new Set<number>()
      const fading: Mesh[] = []
      for (const eid of query(world, [Chip, Position, Rotation])) {
        live.add(eid)
        let mesh = meshes.get(eid)
        if (!mesh) {
          const geometry = geometryFor(Chip.kind[eid])
          mesh = new Mesh(geometry, material)
          mesh.add(new Mesh(geometry, depthOnly))
          meshes.set(eid, mesh)
          scene.add(mesh)
        }
        mesh.position.set(Position.x[eid], Position.y[eid], Position.z[eid])
        mesh.rotation.set(Rotation.x[eid], Rotation.y[eid], Rotation.z[eid])
        // As the shader has it: below the clear layer, it fades.
        const fade = -Position.z[eid] > config.chips.clearDepth
        mesh.material = fade ? faded : material
        mesh.children[0].visible = fade
        if (fade) fading.push(mesh)
      }
      // Farthest first, and before the specks and bubbles (render order 0).
      fading.sort((a, b) => a.position.z - b.position.z)
      fading.forEach((mesh, i) => {
        mesh.children[0].renderOrder = 2 * (i - fading.length)
        mesh.renderOrder = 2 * (i - fading.length) + 1
      })
      for (const [eid, mesh] of meshes) {
        if (!live.has(eid)) {
          scene.remove(mesh)
          meshes.delete(eid)
        }
      }
      let n = 0
      for (const b of query(world, [Bubble, Position])) {
        if (n >= MAX_BUBBLES) break
        bubblePos.setXYZ(n, Position.x[b], Position.y[b], Position.z[b])
        const k = Bubble.age[b] / Bubble.life[b]
        // Fade in fast, out slowly, and dim with depth like everything else.
        bubbleFade.setX(n, Math.min(1, k * 8) * (1 - k) * Math.exp(Position.z[b] / config.chips.fogDepth) * 0.9)
        n++
      }
      bubbleGeometry.setDrawRange(0, n)
      bubblePos.needsUpdate = true
      bubbleFade.needsUpdate = true

      const { renderer } = world.gpu
      renderer.setRenderTarget(target)
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      renderer.render(scene, camera)
    },
    dispose() {
      target?.dispose()
      material.dispose()
      depthOnly.dispose()
      faded.dispose()
      bubbleMaterial.dispose()
      bubbleGeometry.dispose()
      for (const g of geometries.values()) g.dispose()
    },
  }
}
