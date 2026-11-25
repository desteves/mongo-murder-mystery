# TTL Index Setup for agent_memory Collection

> The site promises players that conversations are deleted **within 30 days**. The steps below use 24 hours (`86400`), which is
> shorter and therefore also true; use `2592000` (30 days) if you want players' follow-up questions to persist longer. Whatever you
> choose, check `db.agent_memory.getIndexes()` to confirm the TTL index exists. See `AGENT_MEMORY.md`.

The `agent_memory` collection requires a TTL (Time To Live) index to automatically delete conversation history after 24 hours.

## What is a TTL Index?

A TTL index automatically removes documents from a collection after a specified time period. In our case, agent conversation history should be deleted 24 hours after insertion to manage storage and privacy.

## Setup Instructions

### Option 1: MongoDB Atlas UI

1. Log in to **MongoDB Atlas**
2. Navigate to your cluster → **Browse Collections**
3. Select database: **mmm_AI**
4. Select collection: **agent_memory**
5. Click on the **Indexes** tab
6. Click **Create Index**
7. Configure the index:
   - **Field**: `timestamp`
   - **Type**: `1` (ascending)
   - **Options**: Click "Additional Options"
   - **Index Name**: `memory_ttl_idx`
   - **TTL**: `86400` seconds (24 hours)
8. Click **Review** then **Confirm**

### Option 2: mongosh

```javascript
use mmm_AI

db.agent_memory.createIndex(
  { timestamp: 1 },
  {
    expireAfterSeconds: 86400,  // 24 hours
    name: 'memory_ttl_idx'
  }
)
```

### Option 3: Node.js Script (if you have admin credentials)

```bash
cd app-backend
node scripts/create-ttl-index.js
```

**Note:** This requires the MongoDB user to have `dbAdmin` role or `createIndex` permission.

## Verification

Check that the index was created:

```javascript
use mmm_AI
db.agent_memory.getIndexes()
```

You should see an index named `memory_ttl_idx` with `expireAfterSeconds: 86400`.

## How It Works

- Documents in `agent_memory` have a `timestamp` field set when inserted
- MongoDB checks every 60 seconds for expired documents
- Documents where `timestamp + 86400 seconds < current time` are automatically deleted
- No application code needed - MongoDB handles cleanup automatically

## Testing

To test that the TTL is working:

```javascript
// Insert a test document
db.agent_memory.insertOne({
  session_id: "test",
  timestamp: new Date(),
  user_prompt: "test",
  agent_response: "test"
})

// Check it exists
db.agent_memory.find({ session_id: "test" })

// Wait 24 hours (or temporarily change TTL to 60 seconds for testing)
// Document will be automatically deleted
```

## Troubleshooting

**Index creation fails with "not authorized"**
- Ensure the MongoDB user has `dbAdmin` role on mmm_AI database
- See `docs/ATLAS_PERMISSIONS.md` for required permissions

**Documents not expiring**
- Verify the index exists: `db.agent_memory.getIndexes()`
- Check documents have `timestamp` field with Date type
- MongoDB's TTL monitor runs every 60 seconds, so there may be a delay
- Ensure Atlas cluster is not in a maintenance window
