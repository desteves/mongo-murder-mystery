# Package.json Dependency Updates - Design Document

**Date:** 2026-05-08  
**Type:** Maintenance - Aggressive dependency refresh  
**Scope:** Backend and Frontend package.json files

## Overview

Update all dependencies in both backend and frontend package.json files to their latest versions, including major version updates. This is an aggressive maintenance update with no exclusions.

## Approach

**Atomic Updates with Immediate Testing:** Update all dependencies in both package.json files simultaneously, then fix breaking changes in one pass. This provides the fastest path to a fully updated codebase with a single compatibility validation point.

## Scope & Package Updates

### Backend (app-backend/package.json)

**Major version updates:**
- `openai`: 4.104.0 → 6.37.0
- `express-rate-limit`: 7.5.1 → 8.5.1
- `google-auth-library`: 9.15.1 → 10.6.2

**Minor/patch updates:**
- `mongodb`: 7.1.0 → 7.2.0
- `jest`: 30.3.0 → 30.4.1
- `mongodb-query-parser`: 4.7.6 → 4.7.12
- `dotenv`: 17.3.1 → 17.4.2

**Metadata improvements:**
- Fill in empty `author` field: "diana esteves"
- Fill in empty `description` field: "MongoDB Murder Mystery - Backend API"
- Add `repository` field: "https://github.com/desteves/mongo-murder-mystery"

### Frontend (app-frontend/murdermystery/package.json)

**Major version updates:**
- `vite`: 7.3.1 → 8.0.11
- `vue-router`: 4.6.4 → 5.0.6
- `eslint`: 9.39.4 → 10.3.0
- `@eslint/js`: 9.39.4 → 10.0.1

**Minor/patch updates:**
- `vue`: 3.5.30 → 3.5.34
- `axios`: 1.13.6 → 1.16.0
- `@playwright/test`: 1.58.2 → 1.59.1
- `prettier`: 3.8.1 → 3.8.3
- `@codemirror/autocomplete`: 6.20.1 → 6.20.2
- `@codemirror/language`: 6.12.2 → 6.12.3
- `@vitejs/plugin-vue`: 6.0.5 → 6.0.6
- `eslint-plugin-oxlint`: 1.56.0 → 1.63.0
- `eslint-plugin-vue`: 10.8.0 → 10.9.1
- `oxlint`: 1.56.0 → 1.63.0
- `vite-plugin-vue-devtools`: 8.1.0 → 8.1.2

**Metadata improvements:**
- Add `author` field: "diana esteves"
- Add `description` field: "MongoDB Murder Mystery - Frontend Vue Application"
- Add `repository` field: "https://github.com/desteves/mongo-murder-mystery"

## Breaking Changes & Migration Strategy

### OpenAI SDK (4.x → 6.x) - Critical

**Impact:** `agent.js` (AI assistant endpoint)

The OpenAI SDK has undergone significant changes between v4 and v6. Expected breaking changes:

1. **Client initialization:** Constructor parameters or environment variable handling may have changed
2. **Chat completions API:** Method signatures for `chat.completions.create()` may differ
3. **Tool/function calling:** Syntax for tools and function calls may have evolved
4. **Streaming:** Stream handling patterns may be different
5. **Error types:** New error classes or error handling patterns

**Migration approach:**
- Review OpenAI SDK v6 migration guide
- Update `agent.js::runAgent()` function
- Test MCP tool calling integration thoroughly
- Verify prompt caching still works (if used)
- Update error handling for new exception types

### Express-rate-limit (7.x → 8.x)

**Impact:** `server.js` (rate limiting middleware)

**Migration approach:**
- Check current configuration in `server.js` for `/eval` (30 req/min) and `/agent` (10 req/min)
- Review v8 changelog for configuration changes
- Update middleware initialization if needed
- Verify rate limiting still works with trust proxy settings

### Google-auth-library (9.x → 10.x)

**Impact:** Potentially unused (not clearly referenced in architecture)

**Migration approach:**
- Verify if this is actually used in the codebase
- If unused, consider removing it entirely
- If used, update authentication patterns per v10 migration guide

### Vite (7.x → 8.x)

**Impact:** Frontend build system

**Migration approach:**
- Review Vite 8.x changelog for breaking changes
- Check `vite.config.js` for deprecated configuration options
- Update build scripts if needed
- Verify dev server, build, and preview commands work
- Test HMR (Hot Module Replacement) functionality

### Vue Router (4.x → 5.x)

**Impact:** `app-frontend/murdermystery/src/router/index.js`

**Migration approach:**
- Review Vue Router 5.x migration guide
- Update router initialization syntax if changed
- Check navigation guards for API changes
- Verify route definition syntax
- Test all routes and navigation flows

### ESLint (9.x → 10.x)

**Impact:** Linting configuration and scripts

**Migration approach:**
- Review ESLint 10.x changelog
- Verify flat config format compatibility
- Update any deprecated rules
- Test lint scripts in both projects
- Fix any new linting errors

## Data Flow & Integration

No changes to the architectural data flow:

```
Frontend (Vue/Vite) → Backend API → MongoDB Atlas (read-only)
                              ↓
                      MCP Server (HTTP) → MongoDB Atlas (read-only)
```

**Validation points:**
1. Frontend can still make requests to `/eval` and `/agent` endpoints
2. Backend can still connect to MongoDB
3. Backend can still communicate with MCP server
4. Environment variables remain compatible

## Testing Strategy

### Phase 1: Dependency Installation
1. Update both package.json files with new versions
2. Run `npm install` in `app-backend/`
3. Run `npm install` in `app-frontend/murdermystery/`
4. Verify no npm audit critical vulnerabilities introduced

### Phase 2: Backend Testing
1. Run `npm test` in `app-backend/` - expect failures
2. Fix breaking changes in order of severity:
   - OpenAI SDK changes (agent.js)
   - express-rate-limit changes (server.js)
   - Other breaking changes as discovered
3. Re-run tests until all pass
4. Manually test `/eval` endpoint
5. Manually test `/agent` endpoint

### Phase 3: Frontend Testing
1. Run `npm run build` to verify Vite 8 build works
2. Run `npm run dev` to verify dev server starts
3. Fix Vite configuration breaking changes
4. Fix Vue Router breaking changes
5. Fix ESLint breaking changes
6. Run `npm run lint` and fix any new errors
7. Run `npm run test:e2e` (Playwright tests)

### Phase 4: Integration Testing
1. Start MCP server
2. Start backend with updated dependencies
3. Start frontend dev server
4. Verify full stack works:
   - Frontend loads correctly
   - Queries can be executed via `/eval`
   - AI assistant works via `/agent`
   - No console errors or warnings
5. Test key user flows from Playwright suite

### Phase 5: Lock File Updates
1. Commit updated package.json and package-lock.json files
2. Verify clean install works: `rm -rf node_modules && npm install`

## Rollback Strategy

If breaking changes prove too complex to fix:

1. **Git revert:** All changes are in version control
2. **Lock files:** Revert package-lock.json to restore exact previous versions
3. **Staged rollback:** If only one service fails, can revert that service independently

## Success Criteria

- All backend tests pass (`npm test` in app-backend)
- All frontend E2E tests pass (`npm run test:e2e` in app-frontend/murdermystery)
- No npm audit critical vulnerabilities
- Backend server starts without errors
- Frontend builds and serves without errors
- Full stack integration verified manually
- Both package.json files have improved metadata (author, description, repository)

## Post-Update Verification

1. Check for deprecation warnings in npm install output
2. Review npm audit report
3. Verify no performance regressions
4. Monitor logs for new error patterns
5. Update CLAUDE.md if any new environment variables or configuration required

## Files Modified

- `/app-backend/package.json`
- `/app-backend/package-lock.json`
- `/app-backend/agent.js` (likely)
- `/app-backend/server.js` (possibly)
- `/app-frontend/murdermystery/package.json`
- `/app-frontend/murdermystery/package-lock.json`
- `/app-frontend/murdermystery/vite.config.js` (possibly)
- `/app-frontend/murdermystery/src/router/index.js` (possibly)
- Any ESLint config files (possibly)

## Timeline Estimate

- Dependency updates: 5 minutes
- Backend breaking changes: 30-60 minutes (OpenAI SDK is the largest unknown)
- Frontend breaking changes: 20-40 minutes
- Integration testing: 15-30 minutes
- **Total:** 1.5-3 hours depending on breaking change complexity
