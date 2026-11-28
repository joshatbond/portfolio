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
  /** Its own pace (px/s, for a 900 px window: systems/chips.ts swimScale). */
  pace: f32(),
  /** Where it's heading across the view, and how steeply it climbs (+) or dives (−) (rad). */
  heading: f32(),
  pitch: f32(),
  /**
   * Left of a kick (negative: until the next), the speed it kicks up to, and
   * the heading and pitch it kicks toward.
   */
  kick: f32(),
  kickSpeed: f32(),
  turnTo: f32(),
  pitchTo: f32(),
  /** The depth it's making for, and until it picks another. */
  depth: f32(),
  redepth: f32(),
  /** How far it's banked into a turn (rad). */
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
   * many times faster than its pace.
   */
  entering: new Uint8Array(MAX),
  boost: f32(),
  /** Left of a dart away from a press: it doesn't steer or kick again until it's done. */
  flee: f32(),
  /** Until a fish near the surface next ripples it. */
  wake: f32(),
}

/** A bubble from a startled fish: its age and lifetime. No more than MAX_BUBBLES at once. */
export const Bubble = { age: f32(), life: f32() }
export const MAX_BUBBLES = 256
