// Accessibility check: runs axe-core on each page at 1440 and 390 wide.
// usage: node scripts/check-a11y.mjs [baseUrl] [path ...]
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const [base = 'http://localhost:4321', ...argPaths] = process.argv.slice(2)
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
const browser = await chromium.launch()
let violations = 0

for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  for (const path of paths) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' })
    if (!res || ![200, ...(path === '/404' ? [404] : [])].includes(res.status())) {
      violations++
      console.log(`FAIL ${path} returned ${res ? res.status() : 'no response'}`)
      continue
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
    for (const v of result.violations) {
      violations++
      console.log(`FAIL ${width}px ${path}  ${v.id} (${v.impact}): ${v.help}`)
      for (const node of v.nodes.slice(0, 3)) console.log(`     ${node.target.join(' ')}`)
    }
    if (!result.violations.length) console.log(`ok   ${width}px ${path}  (${result.passes.length} rules passed)`)
  }
  await context.close()
}

await browser.close()
process.exit(violations ? 1 : 0)
