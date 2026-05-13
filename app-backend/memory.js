const connectDB = require('./database');
const logger = require('./logger');

/**
 * Store a conversation turn in agent memory
 * @param {string} sessionId - User session identifier
 * @param {string} userPrompt - User's prompt
 * @param {string} agentResponse - Agent's response
 * @param {Object} metadata - Additional metadata (tools used, etc.)
 */
async function storeConversation(sessionId, userPrompt, agentResponse, metadata = {}) {
  try {
    const { db } = await connectDB();

    await db.collection('agent_memory').insertOne({
      session_id: sessionId,
      timestamp: new Date(),
      user_prompt: userPrompt,
      agent_response: agentResponse,
      metadata: {
        tools_used: metadata.toolsUsed || [],
        turn_count: metadata.turnCount || 0,
        ...metadata
      }
    });

    logger.info({ sessionId }, 'Stored conversation turn');
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Failed to store conversation');
    // Don't throw - memory failure shouldn't block the response
  }
}

/**
 * Retrieve recent conversation history for a session
 * @param {string} sessionId - User session identifier
 * @param {number} limit - Maximum number of turns to retrieve (default: 5)
 * @returns {Array} Recent conversation turns
 */
async function getRecentContext(sessionId, limit = 5) {
  try {
    const { db } = await connectDB();

    const history = await db.collection('agent_memory')
      .find({ session_id: sessionId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Return in chronological order (oldest first)
    return history.reverse();
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Failed to retrieve conversation history');
    return []; // Return empty array on failure - agent can still work without history
  }
}

/**
 * Clear conversation history for a session
 * @param {string} sessionId - User session identifier
 */
async function clearSessionHistory(sessionId) {
  try {
    const { db } = await connectDB();

    const result = await db.collection('agent_memory').deleteMany({
      session_id: sessionId
    });

    logger.info({ sessionId, deletedCount: result.deletedCount }, 'Cleared session history');
    return result.deletedCount;
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Failed to clear session history');
    throw error;
  }
}

/**
 * Get session statistics
 * @param {string} sessionId - User session identifier
 */
async function getSessionStats(sessionId) {
  try {
    const { db } = await connectDB();

    const stats = await db.collection('agent_memory').aggregate([
      { $match: { session_id: sessionId } },
      {
        $group: {
          _id: '$session_id',
          total_turns: { $sum: 1 },
          first_interaction: { $min: '$timestamp' },
          last_interaction: { $max: '$timestamp' }
        }
      }
    ]).toArray();

    return stats[0] || null;
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Failed to get session stats');
    return null;
  }
}

module.exports = {
  storeConversation,
  getRecentContext,
  clearSessionHistory,
  getSessionStats
};
