import { addComponent, addEntity, query, removeEntity } from 'bitecs'
import { site } from '../../config/site'
import { Bubble, Chip, Fish, Position, Rotation, Velocity } from '../chips/components'
import { chipKeys } from '../chips/geometry'
import { layoutHomes, type Box } from '../chips/layout'
import { config } from '../config'
import { lightScale } from '../lamps'
import { random } from '../random'
import { localRect, type SceneWorld, type System } from '../world'

const C = config.chips
const S = C.swim
const TAU = Math.PI * 2
const rand = ([a, b]: readonly number[]) => a + random() * (b - a)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
/** The shortest turn from heading a to heading b (rad). */
const turn = (a: number, b: number) => {
  const d = (((b - a) % TAU) + TAU) % TAU
  return d > Math.PI ? d - TAU : d
}
/** World px per screen px at a depth below the surface. */
const depthScale = (world: SceneWorld, depth: number) => (world.view.distance + depth) / world.view.distance
/** Swimming distances and speeds are for a window with a 900 px short side; phones get them smaller, though not in full. */
const swimScale = (world: SceneWorld) => Math.min(1, Math.sqrt(lightScale(world)))

/** The still's clearance (px) around a moved chip: from the text, pills, HUD and other chips. */
const STILL_GAP = 16

/** Elements' boxes in world px (y up), as they'd line up `depth` px below the surface. */
function measure(world: SceneWorld, selectors: string[], depth = 0): Box[] {
  const { width: W, height: H } = world.viewport
  const k = depthScale(world, depth)
  return selectors
    .map((sel) => document.querySelector(sel))
    .filter((el): el is Element => Boolean(el))
    .map((el) => localRect(world, el))
    .map((r) => ({ x0: (r.left - W / 2) * k, x1: (r.right - W / 2) * k, y0: (H / 2 - r.bottom) * k, y1: (H / 2 - r.top) * k }))
}

/** The chips this window shows: phones show the ones in the mobile frame. */
function keysFor(world: SceneWorld) {
  if (world.capture && !world.capture.chips) return []
  const at = world.viewport.mobile ? C.mobile.at : C.desktop.at
  return site.stackChips.filter((k) => chipKeys.includes(k) && (!world.viewport.mobile || k in at))
}

/** A chip's spot in the still: its Figma position, scaled to this window (world px at the surface, y up). */
function homeOf(world: SceneWorld, key: string, i: number) {
  const { width: W, height: H, mobile } = world.viewport
  const layout = mobile ? C.mobile : C.desktop
  const at = layout.at as Record<string, readonly [number, number]>
  const [fx, fy] = at[key] ?? [layout.frame[0] * (0.15 + 0.7 * ((i * 0.618) % 1)), layout.frame[1] * 0.15]
  return { x: ((fx + C.size / 2) / layout.frame[0] - 0.5) * W, y: (0.5 - (fy + C.size / 2) / layout.frame[1]) * H }
}

function clear(world: SceneWorld) {
  for (const eid of query(world, [Chip])) removeEntity(world, eid)
  for (const eid of query(world, [Bubble])) removeEntity(world, eid)
}

function addChip(world: SceneWorld, key: string, swimming: boolean) {
  const eid = addEntity(world)
  for (const t of swimming ? [Chip, Position, Velocity, Rotation, Fish] : [Chip, Position, Velocity, Rotation]) addComponent(world, eid, t)
  Chip.kind[eid] = key
  Velocity.x[eid] = Velocity.y[eid] = Velocity.z[eid] = 0
  return eid
}

/**
 * Reduced motion (and captures): each chip floats still just under the
 * surface at its spot, moved off the name, title and pills where it would
 * cover them, rocked and lifted a little. It draws as many random numbers,
 * in the same order, as the chips that bobbed here once did (and keeps its
 * rock and lift at the float precision they did), so the still, with its
 * water and specks drawn after, comes out as it always has.
 */
function still(world: SceneWorld) {
  clear(world)
  const { width: W, height: H } = world.viewport
  const keys = keysFor(world)
  const scale = depthScale(world, C.surfaceDepth)
  const homes = layoutHomes(
    keys.map((key, i) => homeOf(world, key, i)),
    measure(world, ['.abyss', '.pills'], C.surfaceDepth),
    {
      frame: { x0: (-W / 2) * scale, y0: (-H / 2) * scale, x1: (W / 2) * scale, y1: (H / 2) * scale },
      size: C.size,
      gap: STILL_GAP,
      clear: measure(world, ['.hud', '.hint'], C.surfaceDepth),
    },
  )
  const rock = (C.bob.rock * Math.PI) / 180
  keys.forEach((key, i) => {
    const eid = addChip(world, key, false)
    const home = homes[i]
    const ph = Math.fround(random() * TAU)
    random()
    const lift = Math.fround(rand(C.bob.amplitude))
    random()
    random()
    Position.x[eid] = home.x
    Position.y[eid] = home.y
    Position.z[eid] = -C.surfaceDepth + lift * Math.sin(ph)
    Rotation.x[eid] = rock * 0.6 * Math.sin(ph * 1.3)
    Rotation.y[eid] = rock * 0.6 * Math.sin(ph * 0.7)
    Rotation.z[eid] = rock * Math.sin(ph)
  })
}

/** Where a fish swims in from (Fish.entering while it does). */
const Role = { side: 1, behind: 2, deep: 3 } as const
type Role = keyof typeof Role

/**
 * The fish swim in from out of sight: the most central rise out of the deep
 * in front of the camera, the ones nearest the top and bottom come from
 * behind it (past the window's edge, just under the surface), and the rest
 * from the side they're on, deeper. Each makes first for about its spot in
 * the still, at a depth, then swims free.
 */
function arrive(world: SceneWorld) {
  clear(world)
  const { width: W, height: H } = world.viewport
  const A = C.arrive
  const s = swimScale(world)
  const fish = keysFor(world).map((key, i) => ({
    key,
    home: homeOf(world, key, i),
    role: 'side' as Role,
    delay: 0,
    from: 0,
    // A little chance in who goes where.
    luck: random(),
  }))
  const free = () => fish.filter((f) => f.role === 'side')
  const centre = (f: (typeof fish)[number]) => Math.hypot(f.home.x / W, f.home.y / H) + f.luck * 0.15
  ;[...fish].sort((a, b) => centre(a) - centre(b)).slice(0, A.deep).forEach((f, i) => {
    f.role = 'deep'
    f.delay = i * 0.8 + random() * 0.3
  })
  for (let i = 0; i < A.behind; i++) {
    // Alternately from below the window and above it.
    const sign = i % 2 ? 1 : -1
    const edge = (f: (typeof fish)[number]) => sign * f.home.y + f.luck * H * 0.2
    const f = free().sort((a, b) => edge(b) - edge(a))[0]
    if (!f) break
    f.role = 'behind'
    f.from = sign
    f.delay = i * 1.2 + random() * 0.3
  }
  const sides = free().sort((a, b) => a.luck - b.luck)
  sides.forEach((f, i) => {
    f.from = Math.sign(f.home.x) || (i % 2 ? 1 : -1)
    f.delay = (A.stagger * (i + 0.2 + random() * 0.6)) / Math.max(1, sides.length)
  })

  for (const f of fish) {
    const eid = addChip(world, f.key, true)
    Fish.cruise[eid] = rand(S.cruise) * s
    Fish.phase[eid] = random() * TAU
    Fish.redepth[eid] = rand(S.redepth)
    Fish.burst[eid] = -rand(S.burst.every)
    Fish.wag[eid] = random() * TAU
    Fish.bank[eid] = 0
    Fish.age[eid] = 0
    Fish.delay[eid] = f.delay
    Fish.entering[eid] = Role[f.role]
    Fish.flee[eid] = 0
    Fish.wake[eid] = 0
    const goalDepth = f.role === 'deep' ? rand(A.depth.deep) : f.role === 'behind' ? rand(A.depth.behind) : rand(A.depth.side)
    Fish.homeX[eid] = f.home.x
    Fish.homeY[eid] = f.home.y
    Fish.goalZ[eid] = -goalDepth
    Fish.depth[eid] = goalDepth
    // Far enough past the edge to be out of sight.
    const margin = C.size * 0.75
    let x: number, y: number, z: number
    if (f.role === 'deep') {
      // Out of sight in the dark, nearer the middle than its spot.
      z = -A.deepFrom
      const k = depthScale(world, A.deepFrom)
      x = f.home.x * k * 0.6
      y = f.home.y * k * 0.6
    } else if (f.role === 'behind') {
      // Just past the window's top or bottom edge, under the surface.
      z = -A.behindFrom
      const k = depthScale(world, A.behindFrom)
      x = f.home.x * k * 0.8
      y = f.from * ((H / 2) * k + margin)
    } else {
      const d = goalDepth + rand(A.depth.sideDrop)
      const k = depthScale(world, d)
      z = -d
      x = f.from * ((W / 2) * k + margin)
      y = clamp(f.home.y * k + (random() - 0.5) * H * 0.3, (-H / 2) * k * 0.85, (H / 2) * k * 0.85)
    }
    Position.x[eid] = x
    Position.y[eid] = y
    Position.z[eid] = z
    const gk = depthScale(world, goalDepth)
    Fish.heading[eid] = Math.atan2(f.home.y * gk - y, f.home.x * gk - x)
    const boost = f.role === 'behind' ? A.behindBoost : A.boost
    Velocity.x[eid] = Math.cos(Fish.heading[eid]) * Fish.cruise[eid] * boost
    Velocity.y[eid] = Math.sin(Fish.heading[eid]) * Fish.cruise[eid] * boost
    Fish.boost[eid] = boost
  }
}

function drop(world: SceneWorld, eid: number, radius: number, strength: number) {
  const { width: W, height: H } = world.viewport
  const k = depthScale(world, -Position.z[eid])
  world.drops.push({ x: Position.x[eid] / k / W + 0.5, y: Position.y[eid] / k / H + 0.5, radius, strength })
}

function loose(world: SceneWorld, eid: number, count: number) {
  for (let i = 0; i < count; i++) {
    const b = addEntity(world)
    addComponent(world, b, Position)
    addComponent(world, b, Velocity)
    addComponent(world, b, Bubble)
    Position.x[b] = Position.x[eid] + (random() - 0.5) * 30
    Position.y[b] = Position.y[eid] + (random() - 0.5) * 30
    Position.z[b] = Position.z[eid] + random() * 10
    Velocity.x[b] = (random() - 0.5) * 90 - Velocity.x[eid] * 0.15
    Velocity.y[b] = (random() - 0.5) * 90 - Velocity.y[eid] * 0.15
    Velocity.z[b] = rand(C.bubbles.rise)
    Bubble.age[b] = 0
    Bubble.life[b] = rand(C.bubbles.life)
  }
}

/** Bubbles rise, drift, and pop at the surface or when they've had their time. */
function bubbles(world: SceneWorld, dt: number) {
  const drag = Math.pow(0.2, dt)
  for (const b of query(world, [Bubble, Position, Velocity])) {
    Bubble.age[b] += dt
    Velocity.x[b] *= drag
    Velocity.y[b] *= drag
    Position.x[b] += Velocity.x[b] * dt + Math.sin((Bubble.age[b] + b) * 9) * 0.3
    Position.y[b] += Velocity.y[b] * dt
    Position.z[b] += Velocity.z[b] * dt
    if (Bubble.age[b] >= Bubble.life[b] || Position.z[b] > -2) removeEntity(world, b)
  }
}

/** A press nearby: the fish darts away from it and dives, the shallow ones loosing bubbles. */
function startle(world: SceneWorld, eid: number, press: { x: number; y: number }, s: number) {
  const depth = -Position.z[eid]
  const k = depthScale(world, depth)
  const dx = Position.x[eid] / k - press.x
  const dy = Position.y[eid] / k - press.y
  const reach = C.scatter.radius * s
  // Seen from above; the deeper ones are further from it, and notice less.
  const d = Math.hypot(dx, dy, depth * 0.35)
  if (d >= reach) return
  const fright = 1 - d / reach
  const heading = Math.atan2(dy, dx) + (random() - 0.5) * 0.8
  const speed = rand(C.scatter.speed) * s * (0.65 + 0.35 * fright)
  Fish.heading[eid] = heading
  Fish.flee[eid] = Fish.fleeTime[eid] = C.scatter.time * (0.75 + 0.4 * fright)
  Fish.fleeSpeed[eid] = speed
  Fish.entering[eid] = 0
  Fish.depth[eid] = depth + C.scatter.dive * (0.5 + 0.5 * fright)
  Fish.redepth[eid] = rand(S.redepth)
  Fish.burst[eid] = -rand(S.burst.every)
  // It kicks off at full speed at once.
  Velocity.x[eid] = Math.cos(heading) * speed
  Velocity.y[eid] = Math.sin(heading) * speed
  Velocity.z[eid] = -(C.scatter.dive / C.scatter.time) * (0.5 + fright)
  if (depth < C.bubbles.from) loose(world, eid, Math.max(1, Math.round(C.bubbles.perDart * (1 - depth / C.bubbles.from))))
}

/** One fish's steering and stroke for this frame. */
function swim(world: SceneWorld, eid: number, school: number[], dt: number, s: number) {
  const t = world.time.elapsed
  const px = Position.x[eid]
  const py = Position.y[eid]
  const pz = Position.z[eid]
  const depth = -pz
  const k = depthScale(world, depth)
  const h = Fish.heading[eid]
  const ph = Fish.phase[eid]
  const cruise = Fish.cruise[eid]
  const fleeing = Fish.flee[eid] > 0
  const entering = Fish.entering[eid] > 0

  // Where it wants to go: on, unless something turns it.
  let fx = Math.cos(h)
  let fy = Math.sin(h)
  let speed = cruise * (1 + 0.15 * Math.sin(t * 0.41 + ph))
  let rise = clamp((-Fish.depth[eid] - pz) * 0.6, -45, 45) * s
  let agility = S.agility

  if (entering) {
    // Making for its spot, slowing as it nears it.
    const gk = depthScale(world, -Fish.goalZ[eid])
    const gx = Fish.homeX[eid] * gk - px
    const gy = Fish.homeY[eid] * gk - py
    const gz = Fish.goalZ[eid] - pz
    const dist = Math.hypot(gx, gy)
    fx += (gx / (dist || 1)) * 3
    fy += (gy / (dist || 1)) * 3
    speed *= 1 + (Fish.boost[eid] - 1) * smoothstep(0, 320 * s, dist + Math.abs(gz) * 0.5)
    const climb = C.arrive.climb
    const rate = Fish.entering[eid] === Role.deep ? climb.deep : Fish.entering[eid] === Role.behind ? climb.behind : climb.side
    rise = clamp(gz * rate, -climb.max, climb.max)
    if ((dist < 110 * s && Math.abs(gz) < 140) || Fish.age[eid] - Fish.delay[eid] > 12) Fish.entering[eid] = 0
  } else if (fleeing) {
    // Darting away, holding its line, and easing back to a cruise.
    Fish.flee[eid] -= dt
    const left = clamp(Fish.flee[eid] / Fish.fleeTime[eid], 0, 1)
    speed = cruise + (Fish.fleeSpeed[eid] - cruise) * left * left
    rise = clamp((-Fish.depth[eid] - pz) * 2.5, -C.scatter.dive * 2, 0)
  } else {
    // Loosely schooling: room from near neighbours, swimming their way, drifting together.
    let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, na = 0, nc = 0
    for (const o of school) {
      if (o === eid || Fish.entering[o]) continue
      const dx = Position.x[o] - px
      const dy = Position.y[o] - py
      const dz = Position.z[o] - pz
      const d = Math.hypot(dx, dy, dz * 0.7)
      if (d < S.separation * s && d > 0) {
        const w = 1 - d / (S.separation * s)
        sx -= (dx / d) * w
        sy -= (dy / d) * w
      }
      if (d < S.alignment * s) {
        ax += Math.cos(Fish.heading[o])
        ay += Math.sin(Fish.heading[o])
        na++
      }
      if (d < S.cohesion * s) {
        cx += dx
        cy += dy
        nc++
      }
    }
    fx += sx * 3
    fy += sy * 3
    if (na) {
      fx += (ax / na) * 0.35
      fy += (ay / na) * 0.35
    }
    if (nc) {
      fx += (cx / nc / (S.cohesion * s)) * 0.3
      fy += (cy / nc / (S.cohesion * s)) * 0.3
    }
    // It keeps to the water around its spot, turning back once it's strayed.
    const hx = Fish.homeX[eid] * k - px
    const hy = Fish.homeY[eid] * k - py
    const away = Math.hypot(hx, hy) || 1
    const range = S.range * world.viewport.width * k
    const pull = smoothstep(range * 0.6, range * 1.4, away) * 2.5
    fx += (hx / away) * pull
    fy += (hy / away) * pull

    // Bursts of speed, each with a swerve.
    const burst = Fish.burst[eid]
    if (burst > 0) {
      Fish.burst[eid] = burst - dt
      if (Fish.burst[eid] <= 0) Fish.burst[eid] = -rand(S.burst.every)
      const swell = Math.sin((Math.PI * burst) / S.burst.length)
      speed *= 1 + (S.burst.boost - 1) * swell
      const a = Fish.dart[eid]
      const rx = fx * Math.cos(a) - fy * Math.sin(a)
      fy = fx * Math.sin(a) + fy * Math.cos(a)
      fx = rx
      agility = S.agility * 2
    } else if ((Fish.burst[eid] = burst + dt) >= 0) {
      Fish.burst[eid] = S.burst.length
      Fish.dart[eid] = (random() < 0.5 ? -1 : 1) * rand(S.burst.swerve)
    }

    // Now and then, another depth.
    Fish.redepth[eid] -= dt
    if (Fish.redepth[eid] <= 0) {
      Fish.redepth[eid] = rand(S.redepth)
      Fish.depth[eid] = rand(S.depth)
    }
  }

  if (!entering) {
    // It roams past the window's edges, but not far, before turning back.
    const limX = (world.viewport.width / 2) * k
    const limY = (world.viewport.height / 2) * k
    fx -= Math.sign(px) * smoothstep(0.75, 1 + S.roam, Math.abs(px) / limX) * 4
    fy -= Math.sign(py) * smoothstep(0.75, 1 + S.roam, Math.abs(py) / limY) * 4
  }

  // Turn toward it, while the heading wanders.
  const before = Fish.heading[eid]
  const wander = Math.sin(t * 0.53 + ph * 7) * 0.65 + Math.sin(t * 1.37 + ph * 3) * 0.35
  let heading = before + (fleeing ? 0 : S.wander * wander * dt)
  heading += turn(heading, Math.atan2(fy, fx)) * (1 - Math.exp(-agility * (fleeing ? 0.5 : 1) * dt))
  Fish.heading[eid] = heading = ((heading % TAU) + TAU) % TAU

  // Speed and depth, taken up with a little inertia (quicker to speed up).
  let v = Math.hypot(Velocity.x[eid], Velocity.y[eid])
  v += (speed - v) * (1 - Math.exp(-(speed > v ? 5 : 1.6) * dt))
  Velocity.z[eid] += (rise - Velocity.z[eid]) * (1 - Math.exp(-2.5 * dt))

  // The tail: it beats faster the faster it swims, and sways the body.
  const beat = Math.min(S.wag.maxBeat, S.wag.perPx * v)
  Fish.wag[eid] += TAU * beat * dt
  const sway = S.wag.sway * s * TAU * beat * Math.cos(Fish.wag[eid])
  const c = Math.cos(heading)
  const sn = Math.sin(heading)
  Velocity.x[eid] = c * v
  Velocity.y[eid] = sn * v
  Position.x[eid] = px + (c * v - sn * sway) * dt
  Position.y[eid] = py + (sn * v + c * sway) * dt
  Position.z[eid] = Math.min(-4, pz + Velocity.z[eid] * dt)

  // Its pose: face turned a little toward where it's going, nose down when
  // it dives (up when it rises), banked into turns, and the tail's wag.
  const rate = turn(before, heading) / Math.max(dt, 1e-3)
  Fish.bank[eid] += (clamp(-rate * S.bank, -0.6, 0.6) - Fish.bank[eid]) * (1 - Math.exp(-5 * dt))
  const pitch = clamp(Math.atan2(-Velocity.z[eid], Math.max(v, 1)), -0.8, 0.8) * 0.85
  const wag = Math.sin(Fish.wag[eid]) * S.wag.angle * (fleeing ? 1.6 : 1)
  const roll = Fish.bank[eid] + wag * 0.8
  Rotation.x[eid] = -pitch * sn + roll * c
  Rotation.y[eid] = pitch * c + roll * sn
  Rotation.z[eid] = -S.lean * c + wag

  // Swimming just under the surface, it ripples it.
  if (depth < S.wake.depth) {
    Fish.wake[eid] -= dt
    if (Fish.wake[eid] <= 0) {
      Fish.wake[eid] = S.wake.every
      drop(world, eid, S.wake.radius, S.wake.strength * (1 - depth / S.wake.depth))
    }
  }
}

/**
 * The stack chips, from site.stackChips. With motion they're fish: they swim
 * in from out of sight when the scene starts, then wander, school loosely,
 * put on bursts of speed and change depth, never still; a press scatters the
 * ones near it. With reduced motion they float still at their spots.
 */
export function chipsSystem(): System {
  let shown = ''
  return {
    resize(world) {
      if (world.frozen) return still(world)
      // The fish carry on through a resize, keeping to their spots for the
      // new window; a different set (phone ↔ wider) swims in afresh.
      const keys: string[] = keysFor(world)
      if (keys.join() !== shown) {
        shown = keys.join()
        return arrive(world)
      }
      for (const eid of query(world, [Chip, Fish])) {
        const home = homeOf(world, Chip.kind[eid], keys.indexOf(Chip.kind[eid]))
        Fish.homeX[eid] = home.x
        Fish.homeY[eid] = home.y
      }
    },
    update(world) {
      const dt = world.time.delta
      if (world.frozen || dt === 0) return
      bubbles(world, dt)
      const s = swimScale(world)
      const press = world.input.press
      // The fish that have set off.
      const active: number[] = []
      for (const eid of query(world, [Chip, Fish])) {
        Fish.age[eid] += dt
        if (Fish.age[eid] >= Fish.delay[eid]) active.push(eid)
      }
      for (const eid of active) {
        if (press) startle(world, eid, press, s)
        swim(world, eid, active, dt, s)
      }
    },
  }
}
