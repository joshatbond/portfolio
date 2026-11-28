// Turns the chip logo faces exported from Figma (src/scene/chips/svg/*.svg)
// into compact path data the scene extrudes at runtime with three's core
// ShapePath/ExtrudeGeometry, so SVGLoader never ships.
//
// For each chip: its layers, bottom to top, each with one fill colour
// (gradients averaged) and its path as [cmd, ...coords] numbers, centred on
// the 64×64 face with y up. cmd: 0 = move, 1 = line, 2 = cubic, 3 = close.
// Faint shading paths (opacity < 0.3) and clip/mask geometry are dropped.
//
// usage: node scripts/build-chips.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const dir = 'src/scene/chips/svg'
const sides = JSON.parse(readFileSync('src/scene/chips/sides.json', 'utf8'))
const out = {}

const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const parseColor = (c) => {
  if (c === 'white') return [255, 255, 255]
  if (c === 'black') return [0, 0, 0]
  const m = c.match(/^#([0-9a-f]{6})$/i)
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null
}
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

// A stroked, closed path → a filled ring (outer outline plus an inner hole),
// with mitred corners. Curves are flattened first.
function strokeLayer(d, rgb, width, file) {
  const t = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi)
  if (/[QAS]/i.test(d)) throw new Error(`${file}: unsupported stroke path`)
  const pts = []
  let i = 0, op = null, x = 0, y = 0
  const num = () => Number(t[i++])
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) op = t[i++]
    if (op === 'M' || op === 'L') { x = num(); y = num(); pts.push([x, y]); op = 'L' }
    else if (op === 'H') { x = num(); pts.push([x, y]) }
    else if (op === 'V') { y = num(); pts.push([x, y]) }
    else if (op === 'C') {
      const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()]
      for (let k = 1; k <= 16; k++) {
        const u = k / 16, v = 1 - u
        pts.push([
          v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
          v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3,
        ])
      }
      x = x3; y = y3
    } else if (op === 'Z' || op === 'z') op = null
  }
  if (Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-3) pts.pop()
  // Orient counter-clockwise in SVG space (y down), so normals point outward.
  const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0)
  if (area < 0) pts.reverse()
  const offset = (dist) =>
    pts.map((p, i) => {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]
      const n = (u, v) => { const dx = v[0] - u[0], dy = v[1] - u[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l] }
      const n1 = n(a, p), n2 = n(p, b)
      const m = [n1[0] + n2[0], n1[1] + n2[1]]
      const ml = Math.hypot(m[0], m[1])
      const scale = dist / Math.max(0.2, (m[0] * n1[0] + m[1] * n1[1]) / ml)
      return [p[0] + (m[0] / ml) * scale, p[1] + (m[1] / ml) * scale]
    })
  const ring = (poly, reverse) => {
    const list = reverse ? [...poly].reverse() : poly
    const out = []
    list.forEach((p, i) => out.push(i ? 1 : 0, Math.round((p[0] - 32) * 100) / 100, Math.round((32 - p[1]) * 100) / 100))
    out.push(3)
    return out
  }
  return { fill: hex(rgb), cmds: [...ring(offset(width / 2), false), ...ring(offset(-width / 2), true)] }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()) {
  const key = file.replace(/\.svg$/, '')
  let svg = readFileSync(`${dir}/${file}`, 'utf8')

  // Gradients → their average stop colour.
  const gradients = {}
  for (const g of svg.matchAll(/<(linear|radial)Gradient[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/\1Gradient>/g)) {
    const stops = [...g[3].matchAll(/<stop[^>]*>/g)].map((s) => {
      const c = parseColor(attr(s[0], 'stop-color') ?? '#000000') ?? [0, 0, 0]
      const o = Number(attr(s[0], 'stop-opacity') ?? 1)
      return { c, o }
    })
    const w = stops.reduce((a, s) => a + s.o, 0) || 1
    gradients[g[2]] = [0, 1, 2].map((i) => stops.reduce((a, s) => a + s.c[i] * s.o, 0) / w)
  }
  // Drop geometry that only clips or masks.
  svg = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '').replace(/<mask[\s\S]*?<\/mask>/g, '').replace(/<clipPath[\s\S]*?<\/clipPath>/g, '')

  const layers = []
  for (const [tag] of svg.matchAll(/<path\b[^>]*>/g)) {
    const opacity = Number(attr(tag, 'opacity') ?? 1)
    const stroke = attr(tag, 'stroke')
    const fill = attr(tag, 'fill') ?? (stroke ? undefined : 'black')
    if (opacity < 0.3) continue
    if ((!fill || fill === 'none') && stroke) {
      layers.push(strokeLayer(attr(tag, 'd'), parseColor(stroke), Number(attr(tag, 'stroke-width') ?? 1), file))
      continue
    }
    if (!fill || fill === 'none') continue
    const ref = fill.match(/^url\(#(.+)\)$/)
    const rgb = ref ? gradients[ref[1]] : parseColor(fill)
    if (!rgb) continue

    const cmds = []
    let x = 0
    let y = 0
    const tokens = attr(tag, 'd').match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi)
    let i = 0
    const num = () => Number(tokens[i++])
    const pt = (px, py) => [Math.round((px - 32) * 100) / 100, Math.round((32 - py) * 100) / 100]
    let op = null
    while (i < tokens.length) {
      if (/[A-Za-z]/.test(tokens[i])) op = tokens[i++]
      if (op === 'M') { x = num(); y = num(); cmds.push(0, ...pt(x, y)); op = 'L' }
      else if (op === 'L') { x = num(); y = num(); cmds.push(1, ...pt(x, y)) }
      else if (op === 'H') { x = num(); cmds.push(1, ...pt(x, y)) }
      else if (op === 'V') { y = num(); cmds.push(1, ...pt(x, y)) }
      else if (op === 'C') {
        const a = pt(num(), num()), b = pt(num(), num())
        x = num(); y = num()
        cmds.push(2, ...a, ...b, ...pt(x, y))
      } else if (op === 'Z' || op === 'z') { cmds.push(3); op = null }
      else throw new Error(`${file}: unsupported path command ${op}`)
    }
    layers.push({ fill: hex(rgb), cmds })
  }
  if (!layers.length) throw new Error(`${file}: no paths`)
  out[key] = { side: sides[key], layers }
}

writeFileSync('src/scene/chips/chips.json', JSON.stringify(out))
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.layers.length} layers`).join('\n'))
console.log(`${JSON.stringify(out).length} bytes`)
