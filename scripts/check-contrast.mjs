// Contrast check on rendered pixels (brief §4: labels need ≥ 7:1 in every state).
//
// For every button and pill (`.btn`), in the default, hover and focus states:
// render it, then render it again with the label hidden to get the pixels
// behind the label. Each background pixel in the label's box is compared with
// the label's colour, and the worst pixel must still reach 7:1.
//
// usage: node scripts/check-contrast.mjs [baseUrl] [path ...]
//   default: http://localhost:4321 and every built page
import { chromium } from 'playwright'
import sharp from 'sharp'

const [base = 'http://localhost:4321', ...argPaths] = process.argv.slice(2)
const paths = argPaths.length ? argPaths : ['/', '/projects', '/projects/dice-augur', '/404']
const MIN = 7
const SELECTOR = '.btn'

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const parseColor = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number)

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failures = 0
let checked = 0

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  for (const path of paths) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' })
    if (!res || (res.status() >= 400 && path !== '/404')) continue
    await page.evaluate(() => document.fonts.ready)
    const count = await page.locator(SELECTOR).count()
    for (let i = 0; i < count; i++) {
      const el = page.locator(SELECTOR).nth(i)
      if (!(await el.isVisible())) continue
      await el.scrollIntoViewIfNeeded()
      for (const state of ['default', 'hover', 'focus']) {
        await page.mouse.move(0, 0)
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
        if (state === 'hover') await el.hover()
        if (state === 'focus') await el.focus()
        await page.waitForTimeout(260)

        const label = el.locator('.btn__label')
        const box = await label.boundingBox()
        const color = parseColor(await label.evaluate((n) => getComputedStyle(n).color))
        const name = (await label.innerText()).trim()
        if (!box) continue
        const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) }

        // Background only: hide the label's glyphs, keep everything else.
        await label.evaluate((n) => n.style.setProperty('color', 'transparent', 'important'))
        const bgPng = await page.screenshot({ clip })
        await label.evaluate((n) => n.style.removeProperty('color'))

        const { data, info } = await sharp(bgPng).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        let worst = Infinity
        for (let p = 0; p < info.width * info.height; p++) {
          const px = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
          worst = Math.min(worst, ratio(color, px))
        }
        checked++
        const ok = worst >= MIN
        if (!ok) failures++
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${worst.toFixed(2)}:1  ${width}px ${path}  "${name}" [${state}]`)
      }
    }
  }
  await page.close()
}

await browser.close()
console.log(`\n${checked} label states checked, ${failures} below ${MIN}:1`)
process.exit(failures ? 1 : 0)
