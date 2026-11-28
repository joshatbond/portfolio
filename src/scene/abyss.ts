import { CanvasTexture } from 'three'

/**
 * Draws the DOM name and title into a texture, lined up with their layout,
 * so the scene can hang them in the deep and the water can refract them.
 * Returns the texture and its rect in CSS px.
 */
export function drawAbyss(): { texture: CanvasTexture; rect: DOMRect } | null {
  const abyss = document.querySelector<HTMLElement>('.abyss')
  if (!abyss) return null
  const pad = 48
  const box = abyss.getBoundingClientRect()
  const rect = new DOMRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2)
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rect.width * scale)
  canvas.height = Math.ceil(rect.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  for (const el of abyss.querySelectorAll<HTMLElement>('.name > span, .role > span')) {
    if (!el.getClientRects().length) continue
    const host = el.closest<HTMLElement>('.name, .role')!
    const cs = getComputedStyle(host)
    const r = el.getBoundingClientRect()
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing
    const text = cs.textTransform === 'uppercase' ? el.textContent!.toUpperCase() : el.textContent!
    const m = ctx.measureText(text)
    const baseline = r.top - rect.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    ctx.shadowColor = 'rgba(6, 182, 212, 0.55)'
    ctx.shadowBlur = host.classList.contains('name') ? 23 : 11
    ctx.fillStyle = '#cffafe'
    ctx.fillText(text, r.left - rect.left, baseline)
    ctx.shadowBlur = 0
    ctx.fillText(text, r.left - rect.left, baseline)
  }
  // Sampled as raw display values, like everything else in these shaders.
  return { texture: new CanvasTexture(canvas), rect }
}
