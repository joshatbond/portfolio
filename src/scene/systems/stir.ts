import { config } from '../config'
import type { Drop, System } from '../world'

/** One tiny, random disturbance somewhere in the water (screen uv; may be off-frame). */
export function stirDrop(): Drop {
  const [min, max] = config.stir.radius
  const m = config.water.margin
  return {
    x: -m + Math.random() * (1 + 2 * m),
    y: -m + Math.random() * (1 + 2 * m),
    radius: min + Math.random() * (max - min),
    strength: (Math.random() - 0.5) * config.stir.strength,
  }
}

/** Keeps the water gently moving so the light never sits dead still. */
export function stirSystem(): System {
  let wait = 0
  return {
    update(world) {
      wait -= world.time.delta
      while (wait <= 0) {
        wait += config.stir.every
        world.drops.push(stirDrop())
      }
    },
  }
}
