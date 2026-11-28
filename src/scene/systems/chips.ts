import { addComponent, addEntity, query, removeEntity } from 'bitecs'
import { site } from '../../config/site'
import { Bob, Chip, Home, Mode, Position, Rotation, State, Velocity } from '../chips/components'
import { chipKeys } from '../chips/geometry'
import { config } from '../config'
import type { SceneWorld, System } from '../world'

const C = config.chips
const rand = ([a, b]: readonly [number, number] | readonly number[]) => a + Math.random() * (b - a)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const terms = [Chip, Position, Velocity, Rotation, Home, Bob, State]

/** Screen-to-world scale at a depth below the surface. */
const depthScale = (world: SceneWorld, depth: number) => (world.view.distance + depth) / world.view.distance

function spawn(world: SceneWorld) {
  for (const eid of query(world, [Chip])) removeEntity(world, eid)
  const { width: W, height: H, mobile } = world.viewport
  const layout = mobile ? C.mobile : C.desktop
  const at = layout.at as Record<string, readonly [number, number]>
  const keys = world.capture && !world.capture.chips ? [] : site.stackChips.filter((k) => chipKeys.includes(k) && (!mobile || k in at))
  keys.forEach((key, i) => {
    const eid = addEntity(world)
    for (const t of terms) addComponent(world, eid, t)
    Chip.kind[eid] = key
    // Figma position (top-left of the 64px chip), scaled to this window.
    const [fx, fy] = at[key] ?? [layout.frame[0] * (0.15 + 0.7 * ((i * 0.618) % 1)), layout.frame[1] * 0.15]
    Home.x[eid] = ((fx + C.size / 2) / layout.frame[0] - 0.5) * W
    Home.y[eid] = (0.5 - (fy + C.size / 2) / layout.frame[1]) * H
    Position.x[eid] = Home.x[eid]
    Position.y[eid] = Home.y[eid]
    Position.z[eid] = -C.surfaceDepth
    Velocity.x[eid] = Velocity.y[eid] = Velocity.z[eid] = 0
    Bob.phase[eid] = Math.random() * Math.PI * 2
    Bob.period[eid] = rand(C.bob.period)
    Bob.amplitude[eid] = rand(C.bob.amplitude)
    Bob.ripple[eid] = rand(C.ripple.every) * Math.random()
    State.mode[eid] = Mode.STILL
    State.time[eid] = 0
  })
}

/** Still: bob at the surface, rock, and send out soft ripples. */
function still(world: SceneWorld, eid: number, dt: number) {
  const t = world.time.elapsed
  const w = (Math.PI * 2) / Bob.period[eid]
  const ph = Bob.phase[eid]
  Position.x[eid] += (Home.x[eid] - Position.x[eid]) * Math.min(1, dt * 2)
  Position.y[eid] += (Home.y[eid] - Position.y[eid]) * Math.min(1, dt * 2)
  Position.z[eid] = -C.surfaceDepth + Bob.amplitude[eid] * Math.sin(w * t + ph)
  const rock = (C.bob.rock * Math.PI) / 180
  Rotation.x[eid] = rock * 0.6 * Math.sin(w * 0.5 * t + ph * 1.3)
  Rotation.y[eid] = rock * 0.6 * Math.sin(w * 0.37 * t + ph * 0.7)
  Rotation.z[eid] = rock * Math.sin(w * 0.21 * t + ph)
  Bob.ripple[eid] -= dt
  if (Bob.ripple[eid] <= 0) {
    Bob.ripple[eid] = rand(C.ripple.every)
    drop(world, eid, C.ripple.radius, C.ripple.strength)
  }
}

function drop(world: SceneWorld, eid: number, radius: number, strength: number) {
  const { width: W, height: H } = world.viewport
  world.drops.push({ x: Position.x[eid] / W + 0.5, y: Position.y[eid] / H + 0.5, radius, strength })
}

function startDive(world: SceneWorld, eid: number, from: { x: number; y: number }) {
  State.mode[eid] = Mode.DIVE
  State.time[eid] = 0
  State.duration[eid] = rand(C.dive.duration)
  State.band[eid] = Math.random() < 0.5 ? 0 : 1
  State.fromZ[eid] = Position.z[eid]
  const dx = Position.x[eid] - from.x
  const dy = Position.y[eid] - from.y
  const len = Math.hypot(dx, dy) || 1
  const speed = rand(C.dive.scatter)
  Velocity.x[eid] = (dx / len) * speed
  Velocity.y[eid] = (dy / len) * speed
  Rotation.sx[eid] = (Math.random() - 0.5) * 9
  Rotation.sy[eid] = (Math.random() - 0.5) * 9
  Rotation.sz[eid] = (Math.random() - 0.5) * 6
  drop(world, eid, 0.03, C.dive.splash)
}

/** Dive: tumble down to a depth band, scattering away from the disturbance. */
function dive(world: SceneWorld, eid: number, dt: number) {
  const k = Math.min(1, State.time[eid] / State.duration[eid])
  Position.z[eid] = State.fromZ[eid] + (-C.dive.bands[State.band[eid]] - State.fromZ[eid]) * ease(k)
  Position.x[eid] += Velocity.x[eid] * dt
  Position.y[eid] += Velocity.y[eid] * dt
  const drag = Math.pow(0.25, dt)
  Velocity.x[eid] *= drag
  Velocity.y[eid] *= drag
  Rotation.x[eid] += Rotation.sx[eid] * dt * (1 - k)
  Rotation.y[eid] += Rotation.sy[eid] * dt * (1 - k)
  Rotation.z[eid] += Rotation.sz[eid] * dt * (1 - k)
  if (k >= 1) {
    State.mode[eid] = Mode.SCHOOL
    State.time[eid] = 0
  }
}

/** School: boids within each depth band, steering around the text and pills. */
function school(world: SceneWorld, eid: number, mates: number[], dt: number) {
  const S = C.school
  const band = State.band[eid]
  const px = Position.x[eid]
  const py = Position.y[eid]
  let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, nAli = 0, nCoh = 0
  for (const o of mates) {
    if (o === eid || State.band[o] !== band) continue
    const dx = Position.x[o] - px
    const dy = Position.y[o] - py
    const d = Math.hypot(dx, dy)
    if (d < S.separation && d > 0) {
      sepX -= dx / d / d
      sepY -= dy / d / d
    }
    if (d < S.alignment) {
      aliX += Velocity.x[o]
      aliY += Velocity.y[o]
      nAli++
    }
    if (d < S.cohesion) {
      cohX += dx
      cohY += dy
      nCoh++
    }
  }
  let ax = sepX * 9000
  let ay = sepY * 9000
  if (nAli) {
    ax += (aliX / nAli - Velocity.x[eid]) * 0.9
    ay += (aliY / nAli - Velocity.y[eid]) * 0.9
  }
  if (nCoh) {
    ax += (cohX / nCoh) * 0.35
    ay += (cohY / nCoh) * 0.35
  }
  // A slow wander so the school never settles.
  const t = world.time.elapsed + Bob.phase[eid] * 10
  ax += Math.sin(t * 0.37) * 30
  ay += Math.cos(t * 0.29) * 30

  // Stay within the water around the frame (it may leave the frame itself).
  const k = depthScale(world, -Position.z[eid])
  const limX = (world.viewport.width / 2) * k * (1 + S.roam)
  const limY = (world.viewport.height / 2) * k * (1 + S.roam)
  if (Math.abs(px) > limX) ax -= Math.sign(px) * (Math.abs(px) - limX) * 4
  if (Math.abs(py) > limY) ay -= Math.sign(py) * (Math.abs(py) - limY) * 4

  // Keep clear of the name column and the pills, as they appear at this depth.
  for (const r of world.keepOut) {
    const x0 = (r.x0 - S.keepOut) * k, x1 = (r.x1 + S.keepOut) * k
    const y0 = (r.y0 - S.keepOut) * k, y1 = (r.y1 + S.keepOut) * k
    if (px > x0 && px < x1 && py > y0 && py < y1) {
      const out = [px - x0, x1 - px, py - y0, y1 - py]
      const m = Math.min(...out)
      const push = 900
      if (m === out[0]) ax -= push
      else if (m === out[1]) ax += push
      else if (m === out[2]) ay -= push
      else ay += push
    }
  }

  let vx = Velocity.x[eid] + ax * dt
  let vy = Velocity.y[eid] + ay * dt
  const speed = Math.hypot(vx, vy) || 1
  const target = S.speed[band]
  const s = speed + (target - speed) * Math.min(1, dt * 1.5)
  vx = (vx / speed) * s
  vy = (vy / speed) * s
  const before = Math.atan2(Velocity.y[eid], Velocity.x[eid])
  Velocity.x[eid] = vx
  Velocity.y[eid] = vy
  Position.x[eid] += vx * dt
  Position.y[eid] += vy * dt

  // Bank into the turn, and lean the face toward the heading.
  const heading = Math.atan2(vy, vx)
  let turn = heading - before
  if (turn > Math.PI) turn -= Math.PI * 2
  if (turn < -Math.PI) turn += Math.PI * 2
  const roll = Math.max(-0.7, Math.min(0.7, (turn / Math.max(dt, 1e-3)) * 0.35))
  const settle = Math.min(1, dt * 3)
  Rotation.x[eid] += (-Math.sin(heading) * roll - Rotation.x[eid]) * settle
  Rotation.y[eid] += (Math.cos(heading) * roll + Math.cos(heading) * 0.25 - Rotation.y[eid]) * settle
  Rotation.z[eid] += (Math.max(-0.5, Math.min(0.5, Math.sin(heading) * 0.5)) - Rotation.z[eid]) * settle
}

function startRise(eid: number) {
  State.mode[eid] = Mode.RISE
  State.time[eid] = 0
  State.duration[eid] = rand(C.rise.duration)
  State.fromX[eid] = Position.x[eid]
  State.fromY[eid] = Position.y[eid]
  State.fromZ[eid] = Position.z[eid]
  Rotation.sx[eid] = Rotation.x[eid]
  Rotation.sy[eid] = Rotation.y[eid]
  Rotation.sz[eid] = Rotation.z[eid]
}

/** Rise: back home to the surface, then bob again. */
function rise(eid: number) {
  const k = ease(Math.min(1, State.time[eid] / State.duration[eid]))
  Position.x[eid] = State.fromX[eid] + (Home.x[eid] - State.fromX[eid]) * k
  Position.y[eid] = State.fromY[eid] + (Home.y[eid] - State.fromY[eid]) * k
  Position.z[eid] = State.fromZ[eid] + (-C.surfaceDepth - State.fromZ[eid]) * k
  Rotation.x[eid] = Rotation.sx[eid] * (1 - k)
  Rotation.y[eid] = Rotation.sy[eid] * (1 - k)
  Rotation.z[eid] = Rotation.sz[eid] * (1 - k)
  if (k >= 1) {
    State.mode[eid] = Mode.STILL
    State.time[eid] = 0
  }
}

/**
 * The stack chips: spawned from site.stackChips at their Figma positions.
 * Still → (pointer within reach) dive → school → (idle) rise → still.
 */
export function chipsSystem(): System {
  return {
    resize(world) {
      spawn(world)
      // What the school keeps clear of, in world px at the surface.
      const { width: W, height: H } = world.viewport
      world.keepOut = ['.abyss', '.pills']
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
        .filter((r): r is DOMRect => Boolean(r))
        .map((r) => ({ x0: r.left - W / 2, x1: r.right - W / 2, y0: H / 2 - r.bottom, y1: H / 2 - r.top }))
    },
    update(world) {
      const dt = world.time.delta
      const eids = [...query(world, [Chip, State])]
      const contact = world.input.contact
      const idle = (performance.now() - world.input.lastAt) / 1000 > C.idle
      const schooling = eids.filter((e) => State.mode[e] === Mode.SCHOOL)
      for (const eid of eids) {
        State.time[eid] += dt
        const mode = State.mode[eid]
        if (contact && (mode === Mode.STILL || mode === Mode.RISE)) {
          const k = 1 / depthScale(world, -Position.z[eid])
          if (Math.hypot(Position.x[eid] * k - contact.x, Position.y[eid] * k - contact.y) < C.disturbRadius) {
            startDive(world, eid, contact)
            continue
          }
        }
        if (idle && (mode === Mode.SCHOOL || mode === Mode.DIVE) && world.input.lastAt > 0) startRise(eid)
        if (State.mode[eid] === Mode.STILL) still(world, eid, dt)
        else if (State.mode[eid] === Mode.DIVE) dive(world, eid, dt)
        else if (State.mode[eid] === Mode.SCHOOL) school(world, eid, schooling, dt)
        else rise(eid)
      }
    },
  }
}
