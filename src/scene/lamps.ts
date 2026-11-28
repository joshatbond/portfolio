import { Vector2, Vector4 } from 'three'
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
  // The lamps' reach shrinks less than the window does, so a phone's pools
  // still read.
  const reach = Math.pow(scale, 0.75)
  const pk = mobile ? config.abyss.pocket.mobile : config.abyss.pocket.desktop
  const lamps = L.slice(0, MAX_LAMPS)
  const pos = Array.from({ length: MAX_LAMPS }, () => new Vector4())
  const shape = Array.from({ length: MAX_LAMPS }, () => new Vector4(-2, -2, 0, 1))
  lamps.forEach(({ at: [ax, ay], behind, water, specks, beam, pool }, i) => {
    const height = world.view.distance + behind
    // The cosine off the lamp's axis toward a point this far out at the surface.
    const cos = (r: number) => Math.cos(Math.atan((r * reach) / height))
    pos[i].set((ax - 0.5) * W, (0.5 - ay) * H, water, specks)
    shape[i].set(
      pool ? cos(pool[1]) : -2,
      pool ? cos(pool[0]) : -2,
      // cosⁿ halves at the beam's radius.
      beam ? Math.log(0.5) / Math.log(cos(beam)) : 0,
      height,
    )
  })
  Object.assign(u, {
    uLamps: { value: pos },
    uLampShape: { value: shape },
    uLampCount: { value: lamps.length },
    uExtinction: { value: c.extinction / reach },
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
