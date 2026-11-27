// NDA guard: fails if any confidential term appears in the repo or the build.
//
// The terms themselves are confidential, so they never live in this repo.
// They come from the NDA_TERMS env var (CI secret) or the file named by
// NDA_TERMS_FILE (default ~/.config/portfolio/nda-terms.txt): one term per line
// or comma-separated, matched case-insensitively on word boundaries.
//
// With no arguments it checks every file git tracks (paths and contents) plus
// dist/. With arguments it checks those files or folders instead.
// Hits are reported by location only, with the term redacted, so the CI log
// never repeats it.
//
// usage: node scripts/check-nda.mjs [path ...]
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const file = process.env.NDA_TERMS_FILE ?? join(homedir(), '.config/portfolio/nda-terms.txt')
const raw = process.env.NDA_TERMS || (existsSync(file) ? readFileSync(file, 'utf8') : '')
const terms = raw.split(/[\n,]/).map((t) => t.trim()).filter((t) => t && !t.startsWith('#'))

if (terms.length === 0) {
  console.warn('NDA guard: no terms configured (set NDA_TERMS or NDA_TERMS_FILE); skipping.')
  // In this repo's CI the secret must be present; elsewhere (forks) skip.
  process.exit(process.env.CI && process.env.GITHUB_REPOSITORY === 'joshatbond/portfolio' ? 1 : 0)
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const source = `(?<![\\p{L}\\p{N}])(?:${terms.map(escape).join('|')})(?![\\p{L}\\p{N}])`
const pattern = new RegExp(source, 'iu')
// Also match slugs and file names, where words are joined by - _ . or /.
const test = { test: (s) => pattern.test(s) || pattern.test(s.replace(/[-_./]+/g, ' ')) }
const redact = (s) => {
  if (!test.test(s)) return s
  return pattern.test(s) ? s.replace(new RegExp(source, 'giu'), '[redacted]') : '[path redacted]'
}

function walk(path, out) {
  if (!existsSync(path)) return out
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) if (name !== 'node_modules' && name !== '.git') walk(join(path, name), out)
  } else out.push(path)
  return out
}

const args = process.argv.slice(2)
const files = args.length
  ? args.flatMap((p) => walk(p, []))
  : [...execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean), ...walk('dist', [])]

let hits = 0
for (const path of files) {
  if (test.test(path)) {
    hits++
    console.error(`NDA guard: confidential term in a file path: ${redact(path)}`)
  }
  if (!existsSync(path)) continue
  const buf = readFileSync(path)
  // Skip binary files (images, fonts): a NUL byte in the first 8 KB.
  if (buf.subarray(0, 8192).includes(0)) continue
  buf
    .toString('utf8')
    .split('\n')
    .forEach((line, i) => {
      if (test.test(line)) {
        hits++
        console.error(`NDA guard: confidential term in ${redact(path)}:${i + 1}`)
      }
    })
}

console.log(`NDA guard: checked ${files.length} files against ${terms.length} terms, ${hits} hit(s).`)
process.exit(hits ? 1 : 0)
