// LLM provider selection for the /agent endpoint. Two OpenAI-compatible backends are supported:
//   - grove:      the Grove Foundry Gateway (Azure APIM, same gateway the quests-platform uses). Auth is the
//                 gateway key sent as `api-key` / `Ocp-Apim-Subscription-Key` / Bearer.
//   - openrouter: OpenRouter (the previous default).
// LLM_PROVIDER picks one explicitly; otherwise Grove is used when GROVE_API_KEY is set.
const GROVE_DEFAULT_ENDPOINT = 'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/openai/v1/chat/completions';
const GROVE_DEFAULT_MODEL = 'gpt-6-luna';

function getLlmConfig(env = process.env) {
  const provider = env.LLM_PROVIDER || (env.GROVE_API_KEY ? 'grove' : 'openrouter');

  if (provider === 'grove') {
    const apiKey = env.GROVE_API_KEY;
    const endpoint = env.GROVE_ENDPOINT || GROVE_DEFAULT_ENDPOINT;
    return {
      provider,
      apiKey,
      // The OpenAI SDK appends /chat/completions itself.
      baseURL: endpoint.replace(/\/chat\/completions\/?$/, ''),
      model: env.GROVE_MODEL || GROVE_DEFAULT_MODEL,
      headers: apiKey ? { 'api-key': apiKey, 'Ocp-Apim-Subscription-Key': apiKey } : {},
      missing: apiKey ? [] : ['GROVE_API_KEY']
    };
  }

  const apiKey = env.OPENAI_API_KEY;
  return {
    provider: 'openrouter',
    apiKey,
    baseURL: env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    model: env.OPENAI_MODEL || 'openai/gpt-oss-120b:free',
    headers: {},
    missing: apiKey ? [] : ['OPENAI_API_KEY']
  };
}

module.exports = { getLlmConfig, GROVE_DEFAULT_ENDPOINT, GROVE_DEFAULT_MODEL };
