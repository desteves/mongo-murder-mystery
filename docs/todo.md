# To do

Open work, newest decisions first. Cross items off when they ship. Full rationale: the improvement plan modelled on
`desteves/mongodb-playground` (dependabot, pre-deploy gates, least-privilege identities, tuned connections, alerts).

## Done in GCP (2026-11-25, `diana-438818`)
- [x] Dedicated runtime service accounts `mmm-fe-sa` (no roles), `mmm-be-sa`, `mmm-mcp-sa` (log/metric writers); the Cloud Build
  deployer (default compute SA) has `iam.serviceAccountUser` on each so deploys keep working
- [x] MCP is private: only `mmm-be-sa` has `run.invoker` (backend sends an ID token); `maxScale=1`; CPU boost on
- [x] Secrets moved to Secret Manager (`mmm-be-*`, `mmm-mcp-mdb-mcp-connection-string`), mounted as `:latest` env refs,
  `secretAccessor` granted per secret. **Values were copied as-is, not rotated**: rotate in Atlas/OpenRouter, then
  `gcloud secrets versions add <name> --data-file=-` (services pick up `latest` on the next revision)
- [x] Alerts to the email channel `MMM alerts (email)`: frontend uptime (`/healthz`), Cloud Run 5xx, crash/startup-failure logs.
  The channel may need its verification email confirmed

## Done (2026-11-25/26)
- [x] Mongo connection profile (`minPoolSize 0`, idle/connect timeouts, zlib, retries); SIGTERM drains HTTP then closes DBs
- [x] `/eval` rejects `$where/$function/$accumulator/$out/$merge/$lookup/...` anywhere in filter/projection/sort (found by the new fuzz test `security.fuzz.test.js`: `$expr: {$function}` used to reach the database)
- [x] nginx: security headers now apply in every location (they were silently dropped where a location set its own `add_header`); CSP in report-only mode
- [x] `cloudbuild.yaml` opt-in template (tests, smoke, no-traffic deploy, probe, shift); triggers still use inline configs
- [x] Dependabot (grouped, majors separated), CODEOWNERS, SECURITY.md, PR/issue templates
- [x] Pre-commit secret scan (`scripts/install-hooks.sh`)
- [x] `scripts/smoke-images.sh`: builds and probes all three images before they ship
- [x] `.dockerignore` hardening (no `.env*`, logs, test output in image build context)

## Phase 1: finish
- [ ] **Switch the three triggers to `cloudbuild.yaml`** (they use inline configs today; the template is untested and its
  smoke step may need `--network=cloudbuild` handling). Try it on one service first.
- [ ] Run `scripts/install-hooks.sh` on every clone; run `scripts/smoke-images.sh` once with Docker

## Phase 2: security
- [ ] Rotate the secrets that moved to Secret Manager (values are unchanged since migration)
- [ ] Remove `VITE_MMM_API_KEY` from the browser bundle (nginx proxy with server-side key, or rely on rate limits)
- [ ] Cloud Armor / Cloudflare rate limits, preview-then-enforce
- [ ] Switch CSP from report-only to enforcing after checking the browser console; longer HSTS; `/agent` daily cap + spend alert

## Phase 3: performance
- [ ] Cloud Run: `--cpu-boost`, explicit concurrency/max-instances, HTTP startup probes
- [ ] Frontend: precompressed assets, lazy-load CodeMirror chunk; indexes for game queries; load test

## Phase 4-6
- [ ] Budget alert (needs billing account and amount); backend/MCP uptime checks; runbook
- [ ] Terraform (optional); validator fuzz test; Playwright mobile project in CI
