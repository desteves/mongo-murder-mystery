#!/usr/bin/env node
// Load + abuse test for the backend. Run against a LOCAL stack (never production: it deliberately trips the rate
// limiter). Usage: BASE_URL=http://localhost:8080 API_KEY=... node scripts/loadtest.mjs [requests=120] [concurrency=20]
//
// Checks: (1) a burst on /eval is served fast or rejected with 429 (never 5xx), (2) hostile queries are rejected
// (400/403/429, never 200 with data), (3) /health stays healthy afterwards.
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const KEY = process.env.API_KEY || '';
const total = parseInt(process.argv[2] || '120', 10);
const conc = parseInt(process.argv[3] || '20', 10);
if (/mongomurdermystery|run\.app/.test(BASE) && !process.env.ALLOW_PROD) {
  console.error('Refusing to load-test a deployed URL (set ALLOW_PROD=1 to override).'); process.exit(2);
}

const get = async (path) => {
  const t = performance.now();
  const res = await fetch(BASE + path, { headers: { 'x-api-key': KEY } }).catch(() => ({ status: 0, text: async () => '' }));
  return { status: res.status, ms: performance.now() - t, body: await res.text().catch(() => '') };
};
const q = (s) => '/eval?query=' + encodeURIComponent(s);

let failures = 0;
const check = (ok, msg) => { console.log((ok ? '  ok:   ' : '  FAIL: ') + msg); if (!ok) failures += 1; };

// 1. burst
const counts = {}; const lat = [];
let next = 0;
await Promise.all(Array.from({ length: conc }, async () => {
  while (next < total) {
    next += 1;
    const r = await get(q('db.person.find({}).limit(5)'));
    counts[r.status] = (counts[r.status] || 0) + 1; lat.push(r.ms);
  }
}));
lat.sort((a, b) => a - b);
const p95 = lat[Math.floor(lat.length * 0.95)] || 0;
console.log('burst:', total, 'requests @', conc, 'concurrency ->', counts, 'p95', p95.toFixed(0) + 'ms');
check(!Object.keys(counts).some((s) => s === '0' || Number(s) >= 500), 'no 5xx or connection errors under load');
check((counts[429] || 0) > 0 || total <= 30, 'rate limiter engaged (429) once the per-minute budget was exceeded');

// 2. abuse (use a fresh minute so the limiter does not mask the validator)
await new Promise((r) => setTimeout(r, 61000));
const hostile = [
  'db.solution.find({})', 'db.solution.deleteMany({})', 'db.person.find({"$where":"sleep(5000)"})',
  'db.person.find({"$expr":{"$function":{"body":"x","args":[],"lang":"js"}}})', 'db.person.drop()',
  'db.person.aggregate([{"$out":"x"}])', 'db.getSiblingDB("admin").system.users.find({})',
];
for (const h of hostile) {
  const r = await get(q(h));
  check(r.status >= 400 && r.status < 500, `${h} -> ${r.status}`);
}

// 3. still healthy
const hr = await get('/health');
check(hr.status === 200, `/health after the test -> ${hr.status}`);
process.exit(failures ? 1 : 0);
