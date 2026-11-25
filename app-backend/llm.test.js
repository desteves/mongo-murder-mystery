const { getLlmConfig, GROVE_DEFAULT_ENDPOINT } = require('./llm');

describe('getLlmConfig', () => {
  test('defaults to OpenRouter without Grove settings', () => {
    const c = getLlmConfig({ OPENAI_API_KEY: 'k' });
    expect(c).toMatchObject({ provider: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', missing: [] });
  });

  test('reports the missing OpenRouter key', () => {
    expect(getLlmConfig({}).missing).toEqual(['OPENAI_API_KEY']);
  });

  test('uses Grove when GROVE_API_KEY is set, with gateway headers and a trimmed base URL', () => {
    const c = getLlmConfig({ GROVE_API_KEY: 'g-key' });
    expect(c.provider).toBe('grove');
    expect(c.baseURL).toBe(GROVE_DEFAULT_ENDPOINT.replace('/chat/completions', ''));
    expect(c.model).toBe('gpt-6-luna');
    expect(c.headers).toEqual({ 'api-key': 'g-key', 'Ocp-Apim-Subscription-Key': 'g-key' });
    expect(c.missing).toEqual([]);
  });

  test('LLM_PROVIDER wins over key detection, and Grove without a key is reported missing', () => {
    expect(getLlmConfig({ LLM_PROVIDER: 'openrouter', GROVE_API_KEY: 'g', OPENAI_API_KEY: 'o' }).provider).toBe('openrouter');
    expect(getLlmConfig({ LLM_PROVIDER: 'grove' }).missing).toEqual(['GROVE_API_KEY']);
  });

  test('honours custom Grove endpoint and model', () => {
    const c = getLlmConfig({ GROVE_API_KEY: 'g', GROVE_ENDPOINT: 'https://x.test/v1/chat/completions/', GROVE_MODEL: 'm' });
    expect(c.baseURL).toBe('https://x.test/v1');
    expect(c.model).toBe('m');
  });
});
