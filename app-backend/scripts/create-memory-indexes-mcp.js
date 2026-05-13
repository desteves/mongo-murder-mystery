/**
 * Script to create indexes for agent_memory collection via MCP server
 * Run with: node scripts/create-memory-indexes-mcp.js
 *
 * Uses MCP Atlas server to create indexes, which requires the connection
 * to have appropriate permissions.
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
const MCP_CONNECTION_STRING = process.env.MONGODB_URI_AI;
const MCP_DATABASE = process.env.MONGODB_DBNAME_AI || 'mmm_AI';

if (!MCP_CONNECTION_STRING) {
  console.error('❌ MONGODB_URI_AI not set');
  process.exit(1);
}

async function initMCPSession() {
  console.log('Initializing MCP session...');
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'init-1',
      method: 'initialize',
      params: {
        clientInfo: { name: 'index-creator', version: '1.0.0' },
        protocolVersion: '2024-11-05',
        capabilities: {}
      }
    })
  });

  if (!res.ok) {
    throw new Error(`MCP init failed: ${res.status} ${res.statusText}`);
  }

  const sessionId = res.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('No session ID returned from MCP server');
  }

  console.log('✓ MCP session initialized:', sessionId);
  return sessionId;
}

async function connectMCP(sessionId) {
  console.log('Connecting to MongoDB via MCP...');
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'connect-1',
      method: 'tools/call',
      params: {
        name: 'connect',
        arguments: { connectionString: MCP_CONNECTION_STRING }
      }
    })
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`MCP connect failed: ${data.error.message}`);
  }

  console.log('✓ Connected to MongoDB:', MCP_DATABASE);
}

async function createIndex(sessionId, indexSpec) {
  console.log(`Creating index: ${indexSpec.name}...`);

  // Use aggregate with $documents to create index
  // This is a workaround since MCP doesn't have a direct createIndex tool
  const pipeline = [
    {
      $documents: [{ _id: 1 }]
    },
    {
      $out: {
        db: MCP_DATABASE,
        coll: 'agent_memory'
      }
    }
  ];

  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `create-index-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'aggregate',
        arguments: {
          database: MCP_DATABASE,
          collection: 'agent_memory',
          pipeline: [
            {
              $indexStats: {}
            },
            {
              $project: {
                name: '$name',
                key: '$key'
              }
            }
          ]
        }
      }
    })
  });

  const data = await res.json();

  if (data.error) {
    console.warn(`⚠️  Could not verify index ${indexSpec.name}: ${data.error.message}`);
    console.log(`   Note: MCP tools don't support direct index creation.`);
    console.log(`   Indexes must be created manually in Atlas UI or via mongosh.`);
    return false;
  }

  return true;
}

async function main() {
  try {
    console.log('\n=== Creating Indexes for agent_memory Collection ===\n');

    const sessionId = await initMCPSession();
    await connectMCP(sessionId);

    console.log('\n📋 Required Indexes:\n');
    console.log('1. session_history_idx: { session_id: 1, timestamp: -1 }');
    console.log('   Purpose: Efficiently retrieve recent history for a session\n');

    console.log('2. memory_ttl_idx: { timestamp: 1 } with TTL: 30 days');
    console.log('   Purpose: Auto-delete old conversations\n');

    console.log('3. session_id_idx: { session_id: 1 }');
    console.log('   Purpose: Session statistics queries\n');

    console.log('⚠️  MCP Tools Limitation:');
    console.log('MCP server tools (find, aggregate, count) do not support index creation.');
    console.log('Indexes must be created manually.\n');

    console.log('📖 Manual Index Creation Instructions:\n');
    console.log('Option 1 - Atlas UI:');
    console.log('1. Go to Atlas → Browse Collections → mmm_AI → agent_memory');
    console.log('2. Click "Indexes" tab → "Create Index"');
    console.log('3. Add each index with the specifications above\n');

    console.log('Option 2 - mongosh:');
    console.log('```javascript');
    console.log('use mmm_AI');
    console.log('');
    console.log('// Index 1');
    console.log('db.agent_memory.createIndex(');
    console.log('  { session_id: 1, timestamp: -1 },');
    console.log('  { name: "session_history_idx" }');
    console.log(');');
    console.log('');
    console.log('// Index 2 (TTL)');
    console.log('db.agent_memory.createIndex(');
    console.log('  { timestamp: 1 },');
    console.log('  { expireAfterSeconds: 2592000, name: "memory_ttl_idx" }');
    console.log(');');
    console.log('');
    console.log('// Index 3');
    console.log('db.agent_memory.createIndex(');
    console.log('  { session_id: 1 },');
    console.log('  { name: "session_id_idx" }');
    console.log(');');
    console.log('```\n');

    console.log('✅ Instructions displayed. Please create indexes manually.');
    console.log('   The agent_memory collection will work without indexes,');
    console.log('   but queries will be slower.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
