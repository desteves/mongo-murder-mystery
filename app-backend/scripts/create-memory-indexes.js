/**
 * Script to create indexes for agent_memory collection
 * Run with: node scripts/create-memory-indexes.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function createIndexes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DBNAME || 'mmm');
    const collection = db.collection('agent_memory');

    // Index on session_id and timestamp for efficient history retrieval
    await collection.createIndex(
      { session_id: 1, timestamp: -1 },
      { name: 'session_history_idx' }
    );
    console.log('✓ Created index: session_history_idx');

    // TTL index to auto-delete old conversations after 30 days
    await collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60, name: 'memory_ttl_idx' }
    );
    console.log('✓ Created TTL index: memory_ttl_idx (30 days)');

    // Index on session_id alone for session stats
    await collection.createIndex(
      { session_id: 1 },
      { name: 'session_id_idx' }
    );
    console.log('✓ Created index: session_id_idx');

    console.log('\nAll indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
