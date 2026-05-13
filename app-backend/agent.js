const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const OpenAI = require('openai');
const { GoogleAuth } = require('google-auth-library');
const http = require('http');
const https = require('https');
const logger = require('./logger');
const { storeConversation, getRecentContext } = require('./memory');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
const MCP_ID_TOKEN_AUDIENCE = process.env.MCP_ID_TOKEN_AUDIENCE || MCP_SERVER_URL;
const MCP_CONNECTION_STRING = process.env.MDB_MCP_CONNECTION_STRING || process.env.MCP_CONNECTION_STRING;
const MCP_DATABASE = process.env.MCP_DATABASE || 'mmm';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'tngtech/deepseek-r1t2-chimera:free';
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  // Fail fast during boot when the agent is invoked
  logger.warn('OPENAI_API_KEY is missing. Agent endpoint will reject requests.');
}

if (!MCP_CONNECTION_STRING) {
  logger.warn('MCP connection string is missing. Set MDB_MCP_CONNECTION_STRING.');
}

const openaiClient = openaiApiKey
  ? new OpenAI({ apiKey: openaiApiKey, baseURL: 'https://openrouter.ai/api/v1' })
  : null;

const baseMcpHeaders = {
  'Accept': 'application/json, text/event-stream',
  'Content-Type': 'application/json'
};

const auth = new GoogleAuth();
let mcpAuthClientPromise = null;
const keepAliveHttpAgent = new http.Agent({ keepAlive: true });
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true });

const shouldUseIdToken = () => {
  if (!MCP_ID_TOKEN_AUDIENCE) return false;
  return !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(MCP_ID_TOKEN_AUDIENCE);
};

async function getMcpAuthHeaders() {
  if (!MCP_SERVER_URL || !shouldUseIdToken()) return {};
  if (!mcpAuthClientPromise) {
    mcpAuthClientPromise = auth.getIdTokenClient(MCP_ID_TOKEN_AUDIENCE);
  }
  try {
    const client = await mcpAuthClientPromise;
    return await client.getRequestHeaders();
  } catch (err) {
    throw new Error(`Failed to obtain MCP ID token: ${err.message}`);
  }
}

async function initSession() {
  const authHeaders = await getMcpAuthHeaders();
  logger.info({ url: MCP_SERVER_URL }, 'Initializing MCP session');
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    agent: (url) => url.protocol === 'http:' ? keepAliveHttpAgent : keepAliveHttpsAgent,
    headers: {
      ...baseMcpHeaders,
      ...authHeaders
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'init-1',
      method: 'initialize',
      params: {
        clientInfo: { name: 'mmm-agent', version: '1.0.0' },
        protocolVersion: '2024-11-05',
        capabilities: {}
      }
    })
  });

  if (!res.ok) {
    logger.error({ status: res.status, statusText: res.statusText }, 'MCP init failed');
    throw new Error(`MCP init failed: ${res.status} ${res.statusText}`);
  }

  const sessionId = res.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP session could not be established (missing mcp-session-id header).');
  }
  return sessionId;
}

async function callMcp(sessionId, toolName, args) {
  // console.log('[agent] calling MCP tool', toolName, 'args:', args);
  const authHeaders = await getMcpAuthHeaders();
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    agent: (url) => url.protocol === 'http:' ? keepAliveHttpAgent : keepAliveHttpsAgent,
    headers: {
      ...baseMcpHeaders,
      ...authHeaders,
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `call-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args || {}
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    // MCP HTTP transport may return event-stream chunks; surface raw text for debugging
    throw new Error(`MCP call failed (${toolName}): ${res.status} ${res.statusText} ${text}`);
  }

  const jsonText = await res.text();
  // console.log('[agent] MCP raw response', jsonText.slice(0, 500));
  let json;
  try {
    json = JSON.parse(jsonText);
  } catch (err) {
    // try to decode event-stream style payloads
    const blocks = jsonText.split('\n\n').map(b => b.trim()).filter(Boolean);
    let parsed = null;
    for (const block of blocks) {
      const dataLine = block.split('\n').find(l => l.startsWith('data:'));
      if (dataLine && dataLine.length > 5) { // "data:" prefix
        const candidate = dataLine.slice(5).trim();
        try {
          parsed = JSON.parse(candidate);
          break;
        } catch (e) {
          continue;
        }
      }
    }
    if (!parsed) {
      throw new Error(`MCP response not JSON (${toolName}): ${jsonText.slice(0, 200)}`);
    }
    json = parsed;
  }
  if (json.error) {
    throw new Error(`MCP error (${toolName}): ${json.error.message || 'unknown'}`);
  }
  return json.result || json;
}

async function ensureConnect(sessionId) {
  if (!MCP_CONNECTION_STRING) {
    throw new Error('MDB_MCP_CONNECTION_STRING is not configured.');
  }
  return callMcp(sessionId, 'connect', { connectionString: MCP_CONNECTION_STRING });
}

const allowedTools = new Set([
  'list-databases',
  'list-collections',
  'find',
  'aggregate',
  'count'
]);

function buildToolSchema() {
  return [
    {
      type: 'function',
      function: {
        name: 'mcp_call',
        description: 'Call a MongoDB tool via the MCP server. Only Atlas MCP is allowed.',
        parameters: {
          type: 'object',
          properties: {
            tool: {
              type: 'string',
              enum: Array.from(allowedTools),
              description: 'The MCP tool to invoke.'
            },
            collection: {
              type: 'string',
              description: 'Collection name (needed for find/aggregate/count).'
            },
            filter: {
              type: 'object',
              description: 'Filter document for find/count.'
            },
            projection: {
              type: 'object',
              description: 'Projection document for find.'
            },
            limit: {
              type: 'integer',
              description: 'Limit for find/count (will be bounded server-side).'
            },
            pipeline: {
              type: 'array',
              description: 'Aggregation pipeline stages.',
              items: { type: 'object' }
            },
            database: {
              type: 'string',
              description: `Database name (defaults to ${MCP_DATABASE})`
            }
          },
          required: ['tool']
        }
      }
    }
  ];
}

async function runAgent(prompt, userSessionId = null) {
  if (!openaiClient) {
    throw new Error('Agent unavailable: OPENAI_API_KEY is not configured.');
  }

  logger.info({ prompt, userSessionId }, 'Starting agent with prompt');
  const mcpSessionId = await initSession();
  await ensureConnect(mcpSessionId);

  // Retrieve conversation history if session ID provided
  let conversationHistory = [];
  if (userSessionId) {
    conversationHistory = await getRecentContext(userSessionId, 5);
    logger.info({ userSessionId, historyLength: conversationHistory.length }, 'Retrieved conversation history');
  }

  // Build context summary from conversation history
  let contextSummary = '';
  if (conversationHistory.length > 0) {
    contextSummary = '\n\nRecent conversation context:\n' + conversationHistory.map(turn =>
      `User: ${turn.user_prompt}\nAssistant: ${turn.agent_response}`
    ).join('\n\n');
  }

  const messages = [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: [
              "You are an AI assistant for the MongoDB Murder Mystery game.",
              "You can ONLY access the mmm_AI database through MCP tools for AI-assisted investigation.",
              "You do NOT have access to the game database (mmm) or any murder mystery data directly.",

              // What you CAN do
              "You can help users by:",
              "- Maintaining conversation history in the agent_memory collection",
              "- Performing vector search and semantic queries against AI embeddings",
              "- Providing general guidance about MongoDB investigation techniques",
              "- Explaining how to use the /eval endpoint to query the game database",

              // What you CANNOT do
              "You CANNOT:",
              "- Access crime, person, event, or suspect collections (they're in mmm database)",
              "- Access the solution collection (restricted)",
              "- Run queries against game data directly",
              "- Solve the mystery for users",

              // Completion rules
              "When you have enough information, produce a FINAL, concise answer.",
              "Do not call tools repeatedly. If a tool call returns identical results, no new information, or an error, stop and answer with what you have.",

              // Tool-use rules
              "Use only the `mcp_call` function wired to the mmm_AI database.",
              "Available MCP tools: list-collections, find, aggregate, count (on mmm_AI only).",
              "Never invent tools, connection strings, query shapes, or data sources.",
              "If any MCP tool call returns an error or unexpected response, stop immediately and inform the user.",

              // Scope limitation
              "If users ask about game data, explain they should use the /eval endpoint on the main page.",
              "Your role is AI assistance and vector search, not direct game data access.",

              // Context awareness
              contextSummary ? "Use the conversation history below to maintain context and avoid asking the user to repeat information." : ""
            ].filter(Boolean).join(" ") + contextSummary
        }
      ]
    },
    { role: 'user', content: [{ type: 'text', text: prompt }] }
  ];

  const toolDefs = buildToolSchema();
  const toolsUsed = []; // Track which MCP tools were called

  for (let step = 0; step < 10; step++) {
    // console.log(`[agent] model turn ${step + 1}, messages so far:`, JSON.stringify(messages, null, 2).slice(0, 1000));
    const response = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: toolDefs,
      tool_choice: 'auto'
    });
    // console.log('[agent] model response raw:', JSON.stringify(response, null, 2).slice(0, 1000));
    const choice = response.choices?.[0];
    const message = choice?.message || {};

    // Always record the assistant turn (with tool_calls if present)
    const assistantTurn = {
      role: 'assistant',
      content: message.content ?? [],
      tool_calls: message.tool_calls ?? []
    };
    messages.push(assistantTurn);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        // console.log('[agent] tool call:', toolCall);
        if (toolCall.function.name !== 'mcp_call') {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: [{ type: 'text', text: 'Rejected: only mcp_call is permitted.' }]
          });
          continue;
        }
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (err) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: [{ type: 'text', text: `Could not parse arguments: ${err.message}` }]
          });
          continue;
        }

        const { tool, collection, filter, projection, limit, pipeline } = args;
        if (!allowedTools.has(tool)) {
          // console.log('[agent] tool rejected (not allowed):', tool);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: [{ type: 'text', text: `Tool ${tool} is not allowed.` }]
          });
          continue;
        }

        // Track tool usage for memory
        if (!toolsUsed.includes(tool)) {
          toolsUsed.push(tool);
        }

        try {
          let mcpResult;
          if (tool === 'aggregate') {
            mcpResult = await callMcp(sessionId, tool, { database: args.database || MCP_DATABASE, collection, pipeline: pipeline || [] });
          } else if (tool === 'find') {
            mcpResult = await callMcp(sessionId, tool, { database: args.database || MCP_DATABASE, collection, filter: filter || {}, projection: projection || {}, limit });
          } else if (tool === 'count') {
            mcpResult = await callMcp(sessionId, tool, { database: args.database || MCP_DATABASE, collection, filter: filter || {}, limit });
          } else if (tool === 'list-collections' || tool === 'list-databases') {
            mcpResult = await callMcp(sessionId, tool, { database: args.database || MCP_DATABASE });
          } else {
            mcpResult = { content: [{ type: 'text', text: `Unsupported tool ${tool}` }], isError: true };
          }
          // console.log('[agent] MCP result:', mcpResult);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: [
              {
                type: 'text',
                text: JSON.stringify(mcpResult, null, 2)
              }
            ]
          });
        } catch (err) {
          // console.log('[agent] MCP call failed:', err.message);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: [{ type: 'text', text: `MCP call failed: ${err.message}` }]
          });
        }
      }
      continue; // loop for another model turn
    }

    // final answer
    let replyText = 'No response';
    if (Array.isArray(message.content)) {
      replyText = message.content.map(c => c.text).join('\n') || 'No response';
    } else if (typeof message.content === 'string') {
      replyText = message.content;
    }

    // Store conversation in memory if session ID provided
    if (userSessionId) {
      await storeConversation(userSessionId, prompt, replyText, {
        toolsUsed,
        turnCount: step + 1
      });
    }

    return {
      reply: replyText,
      sessionId: userSessionId
    };
  }

  // console.log('[agent] reached step limit without final answer');
  const fallbackReply = 'Agent reached step limit without a final answer.';

  // Store even if we hit the limit
  if (userSessionId) {
    await storeConversation(userSessionId, prompt, fallbackReply, {
      toolsUsed,
      turnCount: 10,
      reachedLimit: true
    });
  }

  return { reply: fallbackReply, sessionId: userSessionId };
}

module.exports = {
  runAgent
};
