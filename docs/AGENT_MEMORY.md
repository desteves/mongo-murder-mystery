# Agent Session Memory

The AI agent now maintains conversation history across interactions using MongoDB storage.

## How It Works

**Session Tracking:**
- Frontend generates a unique session ID (UUID) stored in `localStorage`
- Session ID persists across page refreshes for the same browser
- Each user gets their own isolated conversation history

**Memory Storage:**
- Conversations stored in MongoDB `agent_memory` collection in **mmm_AI database**
- Separate database connection (`MONGODB_URI_AI`) using `mmmUser_AI` credentials
- Each turn includes: user prompt, agent response, timestamp, metadata
- Last 5 conversation turns are retrieved and included in context
- Automatic cleanup after 30 days via TTL index

**Context Building:**
- Recent history summarized and added to system prompt
- Agent can reference previous questions and answers
- Maintains investigation continuity across multiple queries

## Database Schema

```javascript
{
  _id: ObjectId,
  session_id: String,          // User's session UUID
  timestamp: Date,              // When conversation occurred
  user_prompt: String,          // User's question
  agent_response: String,       // Agent's reply
  metadata: {
    tools_used: [String],       // MCP tools called (e.g., ['find', 'aggregate'])
    turn_count: Number,         // Number of agent turns for this query
    reachedLimit: Boolean       // True if hit 10-turn limit
  }
}
```

## Database Separation (Security Boundary)

**Architecture:**
- `mmm` database: Mystery game data
  - Collections: crime, person, event, suspect, solution
  - Access: `/eval` endpoint ONLY (direct MongoDB queries)
  - Agent/MCP: **NO ACCESS** (security isolation)

- `mmm_AI` database: AI operational data
  - Collections: agent_memory, vector embeddings (future)
  - Access: `/agent` endpoint via MCP tools ONLY
  - Agent/MCP: **FULL ACCESS** (read/write)
  - Purpose: Conversation history, vector search, semantic queries

**Why this separation?**
- Prevents AI from accessing game solutions directly
- Isolates game data from AI experiments
- Enables vector search without exposing raw game data
- Clear security boundary between user queries and AI operations

## Indexes

**Important:** MCP tools don't support index creation. Indexes must be created manually.

Run `node scripts/create-memory-indexes-mcp.js` for instructions, then create via Atlas UI or mongosh:

1. **session_history_idx** - `{ session_id: 1, timestamp: -1 }`
   - Efficiently retrieves recent history for a session
2. **memory_ttl_idx** - `{ timestamp: 1 }` (TTL: 30 days)
   - Auto-deletes old conversations
3. **session_id_idx** - `{ session_id: 1 }`
   - For session statistics queries

## Configuration

**Backend (`app-backend/.env`):**
```bash
# Game database (mmm)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mmm

# AI database (mmm_AI) - separate connection for agent memory
MONGODB_URI_AI=mongodb+srv://mmmUser_AI:pass@cluster.mongodb.net/mmm_AI
MONGODB_DBNAME_AI=mmm_AI

# Agent configuration
MDB_MCP_CONNECTION_STRING=mongodb+srv://mmmMCP_AI:pass@cluster.mongodb.net/mmm_AI
```

**Two separate connections:**
- `MONGODB_URI` → mmm database (game data)
- `MONGODB_URI_AI` → mmm_AI database (agent memory, vector search)

**Frontend (`app-frontend/murdermystery/.env`):**
```bash
# Standard API connection (already configured)
VITE_MMM_API_BASE_URL=http://localhost:3000
```

Session IDs are automatically generated and stored in browser localStorage.

## API Changes

**POST /agent endpoint now accepts sessionId:**

```javascript
// Request
{
  "prompt": "Find the crime on January 15, 2018",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"  // Optional
}

// Response
{
  "reply": "I found the crime...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

If `sessionId` is omitted, the agent works without memory (stateless).

## Frontend Usage

Session ID is automatically managed:

```javascript
// AgentPrompt.vue automatically:
// 1. Generates UUID on first use
// 2. Stores in localStorage as 'mmm_agent_session_id'
// 3. Sends with every request
// 4. Persists across page reloads
```

**Clear session history:**
```javascript
localStorage.removeItem('mmm_agent_session_id');
// New session ID will be generated on next page load
```

## Memory Management Functions

Backend `memory.js` exports:

- `storeConversation(sessionId, prompt, response, metadata)` - Save a turn
- `getRecentContext(sessionId, limit=5)` - Retrieve history
- `clearSessionHistory(sessionId)` - Delete all turns for session
- `getSessionStats(sessionId)` - Get usage statistics

## Privacy & Retention

- Conversations auto-delete after 30 days
- Each session is isolated (no cross-session access)
- Session IDs are client-generated UUIDs (not user-identifiable)
- Memory storage failures don't block agent responses

## Example Conversation Flow

```
User (Session: abc-123): "Find crimes in MongoDB City"
Agent: "I found 3 crimes..." [Stored in memory]

User (Session: abc-123): "Show me more details about the first one"
Agent: [Retrieves previous context, knows which crime] "The first crime was..."

User (Session: abc-123): "Who were the witnesses?"
Agent: [References the crime from earlier] "The witnesses were..."
```

## Troubleshooting

**Agent not remembering context:**
- Check browser console for localStorage access
- Verify backend logs show sessionId in requests
- Check MongoDB for documents in `agent_memory` collection

**Memory collection not created:**
- Run the index creation script
- Collection is created automatically on first insert

**Old conversations not expiring:**
- Ensure TTL index was created successfully
- MongoDB runs TTL cleanup every 60 seconds
