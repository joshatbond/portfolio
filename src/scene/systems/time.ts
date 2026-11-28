import type { System } from '../world'

/** Frame timing, in seconds. Long gaps (a hidden tab, a stall) are clamped. */
export function timeSystem(): System {
  return {
    update(world) {
      const now = performance.now()
      world.time.delta = Math.min(0.05, (now - world.time.then) / 1000)
      world.time.elapsed += world.time.delta
      world.time.then = now
    },
  }
}
