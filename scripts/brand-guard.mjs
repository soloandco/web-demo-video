// Maintainer check: fail if any file that would be published contains a forbidden term.
// Terms live outside the repo (one per line) so the list itself is never published:
//   .brand-guard.local            (git-ignored)   or   BRAND_GUARD_FILE=/path/to/list
// Usage: node scripts/brand-guard.mjs      (exit 1 on any hit)
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const listFile = process.env.BRAND_GUARD_FILE || '.brand-guard.local'
if (!fs.existsSync(listFile)) {
  console.log(`brand-guard: no term list at ${listFile}, skipped`)
  process.exit(0)
}
const terms = fs.readFileSync(listFile, 'utf8').split(/\r?\n/).map((t) => t.trim()).filter((t) => t && !t.startsWith('#'))
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter(Boolean)

let hits = 0
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue
  const buf = fs.readFileSync(file)
  if (buf.includes(0)) continue // binary
  const lines = buf.toString('utf8').split(/\r?\n/)
  lines.forEach((line, n) => {
    const low = line.toLowerCase()
    for (const t of terms) {
      if (low.includes(t.toLowerCase())) { hits++; console.log(`${file}:${n + 1}: forbidden term (#${terms.indexOf(t) + 1})`) }
    }
  })
}
// Commit metadata is published too
const meta = execFileSync('git', ['log', '--all', '--format=%an <%ae> %cn <%ce>%n%B'], { encoding: 'utf8' }).toLowerCase()
for (const t of terms) if (meta.includes(t.toLowerCase())) { hits++; console.log(`git history: forbidden term (#${terms.indexOf(t) + 1})`) }

console.log(hits ? `brand-guard: ${hits} hit(s)` : `brand-guard: clean (${files.length} files, ${terms.length} terms)`)
process.exit(hits ? 1 : 0)
