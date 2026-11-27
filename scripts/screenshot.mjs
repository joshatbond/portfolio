// Screenshot pages at the design widths (1440 and 390) in Chromium.
// usage: node scripts/screenshot.mjs [baseUrl] [outDir] [path ...]
//   defaults: http://localhost:4321  ./screenshots  /
// Set FULL=0 for viewport-only shots, MOTION=reduce to emulate reduced motion.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:4321', out = 'screenshots', ...paths] = process.argv.slice(2)
const widths = [
  { name: '1440', width: 1440, height: 900, dpr: 1 },
  { name: '390', width: 390, height: 844, dpr: 2 },
]
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const path of paths.length ? paths : ['/']) {
  for (const w of widths) {
    const page = await browser.newPage({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: w.dpr,
      reducedMotion: process.env.MOTION === 'reduce' ? 'reduce' : 'no-preference',
    })
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(Number(process.env.WAIT ?? 300))
    const slug = (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '_')) + '-' + w.name
    await page.screenshot({ path: `${out}/${slug}.png`, fullPage: process.env.FULL !== '0' })
    console.log(`${out}/${slug}.png`)
    await page.close()
  }
}
await browser.close()
