/**
 * The scene's random numbers. Math.random normally; a fixed sequence for
 * stills (reduced motion, captures), so the same still renders every time.
 */
let next = Math.random

export const random = () => next()

export function seedRandom(seed: number) {
  let s = seed >>> 0
  next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
