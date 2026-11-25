// Regression test: the MCP Authorization header was dropped because google-auth-library returns a `Headers`
// object and the agent spread it into a plain object ({...headers} === {}).
jest.mock('openai', () => jest.fn().mockImplementation(() => ({ chat: { completions: { create: jest.fn() } } })));
jest.mock('./memory', () => ({ storeConversation: jest.fn(), getRecentContext: jest.fn() }));
const { toPlainHeaders } = require('./agent');

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
