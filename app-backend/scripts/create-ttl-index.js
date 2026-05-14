#!/usr/bin/env node
/**
 * Create TTL index for agent_memory collection
 *
 * This script creates a TTL (Time To Live) index on the agent_memory collection
 * that automatically deletes documents 24 hours after they were inserted.
 *
 * Usage:
 *   node scripts/create-ttl-index.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI_AI = process.env.MONGODB_URI_AI;
const MONGODB_DBNAME_AI = process.env.MONGODB_DBNAME_AI || 'mmm_AI';

if (!MONGODB_URI_AI) {
  console.error('Error: MONGODB_URI_AI environment variable is not set');
  process.exit(1);
}

async function createTTLIndex() {
  const client = new MongoClient(MONGODB_URI_AI, {
    appName: 'devrel-github-mmm'
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();

    const db = client.db(MONGODB_DBNAME_AI);
    const collection = db.collection('agent_memory');

    console.log(`Creating TTL index on agent_memory.timestamp with 24 hour expiration...`);

    // Create TTL index: documents expire 24 hours (86400 seconds) after timestamp
    const result = await collection.createIndex(
      { timestamp: 1 },
      {
        expireAfterSeconds: 86400, // 24 hours
        name: 'memory_ttl_idx'
      }
    );

    console.log(`✓ TTL index created successfully: ${result}`);
    console.log('Documents in agent_memory will automatically delete 24 hours after insertion');

    // List all indexes to verify
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes on agent_memory:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key),
                  idx.expireAfterSeconds ? `(TTL: ${idx.expireAfterSeconds}s)` : '');
    });

  } catch (error) {
    console.error('Error creating TTL index:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

// Run the script
createTTLIndex().catch(console.error);
