# Agent session memory

The AI Track agent remembers earlier questions in the same browser so follow-ups work ("show me more about the first one").
This page describes what is stored, how it is used, how long it is kept, and how to operate it.

Code: `app-backend/memory.js` (storage), `app-backend/agent.js` (`runAgent` reads and writes it), `app-backend/database-ai.js`
(connection). UI: `app-frontend/murdermystery/src/components/AgentPrompt.vue`.

## How it works
1. The browser creates a random UUID (`crypto.randomUUID`) the first time you open the AI Track and keeps it in
   `localStorage` under `mmm_agent_session_id`. It identifies a browser, not a person, and there are no accounts.
2. `POST /agent` sends `{ prompt, sessionId }` (prompt up to 512 characters). Without a `sessionId` the agent is stateless.
3. `runAgent` loads the last 5 turns for that session (`getRecentContext`) and, if any, appends them to the system prompt as
   `Recent conversation context`. After the model answers, `storeConversation` writes the turn.
4. Memory is best effort: a storage or read failure is logged and never blocks the answer.

## What is stored (`mmm_AI.agent_memory`)
```javascript
{
  _id: ObjectId,
  session_id: String,        // the browser UUID
  timestamp: Date,           // when the turn happened (the TTL index key)
  user_prompt: String,       // what the player typed (<= 512 chars)
  agent_response: String,    // the model's reply text
  metadata: {
    tools_used: [String],    // MCP tools the agent called, e.g. ['find', 'count']
    turn_count: Number,      // model turns used for this question
    reachedLimit: Boolean    // only when the 10-step limit was hit
  }
}
```
Not stored: the structured tool calls shown in the UI ("How the agent got this answer"), query results, IP addresses, or
anything that identifies a person. The structured calls are returned in the `/agent` response (`queries`) and are not persisted.
Prompts are also written to the API's server logs for debugging and abuse prevention (see About page).

## Retention
The About and AI pages tell players conversations are **deleted automatically within 30 days**. That is enforced by a TTL
index on `timestamp`, which must exist or nothing is ever deleted. The repository's earlier notes disagreed (30 days here,
24 hours in `TTL_INDEX_SETUP.md`); both satisfy "within 30 days", but **verify what is actually deployed**:
```javascript
use mmm_AI
db.agent_memory.getIndexes()   // look for { timestamp: 1 } with expireAfterSeconds
```
If the TTL index is missing, create it (see `TTL_INDEX_SETUP.md`; use `expireAfterSeconds: 2592000` for 30 days). MCP tools cannot
create indexes, so this is a manual Atlas or mongosh step with a user that has `createIndex`.

Recommended indexes: `{ session_id: 1, timestamp: -1 }` (history lookup), `{ timestamp: 1 }` with TTL (cleanup).

## Security notes
- **Replayed text is untrusted.** Stored prompts and replies are put back into the system prompt on later turns, so a prompt
  injection in one turn can influence the next turns of the same session. The blast radius is that browser's own session, the agent
  only has read-only game tools, and the `solution` collection is not reachable by the agent or MCP. Keep it that way; if you extend
  memory, label the block as untrusted or pass it as user-role messages instead of system text.
- **Isolation.** `agent_memory` lives in `mmm_AI`; the solution lives in `mmm`. The agent/MCP user reads the game collections and
  reads/writes only the memory collection (see `ATLAS_PERMISSIONS.md`, `ATLAS_ROLE_DEFINITIONS.md`).
- **Deleting a session on request:** there is no HTTP endpoint for it (by design: sessions are anonymous). Operators can run
  `db.agent_memory.deleteMany({ session_id: "<uuid>" })` or call `clearSessionHistory(sessionId)` from `memory.js`.
  Players can start fresh by clearing `mmm_agent_session_id` from their browser storage.

## API
```javascript
// POST /agent
// request
{ "prompt": "Find the crime on January 15, 2018", "sessionId": "550e8400-e29b-41d4-a716-446655440000" }
// response
{
  "reply": "I found the crime...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "queries": [ { "tool": "find", "collection": "crime", "filter": { "...": "..." }, "isError": false } ]
}
```
`queries` is capped at 10 entries and powers the "How the agent got this answer" panel (rendered as mongosh by
`src/lib/shell.js`).

## Configuration
- `MONGODB_URI_AI` / `MONGODB_DBNAME_AI` (default `mmm_AI`): connection used by `database-ai.js` for memory.
- `MDB_MCP_CONNECTION_STRING`: read-only string the MCP server uses for the agent's data tools (secrets live in Secret Manager;
  see `docs/RUNBOOK.md`).
- LLM: Grove `gpt-6-luna` (`llm.js`); MCP server v3 requires the `connectionId` from `connect` on every data tool.

## Operating it
| Task | How |
|---|---|
| See recent memory | `db.agent_memory.find().sort({ timestamp: -1 }).limit(5)` in `mmm_AI` |
| Count active sessions | `db.agent_memory.distinct("session_id").length` |
| Check retention works | `getIndexes()` shows `expireAfterSeconds`; oldest `timestamp` should be younger than the TTL |
| Agent forgets context | The browser cleared `localStorage`, `sessionId` was not sent, or memory reads failed (look for `Failed to retrieve conversation history` in logs) |
| Nothing is stored | Look for `Failed to store conversation`; check the AI user's write permission on `agent_memory` |

## Related
`TTL_INDEX_SETUP.md`, `ATLAS_PERMISSIONS.md`, `ATLAS_ROLE_DEFINITIONS.md`, `docs/RUNBOOK.md` (`/agent` problems), `AGENTS.md`.
