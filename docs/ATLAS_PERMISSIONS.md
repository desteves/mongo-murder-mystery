# MongoDB Atlas User Permissions

Required permissions for each database user in the Murder Mystery application.

## Database Architecture

- **mmm database**: Game content (read-only for players)
- **mmm_AI database**: AI operational data (read/write for agent features)

## User Permissions

### 1. mmmUser (Main Application User)

**Connection:** `MONGODB_URI`  
**Database:** mmm  
**Purpose:** Backend `/eval` endpoint for direct query execution

**Required Permissions:**
```json
{
  "database": "mmm",
  "roles": [
    {
      "role": "read",
      "db": "mmm"
    }
  ],
  "privileges": [
    {
      "resource": { "db": "mmm", "collection": "solution" },
      "actions": ["find", "update"]
    }
  ]
}
```

**Collections:**
- ✅ `crime`, `person`, `gymCheckin`, `socialEventCheckin` - **read** (game data)
- ✅ `solution` - **readWrite** (answer validation)

**Atlas UI Setup:**
1. Database Access → Add New Database User
2. Authentication Method: Password
3. Database User Privileges → Custom Roles:
   - Database: mmm, Role: read
   - Add Specific Privilege:
     - Resource: mmm.solution
     - Actions: find, update

---

### 2. mmmUser_AI (AI Database User)

**Connection:** `MONGODB_URI_AI`  
**Database:** mmm_AI  
**Purpose:** Agent memory storage, vector search, AI operational data

**Required Permissions:**
```json
{
  "database": "mmm_AI",
  "roles": [
    {
      "role": "readWrite",
      "db": "mmm_AI"
    }
  ]
}
```

**Collections:**
- ✅ `agent_memory` - **readWrite** (conversation history)
- ✅ Future: vector embeddings, MCP metadata

**Additional Privileges Needed:**
- ⚠️ `createCollection` - Auto-create collections
- ⚠️ `createIndex` - Create indexes for performance

**Atlas UI Setup:**
1. Database Access → Add New Database User
2. Authentication Method: Password
3. Database User Privileges:
   - Database: mmm_AI, Role: **readWrite**
   - Database: mmm_AI, Built-in Role: **dbAdmin** (for index creation)

**Why dbAdmin?**
- Allows `createIndex`, `dropIndex` operations
- Allows `createCollection`, `dropCollection` operations
- Does NOT grant write access to other databases

---

### 3. mmmMCP_AI (MCP Server User)

**Connection:** `MDB_MCP_CONNECTION_STRING`  
**Database:** mmm_AI ONLY  
**Purpose:** MCP server for AI queries and vector search

**Required Permissions:**
```json
{
  "database": "mmm_AI",
  "roles": [
    {
      "role": "read",
      "db": "mmm_AI"
    }
  ],
  "privileges": [
    {
      "resource": { "db": "mmm_AI", "collection": "agent_memory" },
      "actions": ["find", "insert", "update", "remove"]
    }
  ]
}
```

**Collections in mmm_AI:**
- ✅ `crime`, `person`, `gymCheckin`, `socialEventCheckin` - **READ** (game data for AI queries)
- ✅ `agent_memory` - **READ/WRITE** (conversation history)
- ✅ Vector embeddings collections - **READ/WRITE** (vector search)

**MCP Tools Used:**
- `list-collections` - List collections in mmm_AI
- `find` - Query crime, person, gymCheckin, socialEventCheckin, agent_memory
- `aggregate` - Run aggregation pipelines including $vectorSearch
- `count` - Count documents

**Atlas UI Setup:**
1. Database Access → Add New Database User
2. Authentication Method: Password
3. Database User Privileges:
   - Database: mmm_AI, Role: **read**
   - Database: admin, Role: **read** (for listDatabases)
4. Specific Privileges → Add Privilege:
   - Resource: mmm_AI.agent_memory
   - Actions: find, insert, update, remove

**🔒 Security Constraints:**
- ✅ **READ ACCESS** to crime, person, gymCheckin, socialEventCheckin in mmm_AI
- ✅ **READ/WRITE** to agent_memory in mmm_AI
- ❌ **NO ACCESS to solution collection** (isolated in mmm database)
- ✅ Can run vector search queries on mmm_AI collections

---

## Permission Verification

### Test Main Database Access:
```javascript
// Connect with MONGODB_URI
use mmm
db.crime.findOne()      // Should work (read)
db.person.findOne()     // Should work (read)
db.solution.updateOne(  // Should work (write)
  { name: "Test" },
  { $set: { checked: true } }
)
```

### Test AI Database Access:
```javascript
// Connect with MONGODB_URI_AI
use mmm_AI
db.agent_memory.insertOne({  // Should work (write)
  session_id: "test",
  timestamp: new Date()
})
db.agent_memory.createIndex(  // Should work (createIndex)
  { session_id: 1 }
)
```

### Test MCP Access:
```javascript
// Connect with MDB_MCP_CONNECTION_STRING
use mmm_AI
db.getCollectionNames()  // Should work (listCollections)
db.agent_memory.find().limit(1)  // Should work (read)
```

---

## Common Permission Errors

### Error: "not authorized on mmm to execute command { createIndexes }"
**Cause:** User lacks `createIndex` privilege  
**Solution:** Grant `dbAdmin` role or specific `createIndex` action

### Error: "not authorized on mmm to execute command { find: 'crime' }"
**Cause:** User lacks read access to collection  
**Solution:** Grant `read` role on mmm database

### Error: "not authorized on admin to execute command { listDatabases }"
**Cause:** User lacks read access to admin database  
**Solution:** Grant `read` role on admin database (for MCP listDatabases)

---

## Security Best Practices

1. **Principle of Least Privilege:**
   - mmmUser: read-only except solution collection
   - mmmUser_AI: readWrite only on mmm_AI database
   - mmmMCP_AI: read-only access

2. **Separate Users for Separate Purposes:**
   - Don't use same credentials for game data and AI data
   - Isolate MCP connection from main application

3. **IP Allowlist:**
   - Add your backend server IP to Atlas IP Access List
   - For local development: Add your IP or use 0.0.0.0/0 (not recommended for production)

4. **Connection String Security:**
   - Use environment variables (never commit credentials)
   - Rotate passwords regularly
   - Use SRV connection strings for automatic failover

5. **Monitoring:**
   - Check Atlas → Metrics → Operations for unusual activity
   - Set up alerts for connection failures
   - Monitor slow queries and index usage

---

## Atlas Configuration Checklist

- [ ] mmmUser created with read on mmm + write on solution
- [ ] mmmUser_AI created with readWrite + dbAdmin on mmm_AI
- [ ] mmmMCP_AI created with read on mmm_AI + read on admin
- [ ] IP Access List configured for your backend server
- [ ] Connection strings tested and working
- [ ] Indexes created on agent_memory collection
- [ ] Monitoring and alerts configured

---

## Troubleshooting

**Q: Agent returns "I can only assist with the Mongo Murder Mystery Atlas database"**  
A: Check that MCP_CONNECTION_STRING has access to mmm database with crime data.

**Q: Index creation fails in mmm_AI**  
A: Grant dbAdmin role to mmmUser_AI or create indexes manually via Atlas UI.

**Q: Connection times out**  
A: Check IP Access List in Atlas. Add your server's public IP address.

**Q: "Authentication failed"**  
A: Verify connection string format and credentials. Check user is enabled in Atlas.
