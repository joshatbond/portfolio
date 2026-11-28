/**
 * The deep's currents: a slowly changing flow that neighbouring specks share,
 * so they move together in eddies, the way water churns, instead of each
 * wandering on its own. It's the curl of a few random plane waves, so it
 * neither piles specks up nor thins them out, and it's cheap to sample.
 */
export interface Flow {
  /** Per wave: kx, ky, kz, ω, phase, amplitude, component of the potential (0–2). */
  waves: Float32Array
  count: number
}

const STRIDE = 7

/**
 * `wavelength` is the size of the eddies (px), `speed` about how fast the
 * water moves (px/s), and `turnover` how long (s) a pattern of eddies takes
 * to give way to the next. Most of the motion is across the view; `lift` is
 * the share that churns up and down.
 */
export function createFlow(
  rand: () => number,
  { wavelength, speed, turnover, lift }: { wavelength: readonly [number, number]; speed: number; turnover: number; lift: number },
): Flow {
  // Waves on the potential's z component turn the water across the view;
  // those on x and y churn it up and down.
  const components = [2, 2, 2, 2, 2, 0, 1, 0, 1]
  const waves = new Float32Array(components.length * STRIDE)
  components.forEach((c, i) => {
    const lambda = wavelength[0] + rand() * (wavelength[1] - wavelength[0])
    const k = (2 * Math.PI) / lambda
    // Mostly horizontal wave vectors, tipped a little so the eddies change with depth.
    const a = rand() * Math.PI * 2
    const tip = (rand() - 0.5) * 0.9
    const o = i * STRIDE
    waves[o] = Math.cos(a) * Math.cos(tip) * k
    waves[o + 1] = Math.sin(a) * Math.cos(tip) * k
    waves[o + 2] = Math.sin(tip) * k
    waves[o + 3] = ((2 * Math.PI) / turnover) * (0.6 + rand() * 0.8) * (rand() < 0.5 ? -1 : 1)
    waves[o + 4] = rand() * Math.PI * 2
    // So each wave moves the water at about `speed`, split between them.
    waves[o + 5] = ((c === 2 ? 1 : lift) * speed) / k / Math.sqrt(components.length / 2)
    waves[o + 6] = c
  })
  return { waves, count: components.length }
}

/** The water's velocity at (x, y, z) at time t, written into `out`. */
export function sampleFlow(flow: Flow, x: number, y: number, z: number, t: number, out: { x: number; y: number; z: number }) {
  let vx = 0
  let vy = 0
  let vz = 0
  const w = flow.waves
  for (let i = 0; i < flow.count; i++) {
    const o = i * STRIDE
    const kx = w[o], ky = w[o + 1], kz = w[o + 2]
    const c = w[o + 5] * Math.cos(kx * x + ky * y + kz * z + w[o + 3] * t + w[o + 4])
    // v = ∇ × A, for a wave on component w[o + 6] of A.
    switch (w[o + 6]) {
      case 0:
        vy += kz * c
        vz -= ky * c
        break
      case 1:
        vx -= kz * c
        vz += kx * c
        break
      default:
        vx += ky * c
        vy -= kx * c
    }
  }
  out.x = vx
  out.y = vy
  out.z = vz
  return out
}
