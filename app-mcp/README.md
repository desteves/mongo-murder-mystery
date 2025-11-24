# MongoDB MCP Server (Atlas, read-only)

This folder packages the official `mongodb-mcp-server` running in HTTP mode for Cloud Run.

## Environment

- `MDB_MCP_CONNECTION_STRING` **(required)**: MongoDB Atlas connection string (use a **read-only** user).
- `MDB_MCP_READ_ONLY` (default: `true` via start script)
- `MDB_MCP_HTTP_HOST` (default: `0.0.0.0` via start script)
- `MDB_MCP_HTTP_PORT` (default: `8080` via start script / Cloud Run `PORT`)

## Run locally

```bash
cd app-mcp
# pick a free port (backend often uses 8080); 3001 is usually free locally
PORT=3001 MDB_MCP_HTTP_PORT=3001 MDB_MCP_CONNECTION_STRING="mongodb+srv://readonly:..." npm start
# HTTP MCP transport will listen on http://localhost:3001

# or load from .env (Unix)
set -a; source .env; set +a; npm start
```

### Quick test (HTTP MCP transport)

The HTTP transport speaks MCP JSON-RPC on `/mcp`. You must:
1) Include `Accept: application/json, text/event-stream`
2) Initialize a session
3) Connect (once per session) using `connect` with your connection string
4) Reuse the returned `mcp-session-id` for tool calls

1) Initialize (captures the session id from response headers):

```bash
SESSION_ID=$(
  curl -is http://localhost:3001/mcp \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"clientInfo":{"name":"curl","version":"0.0.0"},"protocolVersion":"2024-11-05","capabilities":{}}}' \
  | awk '/mcp-session-id:/ {print $2}' | tr -d '\r'
)
echo "Session: $SESSION_ID"
```

2) Connect (registers the DB tools for this session) using `tools/call`:

```bash
curl -s http://localhost:3001/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"connect","arguments":{"connectionString":"'"${MDB_MCP_CONNECTION_STRING}"'"}}}'
```

3) Call a tool (e.g., list databases) via `tools/call`:
```bash
curl -s http://localhost:3001/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"list-databases","arguments":{}}}'
```

A successful response returns JSON with the available databases.

## Build and deploy to Cloud Run

```bash
cd app-mcp
gcloud builds submit --tag gcr.io/PROJECT_ID/mm-mcp
gcloud run deploy mm-mcp \
  --image gcr.io/PROJECT_ID/mm-mcp \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars "MDB_MCP_CONNECTION_STRING=mongodb+srv://...,MDB_MCP_READ_ONLY=true,MDB_MCP_HTTP_HOST=0.0.0.0"
```

The MCP server will run in read-only mode and bind to the Cloud Run-provided `PORT`.
