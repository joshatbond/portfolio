// Chip components (structure of arrays, indexed by entity id).
const MAX = 512
const f32 = () => new Float32Array(MAX)

export const Chip = { kind: [] as string[] }
export const Position = { x: f32(), y: f32(), z: f32() }
export const Velocity = { x: f32(), y: f32(), z: f32() }
/** Euler rotation (rad). */
export const Rotation = { x: f32(), y: f32(), z: f32() }

/** A chip swimming like a fish (systems/chips.ts). Times in s, distances in px. */
export const Fish = {
  /** Its own pace and rhythm. */
  cruise: f32(),
  phase: f32(),
  /** Where it's heading across the view (rad), and the depth it's making for. */
  heading: f32(),
  depth: f32(),
  /** Until it picks a new depth. */
  redepth: f32(),
  /** Left of a burst of speed (negative: until the next). */
  burst: f32(),
  /** Its tail's phase. */
  wag: f32(),
  /** Since the scene started, and how long it waits before swimming in. */
  age: f32(),
  delay: f32(),
  /** 1 while it swims in toward its first spot (goal). */
  entering: new Uint8Array(MAX),
  goalX: f32(),
  goalY: f32(),
  goalZ: f32(),
  /** Left of a dart away from a press, and the speed it darted at. */
  flee: f32(),
  fleeSpeed: f32(),
  /** Until a fish near the surface next ripples it. */
  wake: f32(),
}

/** A bubble from a startled fish: its age and lifetime. */
export const Bubble = { age: f32(), life: f32() }
