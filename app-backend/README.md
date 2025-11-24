# Backend

## Agent endpoint (`/agent`)

- Env required:
  - `OPENAI_API_KEY`
  - `MDB_MCP_CONNECTION_STRING` (read-only Atlas connection string)
  - `MCP_SERVER_URL` (e.g., `http://localhost:3001/mcp`)
- Rate limited: 10 requests/minute by default.
- Custom port: set `PORT` (defaults to `8080`).

### Quick test

1) Start the backend:
```bash
export OPENAI_API_KEY=sk-...
export MDB_MCP_CONNECTION_STRING="mongodb+srv://readonly:.../mmm"
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
- 500: missing envs or MCP/OpenAI connectivity issues
