# AGENTS.md

Guidance for AI agents (and humans) working on this repository. Read this first; `CLAUDE.md` has deeper architecture notes.

## What this project is

MongoDB Murder Mystery (https://mongomurdermystery.com): a free game for learning MongoDB queries. Players solve a murder by
querying a real database in a mongosh-style box (`/eval`), with a step-by-step walkthrough and an AI Track where an LLM agent
queries the database for them (`/agent`). Three Cloud Run services: Vue 3 + Vite frontend served by nginx, an Express API, and a
private MongoDB MCP server. Terraform in `infra/`. MIT licensed.

## Code map

| Path | What |
|---|---|
| `app-frontend/murdermystery` | Vue 3 + Vite SPA, nginx image, Playwright e2e (`e2e/`), UTM helper `src/lib/utm.js` |
| `app-backend` | Express API: `helpers.js` (query parsing/validation), `ejson.js` (EJSON in/out, BSON type guard), `agent.js` + `llm.js` (LLM agent), `memory.js` (conversation memory), `server.js`, `database*.js` |
| `app-mcp` | Wrapper that runs `mongodb-mcp-server` over HTTP (read-only) |
| `infra` | Terraform: apis, iam, secrets, runtime, network, cicd, observability (`infra/README.md`) |
| `scripts` | `smoke-images.sh`, `loadtest.mjs`, `check-utm.mjs`, `install-hooks.sh` |
| `docs` | `RUNBOOK.md` (operations), `todo.md` (roadmap), `EJSON.md`, `AGENT_MEMORY.md` (+ Atlas permission/TTL docs) |

## Commands

```bash
cd app-backend && npm test                       # Jest (agent.test.js/server.test.js need local ports)
cd app-frontend/murdermystery && npm run lint && npm run build && npm run test:unit
node scripts/check-utm.mjs                       # every mongodb.com link carries the standard UTM parameters
scripts/smoke-images.sh                          # builds and probes all three images (needs Docker)
terraform -chdir=infra fmt -check -recursive     # plans/applies: see infra/README.md, plans stay outside the repo
```

## Rules for changes

1. **Every push to `main` deploys all three services** (Cloud Build triggers). Run the checks above, and `scripts/smoke-images.sh`
   for any Dockerfile or dependency change. A bad image is an outage.
2. **Never commit secrets.** `.env*`, `*.tfvars`, state and plan files are git-ignored; credentials live in Secret Manager. Run
   `scripts/install-hooks.sh` so the pre-commit hook blocks them. Keep Terraform plans outside the repo.
3. **UTM on every link to mongodb.com** (any subdomain: www, learn, cloud, docs): `utm_campaign=devrel&utm_source=third-party-content&utm_medium=cta&utm_content=mmm&utm_term=diana.esteves`.
   In the frontend never hand-write it: wrap the URL in `withUtm()` (`src/lib/utm.js`). Static docs carry the literal query string.
   `node scripts/check-utm.mjs` enforces it.
4. **Security boundaries.** (EJSON can express JavaScript via `{"$code": ...}`: keep `ejson.js::findForbiddenBsonType` in the path of every parsed filter.) The `solution` collection is reachable only through the restricted check in `/eval`; neither the query box
   nor the agent/MCP may read it. `/eval` rejects server-side JavaScript and write/join operators anywhere in a filter, projection
   or sort (`helpers.js::assertNoForbiddenOperators`, fuzz-tested in `security.fuzz.test.js`). Keep those tests green when touching the parser.
5. **Runtime dependencies belong in `dependencies`**, not `devDependencies` (images install with `--omit=dev`).
6. **Hero images are immutable.** `public/hero-<width>.webp` is cached for a year: when the picture changes, use new file names (and update `HelloWorld.vue` and the preload in `index.html`).
7. **Docker images are pinned and run as non-root.** Do not use floating tags; keep the OS-package upgrade and version guards in the Dockerfiles.
8. **Infrastructure changes go through `infra/`** (Terraform). Cloud Build owns Cloud Run images and revision labels; do not fight it.
9. **Agent readiness.** Every interactive element needs an accessible name; new forms need `toolname`/`tooldescription` and named fields; keep one `<h1>` per page and reserve space for images (see `docs/AGENTIC.md`).
10. **Keep copy accurate.** The About page states how the system works and what is logged; update it when behavior changes.
11. Tests accompany behavior changes. State what you verified and what you could not.

## Gotchas learned the hard way
- `google-auth-library` >= 10 returns a web `Headers` object; spreading it drops the header (`agent.js::toPlainHeaders`).
- MCP server v3 needs the `connectionId` returned by `connect` on every data tool (`agent.js::extractConnectionId`); `count` takes `query`, not `filter`.
- Grove `gpt-6-luna` rejects function tools on chat/completions unless `reasoning_effort` is `none` (`llm.js`).
- nginx 1.30 keeps its pid at `/run/nginx.pid`; the non-root Dockerfile rewrites it to `/tmp` and must remove the root-owned file `nginx -t` leaves behind.
- The frontend reads `VITE_MMM_API_BASE_URL`/`VITE_MMM_API_KEY` at **build** time; the Cloud Build trigger must pass them (see `infra/modules/cicd`).
- Every push redeploys MCP too; in-flight `/agent` calls can see `session not found` (sessions are in memory). Retry.

## Using the project as an agent
- Site summary for LLMs: `https://mongomurdermystery.com/llms.txt`.
- API (needs the shared `x-api-key`, rate limited): `GET /eval?query=<url-encoded mongosh-like query>`, `POST /agent {"prompt": "...", "sessionId": "..."}` (prompt <= 512 chars).
