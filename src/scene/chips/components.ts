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
  /** Its own pace (px/s, for a 900 px window: systems/chips.ts swimScale), and how much faster (or slower) than its school it swims. */
  pace: f32(),
  trim: f32(),
  /** Where it's heading across the view, and how steeply it climbs (+) or dives (−) (rad). */
  heading: f32(),
  pitch: f32(),
  /**
   * Left of the kick of a dart away from a press, the speed it kicks up to,
   * and the heading and pitch it kicks toward.
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
  /** Where it swims in toward when the scene starts (px at the surface), at the depth `goalZ`. */
  homeX: f32(),
  homeY: f32(),
  goalZ: f32(),
  /** Its school (School, by id; 0: on its own), and while on its own, until it looks for company (negative) or since. */
  school: new Uint8Array(MAX),
  lonely: f32(),
  /**
   * While it swims in: where it came from (systems/chips.ts Role), and how
   * many times faster than its pace.
   */
  entering: new Uint8Array(MAX),
  boost: f32(),
  /** Left of a dart away from a press: it doesn't steer again until it's done. */
  flee: f32(),
  /** Until a fish near the surface next ripples it. */
  wake: f32(),
}

/** A small school of fish (systems/chips.ts), by its id. */
export const MAX_SCHOOLS = 64
const schoolF32 = () => new Float32Array(MAX_SCHOOLS)
export const School = {
  /** The depth it's making for, and until it picks another. */
  depth: schoolF32(),
  redepth: schoolF32(),
  /** Its cruising pace (px/s, for a 900 px window). */
  pace: schoolF32(),
  /**
   * Its speed (× its pace) eases from `from` to `to` over `easeTime` s
   * (`ease` s in so far); in `next` s it picks another.
   */
  from: schoolF32(),
  to: schoolF32(),
  ease: schoolF32(),
  easeTime: schoolF32(),
  next: schoolF32(),
  /** How far through its weave it is (rad), and how fast it goes through it (rad/s). */
  wave: schoolF32(),
  waveRate: schoolF32(),
  /** Where it's heading for across the window (share of its width and height, from the middle), and until it picks somewhere else. */
  goalU: schoolF32(),
  goalV: schoolF32(),
  regoal: schoolF32(),
}

/** A bubble from a startled fish: its age and lifetime. No more than MAX_BUBBLES at once. */
export const Bubble = { age: f32(), life: f32() }
export const MAX_BUBBLES = 256
