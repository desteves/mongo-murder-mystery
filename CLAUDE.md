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

- **MongoDB is read-only** except for the `solution` collection (update-only for mystery validation)
- **Two separate authentication paths**: `/eval` uses direct driver connection, `/agent` uses MCP tools
- **Rate limiting**: `/eval` allows 30 req/min, `/agent` allows 10 req/min (configurable via express-rate-limit)
- **Request timeout**: 30s default (`REQUEST_TIMEOUT_MS` env var)

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

- `app-backend/config.js` - Environment variable validation and configuration object
- `app-backend/database.js` - MongoDB connection singleton
- `app-backend/helpers.js` - Query validation and execution logic
- `app-backend/agent.js` - AI agent implementation with MCP integration
- `app-backend/server.js` - Express app setup, middleware, endpoints
- `app-backend/logger.js` - Pino logger configuration
- `app-frontend/murdermystery/src/services/api.js` - API client wrapper
- `app-frontend/murdermystery/src/router/index.js` - Vue Router configuration

## Security Considerations

- All API endpoints require `x-api-key` header (except `/health`, `/readiness`)
- CORS restricted to specific origins (configurable via `ALLOWED_ORIGIN`)
- Rate limiting enforced per IP address (trust proxy enabled for Cloud Run/NGINX)
- MongoDB queries are validated before execution to prevent injection
- Agent prompts limited to 512 characters max
- Connection strings should use read-only database users
