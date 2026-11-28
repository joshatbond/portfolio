import { Vector2, Vector3, Vector4 } from 'three'
import { textRect } from './abyss'
import { config } from './config'
import { MAX_LAMPS } from './shaders/lamps'
import type { SceneWorld } from './world'

/** Short side of the window over the reference: distances scale by it. */
export const lightScale = (world: SceneWorld) => Math.min(world.viewport.width, world.viewport.height) / config.light.referenceSide

/**
 * The uniforms of the lamps and the water they light (shaders/lamps.ts), for
 * this window. They're shared objects: every material that's lit by the
 * lamps holds the same ones, so this sets them all.
 */
export function updateLampUniforms(world: SceneWorld) {
  const u = world.light.uniforms
  const { width: W, height: H, mobile } = world.viewport
  const L = config.lamps
  const c = config.light
  const scale = lightScale(world)
  const pk = mobile ? config.abyss.pocket.mobile : config.abyss.pocket.desktop
  const lamps = (mobile ? L.mobile : L.desktop).slice(0, MAX_LAMPS)
  const pos = Array.from({ length: MAX_LAMPS }, () => new Vector4())
  const dirs = Array.from({ length: MAX_LAMPS }, () => new Vector3(0, 0, -1))
  lamps.forEach(({ at: [ax, ay], power }, i) => {
    const x = (ax - 0.5) * W
    const y = (0.5 - ay) * H
    pos[i].set(x, y, power, 0)
    // Leaning out toward its own edge of the frame.
    const out = new Vector2(Math.abs(ax - 0.5) >= Math.abs(ay - 0.5) ? Math.sign(x) : 0, Math.abs(ay - 0.5) > Math.abs(ax - 0.5) ? Math.sign(y) : 0)
    dirs[i].set(out.x * L.tilt, out.y * L.tilt, -1).normalize()
  })
  const rad = (d: number) => (d * Math.PI) / 180
  Object.assign(u, {
    uLamps: { value: pos },
    uLampDirs: { value: dirs },
    uLampCount: { value: lamps.length },
    uLampHeight: { value: L.height * scale },
    uLampCone: { value: new Vector2(Math.cos(rad(L.cone[1])), Math.cos(rad(L.cone[0]))) },
    uLampRange: { value: L.range * scale },
    uExtinction: { value: c.extinction / scale },
    uHalf: { value: new Vector2(W / 2, H / 2) },
    uCamZ: { value: world.view.distance },
    uTime: u.uTime ?? { value: 0 },
    uMurk: { value: new Vector4(1 / (c.murk.scale * scale), c.murk.amount, c.murk.ambient, c.murk.drift * scale) },
    uPocket: { value: pocket(world) },
    uPocketFeather: { value: pk.feather },
    uPocketFloor: { value: pk.floor },
  })
}

/** The ellipse of thicker water around the name and title (world px at the surface, y up). */
function pocket(world: SceneWorld) {
  const { width: W, height: H } = world.viewport
  const text = [...document.querySelectorAll('.abyss .name > span, .abyss .role > span')].filter((el) => el.getClientRects().length)
  if (!text.length) return new Vector4(0, 0, 0, 0)
  const origin = world.container.getBoundingClientRect()
  const rects = text.map((el) => textRect(el))
  const x0 = Math.min(...rects.map((r) => r.left)) - origin.x
  const x1 = Math.max(...rects.map((r) => r.right)) - origin.x
  const y0 = Math.min(...rects.map((r) => r.top)) - origin.y
  const y1 = Math.max(...rects.map((r) => r.bottom)) - origin.y
  const { pad } = world.viewport.mobile ? config.abyss.pocket.mobile : config.abyss.pocket.desktop
  // An ellipse through the box's corners (√2 × its half-size), padded.
  return new Vector4((x0 + x1) / 2 - W / 2, H / 2 - (y0 + y1) / 2, ((x1 - x0) / 2) * Math.SQRT2 + pad, ((y1 - y0) / 2) * Math.SQRT2 + pad)
}
