// Regression test: the MCP Authorization header was dropped because google-auth-library returns a `Headers`
// object and the agent spread it into a plain object ({...headers} === {}).
jest.mock('openai', () => jest.fn().mockImplementation(() => ({ chat: { completions: { create: jest.fn() } } })));
jest.mock('./memory', () => ({ storeConversation: jest.fn(), getRecentContext: jest.fn() }));
const { toPlainHeaders, extractConnectionId } = require('./agent');

describe('toPlainHeaders', () => {
  test('keeps the Authorization header from a web Headers object', () => {
    const h = new Headers({ Authorization: 'Bearer token-123' });
    expect({ ...h }).toEqual({}); // the bug: spreading loses everything
    expect(toPlainHeaders(h)).toEqual({ authorization: 'Bearer token-123' });
  });

  test('passes plain objects through', () => {
    expect(toPlainHeaders({ Authorization: 'Bearer x' })).toEqual({ Authorization: 'Bearer x' });
  });

  test('handles an empty value', () => {
    expect(toPlainHeaders({})).toEqual({});
  });
});

describe('extractConnectionId', () => {
  test('prefers structuredContent', () => {
    expect(extractConnectionId({ structuredContent: { connectionId: 'abc' }, content: [{ type: 'text', text: 'Your connectionId is "zzz"' }] })).toBe('abc');
  });

  test('falls back to the text message', () => {
    expect(extractConnectionId({ content: [{ type: 'text', text: 'Successfully connected. Your connectionId is "conn-42" - pass it on.' }] })).toBe('conn-42');
  });

  test('returns undefined for servers that return none (MCP 1.x)', () => {
    expect(extractConnectionId({ content: [{ type: 'text', text: 'Successfully connected to MongoDB.' }] })).toBeUndefined();
    expect(extractConnectionId(undefined)).toBeUndefined();
  });
});
