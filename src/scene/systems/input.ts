import { config } from '../config'
import type { System } from '../world'

/**
 * Pointer → water. Moving drops a trail of small ripples (stronger for faster
 * strokes); a press or tap drops a bigger one. Listening is on the window,
 * because the DOM text and pills sit above the canvas.
 */
export function inputSystem(): System {
  let detach: (() => void) | null = null
  return {
    resize(world) {
      if (detach) return
      const { input } = world
      const toUv = (e: PointerEvent) => ({ x: e.clientX / innerWidth, y: 1 - e.clientY / innerHeight })
      const onMove = (e: PointerEvent) => {
        input.moves.push(toUv(e))
        input.lastAt = performance.now()
      }
      const onDown = (e: PointerEvent) => {
        input.presses.push(toUv(e))
        input.lastAt = performance.now()
      }
      const onLeave = () => (input.last = null)
      addEventListener('pointermove', onMove, { passive: true })
      addEventListener('pointerdown', onDown, { passive: true })
      document.addEventListener('pointerleave', onLeave)
      detach = () => {
        removeEventListener('pointermove', onMove)
        removeEventListener('pointerdown', onDown)
        document.removeEventListener('pointerleave', onLeave)
      }
    },
    update(world) {
      const { input, drops, viewport } = world
      const long = Math.max(viewport.width, viewport.height)
      // Where the pointer touched the water this frame, for the chips.
      const touch = input.presses.at(-1) ?? input.moves.at(-1)
      input.contact = touch ? { x: (touch.x - 0.5) * viewport.width, y: (touch.y - 0.5) * viewport.height } : null
      const { trail, press } = config.pointer
      for (const p of input.moves) {
        const last = input.last
        if (last) {
          const dist = Math.hypot(((p.x - last.x) * viewport.width) / long, ((p.y - last.y) * viewport.height) / long)
          const steps = Math.min(3, Math.ceil(dist / trail.spacing))
          const strength = Math.min(trail.maxStrength, 0.0004 + dist * 0.02) / Math.max(1, steps)
          for (let i = 1; i <= steps; i++) {
            drops.push({ x: last.x + ((p.x - last.x) * i) / steps, y: last.y + ((p.y - last.y) * i) / steps, radius: trail.radius, strength })
          }
        }
        input.last = p
      }
      for (const p of input.presses) {
        drops.push({ x: p.x, y: p.y, radius: press.radius, strength: press.strength })
        input.last = p
      }
      input.moves.length = 0
      input.presses.length = 0
    },
    dispose() {
      detach?.()
      detach = null
    },
  }
}
