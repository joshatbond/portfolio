import { config } from '../config'
import { random } from '../random'
import type { Drop, System } from '../world'

/** One tiny, random disturbance somewhere in the water (screen uv; may be off-frame). */
export function stirDrop(): Drop {
  const [min, max] = config.stir.radius
  const m = config.water.margin
  return {
    x: -m + random() * (1 + 2 * m),
    y: -m + random() * (1 + 2 * m),
    radius: min + random() * (max - min),
    strength: (random() - 0.5) * config.stir.strength,
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
