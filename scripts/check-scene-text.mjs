// Contrast of the homepage name and title where the water scene draws them
// (brief §4: the 4.57:1 floor). Once the scene is up the DOM copy stops
// painting, so check-contrast.mjs can't see this text; the scene draws it
// into the water instead, refracted and lit.
//
// The scene's still (reduced motion) is deterministic, so it's rendered
// twice: as the page shows it, and with only the text's glow, not its
// letters (as check-contrast.mjs hides DOM text but keeps its glow). Where
// the two differ are the letters. DOM text is measured by its declared
// colour, which is what its fully covered pixels show; the scene's text has
// no declared colour, so it's read from its fully covered pixels instead
// (within 85% of the 99th-percentile brightening: the lower quartile of
// those, as the light behind varies). It must reach the floor against the brightest twentieth
// of the glow-only pixels, as check-contrast.mjs reads DOM text against its
// 95th-percentile pixel.
//
// usage: node scripts/check-scene-text.mjs [baseUrl]   (build and preview first)
import { chromium } from 'playwright'
import sharp from 'sharp'

const base = process.argv[2] ?? 'http://localhost:4321'
const SIZES = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2])
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const lumHex = (h) => luminance([(h >> 16) & 255, (h >> 8) & 255, h & 255], 0)
// text/tertiary (#6C7786) on pool/deep (#000204)
const FLOOR_MIN = Math.floor(ratio(lumHex(0x6c7786), lumHex(0x000204)) * 100) / 100
const pick = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]

async function render(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 120000 })
  // Just the water: the pills and HUD aren't part of what the text is read against.
  await page.addStyleTag({ content: '.pills, .hud, .hint { visibility: hidden !important } .pool-scene { opacity: 1 !important; transition: none !important }' })
  await page.waitForTimeout(100)
  return page.screenshot()
}

async function raw(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width }
}

let failures = 0
let checked = 0
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const { width, height } of SIZES) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const shown = await raw(await render(page, `${base}/`))
  const lines = await page.evaluate(() =>
    [...document.querySelectorAll('.abyss .name > span, .abyss .role > span')]
      .filter((el) => el.getClientRects().length)
      .map((el) => {
        // The line's own text (on phones it's centred in a full-width box).
        const range = document.createRange()
        range.selectNodeContents(el)
        const r = range.getBoundingClientRect()
        return { text: el.textContent.trim(), box: { x: r.x, y: r.y, w: r.width, h: r.height } }
      }),
  )
  if (!lines.length) {
    failures++
    console.log(`FAIL ${width}px: no name or title on the page`)
  }
  const bare = await raw(await render(page, `${base}/?capture=glow`))
  for (const { text, box } of lines) {
    const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(width, Math.ceil(box.x + box.w))
    const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(height, Math.ceil(box.y + box.h))
    const added = []
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * shown.width + x) * 3
        added.push({ i, d: luminance(shown.data, i) - luminance(bare.data, i) })
      }
    }
    // How much a fully covered letter pixel brightens the water: the 99th
    // percentile, not the brightest, which can be a speck over a letter
    // (on a brighter base the same added light counts for more).
    const most = pick(added.map((p) => p.d).sort((a, b) => a - b), 0.99)
    const glyph = added.filter((p) => p.d >= most * 0.85).map((p) => luminance(shown.data, p.i)).sort((a, b) => a - b)
    const ground = added.map((p) => luminance(bare.data, p.i)).sort((a, b) => a - b)
    checked++
    if (!glyph.length || !ground.length || most <= 0) {
      failures++
      console.log(`FAIL ${width}px "${text}": the scene didn't draw it`)
      continue
    }
    const value = ratio(pick(glyph, 0.25), pick(ground, 0.95))
    const ok = value >= FLOOR_MIN
    if (!ok) failures++
    const detail = process.env.VERBOSE
      ? `  [text ${pick(glyph, 0.25).toFixed(4)}, ground median ${pick(ground, 0.5).toFixed(4)} p95 ${pick(ground, 0.95).toFixed(4)}]`
      : ''
    if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${value.toFixed(2)}:1 (min ${FLOOR_MIN})  ${width}px "${text}"${detail}`)
  }
  await context.close()
}
await browser.close()
console.log(`\n${checked} checks of the scene's name and title, ${failures} failed`)
process.exit(failures ? 1 : 0)
