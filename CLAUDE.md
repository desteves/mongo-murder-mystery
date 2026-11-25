# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a MongoDB Murder Mystery game with a three-service architecture:

1. **Frontend** (`app-frontend/murdermystery`): Vue 3 + Vite SPA with a MongoDB Shell-like interface
2. **Backend** (`app-backend`): Node.js/Express API with two distinct endpoints:
   - `/eval` - Direct MongoDB query execution (validates & runs user queries)
   - `/agent` - AI assistant endpoint (uses OpenAI/OpenRouter + MongoDB MCP server)
3. **MCP Server** (`app-mcp`): HTTP-based MongoDB MCP server for agent-driven database access

```
Frontend (Vue/Vite) → Backend API → MongoDB Atlas (read-only)
                              ↓
                      MCP Server (HTTP) → MongoDB Atlas (read-only)
```

### Critical Architectural Constraints

- **Database Separation (Security Boundary)**:
  - `mmm` database: Contains solution collection ONLY
    - `solution` collection: **NO ACCESS** for agent/MCP (prevents cheating)
    - Access: `/eval` endpoint for solution verification only
  - `mmm_AI` database: Game data + AI operational data
    - `crime`, `person`, `gymCheckin`, `socialEventCheckin` collections: **READ** for agent/MCP
    - `agent_memory` collection: **READ/WRITE** for agent/MCP
    - Vector embeddings collections: **READ/WRITE** for vector search
    - Access: Agent/MCP via `/agent` endpoint
    - Used for: AI-assisted investigation, vector search, conversation history
  - Two separate MongoDB connections: `MONGODB_URI` and `MONGODB_URI_AI`
- **MongoDB is read-only** except for the `solution` collection (update-only for mystery validation)
- **Two separate authentication paths**: 
  - `/eval` uses direct driver connection to mmm
  - `/agent` uses MCP tools on mmm_AI only
- **Rate limiting**: `/eval` allows 30 req/min, `/agent` allows 10 req/min (configurable via express-rate-limit)
- **Request timeout**: 30s default (`REQUEST_TIMEOUT_MS` env var)

## Recent Improvements (2026-05)

### Security Hardening
- ✅ Fixed timing attack vulnerability in API key comparison
- ✅ Added Helmet.js for security headers (HSTS, X-Frame-Options, CSP, etc.)
- ✅ Fixed CORS preflight handling by reordering middleware
- ✅ Added support for both HTTP/HTTPS in CORS allowlist
- ✅ Sanitized error messages to prevent information leakage
- ✅ Replaced console.log with structured logging throughout

### Dependency Updates
- ✅ Aggressive update to latest versions (all major bumps)
- ✅ OpenAI SDK: 4.104 → 6.37
- ✅ Vite: 7.3 → 8.0 (with manualChunks fix)
- ✅ Vue Router: 4.6 → 5.0
- ✅ ESLint: 9.39 → 10.3 (with globals config)
- ✅ MongoDB driver: 7.1 → 7.2
- ✅ express-rate-limit: 7.5 → 8.5
- ✅ All security vulnerabilities resolved

### Infrastructure
- ✅ Database reconnection with exponential backoff
- ✅ Configurable max retries (default: 5)
- ✅ Prevents connection stacking under load
- ✅ Improved error messages and logging

## Development Commands

### Backend (`app-backend/`)

```bash
# Local development (requires .env file)
npm start                    # Start server (default port 8080)
PORT=3000 npm start         # Override port

# Testing
npm test                    # Run Jest tests

# Docker
docker build -t mmm-api .
docker run -p 3000:8080 --env-file .env mmm-api
```

**Required environment variables** (see `ENV_VARIABLES.md` for complete reference):
- `MONGODB_URI` - MongoDB connection string
- `INTERNAL_API_KEY` - API key for frontend auth
- `SALT` - Hash salt for solution validation
- `CLUE_CRIME` - MongoDB ObjectId for crime scene clue

**Agent endpoint requirements** (optional, only if using `/agent`):
- `OPENAI_API_KEY` - OpenAI/OpenRouter API key
- `MDB_MCP_CONNECTION_STRING` - Read-only Atlas connection string
- `MCP_SERVER_URL` - MCP server URL (e.g., `http://localhost:3001/mcp`)

### Frontend (`app-frontend/murdermystery/`)

```bash
# Local development
npm install
npm run dev                 # Vite dev server (default port 5173)
npm run build              # Production build
npm run preview            # Preview production build

# Linting
npm run lint               # Run oxlint + eslint
npm run format             # Prettier formatting

# Testing
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # Run with browser visible
```

**Required environment variables** (must prefix with `VITE_`):
- `VITE_MMM_API_BASE_URL` - Backend API URL (e.g., `http://localhost:8080`)
- `VITE_MMM_API_KEY` - Matches backend's `INTERNAL_API_KEY`

### MCP Server (`app-mcp/`)

```bash
# Local development
PORT=3001 MDB_MCP_HTTP_PORT=3001 MDB_MCP_CONNECTION_STRING="mongodb+srv://..." npm start

# Docker
docker build -t mmm-mcp .
docker run -p 3001:8080 -e MDB_MCP_CONNECTION_STRING="mongodb+srv://..." mmm-mcp
```

**Environment variables**:
- `MDB_MCP_CONNECTION_STRING` - MongoDB Atlas connection (read-only user)
- `MDB_MCP_READ_ONLY=true` (default via start script)
- `MDB_MCP_HTTP_HOST=0.0.0.0` (default)
- `MDB_MCP_HTTP_PORT=8080` (default, use `PORT` to override)
- `MDB_MCP_DISABLED_TOOLS=atlas,atlas-local` (default, silences warnings)

## Key Implementation Patterns

### Backend Endpoint Design

- **`/eval` endpoint** (GET): Accepts URI-encoded MongoDB queries, validates them using `mongodb-query-parser`, executes via direct driver
  - Validation in `helpers.js::validateQueryString()`
  - Query execution in `helpers.js::processQuery()`
  - Security: read-only queries only, API key required

- **`/agent` endpoint** (POST): Routes user prompts through OpenAI/OpenRouter model, executes MCP tool calls
  - Agent logic in `agent.js::runAgent()`
  - Max prompt length: 512 characters
  - Uses `mcp_call` helper to invoke MCP server tools
  - Returns plain text reply from LLM

### Environment Validation

The backend validates environment variables on startup via `config.js::validateEnv()`:
- **Required vars missing**: exits with code 1
- **Recommended vars missing**: logs warning, continues
- **Agent vars missing**: logs warning, `/agent` returns 503

### MongoDB Connection Pool

Connection pooling configured in `database.js`:
- `maxPoolSize`: 20 (configurable via `MONGODB_MAX_POOL`)
- `minPoolSize`: 2 (configurable via `MONGODB_MIN_POOL`)
- `serverSelectionTimeoutMS`: 5000 (configurable)
- `socketTimeoutMS`: 20000 (configurable)
- Single shared client instance across the application
- Exponential backoff reconnection with max 5 retries (configurable via `MONGODB_MAX_RETRIES`)
  - Retry delays: 100ms, 200ms, 400ms, 800ms, 1600ms
  - Prevents connection attempt stacking under load

### Testing Strategy

- **Backend**: Jest tests for `helpers.js` and `server.js` (integration tests with supertest)
- **Frontend**: Playwright E2E tests for user flows
- Test files follow `*.test.js` naming convention
- Jest setup in `app-backend/jest.setup.js`

## Common Development Tasks

### Running full stack locally

1. Start MCP server (terminal 1):
   ```bash
   cd app-mcp
   PORT=3001 MDB_MCP_HTTP_PORT=3001 MDB_MCP_CONNECTION_STRING="..." npm start
   ```

2. Start backend (terminal 2):
   ```bash
   cd app-backend
   # Configure .env with all required vars
   PORT=3000 npm start
   ```

3. Start frontend (terminal 3):
   ```bash
   cd app-frontend/murdermystery
   # Configure .env with VITE_MMM_API_BASE_URL=http://localhost:3000
   npm run dev
   ```

### Testing the agent endpoint

```bash
curl -s http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INTERNAL_API_KEY" \
  -d '{"prompt":"List the collections in the murder mystery database"}'
```

### Testing the eval endpoint

```bash
curl "http://localhost:3000/eval?query=db.person.find().limit(5)" \
  -H "x-api-key: YOUR_INTERNAL_API_KEY"
```

## File Organization

### Backend (`app-backend/`)
- `config.js` - Environment variable validation and configuration object
- `database.js` - MongoDB connection singleton with exponential backoff reconnection
- `helpers.js` - Query validation and execution logic
- `agent.js` - AI agent implementation with MCP integration
- `server.js` - Express app setup, middleware, endpoints
- `logger.js` - Pino structured logger configuration
- `index.js` - Entry point with graceful shutdown
- `Dockerfile` - Multi-stage Docker build with tests

### Frontend (`app-frontend/murdermystery/`)
- `src/services/api.js` - Axios API client with interceptors
- `src/router/index.js` - Vue Router configuration
- `src/components/` - Vue 3 components
- `src/views/` - Vue 3 page views
- `vite.config.js` - Vite build configuration with code splitting
- `eslint.config.js` - ESLint 10 flat config with globals

### MCP Server (`app-mcp/`)
- HTTP-based MongoDB MCP server for agent interactions
- See MongoDB MCP server documentation for details

## Containers & Deployment (2026-11)

Every merge to `main` deploys to Cloud Run via Cloud Build triggers, so a broken image is an outage.
Run `scripts/smoke-images.sh` (builds each image and probes it) before pushing Dockerfile or dependency changes.

- **Node pin**: backend/MCP/frontend-build use `node:24.22.x` (patched for CVE-2026-111497); Dependabot bumps the tag.
  Never use floating tags such as `node:lts-alpine`.
- **Non-root**: backend and MCP run as `USER node`; frontend runs as `nginx` on the official `nginx:1.30.x-alpine`
  image. nginx 1.30 keeps its pid at `/run/nginx.pid`, so the Dockerfile rewrites the `pid` directive to `/tmp` (and
  removes the `/tmp/nginx.pid` that the build-time `nginx -t` leaves behind, which is root-owned).
- **OS package guards**: `apk upgrade` + a build-time check that `brotli-libs >= 1.2.1-r0` (Alpine images);
  `apt-get upgrade` on the Debian MCP image. A failing check fails the build on purpose.
- **Production deps**: anything required at startup (e.g. `dotenv`) must be in `dependencies`, not `devDependencies`
  (images install with `npm ci --omit=dev`).
- **MCP server v3** refuses non-loopback binds; `MDB_MCP_DANGEROUS_HOST_BINDING=true` is set in the Dockerfile for
  Cloud Run. Restrict who can call the service (private ingress / IAM), do not rely on the bind check.
- **Security process**: Dependabot (weekly, grouped), pre-commit secret scan (`scripts/install-hooks.sh`), see
  `SECURITY.md`. The improvement roadmap is in `docs/todo.md`.

## GCP Runtime (project `diana-438818`, us-central1)

- **Identities**: `mmm-fe-sa` (no roles), `mmm-be-sa`, `mmm-mcp-sa` (log/metric writers). The Cloud Build deployer (default compute SA)
  has `iam.serviceAccountUser` on each, so deploys keep working.
- **MCP is private**: `run.invoker` only for `mmm-be-sa` (plus the default compute SA until `/agent` is confirmed end to end).
  The backend sends a Google ID token (`agent.js::getMcpAuthHeaders`; google-auth-library returns a web `Headers` object, so
  it must be converted with `toPlainHeaders` or the Authorization header is silently dropped).
- **Secrets** live in Secret Manager (`mmm-be-*`, `mmm-mcp-mdb-mcp-connection-string`) as `:latest` env refs. Rotate by adding a
  secret version; the next revision picks it up.
- **Agent model**: Grove Foundry Gateway, `gpt-6-luna` (`app-backend/llm.js`; `GROVE_API_KEY` secret `mmm-be-grove-api-key`). It needs
  `reasoning_effort: "none"` when function tools are sent on chat/completions. MCP server v3 needs the `connectionId` returned by
  `connect` on every data tool (`agent.js::extractConnectionId`). OpenRouter (`OPENAI_MODEL`, below) remains the fallback.
- **OpenRouter fallback**: `OPENAI_MODEL`. Free models disappear and are limited to ~50 requests/day without credits; the
  account has guardrails/ZDR that restrict providers. `REQUEST_TIMEOUT_MS=120000` because reasoning models are slow.
- **Deploy race**: every push redeploys MCP too; MCP sessions are in memory, so an in-flight `/agent` call can get
  `session not found` (404, -32003) while a new MCP revision takes over. Retry; do not treat as a bug.
- **Alerts** (email channel `MMM alerts (email)`): frontend `/healthz` uptime, Cloud Run 5xx, crash/startup-failure logs.
- **Browser API key**: `VITE_MMM_API_KEY` is public by design (it ships in the bundle). It is a speed bump, not authentication;
  the real controls are `express-rate-limit`, query validation (`helpers.js`, fuzz-tested) and read-only database users.
  Proxying it through nginx would make it equally public and break per-client rate limiting, so it was deliberately not done.

## Dependencies

### Backend (Current Versions)
- **Runtime**: Node.js 24.22.x (pinned; Alpine-based Docker image)
- **Framework**: Express 5.1.0
- **Database**: MongoDB driver 7.2.0
- **AI**: OpenAI SDK 6.37.0 (OpenRouter compatible)
- **Security**: Helmet 8.1.0, express-rate-limit 8.5.1
- **Auth**: google-auth-library 10.6.2
- **Logging**: Pino 10.3.1, pino-http 11.0.0
- **Testing**: Jest 30.4.1, supertest 7.1.4

### Frontend (Current Versions)
- **Framework**: Vue 3.5.34
- **Build**: Vite 8.0.11, esbuild 0.28.0
- **Routing**: Vue Router 5.0.6
- **HTTP**: Axios 1.16.0
- **Editor**: CodeMirror 6.0.2 + extensions
- **Linting**: ESLint 10.3.0, oxlint 1.63.0, Prettier 3.8.3
- **Testing**: Playwright 1.59.1

## Security Hardening

### Authentication & Authorization
- **Timing-safe API key comparison** (`crypto.timingSafeEqual()`) prevents timing attacks
- All API endpoints require `x-api-key` header (except `/health`, `/readiness`)
- API key validation in `server.js::requireApiKey()`

### CORS Configuration
- Explicit allowlist in `server.js::allowedOrigins`
- Supports both HTTP and HTTPS for production domains:
  - `https://mongomurdermystery.com`
  - `https://mongodbmurdermystery.com`
  - `http://mongomurdermystery.com`
  - `http://mongodbmurdermystery.com`
  - `process.env.ALLOWED_ORIGIN` (for additional domains)
- CORS middleware positioned before API key check to allow preflight OPTIONS requests
- Credentials enabled for cookie/session support

### Security Headers (Helmet.js)
- **HSTS**: `max-age=31536000; includeSubDomains`
- **X-Frame-Options**: `SAMEORIGIN`
- **X-Content-Type-Options**: `nosniff`
- **Referrer-Policy**: `no-referrer`
- **Cross-Origin-Opener-Policy**: `same-origin`
- **Cross-Origin-Resource-Policy**: `same-origin`
- CSP disabled (frontend may need custom policy)

### Rate Limiting
- `/eval` endpoint: 30 requests/min per IP
- `/agent` endpoint: 10 requests/min per IP (more restrictive for AI queries)
- Trust proxy enabled for accurate IP detection behind Cloud Run/NGINX
- Configurable via express-rate-limit

### Input Validation
- **Query validation** (`helpers.js::validateQueryString()`):
  - Max length: 1024 characters
  - URI decoding with error handling
  - Regex-based query pattern validation
  - Collection name sanitization
- **Agent prompt validation**:
  - Max length: 512 characters
  - Trim whitespace
  - Non-empty string check
- **MongoDB query parsing**: JSON validation before execution
- **Sort/limit validation**: Type checking and range limits (1-30 for limit)

### Error Handling
- Global error handler sanitizes errors in production
- Health check errors logged but not exposed to clients
- Structured logging with pino (no sensitive data in logs)
- All `console.log` replaced with structured `logger.error()`

### Database Security
- Read-only MongoDB user recommended for all connections
- `solution` collection: update-only for mystery validation
- Connection pooling prevents resource exhaustion
- Exponential backoff reconnection prevents DoS during outages

### Request Protection
- Request body size limit: 64kb
- Request/response timeouts: 30s (configurable via `REQUEST_TIMEOUT_MS`)
- Graceful shutdown handlers (SIGTERM, SIGINT)
