const http = require('http');

// Mock the OpenAI client so no real LLM calls are made
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } }
  }));
});

// Avoid touching the AI database (memory is only used with a sessionId anyway)
jest.mock('./memory', () => ({
  storeConversation: jest.fn(),
  getRecentContext: jest.fn(() => [])
}));

describe('runAgent MCP tool dispatch', () => {
  let server;
  let runAgent;
  const mcpRequests = []; // every tools/call the fake MCP server receives

  beforeAll((done) => {
    // Fake MCP server: answers initialize with a session id and records tool calls
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const msg = JSON.parse(body);
        res.setHeader('Content-Type', 'application/json');
        if (msg.method === 'initialize') {
          res.setHeader('mcp-session-id', 'test-mcp-session');
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }));
          return;
        }
        if (msg.method === 'tools/call') {
          mcpRequests.push({
            tool: msg.params.name,
            sessionHeader: req.headers['mcp-session-id']
          });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: { content: [{ type: 'text', text: '[]' }] }
          }));
          return;
        }
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }));
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      process.env.MCP_SERVER_URL = `http://127.0.0.1:${port}/mcp`;
      process.env.MCP_ID_TOKEN_AUDIENCE = process.env.MCP_SERVER_URL; // localhost -> no Google auth
      process.env.MDB_MCP_CONNECTION_STRING = 'mongodb://127.0.0.1:27017/mmm_AI';
      process.env.OPENAI_API_KEY = 'test-openai-key';
      runAgent = require('./agent').runAgent; // env is read at require time
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('executes a model-requested find tool call against the MCP session', async () => {
    // Turn 1: model asks for a find; turn 2: model gives its final answer
    mockCreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'tc1',
              type: 'function',
              function: {
                name: 'mcp_call',
                arguments: JSON.stringify({ tool: 'find', collection: 'person', filter: {} })
              }
            }]
          }
        }]
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'final answer' } }]
      });

    const { reply } = await runAgent('who is the suspect?');

    expect(reply).toBe('final answer');

    // The find tool call must reach the MCP server, bound to the established session
    const findCall = mcpRequests.find((r) => r.tool === 'find');
    expect(findCall).toBeDefined();
    expect(findCall.sessionHeader).toBe('test-mcp-session');

    // The tool result fed back to the model must be a success, not an internal failure
    const secondCallMessages = mockCreate.mock.calls[1][0].messages;
    const toolMessage = secondCallMessages.find((m) => m.role === 'tool');
    expect(toolMessage).toBeDefined();
    expect(JSON.stringify(toolMessage.content)).not.toContain('MCP call failed');
  });
});
