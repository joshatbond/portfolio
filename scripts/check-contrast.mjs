// Contrast checks on rendered pixels (brief §4).
//
// 1. Button and pill labels (`.btn__label`) must reach 7:1 in the default,
//    hover and focus states. The label is hidden, the pixels behind it are
//    captured, and the worst pixel in the label's box must pass.
// 2. All other text: text inside a link or button is a label too and must
//    reach 7:1 against its worst background pixel. Everything else must reach
//    the floor, text/tertiary on pool/deep (4.57:1), against its
//    95th-percentile worst pixel, so one bright caustic speck doesn't fail a
//    paragraph. All text is hidden and the page captured once per width.
//
// Pages are checked at the design widths and either side of each breakpoint.
//
// usage: node scripts/check-contrast.mjs [baseUrl] [path ...]
//   default: http://localhost:4321 and every page in dist/
import { chromium } from 'playwright'
import sharp from 'sharp'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const [base = 'http://localhost:4321', ...argPaths] = process.argv.slice(2)
const WIDTHS = [1440, 1024, 720, 390, 320]
const LABEL_MIN = 7

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (la, lb) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
// text/tertiary (#6C7786) on pool/deep (#000204)
const FLOOR_MIN = Math.floor(ratio(luminance([0x6c, 0x77, 0x86]), luminance([0x00, 0x02, 0x04])) * 100) / 100

/** rgb()/rgba() or color(srgb r g b / a) → [r, g, b, a] in 0–255 (alpha 0–1). */
const parseColor = (s) => {
  const n = s.match(/[\d.]+/g).map(Number)
  if (s.startsWith('color(')) return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1]
  return [n[0], n[1], n[2], n[3] ?? 1]
}

function builtPaths() {
  const pages = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.html')) pages.push('/' + relative('dist', p).replace(/\.html$/, '').replace(/(^|\/)index$/, ''))
    }
  }
  if (existsSync('dist')) walk('dist')
  return pages.length ? pages.sort() : ['/']
}
const paths = argPaths.length ? argPaths : builtPaths()

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failures = 0
let checked = 0
const report = (ok, value, min, where) => {
  checked++
  if (!ok) failures++
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${value.toFixed(2)}:1 (min ${min})  ${where}`)
}

/** Worst-case ratios of `color` against the pixels of `png`. */
async function measure(png, color) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = info.width * info.height
  const ratios = new Float64Array(n)
  const a = color[3]
  for (let p = 0; p < n; p++) {
    const px = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
    const fg = [0, 1, 2].map((k) => color[k] * a + px[k] * (1 - a))
    ratios[p] = ratio(luminance(fg), luminance(px))
  }
  ratios.sort()
  return { min: ratios[0], p5: ratios[Math.floor(n * 0.05)] }
}

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const path of paths) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' })
    const expected = path === '/404' ? [200, 404] : [200]
    if (!res || !expected.includes(res.status())) {
      failures++
      console.log(`FAIL ${path} returned ${res ? res.status() : 'no response'}`)
      continue
    }
    await page.evaluate(() => document.fonts.ready)

    // ----- 1. Button and pill labels, per state -----
    const labels = page.locator('.btn__label')
    for (let i = 0; i < (await labels.count()); i++) {
      const label = labels.nth(i)
      if (!(await label.isVisible())) continue
      const btn = label.locator('xpath=ancestor::*[contains(concat(" ", @class, " "), " btn ")][1]')
      await btn.scrollIntoViewIfNeeded()
      for (const state of ['default', 'hover', 'focus']) {
        await page.mouse.move(0, 0)
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
        if (state === 'hover') await btn.hover()
        if (state === 'focus') await btn.focus()
        await page.waitForTimeout(260)
        const box = await label.boundingBox()
        if (!box) continue
        const color = parseColor(await label.evaluate((n) => getComputedStyle(n).color))
        const name = (await label.innerText()).trim()
        await label.evaluate((n) => n.style.setProperty('color', 'transparent', 'important'))
        const png = await page.screenshot({ clip: { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) } })
        await label.evaluate((n) => n.style.removeProperty('color'))
        const { min } = await measure(png, color)
        report(min >= LABEL_MIN, min, LABEL_MIN, `button ${width}px ${path}  "${name}" [${state}]`)
      }
    }

    // ----- 2. All other text -----
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(200)
    const texts = await page.evaluate(() => {
      const out = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement
        if (!el || !node.textContent.trim() || el.closest('.btn, .skip-link, script, style, .visually-hidden')) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2) continue
          out.push({
            text: node.textContent.trim().slice(0, 40),
            color: style.color,
            label: Boolean(el.closest('a, button')),
            x: r.x + scrollX,
            y: r.y + scrollY,
            w: r.width,
            h: r.height,
          })
        }
      }
      return out
    })
    const hide = await page.addStyleTag({
      content: '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
    })
    await page.waitForTimeout(100)
    const full = await page.screenshot()
    await hide.evaluate((n) => n.remove())
    for (const t of texts) {
      // Off-page boxes (e.g. carousel cards scrolled out of view) can't be measured.
      if (t.x < 0 || t.y < 0 || t.x + 1 > width || t.y + 1 > height) continue
      const left = Math.floor(t.x)
      const top = Math.floor(t.y)
      const crop = await sharp(full)
        .extract({ left, top, width: Math.max(1, Math.min(Math.ceil(t.w), width - left)), height: Math.max(1, Math.min(Math.ceil(t.h), height - top)) })
        .png()
        .toBuffer()
      const { min, p5 } = await measure(crop, parseColor(t.color))
      if (t.label) report(min >= LABEL_MIN, min, LABEL_MIN, `link   ${width}px ${path}  "${t.text}"`)
      else report(p5 >= FLOOR_MIN, p5, FLOOR_MIN, `text   ${width}px ${path}  "${t.text}"`)
    }
    await page.setViewportSize({ width, height: 900 })
  }
  await context.close()
}

await browser.close()
console.log(`\n${checked} checks on ${paths.join(', ')}, ${failures} failed`)
process.exit(failures ? 1 : 0)
