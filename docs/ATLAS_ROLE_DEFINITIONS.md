# MongoDB Atlas Custom Role Definitions

Custom roles for the Murder Mystery application with granular permissions.

## findMongoMurderMysteryRole_AI

**Purpose:** Agent/MCP access to mmm_AI database with read access to game data and read/write to operational collections.

**Database:** mmm_AI

**Permissions:**

### Read-Only Collections (Game Data)
```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": "crime"
  },
  "actions": ["find", "listIndexes"]
}
```

```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": "person"
  },
  "actions": ["find", "listIndexes"]
}
```

```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": "event"
  },
  "actions": ["find", "listIndexes"]
}
```

```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": "suspect"
  },
  "actions": ["find", "listIndexes"]
}
```

### Read/Write Collections (AI Operations)
```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": "agent_memory"
  },
  "actions": [
    "find",
    "insert",
    "update",
    "remove",
    "listIndexes",
    "createIndex",
    "dropIndex"
  ]
}
```

```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": ""
  },
  "actions": [
    "find",
    "insert",
    "update",
    "remove",
    "listCollections"
  ]
}
```
Note: Empty collection name applies to all collections not explicitly listed (for future vector embedding collections).

### Database-Level Actions
```json
{
  "resource": {
    "db": "mmm_AI",
    "collection": ""
  },
  "actions": [
    "listCollections",
    "dbStats"
  ]
}
```

## Complete Role Definition (JSON)

For Atlas API or CLI:

```json
{
  "roleName": "findMongoMurderMysteryRole_AI",
  "privileges": [
    {
      "resource": {
        "db": "mmm_AI",
        "collection": "crime"
      },
      "actions": ["find", "listIndexes"]
    },
    {
      "resource": {
        "db": "mmm_AI",
        "collection": "person"
      },
      "actions": ["find", "listIndexes"]
    },
    {
      "resource": {
        "db": "mmm_AI",
        "collection": "event"
      },
      "actions": ["find", "listIndexes"]
    },
    {
      "resource": {
        "db": "mmm_AI",
        "collection": "suspect"
      },
      "actions": ["find", "listIndexes"]
    },
    {
      "resource": {
        "db": "mmm_AI",
        "collection": "agent_memory"
      },
      "actions": [
        "find",
        "insert",
        "update",
        "remove",
        "listIndexes",
        "createIndex",
        "dropIndex"
      ]
    },
    {
      "resource": {
        "db": "mmm_AI",
        "collection": ""
      },
      "actions": [
        "listCollections",
        "dbStats"
      ]
    }
  ],
  "roles": []
}
```

## Atlas UI Instructions

### Create/Update Custom Role

1. **Navigate to Database Access:**
   - Atlas → Project → Database Access → Custom Roles

2. **Create or Edit Role:**
   - Click "Add New Custom Role" or edit "findMongoMurderMysteryRole_AI"
   - Role Name: `findMongoMurderMysteryRole_AI`

3. **Add Privileges:**

   **For crime collection:**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: crime
   - Actions: find, listIndexes
   - Click "Add"

   **For person collection:**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: person
   - Actions: find, listIndexes
   - Click "Add"

   **For event collection:**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: event
   - Actions: find, listIndexes
   - Click "Add"

   **For suspect collection:**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: suspect
   - Actions: find, listIndexes
   - Click "Add"

   **For agent_memory collection (READ/WRITE):**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: agent_memory
   - Actions: find, insert, update, remove, listIndexes, createIndex, dropIndex
   - Click "Add"

   **For database-level actions:**
   - Click "Add Privilege"
   - Database: mmm_AI
   - Collection: (leave empty)
   - Actions: listCollections, dbStats
   - Click "Add"

4. **Save:**
   - Click "Save" or "Update"

### Assign Role to User

1. **Navigate to Database Users:**
   - Atlas → Project → Database Access → Database Users

2. **Edit User:**
   - Find `mmmMCP_AI` user
   - Click "Edit"

3. **Add Custom Role:**
   - Under "Database User Privileges"
   - Click "Add Custom Role"
   - Database: mmm_AI
   - Role: findMongoMurderMysteryRole_AI
   - Click "Add"

4. **Remove Conflicting Roles:**
   - If user has "readWrite" on mmm_AI, remove it
   - Keep only the custom role for granular control

5. **Save:**
   - Click "Update User"

## Atlas CLI Commands

### Create Custom Role

```bash
atlas customDbRoles create findMongoMurderMysteryRole_AI \
  --privilege resource=mmm_AI.crime,actions=find,listIndexes \
  --privilege resource=mmm_AI.person,actions=find,listIndexes \
  --privilege resource=mmm_AI.event,actions=find,listIndexes \
  --privilege resource=mmm_AI.suspect,actions=find,listIndexes \
  --privilege resource=mmm_AI.agent_memory,actions=find,insert,update,remove,listIndexes,createIndex,dropIndex \
  --privilege resource=mmm_AI.,actions=listCollections,dbStats \
  --projectId <YOUR_PROJECT_ID>
```

### Update Existing Role

```bash
atlas customDbRoles update findMongoMurderMysteryRole_AI \
  --privilege resource=mmm_AI.crime,actions=find,listIndexes \
  --privilege resource=mmm_AI.person,actions=find,listIndexes \
  --privilege resource=mmm_AI.event,actions=find,listIndexes \
  --privilege resource=mmm_AI.suspect,actions=find,listIndexes \
  --privilege resource=mmm_AI.agent_memory,actions=find,insert,update,remove,listIndexes,createIndex,dropIndex \
  --privilege resource=mmm_AI.,actions=listCollections,dbStats \
  --projectId <YOUR_PROJECT_ID>
```

### Assign Role to User

```bash
atlas dbusers update mmmMCP_AI \
  --role roleName=findMongoMurderMysteryRole_AI,databaseName=mmm_AI \
  --projectId <YOUR_PROJECT_ID>
```

## Verification

### Test Read Access to Game Data

```javascript
// Connect with mmmMCP_AI credentials
use mmm_AI

// Should succeed (read access)
db.crime.findOne()
db.person.findOne()
db.event.findOne()
db.suspect.findOne()

// Should fail (no write access)
db.crime.insertOne({ test: 1 })
// Error: not authorized
```

### Test Read/Write Access to agent_memory

```javascript
// Should succeed (read/write access)
db.agent_memory.insertOne({
  session_id: "test",
  timestamp: new Date()
})

db.agent_memory.findOne({ session_id: "test" })

db.agent_memory.updateOne(
  { session_id: "test" },
  { $set: { updated: true } }
)

db.agent_memory.deleteOne({ session_id: "test" })
```

### Test Index Creation

```javascript
// Should succeed on agent_memory
db.agent_memory.createIndex({ session_id: 1 })

// Should fail on crime (no createIndex permission)
db.crime.createIndex({ date: 1 })
// Error: not authorized
```

## Security Notes

**Why This Role Structure?**

1. **Read-Only Game Data:**
   - Prevents accidental modification of crime, person, event, suspect
   - Agent can query but not corrupt game data

2. **Read/Write AI Operations:**
   - agent_memory needs full CRUD for conversation tracking
   - Index creation needed for performance optimization

3. **No Solution Access:**
   - Role only applies to mmm_AI database
   - solution collection in mmm database is completely isolated

4. **Granular Control:**
   - More secure than blanket readWrite role
   - Explicit permissions are easier to audit
   - Can add vector embedding collections without modifying role

## Troubleshooting

**Error: "not authorized to insert on mmm_AI.agent_memory"**
- Verify role includes `insert` action on agent_memory
- Check user has the custom role assigned

**Error: "not authorized to createIndex"**
- Verify role includes `createIndex` action on agent_memory
- May need to create indexes manually or via Atlas UI

**Agent can't query crime data:**
- Verify role includes `find` action on crime collection
- Check role is assigned to correct database (mmm_AI)

**Changes not taking effect:**
- Reconnect the application after role changes
- May take a few seconds for changes to propagate
