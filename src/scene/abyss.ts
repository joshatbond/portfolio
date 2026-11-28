import { CanvasTexture, LinearFilter } from 'three'

/** The box of an element's own text (a line can sit centred in a wider box). */
export function textRect(el: Element) {
  const range = document.createRange()
  range.selectNodeContents(el)
  return range.getBoundingClientRect()
}

/**
 * Draws the DOM name and title into a texture, lined up with their layout,
 * so the scene can hang them in the deep and the water can refract them.
 * Returns the texture and its rect in CSS px, relative to `container`.
 * `scale` is the device pixel ratio the scene renders at, so the texture
 * maps 1:1 onto the canvas's pixels.
 */
export function drawAbyss(
  container: HTMLElement,
  scale: number,
  { glyphs = true }: { glyphs?: boolean } = {},
): { texture: CanvasTexture; rect: DOMRect } | null {
  const abyss = document.querySelector<HTMLElement>('.abyss')
  if (!abyss) return null
  const pad = 48
  const box = abyss.getBoundingClientRect()
  const origin = container.getBoundingClientRect()
  const rect = new DOMRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rect.width * scale)
  canvas.height = Math.ceil(rect.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  for (const el of abyss.querySelectorAll<HTMLElement>('.name > span, .role > span')) {
    if (!el.getClientRects().length) continue
    const host = el.closest<HTMLElement>('.name, .role')!
    const cs = getComputedStyle(host)
    const r = textRect(el)
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing
    const text = cs.textTransform === 'uppercase' ? el.textContent!.toUpperCase() : el.textContent!
    const m = ctx.measureText(text)
    const baseline = r.top - rect.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    // The same wide, faint halo as the DOM text (a brighter glow crowds the
    // letters below the contrast floor).
    ctx.shadowColor = host.classList.contains('name') ? 'rgba(6, 182, 212, 0.16)' : 'rgba(6, 182, 212, 0.45)'
    // (Shadows are in canvas pixels, whatever the scale.)
    ctx.shadowBlur = (host.classList.contains('name') ? 36 : 11) * scale
    ctx.fillStyle = '#cffafe'
    if (glyphs) {
      ctx.fillText(text, r.left - rect.left, baseline)
      ctx.shadowBlur = 0
      ctx.fillText(text, r.left - rect.left, baseline)
    } else {
      // Just the glow: the letters drawn off the canvas, their shadow cast
      // back into place (shadow offsets ignore the scale).
      const away = rect.width + 100
      ctx.shadowOffsetX = away * scale
      ctx.fillText(text, r.left - rect.left - away, baseline)
      ctx.shadowOffsetX = 0
      ctx.shadowBlur = 0
    }
  }
  // Sampled as raw display values, like everything else in these shaders.
  const texture = new CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  rect.x -= origin.x
  rect.y -= origin.y
  return { texture, rect }
}
