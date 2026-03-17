# Environment Variables Reference

This document lists all environment variables used across the MongoDB Murder Mystery application.

## 📋 Table of Contents

- [Backend Environment Variables](#backend-environment-variables)
- [Frontend Environment Variables](#frontend-environment-variables)
- [Quick Setup](#quick-setup)

---

## Backend Environment Variables

### ✅ Required Variables

These variables **must** be set for the application to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/mmm` or `mongodb+srv://user:pass@cluster.mongodb.net/mmm` |
| `INTERNAL_API_KEY` | API key for securing `/eval` and `/agent` endpoints | `mmm-frontend-M4rCHm4ddn3$$-2026` |
| `SALT` | Salt for hashing (used for mystery solution validation) | `your-random-salt-string-here` |
| `CLUE_CRIME` | MongoDB ObjectId for the crime scene clue | `5f9f1b9f1b9f1b9f1b9f1b9f` |

### 🔧 Recommended Variables

These variables are optional but recommended for production:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ALLOWED_ORIGIN` | CORS allowed origin (frontend URL) | `undefined` | `https://mongomurdermystery.com` |
| `MONGODB_DBNAME` | MongoDB database name | `mmm` | `mmm` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` | `info` |

### ⚙️ Optional Variables

#### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Node environment (development, production, test) | `undefined` |
| `REQUEST_TIMEOUT_MS` | Request timeout in milliseconds | `30000` (30 seconds) |

#### MongoDB Connection Pool

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_MAX_POOL` | Maximum connection pool size | `20` |
| `MONGODB_MIN_POOL` | Minimum connection pool size | `2` |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Server selection timeout | `5000` (5 seconds) |
| `MONGODB_SOCKET_TIMEOUT_MS` | Socket timeout | `20000` (20 seconds) |

#### Mystery Clues (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `CLUE_WITNESS1` | First witness clue text | `WOOF WOOF` |
| `CLUE_WITNESS2` | Second witness clue text | `MEOW MEOW` |
| `CLUE_SUSPECT` | Suspect clue text | `QUACK QUACK` |

### 🤖 Agent Endpoint Variables

These variables are **only required** if you want to use the `/agent` endpoint (AI assistant):

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (for OpenRouter) | `sk-or-v1-...` |
| `MDB_MCP_CONNECTION_STRING` | MongoDB connection string for MCP server | `mongodb+srv://user:pass@cluster.mongodb.net/mmm` |
| `MCP_SERVER_URL` | MCP server URL | `http://localhost:3001/mcp` or `https://mcp-server.run.app/mcp` |
| `MCP_DATABASE` | MCP database name | `mmm` |
| `MCP_CONNECTION_STRING` | Alternative to `MDB_MCP_CONNECTION_STRING` | `mongodb://localhost:27017/mmm` |
| `MCP_ID_TOKEN_AUDIENCE` | ID token audience for Google Cloud auth | `http://localhost:3001/mcp` |
| `OPENAI_MODEL` | OpenAI model to use | `tngtech/deepseek-r1t2-chimera:free` |

---

## Frontend Environment Variables

All frontend environment variables must be prefixed with `VITE_` to be exposed to the client.

### ✅ Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_MMM_API_BASE_URL` | Backend API base URL | `https://mmm-be-1020079043644.us-central1.run.app` |
| `VITE_MMM_API_KEY` | API key for backend authentication (matches `INTERNAL_API_KEY`) | `mmm-frontend-M4rCHm4ddn3$$-2026` |

### 🔧 Development Variables

For local development:

```bash
VITE_MMM_API_BASE_URL=http://localhost:8080
VITE_MMM_API_KEY=your-local-api-key
```

---

## Quick Setup

### Backend Setup

1. Copy the example file:
   ```bash
   cd app-backend
   cp .env.example .env
   ```

2. Edit `.env` and fill in the required values:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/mmm
   INTERNAL_API_KEY=mmm-frontend-M4rCHm4ddn3$$-2026
   SALT=your-random-salt-here
   CLUE_CRIME=5f9f1b9f1b9f1b9f1b9f1b9f
   ```

3. (Optional) Add agent variables if using AI features:
   ```bash
   OPENAI_API_KEY=sk-or-v1-...
   MDB_MCP_CONNECTION_STRING=mongodb+srv://...
   MCP_SERVER_URL=http://localhost:3001/mcp
   ```

### Frontend Setup

1. Copy the example file:
   ```bash
   cd app-frontend/murdermystery
   cp .env.example .env
   ```

2. Edit `.env` and fill in the values:
   ```bash
   VITE_MMM_API_BASE_URL=http://localhost:8080
   VITE_MMM_API_KEY=mmm-frontend-M4rCHm4ddn3$$-2026
   ```

---

## Environment Validation

The backend automatically validates required environment variables on startup using `app-backend/config.js`:

- **Missing required variables**: Application will exit with error code 1
- **Missing recommended variables**: Warning logged, application continues
- **Missing agent variables**: Warning logged, `/agent` endpoint will return 503

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** to version control
2. **Use different API keys** for development and production
3. **Rotate secrets regularly** in production
4. **Use strong, random values** for `SALT` and `INTERNAL_API_KEY`
5. **Restrict CORS origins** in production using `ALLOWED_ORIGIN`
6. **Use MongoDB Atlas** with IP whitelisting and authentication
7. **Enable TLS/SSL** for MongoDB connections in production

---

## Troubleshooting

### Backend won't start
- Check that all required variables are set
- Verify MongoDB connection string is correct
- Check logs for specific missing variables

### Frontend can't connect to backend
- Verify `VITE_MMM_API_BASE_URL` points to the correct backend URL
- Ensure `VITE_MMM_API_KEY` matches backend's `INTERNAL_API_KEY`
- Check CORS settings on backend (`ALLOWED_ORIGIN`)

### Agent endpoint returns 503
- Verify all agent-specific variables are set
- Check `OPENAI_API_KEY` is valid
- Ensure MCP server is running and accessible

