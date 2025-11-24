const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
// const MCP_CONNECTION_STRING = process.env.MDB_MCP_CONNECTION_STRING || process.env.MCP_CONNECTION_STRING;
const MCP_DATABASE = process.env.MCP_DATABASE || 'mmm';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  // Fail fast during boot when the agent is invoked
  console.warn('OPENAI_API_KEY is missing. Agent endpoint will reject requests.');
}

// if (!MCP_CONNECTION_STRING) {
//   console.warn('MCP connection string is missing. Set MDB_MCP_CONNECTION_STRING.');
// }

const openaiClient = openaiApiKey
  ? new OpenAI({ apiKey: openaiApiKey, baseURL: 'https://openrouter.ai/api/v1' })
  : null;

const headers = {
  'Accept': 'application/json, text/event-stream',
  'Content-Type': 'application/json'
};

async function initSession() {
  // console.log('[agent] initializing MCP session at', MCP_SERVER_URL);
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers,
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
    throw new Error(`Initialize failed: ${res.status} ${res.statusText}`);
  }

  const sessionId = res.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP session could not be established (missing mcp-session-id header).');
  }
  return sessionId;
}

async function callMcp(sessionId, toolName, args) {
  // console.log('[agent] calling MCP tool', toolName, 'args:', args);
  const res = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      ...headers,
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

// async function ensureConnect(sessionId) {
//   if (!MCP_CONNECTION_STRING) {
//     throw new Error('MDB_MCP_CONNECTION_STRING is not configured.');
//   }
//   return callMcp(sessionId, 'connect', { connectionString: MCP_CONNECTION_STRING });
// }

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

async function runAgent(prompt) {
  if (!openaiClient) {
    throw new Error('Agent unavailable: OPENAI_API_KEY is not configured.');
  }

  // console.log('[agent] starting runAgent with prompt:', prompt);
  const sessionId = await initSession();
  // await ensureConnect(sessionId);

  const messages = [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: [
            "You are an assistant for the Mongo Murder Mystery Atlas database only.",
            "Your job is to answer questions strictly about the murder mystery data and collections available through the MCP tools.",

            // Completion rules
            "When you have enough information, produce a FINAL concise answer.",
            "Never call tools repeatedly. If a tool returns the same result twice or returns no new information, stop and answer with what you have.",

            // Tool-use rules
            "Use only the provided `mcp_call` function connected to the Atlas MCP server.",
            "Do not invent tools, connection strings, queries, or data sources.",
            "If any MCP tool call returns an error or fails, stop immediately and inform the user.",

            // Scope restriction
            "Decline any request that is not about the murder mystery scenario or its associated Atlas collections.",
            "If the user asks about anything else, respond: 'I can only assist with the Mongo Murder Mystery Atlas database.'"
          ].join(' ')
        }
      ]
    },
    { role: 'user', content: [{ type: 'text', text: prompt }] }
  ];

  const toolDefs = buildToolSchema();

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

    return {
      reply: replyText,
      sessionId
    };
  }

  // console.log('[agent] reached step limit without final answer');
  return { reply: 'Agent reached step limit without a final answer.', sessionId: null };
}

module.exports = {
  runAgent
};
