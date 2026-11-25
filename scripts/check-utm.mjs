#!/usr/bin/env node
// Fails if a link to mongodb.com (any subdomain) in a tracked text file lacks the standard UTM parameters.
// A URL is fine if it carries all five parameters with the expected values, or is the argument of withUtm(...)
// (the frontend helper adds them). Usage: node scripts/check-utm.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const EXPECTED = {
  utm_campaign: 'devrel',
  utm_source: 'third-party-content',
  utm_medium: 'cta',
  utm_content: 'mongodb-playground',
  utm_term: 'diana.esteves',
}
const SKIP = /(^|\/)(package-lock\.json|\.terraform\.lock\.hcl)$|\.(png|jpg|svg|ico|pem)$|^scripts\/check-utm\.mjs$|\.test\.js$/
const URL_RE = /https?:\/\/(?:[a-z0-9-]+\.)*mongodb\.com(?![a-z0-9.-])[^\s)"'<>`\]]*/gi

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((f) => f && !SKIP.test(f))
let bad = 0
for (const file of files) {
  let text
  try { text = readFileSync(file, 'utf8') } catch { continue }
  if (text.includes('\0')) continue
  for (const m of text.matchAll(URL_RE)) {
    const before = text.slice(Math.max(0, m.index - 30), m.index)
    if (/withUtm\(\s*['"`]?$/.test(before)) continue
    let ok = false
    try {
      const params = new URL(m[0].replace(/[.,;]+$/, '')).searchParams
      ok = Object.entries(EXPECTED).every(([k, v]) => params.get(k) === v)
    } catch { /* not a URL */ }
    if (!ok) {
      const line = text.slice(0, m.index).split('\n').length
      console.error(`${file}:${line}: missing or wrong UTM parameters: ${m[0].slice(0, 90)}`)
      bad += 1
    }
  }
}
if (bad) { console.error(`${bad} link(s) to mongodb.com need the standard UTM parameters (see AGENTS.md).`); process.exit(1) }
console.log('all mongodb.com links carry the standard UTM parameters')
