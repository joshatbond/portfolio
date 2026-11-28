/** A box in px: x0 < x1, y0 < y1. */
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Point {
  x: number
  y: number
}

/**
 * The still's layout: chip homes moved off what they'd cover. A chip (a
 * `size` px square centred on its home) that overlaps one of `avoid` moves to
 * the nearest spot inside `frame` that's `gap` px clear of `avoid`, `clear`
 * and every other chip; chips that would share a spot push each other apart
 * until they fit. Chips that overlap none of `avoid` keep their home exactly,
 * even where they sit on one of `clear`. Everything is in the same px.
 */
export function layoutHomes(
  homes: readonly Point[],
  avoid: readonly Box[],
  { frame, size, gap, clear = [] }: { frame: Box; size: number; gap: number; clear?: readonly Box[] },
): Point[] {
  const half = size / 2
  const covers = (p: Point, b: Box) => p.x + half > b.x0 && p.x - half < b.x1 && p.y + half > b.y0 && p.y - half < b.y1
  const out = homes.map((h) => ({ x: h.x, y: h.y }))
  const moving = out.filter((p) => avoid.some((b) => covers(p, b)))
  if (!moving.length) return out

  // Where a moving chip's centre can't go: each box grown by half a chip and
  // the gap, and each chip that stays grown by a whole chip and the gap.
  const grow = (b: Box, by: number) => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })
  const chip = (p: Point) => grow({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }, size + gap)
  const walls = [...avoid, ...clear].map((b) => grow(b, half + gap)).concat(out.filter((p) => !moving.includes(p)).map(chip))
  const room = grow(frame, -half)
  const blocked = (x: number, y: number, ws: Box[]) => ws.some((w) => x > w.x0 && x < w.x1 && y > w.y0 && y < w.y1)
  // The nearest free point is level with p on a wall's edge, or a corner
  // where two edges cross; null if there's none.
  const nearest = (p: Point, more: Box[] = []) => {
    const ws = walls.concat(more)
    const free = (x: number, y: number) => x >= room.x0 && x <= room.x1 && y >= room.y0 && y <= room.y1 && !blocked(x, y, ws)
    if (free(p.x, p.y)) return p
    const xs = [p.x, room.x0, room.x1, ...ws.flatMap((w) => [w.x0, w.x1])]
    const ys = [p.y, room.y0, room.y1, ...ws.flatMap((w) => [w.y0, w.y1])]
    let best: Point | null = null
    let d = Infinity
    for (const x of xs) {
      for (const y of ys) {
        const e = (x - p.x) ** 2 + (y - p.y) ** 2
        if (e < d && free(x, y)) [best, d] = [{ x, y }, e]
      }
    }
    return best
  }
  const apart = size + gap
  // (Pushes settle by halves, so within a pixel is apart enough.)
  const crowd = (a: Point, b: Point) => a !== b && Math.abs(b.x - a.x) < apart - 1 && Math.abs(b.y - a.y) < apart - 1

  // Settle: send each moving chip to its nearest free spot, then push apart
  // any two that crowd each other (half each, along the shallower overlap).
  for (let i = 0; i < 50; i++) {
    for (const p of moving) Object.assign(p, nearest(p))
    let crowded = false
    for (const [j, a] of moving.entries()) {
      for (const b of moving.slice(j + 1)) {
        if (!crowd(a, b)) continue
        crowded = true
        const dx = b.x - a.x
        const dy = b.y - a.y
        const ox = apart - Math.abs(dx)
        const oy = apart - Math.abs(dy)
        if (ox < oy) {
          const s = (Math.sign(dx) || 1) * (ox / 2)
          a.x -= s
          b.x += s
        } else {
          const s = (Math.sign(dy) || 1) * (oy / 2)
          a.y -= s
          b.y += s
        }
      }
    }
    if (!crowded) break
  }
  for (const p of moving) Object.assign(p, nearest(p))
  // Where two still crowd each other (the spot they share has room for one),
  // one takes the spot nearest its home that's clear of every other chip. If
  // there's none, it stays crowded rather than go back over the text.
  for (const p of moving) {
    const others = moving.filter((q) => q !== p)
    if (others.some((q) => crowd(p, q))) Object.assign(p, nearest(homes[out.indexOf(p)], others.map(chip)))
  }
  return out
}
