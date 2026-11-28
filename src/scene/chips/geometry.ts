import { BufferGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, ShapePath } from 'three'
import data from './chips.json'

type ChipData = { side: string; layers: { fill: string; cmds: number[] }[] }
const chips = data as Record<string, ChipData>

/** Chip keys that have face artwork. */
export const chipKeys = Object.keys(chips)

/** How deep the plate is, and how much further each logo layer stands out. */
const BASE = 12
const STEP = 1.4

/**
 * A chip: its logo face (64×64, centred) extruded, each Figma layer on top of
 * the one below so marks stand slightly proud of their plate. Caps take the
 * layer's fill, walls the chip's side colour. The front sits at z = 0.
 */
export function chipGeometry(key: string): BufferGeometry {
  const chip = chips[key]
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const side = new Color(chip.side)
  const front = BASE + STEP * (chip.layers.length - 1)

  chip.layers.forEach((layer, i) => {
    const path = new ShapePath()
    const c = layer.cmds
    for (let k = 0; k < c.length; ) {
      const op = c[k++]
      if (op === 0) path.moveTo(c[k++], c[k++])
      else if (op === 1) path.lineTo(c[k++], c[k++])
      else if (op === 2) {
        path.bezierCurveTo(c[k], c[k + 1], c[k + 2], c[k + 3], c[k + 4], c[k + 5])
        k += 6
      } else path.currentPath?.closePath()
    }
    const depth = BASE + STEP * i
    const geo = new ExtrudeGeometry(path.toShapes(), {
      depth,
      bevelEnabled: i === 0,
      bevelThickness: 1.2,
      bevelSize: 0.7,
      bevelSegments: 2,
      curveSegments: 8,
    })
    const fill = new Color(layer.fill)
    const wall = i === 0 ? side : fill.clone().multiplyScalar(0.55)
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    for (const group of geo.groups) {
      const col = group.materialIndex === 0 ? fill : wall
      for (let v = group.start; v < group.start + group.count; v++) {
        positions.push(pos.getX(v), pos.getY(v), pos.getZ(v) - front)
        normals.push(nor.getX(v), nor.getY(v), nor.getZ(v))
        colors.push(col.r, col.g, col.b)
      }
    }
    geo.dispose()
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}
