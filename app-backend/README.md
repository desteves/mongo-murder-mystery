# Backend

## Agent endpoint (`/agent`)

- Env required:
  - `OPENAI_API_KEY`
  - `MDB_MCP_CONNECTION_STRING` (read-only Atlas connection string)
  - `MCP_SERVER_URL` (e.g., `http://localhost:3001/mcp`; if pointing to a secured Cloud Run URL, the backend will fetch an ID token automatically)
  - `MCP_ID_TOKEN_AUDIENCE` (optional; defaults to `MCP_SERVER_URL` for ID token audience override)
- Rate limited: 10 requests/minute by default.
- Custom port: set `PORT` (defaults to `8080`).

### Quick test

1) Start the backend:
```bash
export OPENAI_API_KEY=sk-...
export MDB_MCP_CONNECTION_STRING="mongodb+srv://.../mmm"
export MCP_SERVER_URL="http://localhost:3001/mcp"
PORT=3000 npm start   # change the port if needed
```

2) Call the agent:
```bash
curl -s http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List the collections in the murder mystery database"}'
```

Expect a JSON reply. Errors to check:
- 400: prompt missing/too long (max 512 chars)
- 429: rate limit exceeded
- 503: missing envs (OPENAI_API_KEY, MDB_MCP_CONNECTION_STRING, MCP_SERVER_URL)
- 500: MCP/OpenAI connectivity issues
