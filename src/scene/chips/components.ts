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
  /** Left of a burst of speed (negative: until the next), and the swerve it takes in it (rad). */
  burst: f32(),
  dart: f32(),
  /** Its tail's phase, and how far it's banked into a turn (rad). */
  wag: f32(),
  bank: f32(),
  /** Since the scene started, and how long it waits before swimming in. */
  age: f32(),
  delay: f32(),
  /**
   * Its spot in the still (px at the surface): it swims in toward it, at
   * the depth `goalZ`, then keeps to the water around it.
   */
  homeX: f32(),
  homeY: f32(),
  goalZ: f32(),
  /**
   * While it swims in: where it came from (systems/chips.ts Role), and how
   * many times faster than its cruise.
   */
  entering: new Uint8Array(MAX),
  boost: f32(),
  /** Left of a dart away from a press, how long it lasts, and the speed it darted at. */
  flee: f32(),
  fleeTime: f32(),
  fleeSpeed: f32(),
  /** Until a fish near the surface next ripples it. */
  wake: f32(),
}

/** A bubble from a startled fish: its age and lifetime. */
export const Bubble = { age: f32(), life: f32() }
