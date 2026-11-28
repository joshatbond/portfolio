import { query } from 'bitecs'
import { Mesh, PerspectiveCamera, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, type BufferGeometry } from 'three'
import { Chip, Position, Rotation } from '../chips/components'
import { chipGeometry } from '../chips/geometry'
import { config } from '../config'
import { chipFrag, chipVert } from '../shaders/chips'
import type { System } from '../world'

/** Draws the chips at full resolution (antialiased) into world.chips.target. */
export function chipRenderSystem(): System {
  const scene = new Scene()
  const geometries = new Map<string, BufferGeometry>()
  const meshes = new Map<number, Mesh>()
  const camera = new PerspectiveCamera()
  let target: WebGLRenderTarget | null = null
  const material = new ShaderMaterial({
    vertexShader: chipVert,
    fragmentShader: chipFrag,
    vertexColors: true,
    uniforms: { uHalf: { value: new Vector2() }, uFogDepth: { value: config.chips.fogDepth } },
  })

  const geometryFor = (key: string) => {
    let g = geometries.get(key)
    if (!g) geometries.set(key, (g = chipGeometry(key)))
    return g
  }

  return {
    resize(world) {
      const { width: W, height: H, dpr } = world.viewport
      const P = world.view.distance
      camera.position.set(0, 0, P)
      camera.fov = (2 * Math.atan(H / 2 / P) * 180) / Math.PI
      camera.aspect = W / H
      camera.near = 1
      camera.far = P + 2000
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      material.uniforms.uHalf.value.set(W / 2, H / 2)
      target?.dispose()
      target = new WebGLRenderTarget(Math.round(W * dpr), Math.round(H * dpr), { samples: 4 })
      world.chips.target = target
      for (const m of meshes.values()) scene.remove(m)
      meshes.clear()
    },
    update(world) {
      if (!target) return
      const live = new Set<number>()
      for (const eid of query(world, [Chip, Position, Rotation])) {
        live.add(eid)
        let mesh = meshes.get(eid)
        if (!mesh) {
          mesh = new Mesh(geometryFor(Chip.kind[eid]), material)
          meshes.set(eid, mesh)
          scene.add(mesh)
        }
        mesh.position.set(Position.x[eid], Position.y[eid], Position.z[eid])
        mesh.rotation.set(Rotation.x[eid], Rotation.y[eid], Rotation.z[eid])
      }
      for (const [eid, mesh] of meshes) {
        if (!live.has(eid)) {
          scene.remove(mesh)
          meshes.delete(eid)
        }
      }
      const { renderer } = world.gpu
      renderer.setRenderTarget(target)
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      renderer.render(scene, camera)
    },
    dispose() {
      target?.dispose()
      material.dispose()
      for (const g of geometries.values()) g.dispose()
    },
  }
}
