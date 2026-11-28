// Chip components (structure of arrays, indexed by entity id).
const MAX = 512
const f32 = () => new Float32Array(MAX)

export const Mode = { STILL: 0, DIVE: 1, SCHOOL: 2, RISE: 3 } as const

export const Chip = { kind: [] as string[] }
export const Position = { x: f32(), y: f32(), z: f32() }
export const Velocity = { x: f32(), y: f32(), z: f32() }
/** Euler rotation (rad), plus spin rates while tumbling. */
export const Rotation = { x: f32(), y: f32(), z: f32(), sx: f32(), sy: f32(), sz: f32() }
export const Home = { x: f32(), y: f32() }
export const Bob = { phase: f32(), period: f32(), amplitude: f32(), ripple: f32() }
/** A bubble from a diving chip: its age and lifetime (s). */
export const Bubble = { age: f32(), life: f32() }

/** Behaviour state, time in it, its length, depth band, and where it started. */
export const State = {
  mode: new Uint8Array(MAX),
  time: f32(),
  duration: f32(),
  band: new Uint8Array(MAX),
  fromX: f32(),
  fromY: f32(),
  fromZ: f32(),
}
