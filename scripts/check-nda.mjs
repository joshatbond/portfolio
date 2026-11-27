// NDA guard: fails if any confidential term appears in the given folders.
//
// The terms themselves are confidential, so they never live in this repo.
// They come from the NDA_TERMS env var (CI secret) or the file named by
// NDA_TERMS_FILE (default ~/.config/portfolio/nda-terms.txt): one term per line
// or comma-separated, matched case-insensitively on word boundaries.
//
// usage: node scripts/check-nda.mjs <dir> [dir ...]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join } from 'node:path'

const file = process.env.NDA_TERMS_FILE ?? join(homedir(), '.config/portfolio/nda-terms.txt')
const raw = process.env.NDA_TERMS || (existsSync(file) ? readFileSync(file, 'utf8') : '')
const terms = raw.split(/[\n,]/).map((t) => t.trim()).filter((t) => t && !t.startsWith('#'))

if (terms.length === 0) {
  console.warn('NDA guard: no terms configured (set NDA_TERMS or NDA_TERMS_FILE); skipping.')
  process.exit(process.env.CI && process.env.GITHUB_REPOSITORY === 'joshatbond/portfolio' ? 1 : 0)
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'iu')
const textExt = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.css', '.html', '.json', '.md', '.mdx', '.txt', '.xml', '.svg', '.webmanifest', '.yml', '.yaml'])

let hits = 0
let scanned = 0
function walk(path) {
  const st = statSync(path)
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) if (name !== 'node_modules' && !name.startsWith('.')) walk(join(path, name))
    return
  }
  if (!textExt.has(extname(path)) && !['_redirects', '_headers'].includes(path.split('/').pop())) return
  scanned++
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    // Report the location only; echoing the term would leak it into CI logs.
    if (pattern.test(line)) {
      hits++
      console.error(`NDA guard: confidential term in ${path}:${i + 1}`)
    }
  })
}

for (const dir of process.argv.slice(2)) if (existsSync(dir)) walk(dir)
console.log(`NDA guard: scanned ${scanned} files against ${terms.length} terms, ${hits} hit(s).`)
process.exit(hits ? 1 : 0)
