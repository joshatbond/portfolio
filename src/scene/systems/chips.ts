import { addComponent, addEntity, query, removeEntity } from 'bitecs'
import { site } from '../../config/site'
import { Bubble, Chip, Fish, MAX_BUBBLES, MAX_SCHOOLS, Position, Rotation, School, Velocity } from '../chips/components'
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
/** How far past the window's edge a fish waits to swim in, out of sight (px). */
const OFFSTAGE = C.size * 0.75

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

/** A fish in a school, waiting for the school's next kick. */
const WAIT = -1e6

/** Sizes for schools of `n` fish, none left on its own. */
function schoolSizes(n: number) {
  const [lo, hi] = S.school.size
  const sizes: number[] = []
  for (let left = n; left > 0; ) {
    let size = Math.min(left, lo + Math.floor(random() * (hi - lo + 1)))
    if (left - size > 0 && left - size < lo) size = left - lo >= lo ? left - lo : left
    sizes.push(size)
    left -= size
  }
  return sizes
}

/**
 * The fish swim in from out of sight in small schools, from neighbouring
 * spots in the still: the most central school rises out of the deep in front
 * of the camera, the ones nearest the top and bottom come from behind it
 * (past the window's edge, just under the surface), and the rest from the
 * side they're on, deeper. Each school makes for about its spot, at a depth,
 * its fish a little apart and one after another, then swims free.
 */
function arrive(world: SceneWorld) {
  clear(world)
  const { width: W, height: H } = world.viewport
  const A = C.arrive
  const s = swimScale(world)
  // Schools of neighbouring spots: round the window, in runs.
  const fish = keysFor(world).map((key, i) => ({ key, home: homeOf(world, key, i) }))
  const angle = (f: (typeof fish)[number]) => Math.atan2(f.home.y / H, f.home.x / W)
  fish.sort((a, b) => angle(a) - angle(b))
  const start = Math.floor(random() * fish.length)
  const ring = [...fish.slice(start), ...fish.slice(0, start)]
  let at = 0
  const groups = schoolSizes(ring.length).map((size) => {
    const members = ring.slice(at, (at += size))
    const anchor = {
      x: members.reduce((t, f) => t + f.home.x, 0) / size,
      y: members.reduce((t, f) => t + f.home.y, 0) / size,
    }
    return { members, anchor, role: 'side' as Role, from: 0, delay: 0, luck: random() }
  })
  type Group = (typeof groups)[number]
  // Who comes from where: one from the deep and one or two from behind when there are enough, the rest from the sides.
  const free = () => groups.filter((g) => g.role === 'side')
  const deep = groups.length >= 3 ? A.deep : 0
  const behind = Math.min(A.behind, Math.max(groups.length >= 2 ? 1 : 0, groups.length - deep - 2))
  const centre = (g: Group) => Math.hypot(g.anchor.x / W, g.anchor.y / H) + g.luck * 0.15
  ;[...groups].sort((a, b) => centre(a) - centre(b)).slice(0, deep).forEach((g, i) => {
    g.role = 'deep'
    g.delay = i * 0.8 + random() * 0.3
  })
  for (let i = 0; i < behind; i++) {
    // Alternately from below the window and above it.
    const sign = i % 2 ? 1 : -1
    const edge = (g: Group) => sign * g.anchor.y + g.luck * H * 0.2
    const g = free().sort((a, b) => edge(b) - edge(a))[0]
    if (!g) break
    g.role = 'behind'
    g.from = sign
    g.delay = i * 1.2 + random() * 0.3
  }
  const sides = free().sort((a, b) => a.luck - b.luck)
  sides.forEach((g, i) => {
    g.from = Math.sign(g.anchor.x) || (i % 2 ? 1 : -1)
    g.delay = (A.stagger * (i + 0.2 + random() * 0.6)) / Math.max(1, sides.length)
  })

  groups.forEach((g, gi) => {
    const id = gi + 1
    const goalDepth = g.role === 'deep' ? rand(A.depth.deep) : g.role === 'behind' ? rand(A.depth.behind) : rand(A.depth.side)
    School.depth[id] = goalDepth
    School.redepth[id] = rand(S.depth.every)
    School.beat[id] = -rand([0.5, 1.5])
    // First its spot in the still, then somewhere new.
    School.goalU[id] = g.anchor.x / W
    School.goalV[id] = g.anchor.y / H
    School.regoal[id] = rand(S.school.wander)
    const pace = rand(S.pace)
    const boost = g.role === 'behind' ? A.behindBoost : A.boost
    // Where the school sets off from, out of sight.
    let x0: number, y0: number, z0: number
    if (g.role === 'deep') {
      // In the dark, nearer the middle than its spot.
      z0 = -A.deepFrom
      const k = depthScale(world, A.deepFrom)
      x0 = g.anchor.x * k * 0.6
      y0 = g.anchor.y * k * 0.6
    } else if (g.role === 'behind') {
      // Just past the window's top or bottom edge, under the surface.
      z0 = -A.behindFrom
      const k = depthScale(world, A.behindFrom)
      x0 = g.anchor.x * k * 0.8
      y0 = g.from * ((H / 2) * k + OFFSTAGE)
    } else {
      const d = goalDepth + rand(A.depth.sideDrop)
      const k = depthScale(world, d)
      z0 = -d
      x0 = g.from * ((W / 2) * k + OFFSTAGE)
      y0 = clamp(g.anchor.y * k + (random() - 0.5) * H * 0.3, (-H / 2) * k * 0.85, (H / 2) * k * 0.85)
    }
    let delay = g.delay
    for (const f of g.members) {
      const eid = addChip(world, f.key, true)
      Fish.school[eid] = id
      Fish.lonely[eid] = 0
      Fish.pace[eid] = pace * (0.97 + random() * 0.06)
      Fish.redepth[eid] = rand(S.depth.every)
      Fish.kick[eid] = 0
      Fish.pitch[eid] = 0
      Fish.bank[eid] = 0
      Fish.age[eid] = 0
      Fish.delay[eid] = delay
      delay += rand(A.follow)
      Fish.entering[eid] = Role[g.role]
      Fish.flee[eid] = 0
      Fish.wake[eid] = 0
      // Its place in the school as it swims in.
      const ox = (random() * 2 - 1) * A.spread * s
      const oy = (random() * 2 - 1) * A.spread * s
      const oz = (random() * 2 - 1) * 25
      Fish.homeX[eid] = g.anchor.x + ox
      Fish.homeY[eid] = g.anchor.y + oy
      Fish.goalZ[eid] = -(goalDepth + oz)
      Fish.depth[eid] = goalDepth + oz
      const k = depthScale(world, -z0)
      // Out of sight, behind the edge it comes in from.
      Position.x[eid] = x0 + (g.role === 'side' ? g.from * Math.abs(ox) : ox) * k
      Position.y[eid] = y0 + (g.role === 'behind' ? g.from * Math.abs(oy) : oy) * k
      Position.z[eid] = z0 - Math.abs(oz)
      const gk = depthScale(world, goalDepth)
      Fish.heading[eid] = Math.atan2(Fish.homeY[eid] * gk - Position.y[eid], Fish.homeX[eid] * gk - Position.x[eid])
      Velocity.x[eid] = Math.cos(Fish.heading[eid]) * Fish.pace[eid] * s * boost
      Velocity.y[eid] = Math.sin(Fish.heading[eid]) * Fish.pace[eid] * s * boost
      Fish.boost[eid] = boost
    }
  })
}

/** A fish that hasn't set off yet, back out of sight past the edge it comes in from (a deep one is out of sight already). */
function park(world: SceneWorld, eid: number) {
  const k = depthScale(world, -Position.z[eid])
  const { width: W, height: H } = world.viewport
  if (Fish.entering[eid] === Role.side) Position.x[eid] = Math.sign(Position.x[eid]) * ((W / 2) * k + OFFSTAGE)
  if (Fish.entering[eid] === Role.behind) Position.y[eid] = Math.sign(Position.y[eid]) * ((H / 2) * k + OFFSTAGE)
}

function drop(world: SceneWorld, eid: number, radius: number, strength: number) {
  const { width: W, height: H } = world.viewport
  const k = depthScale(world, -Position.z[eid])
  world.drops.push({ x: Position.x[eid] / k / W + 0.5, y: Position.y[eid] / k / H + 0.5, radius, strength })
}

function loose(world: SceneWorld, eid: number, count: number) {
  const room = MAX_BUBBLES - query(world, [Bubble]).length
  for (let i = 0; i < Math.min(count, room); i++) {
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

/** The fish swimming now, and their schools: each school's fish, middle and the fish that leads its kicks. */
interface Shoal {
  all: number[]
  schools: Map<number, number[]>
  middle: Map<number, { x: number; y: number; z: number }>
  lead: Map<number, number>
}

/** The school's fish that are swimming with it now (not still swimming in). */
const swimming = (members: number[]) => members.filter((m) => !Fish.entering[m])

function shoalOf(all: number[]): Shoal {
  const schools = new Map<number, number[]>()
  for (const eid of all) {
    const id = Fish.school[eid]
    if (!id) continue
    const members = schools.get(id)
    if (members) members.push(eid)
    else schools.set(id, [eid])
  }
  const middle = new Map<number, { x: number; y: number; z: number }>()
  const lead = new Map<number, number>()
  for (const [id, members] of schools) {
    const here = swimming(members)
    if (!here.length) continue
    middle.set(id, {
      x: here.reduce((t, m) => t + Position.x[m], 0) / here.length,
      y: here.reduce((t, m) => t + Position.y[m], 0) / here.length,
      z: here.reduce((t, m) => t + Position.z[m], 0) / here.length,
    })
    lead.set(id, here[0])
  }
  return { all, schools, middle, lead }
}

/** The smallest school id no fish has. */
function freeSchool(world: SceneWorld) {
  const used = new Set<number>()
  for (const eid of query(world, [Chip, Fish])) used.add(Fish.school[eid])
  for (let id = 1; id < MAX_SCHOOLS; id++) if (!used.has(id)) return id
  return 0
}

/** A startled fish kicks away along `heading` and dives, the shallow ones loosing bubbles. */
function startle(world: SceneWorld, eid: number, heading: number, fright: number, s: number) {
  const depth = -Position.z[eid]
  const speed = rand(C.scatter.speed) * s * (0.65 + 0.35 * fright)
  // It turns away at once and kicks off hard, nose down.
  Fish.heading[eid] = Fish.turnTo[eid] = ((heading % TAU) + TAU) % TAU
  Fish.pitch[eid] = Fish.pitchTo[eid] = -S.climb * (0.6 + 0.4 * fright)
  Fish.kick[eid] = S.kick.length * 1.4
  Fish.kickSpeed[eid] = speed
  Fish.flee[eid] = C.scatter.time * (0.75 + 0.4 * fright)
  Fish.entering[eid] = 0
  Fish.depth[eid] = depth + C.scatter.dive * (0.5 + 0.5 * fright)
  Fish.redepth[eid] = rand(S.depth.every)
  setVelocity(eid, speed * 0.7)
  if (depth < C.bubbles.from) loose(world, eid, Math.max(1, Math.round(C.bubbles.perDart * (1 - depth / C.bubbles.from))))
}

/**
 * A press: every school whose middle is within reach breaks up, its fish
 * flashing apart (away from the press and from the school's middle) to swim
 * on their own; fish on their own within reach dart away from it too.
 * Schools further off carry on.
 */
function scatter(world: SceneWorld, shoal: Shoal, press: { x: number; y: number }, s: number) {
  const reach = C.scatter.radius * s
  // How far from the press a point in the water is, seen from above; the
  // deeper, the further, so the deep barely notice.
  const far = (x: number, y: number, z: number) => {
    const k = depthScale(world, -z)
    return Math.hypot(x / k - press.x, y / k - press.y, -z * C.scatter.depth * s)
  }
  const away = (eid: number) => {
    const k = depthScale(world, -Position.z[eid])
    return { x: Position.x[eid] / k - press.x, y: Position.y[eid] / k - press.y }
  }
  const fright = new Map<number, number>()
  for (const eid of shoal.all) {
    const d = far(Position.x[eid], Position.y[eid], Position.z[eid])
    if (d < reach) fright.set(eid, 1 - d / reach)
  }
  // Where each school is to be seen, its fish still swimming in included.
  const broken = new Set<number>()
  const seen = new Map<number, { x: number; y: number }>()
  for (const [id, members] of shoal.schools) {
    const mid = {
      x: members.reduce((t, m) => t + Position.x[m], 0) / members.length,
      y: members.reduce((t, m) => t + Position.y[m], 0) / members.length,
      z: members.reduce((t, m) => t + Position.z[m], 0) / members.length,
    }
    seen.set(id, mid)
    if (far(mid.x, mid.y, mid.z) < reach) broken.add(id)
  }
  const startled = new Set<number>()
  for (const id of broken) {
    const members = shoal.schools.get(id) ?? []
    const mid = seen.get(id)
    // Any of its fish yet to set off will swim in on their own.
    for (const eid of query(world, [Chip, Fish])) {
      if (Fish.school[eid] !== id || members.includes(eid)) continue
      Fish.school[eid] = 0
      Fish.lonely[eid] = -rand(S.school.regroup)
    }
    for (const m of members) {
      const a = away(m)
      const al = Math.hypot(a.x, a.y) || 1
      let bx = mid ? Position.x[m] - mid.x : 0
      let by = mid ? Position.y[m] - mid.y : 0
      const bl = Math.hypot(bx, by) || 1
      bx /= bl
      by /= bl
      const heading = Math.atan2((a.y / al) * 0.7 + by, (a.x / al) * 0.7 + bx) + (random() - 0.5) * 0.6
      startle(world, m, heading, Math.max(fright.get(m) ?? 0, 0.35), s)
      Fish.school[m] = 0
      Fish.lonely[m] = -rand(S.school.regroup)
      startled.add(m)
    }
  }
  for (const [eid, f] of fright) {
    // Fish in a school that carries on stay with it; those just broken away have darted already.
    if (Fish.school[eid] || startled.has(eid)) continue
    const a = away(eid)
    startle(world, eid, Math.atan2(a.y, a.x) + (random() - 0.5) * 0.8, f, s)
    Fish.lonely[eid] = -rand(S.school.regroup)
  }
}

/**
 * Fish on their own look for company once they've been alone a while: a
 * school with room nearby, or another fish on its own, to start a new one.
 */
function regroup(world: SceneWorld, shoal: Shoal, dt: number, s: number) {
  const join = S.school.join * s
  const ready = (o: number) => !Fish.school[o] && !Fish.entering[o] && Fish.flee[o] <= 0 && Fish.lonely[o] >= 0
  for (const eid of shoal.all) {
    if (Fish.school[eid] || Fish.entering[eid] || Fish.flee[eid] > 0) continue
    Fish.lonely[eid] += dt
    if (Fish.lonely[eid] < 0) continue
    const at = (x: number, y: number, z: number) => Math.hypot(x - Position.x[eid], y - Position.y[eid], z - Position.z[eid])
    let school = 0
    let best = join
    for (const [id, members] of shoal.schools) {
      const mid = shoal.middle.get(id)
      if (!mid || members.length >= S.school.most) continue
      const d = at(mid.x, mid.y, mid.z)
      if (d < best) [school, best] = [id, d]
    }
    let mate = 0
    if (!school) {
      for (const o of shoal.all) {
        if (o === eid || !ready(o)) continue
        const d = at(Position.x[o], Position.y[o], Position.z[o])
        if (d < best) [mate, best] = [o, d]
      }
      if (!mate) continue
      school = freeSchool(world)
      if (!school) continue
      School.depth[school] = clamp((Fish.depth[eid] + Fish.depth[mate]) / 2, S.depth.band[0], S.depth.band[1])
      School.redepth[school] = rand(S.depth.every)
      School.beat[school] = -rand([0.2, 0.8])
      shoal.schools.set(school, [])
      newGoal(world, shoal, school)
    }
    const members = shoal.schools.get(school)!
    for (const f of mate ? [eid, mate] : [eid]) {
      Fish.school[f] = school
      Fish.depth[f] = clamp(School.depth[school] + (random() - 0.5) * 50, S.depth.band[0], S.depth.band[1])
      if (Fish.kick[f] <= 0) Fish.kick[f] = WAIT
      members.push(f)
    }
    // The school's middle moves with its new fish, for whoever looks to join next.
    const here = swimming(members)
    shoal.middle.set(school, {
      x: here.reduce((t, m) => t + Position.x[m], 0) / here.length,
      y: here.reduce((t, m) => t + Position.y[m], 0) / here.length,
      z: here.reduce((t, m) => t + Position.z[m], 0) / here.length,
    })
  }
}

/**
 * Somewhere in open water for a school to head for: of a few spots in the
 * window, the one furthest from the other schools and where they're heading.
 */
function newGoal(world: SceneWorld, shoal: Shoal, id: number) {
  const { width: W, height: H } = world.viewport
  let room = -1
  for (let n = 0; n < 6; n++) {
    const u = (random() - 0.5) * 0.8
    const v = (random() - 0.5) * 0.76
    let nearest = Infinity
    for (const [other, m] of shoal.middle) {
      if (other === id) continue
      const k = depthScale(world, -m.z)
      nearest = Math.min(nearest, Math.hypot(u * W - m.x / k, v * H - m.y / k), Math.hypot((u - School.goalU[other]) * W, (v - School.goalV[other]) * H))
    }
    if (nearest > room) {
      room = nearest
      School.goalU[id] = u
      School.goalV[id] = v
    }
  }
  School.regoal[id] = rand(S.school.wander)
}

/**
 * Each school's beat: its fish kick one after another, a moment apart,
 * the first leading; now and then the school picks a new depth, and
 * somewhere new to head for once it's there.
 */
function schoolBeats(world: SceneWorld, shoal: Shoal, dt: number, s: number) {
  for (const [id, members] of shoal.schools) {
    const here = members.filter((m) => !Fish.entering[m] && Fish.flee[m] <= 0)
    if (!here.length) continue
    const mid = shoal.middle.get(id)
    School.regoal[id] -= dt
    if (mid) {
      const k = depthScale(world, -mid.z)
      const there = Math.hypot(mid.x / k - School.goalU[id] * world.viewport.width, mid.y / k - School.goalV[id] * world.viewport.height)
      if (School.regoal[id] <= 0 || there < 120 * s) newGoal(world, shoal, id)
    }
    School.redepth[id] -= dt
    if (School.redepth[id] <= 0) {
      School.redepth[id] = rand(S.depth.every)
      School.depth[id] = newDepth(shoal.all, members)
      for (const m of members) Fish.depth[m] = clamp(School.depth[id] + (random() - 0.5) * 50, S.depth.band[0], S.depth.band[1])
    }
    School.beat[id] += dt
    if (School.beat[id] < 0) continue
    School.beat[id] = -rand(S.kick.glide)
    let lag = 0
    for (const m of here) {
      if (Fish.kick[m] <= 0) Fish.kick[m] = -lag
      lag += rand(S.school.lag)
    }
  }
}

/** Velocity along the fish's heading and pitch. */
function setVelocity(eid: number, speed: number) {
  const h = Fish.heading[eid]
  const p = Fish.pitch[eid]
  Velocity.x[eid] = Math.cos(h) * Math.cos(p) * speed
  Velocity.y[eid] = Math.sin(h) * Math.cos(p) * speed
  Velocity.z[eid] = Math.sin(p) * speed
}

/**
 * Where a fish wants to go: a direction across the view (x, y) and a climb
 * (+) or dive (−) from -1 to 1 (z). Every fish keeps clear of the others and
 * within the window. In a school it swims the school's way and keeps to its
 * middle, the school keeping its distance from the others; on its own,
 * once it's ready, it swims toward company. Gliding (`full` false), only
 * keeping clear, keeping to its school and the window's edges count.
 */
function steer(world: SceneWorld, eid: number, shoal: Shoal, s: number, full: boolean) {
  const px = Position.x[eid]
  const py = Position.y[eid]
  const pz = Position.z[eid]
  const k = depthScale(world, -pz)
  const W = world.viewport.width
  const h = Fish.heading[eid]
  let fx = Math.cos(h)
  let fy = Math.sin(h)
  let fz = 0
  // Room from every fish near it.
  for (const o of shoal.all) {
    if (o === eid || Fish.entering[o]) continue
    const dx = Position.x[o] - px
    const dy = Position.y[o] - py
    const dz = Position.z[o] - pz
    const d = Math.hypot(dx, dy, dz)
    if (d < S.separation * s && d > 0) {
      const w = (1 - d / (S.separation * s)) * 3
      fx -= (dx / d) * w
      fy -= (dy / d) * w
      fz -= (dz / d) * w
    }
  }
  const id = Fish.school[eid]
  const mid = id ? shoal.middle.get(id) : undefined
  if (mid) {
    // To the school's middle,
    const reach = S.school.cohesion * s
    const cx = mid.x - px
    const cy = mid.y - py
    const cz = mid.z - pz
    const pull = Math.min(1.5, Math.hypot(cx, cy, cz) / reach) / (Math.hypot(cx, cy, cz) || 1)
    const cohere = S.school.cohere * (full ? 1 : 0.5)
    fx += cx * pull * cohere
    fy += cy * pull * cohere
    fz += cz * pull * cohere
  }
  if (full) {
    if (mid) {
      // its way (the way its fish are kicking toward, as they do),
      let ax = 0, ay = 0, ap = 0, n = 0
      for (const m of shoal.schools.get(id) ?? []) {
        if (m === eid || Fish.entering[m]) continue
        const kicking = Fish.kick[m] > 0
        ax += Math.cos(kicking ? Fish.turnTo[m] : Fish.heading[m])
        ay += Math.sin(kicking ? Fish.turnTo[m] : Fish.heading[m])
        ap += Math.sin(kicking ? Fish.pitchTo[m] : Fish.pitch[m])
        n++
      }
      if (n) {
        fx += (ax / n) * S.school.align
        fy += (ay / n) * S.school.align
        fz += (ap / n) * S.school.align
      }
      // toward where it's heading,
      const gx = School.goalU[id] * W * k - px
      const gy = School.goalV[id] * world.viewport.height * k - py
      const gd = Math.hypot(gx, gy) || 1
      fx += (gx / gd) * S.school.travel
      fy += (gy / gd) * S.school.travel
      // and clear of the other schools.
      const room = S.school.spacing * W * k
      for (const [other, m] of shoal.middle) {
        if (other === id) continue
        const dx = px - m.x
        const dy = py - m.y
        const d = Math.hypot(dx, dy) || 1
        if (d < room) {
          fx += (dx / d) * (1 - d / room) * 1.5
          fy += (dy / d) * (1 - d / room) * 1.5
        }
      }
    } else if (Fish.lonely[eid] >= 0) {
      // On its own, toward the nearest company: a school with room, or another fish on its own.
      let best = Infinity
      let to: { x: number; y: number; z: number } | null = null
      for (const [other, m] of shoal.middle) {
        if ((shoal.schools.get(other)?.length ?? 0) >= S.school.most) continue
        const d = Math.hypot(m.x - px, m.y - py, m.z - pz)
        if (d < best) [best, to] = [d, m]
      }
      for (const o of shoal.all) {
        if (o === eid || Fish.school[o] || Fish.entering[o]) continue
        const d = Math.hypot(Position.x[o] - px, Position.y[o] - py, Position.z[o] - pz)
        if (d < best) [best, to] = [d, { x: Position.x[o], y: Position.y[o], z: Position.z[o] }]
      }
      if (to) {
        const d = Math.max(best, 1)
        fx += ((to.x - px) / d) * 2.5
        fy += ((to.y - py) / d) * 2.5
        fz += ((to.z - pz) / d) * 2.5
      }
    }
    // Toward the depth it's making for.
    fz += (-Fish.depth[eid] - pz) / 160
  }
  // Within the window: not far past its edges.
  const limX = (W / 2) * k
  const limY = (world.viewport.height / 2) * k
  fx -= Math.sign(px) * smoothstep(0.7, 1 + S.roam, Math.abs(px) / limX) * 4
  fy -= Math.sign(py) * smoothstep(0.7, 1 + S.roam, Math.abs(py) / limY) * 4
  return { x: fx, y: fy, z: clamp(fz, -1, 1) }
}

/** How many of `fish` can be seen and are staying where they can. */
const inSight = (fish: number[]) =>
  fish.filter((o) => -Position.z[o] < S.depth.visibleDepth && Fish.depth[o] < S.depth.visibleDepth).length

/**
 * A new depth for a school (or a fish on its own): mostly shallow, and
 * shallow for sure while too few of the others would be seen.
 */
function newDepth(all: number[], own: number[]) {
  const D = S.depth
  const others = all.filter((o) => !own.includes(o))
  const [lo, hi] = inSight(others) < D.visible * others.length ? [D.band[0], D.visibleDepth] : D.band
  return lo + (hi - lo) * random() ** D.bias
}

/** One fish's steering and stroke for this frame. */
function swim(world: SceneWorld, eid: number, shoal: Shoal, dt: number, s: number) {
  const pz = Position.z[eid]
  const depth = -pz
  const before = Fish.heading[eid]
  const id = Fish.school[eid]
  // A school kicks at its own pace, all its fish together.
  const mates = id ? swimming(shoal.schools.get(id) ?? []) : []
  const pace = (mates.length ? mates.reduce((t, m) => t + Fish.pace[m], 0) / mates.length : Fish.pace[eid]) * s

  if (Fish.entering[eid] > 0) {
    // Swimming in, making for its spot and slowing as it nears it.
    const gk = depthScale(world, -Fish.goalZ[eid])
    const gx = Fish.homeX[eid] * gk - Position.x[eid]
    const gy = Fish.homeY[eid] * gk - Position.y[eid]
    const gz = Fish.goalZ[eid] - pz
    const dist = Math.hypot(gx, gy)
    const want = Math.atan2(Math.sin(before) + (gy / (dist || 1)) * 3, Math.cos(before) + (gx / (dist || 1)) * 3)
    const heading = before + turn(before, want) * (1 - Math.exp(-C.arrive.agility * dt))
    Fish.heading[eid] = ((heading % TAU) + TAU) % TAU
    const speed = Fish.pace[eid] * s * (1 + (Fish.boost[eid] - 1) * smoothstep(0, 320 * s, dist + Math.abs(gz) * 0.5))
    const climb = C.arrive.climb
    const rate = Fish.entering[eid] === Role.deep ? climb.deep : Fish.entering[eid] === Role.behind ? climb.behind : climb.side
    let v = Math.hypot(Velocity.x[eid], Velocity.y[eid])
    v += (speed - v) * (1 - Math.exp(-(speed > v ? 5 : 1.6) * dt))
    Velocity.x[eid] = Math.cos(Fish.heading[eid]) * v
    Velocity.y[eid] = Math.sin(Fish.heading[eid]) * v
    Velocity.z[eid] += (clamp(gz * rate, -climb.max, climb.max) - Velocity.z[eid]) * (1 - Math.exp(-2.5 * dt))
    Fish.pitch[eid] = Math.atan2(Velocity.z[eid], Math.max(v, 1))
    if ((dist < 110 * s && Math.abs(gz) < 140) || Fish.age[eid] - Fish.delay[eid] > 12) {
      // There: it glides on a moment, then swims as the others do.
      Fish.entering[eid] = 0
      Fish.kick[eid] = id ? WAIT : -rand([0.2, 1.2])
    }
  } else {
    // Burst and glide: a short, hard kick, aimed, then a long coast.
    let v = Math.hypot(Velocity.x[eid], Velocity.y[eid], Velocity.z[eid])
    const fleeing = Fish.flee[eid] > 0
    if (fleeing) {
      Fish.flee[eid] -= dt
      // Diving away from a press: down to the depth it dived for, then level.
      if (depth >= Fish.depth[eid]) Fish.pitchTo[eid] = Math.max(Fish.pitchTo[eid], 0)
    }
    const kick = Fish.kick[eid]
    if (kick > 0) {
      Fish.kick[eid] = kick - dt
      v += (Fish.kickSpeed[eid] - v) * (1 - Math.exp(-14 * dt))
      const take = 1 - Math.exp(-S.agility.kick * dt)
      Fish.heading[eid] = before + turn(before, Fish.turnTo[eid]) * take
      Fish.pitch[eid] += (Fish.pitchTo[eid] - Fish.pitch[eid]) * take
      // In a school it waits for the school's next kick; on its own, it picks its moment.
      if (Fish.kick[eid] <= 0) Fish.kick[eid] = Fish.school[eid] ? WAIT : -rand(S.kick.glide) / (Fish.lonely[eid] >= 0 ? S.school.chase : 1)
    } else {
      const drift = pace * S.kick.drift
      v = drift + (v - drift) * Math.exp(-dt / S.kick.coast)
      const level = 1 - Math.exp(-S.level * dt)
      if (fleeing) Fish.pitch[eid] -= Fish.pitch[eid] * level
      else {
        // Holding its line, only easing clear of the others (up or down too),
        // toward its school and back into the window, and levelling out.
        const f = steer(world, eid, shoal, s, false)
        Fish.heading[eid] = before + turn(before, Math.atan2(f.y, f.x)) * (1 - Math.exp(-S.agility.glide * dt))
        Fish.pitch[eid] += (f.z * S.climb * 0.5 - Fish.pitch[eid]) * level
        Fish.kick[eid] = kick + dt
      }
      // Gliding past the depth it's making for (a press's dive included), it levels out quickly.
      if (Fish.pitch[eid] < 0 ? depth >= Fish.depth[eid] : depth <= Fish.depth[eid]) Fish.pitch[eid] *= Math.exp(-8 * dt)
      if (Fish.kick[eid] >= 0) {
        // The next kick, aimed where it wants to go, a swerve off that (much
        // less when it follows its school), and up or down; a fish that's
        // fallen behind its school kicks a little harder, one ahead softer.
        const f = steer(world, eid, shoal, s, true)
        const leads = !id || shoal.lead.get(id) === eid
        const swerve = leads ? S.swerve : S.swerve * 0.15
        Fish.turnTo[eid] = Math.atan2(f.y, f.x) + (random() < 0.5 ? -1 : 1) * random() * swerve
        Fish.pitchTo[eid] = clamp(f.z + (random() - 0.5) * (leads ? 0.3 : 0.1), -1, 1) * S.climb
        let keep = 1
        const mid = id ? shoal.middle.get(id) : undefined
        if (mid && mates.length > 1) {
          const behind = (mid.x - Position.x[eid]) * Math.cos(Fish.turnTo[eid]) + (mid.y - Position.y[eid]) * Math.sin(Fish.turnTo[eid])
          keep += clamp(behind / (S.separation * s * 1.5), -0.35, 0.35)
        }
        // On its own and looking for company, it swims harder to catch up.
        if (!id && Fish.lonely[eid] >= 0) keep *= S.school.chase
        Fish.kickSpeed[eid] = pace * S.kick.boost * (1 + S.kick.vary * (random() * 2 - 1) * (leads ? 1 : 0.3)) * keep
        Fish.kick[eid] = S.kick.length * (0.8 + random() * 0.4)
      }
    }
    // Not out through the surface, nor down past the deep.
    if (depth < S.depth.band[0] && Fish.pitch[eid] > 0) Fish.pitch[eid] *= Math.exp(-8 * dt)
    if (depth > S.depth.band[1] + 120 && Fish.pitch[eid] < 0) Fish.pitch[eid] *= Math.exp(-8 * dt)
    Fish.heading[eid] = ((Fish.heading[eid] % TAU) + TAU) % TAU
    setVelocity(eid, v)

    // On its own, it picks its own depths now and then.
    if (!id) {
      Fish.redepth[eid] -= dt
      if (Fish.redepth[eid] <= 0 && Fish.flee[eid] <= 0) {
        Fish.depth[eid] = newDepth(shoal.all, [eid])
        Fish.redepth[eid] = rand(S.depth.every)
      }
    }
  }

  Position.x[eid] += Velocity.x[eid] * dt
  Position.y[eid] += Velocity.y[eid] * dt
  Position.z[eid] = Math.min(-4, pz + Velocity.z[eid] * dt)

  // Its pose: face turned a little toward where it's going, nose down as it
  // dives (up as it climbs), and banked into its turns.
  const h = Fish.heading[eid]
  const c = Math.cos(h)
  const sn = Math.sin(h)
  const rate = turn(before, h) / Math.max(dt, 1e-3)
  Fish.bank[eid] += (clamp(-rate * S.bank, -0.4, 0.4) - Fish.bank[eid]) * (1 - Math.exp(-5 * dt))
  const tilt = -clamp(Fish.pitch[eid], -0.8, 0.8) * 0.85
  const roll = Fish.bank[eid]
  Rotation.x[eid] = -tilt * sn + roll * c
  Rotation.y[eid] = tilt * c + roll * sn
  Rotation.z[eid] = -S.lean * c

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
 * in from out of sight in small schools when the scene starts, then swim in
 * bursts and glides, each school as one, ranging from just under the
 * surface down into the dark; a press breaks up the schools near it, and in
 * a while the fish regroup. With reduced motion they float still at their
 * spots.
 */
export function chipsSystem(): System {
  let shown = ''
  let size = { width: 1, height: 1 }
  return {
    resize(world) {
      if (world.frozen) return still(world)
      // The fish carry on through a resize (those yet to swim in making for
      // the same spots in the new window, out of its sight meanwhile); a
      // different set (phone ↔ wider) swims in afresh.
      const keys: string[] = keysFor(world)
      const { width: W, height: H } = world.viewport
      if (!W || !H) return
      if (keys.join() !== shown) {
        shown = keys.join()
        size = { width: W, height: H }
        return arrive(world)
      }
      for (const eid of query(world, [Chip, Fish])) {
        Fish.homeX[eid] *= W / size.width
        Fish.homeY[eid] *= H / size.height
        if (Fish.age[eid] < Fish.delay[eid]) park(world, eid)
      }
      size = { width: W, height: H }
    },
    update(world) {
      const dt = world.time.delta
      if (world.frozen || dt === 0 || !world.viewport.width || !world.viewport.height) return
      bubbles(world, dt)
      const s = swimScale(world)
      // The fish that have set off.
      const all: number[] = []
      for (const eid of query(world, [Chip, Fish])) {
        Fish.age[eid] += dt
        if (Fish.age[eid] >= Fish.delay[eid]) all.push(eid)
      }
      let shoal = shoalOf(all)
      if (world.input.press) {
        scatter(world, shoal, world.input.press, s)
        shoal = shoalOf(all)
      }
      regroup(world, shoal, dt, s)
      shoal = shoalOf(all)
      schoolBeats(world, shoal, dt, s)
      for (const eid of all) swim(world, eid, shoal, dt, s)
    },
  }
}
