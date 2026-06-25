const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');

const OPENAI_COMPATIBLE_PREFIX = 'openai-compatible:';

const isOpenAiCompatibleProviderId = (id) =>
  typeof id === 'string' && id.startsWith(OPENAI_COMPATIBLE_PREFIX);

const endpointIdFromProviderId = (providerId) =>
  isOpenAiCompatibleProviderId(providerId) ? providerId.slice(OPENAI_COMPATIBLE_PREFIX.length) : null;

const providerIdFromEndpointId = (endpointId) => `${OPENAI_COMPATIBLE_PREFIX}${endpointId}`;

const PROVIDERS = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    createSdk: ({ apiKey }) => createOpenAI({ apiKey }),
    validateApiKey: ({ apiKey }) => fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000)
    })
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    createSdk: ({ apiKey }) => createAnthropic({ apiKey }),
    validateApiKey: ({ apiKey }) => fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(10000)
    })
  }
};

/**
 * Static model catalog for built-in providers. User-defined custom models for
 * OpenAI-compatible endpoints are layered on top at lookup time.
 */
const MODEL_DEFINITIONS = {
  // OpenAI
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o', label: 'GPT-4o' },
  'gpt-5': { provider: 'openai', modelId: 'gpt-5', label: 'GPT-5' },
  'gpt-5-mini': { provider: 'openai', modelId: 'gpt-5-mini', label: 'GPT-5 Mini' },
  // Anthropic
  'claude-opus-4-7': { provider: 'anthropic', modelId: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  'claude-sonnet-4-6': { provider: 'anthropic', modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  'claude-haiku-4-5': { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
};

// Cache SDK instances. Built-in keyed by `${providerId}:${apiKey}`; compat
// also folds baseURL in so editing the URL rebuilds the SDK.
const sdkCache = new Map();

// JSON-stringified tuple so values containing ":" (provider ids, URLs) can't
// collide and reuse an SDK configured for a different endpoint/key.
const sdkCacheKey = ({ providerId, apiKey, baseURL }) =>
  JSON.stringify([providerId, baseURL || '', apiKey]);

const getCompatEndpoint = (aiPreferences, endpointId) => {
  const list = Array.isArray(aiPreferences?.openaiCompatibleEndpoints)
    ? aiPreferences.openaiCompatibleEndpoints
    : [];
  return list.find((e) => e?.id === endpointId) || null;
};

const compatProviderEntry = (endpoint) => ({
  id: providerIdFromEndpointId(endpoint.id),
  label: endpoint.name || 'OpenAI-compatible',
  apiKeyPlaceholder: 'sk-...',
  apiKeyHelpUrl: null,
  isCustom: true,
  endpointId: endpoint.id,
  baseURL: endpoint.baseURL || ''
});

const getSdk = ({ providerId, apiKey, baseURL }) => {
  const key = sdkCacheKey({ providerId, apiKey, baseURL });
  let sdk = sdkCache.get(key);
  if (sdk) return sdk;

  if (isOpenAiCompatibleProviderId(providerId)) {
    sdk = createOpenAI({ apiKey, baseURL });
  } else {
    const provider = PROVIDERS[providerId];
    if (!provider) throw new Error(`Unknown AI provider: ${providerId}`);
    sdk = provider.createSdk({ apiKey });
  }

  sdkCache.set(key, sdk);
  return sdk;
};

const clearSdkCache = () => {
  sdkCache.clear();
};

const listProviders = (aiPreferences) => {
  const builtIn = Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    apiKeyPlaceholder: p.apiKeyPlaceholder,
    apiKeyHelpUrl: p.apiKeyHelpUrl,
    isCustom: false
  }));

  const endpoints = Array.isArray(aiPreferences?.openaiCompatibleEndpoints)
    ? aiPreferences.openaiCompatibleEndpoints
    : [];

  return [...builtIn, ...endpoints.map(compatProviderEntry)];
};

const listModels = (aiPreferences) => {
  const builtIn = Object.entries(MODEL_DEFINITIONS).map(([id, def]) => ({
    id,
    label: def.label,
    provider: def.provider,
    isCustom: false
  }));

  const endpoints = Array.isArray(aiPreferences?.openaiCompatibleEndpoints)
    ? aiPreferences.openaiCompatibleEndpoints
    : [];

  const custom = [];
  for (const endpoint of endpoints) {
    if (!endpoint?.id || !Array.isArray(endpoint.models)) continue;
    for (const model of endpoint.models) {
      if (!model?.id || !model?.modelId) continue;
      custom.push({
        id: model.id,
        label: model.label || model.modelId,
        provider: providerIdFromEndpointId(endpoint.id),
        isCustom: true
      });
    }
  }

  return [...builtIn, ...custom];
};

/** Resolve a Bruno model id (built-in or custom) into its provider config. */
const resolveModelDefinition = (modelId, aiPreferences) => {
  if (MODEL_DEFINITIONS[modelId]) {
    const def = MODEL_DEFINITIONS[modelId];
    return {
      providerId: def.provider,
      sdkModelId: def.modelId,
      label: def.label,
      baseURL: null
    };
  }

  const endpoints = Array.isArray(aiPreferences?.openaiCompatibleEndpoints)
    ? aiPreferences.openaiCompatibleEndpoints
    : [];
  for (const endpoint of endpoints) {
    if (!endpoint?.id || !Array.isArray(endpoint.models)) continue;
    const match = endpoint.models.find((m) => m?.id === modelId);
    if (match) {
      return {
        providerId: providerIdFromEndpointId(endpoint.id),
        sdkModelId: match.modelId,
        label: match.label || match.modelId,
        baseURL: endpoint.baseURL || ''
      };
    }
  }
  return null;
};

const providerLabel = (providerId, aiPreferences) => {
  if (PROVIDERS[providerId]) return PROVIDERS[providerId].label;
  const endpointId = endpointIdFromProviderId(providerId);
  if (endpointId) {
    const endpoint = getCompatEndpoint(aiPreferences, endpointId);
    if (endpoint) return endpoint.name || 'OpenAI-compatible';
  }
  return providerId;
};

/**
 * Resolve a Bruno model id to a vercel-ai SDK model instance.
 * Throws if the provider isn't configured (no key) or the model is unknown.
 */
const getModel = (modelId, { aiPreferences, getApiKey }) => {
  const def = resolveModelDefinition(modelId, aiPreferences);
  if (!def) throw new Error(`Unknown model: ${modelId}`);

  const providerConfig = aiPreferences?.providers?.[def.providerId];
  if (!providerConfig?.enabled) {
    throw new Error(`${providerLabel(def.providerId, aiPreferences)} is not enabled. Enable it in Preferences > AI.`);
  }

  const apiKey = getApiKey(def.providerId);
  if (!apiKey) {
    throw new Error(`${providerLabel(def.providerId, aiPreferences)} API key is not configured. Add it in Preferences > AI.`);
  }

  if (isOpenAiCompatibleProviderId(def.providerId) && !def.baseURL) {
    throw new Error(`${providerLabel(def.providerId, aiPreferences)} is missing a Base URL. Set one in Preferences > AI.`);
  }

  return getSdk({ providerId: def.providerId, apiKey, baseURL: def.baseURL })(def.sdkModelId);
};

/**
 * List models that are usable right now (provider enabled + key configured + model not disabled).
 */
const getAvailableModels = ({ aiPreferences, hasApiKey }) => {
  const out = [];
  for (const model of listModels(aiPreferences)) {
    const providerConfig = aiPreferences?.providers?.[model.provider];
    if (!providerConfig?.enabled) continue;
    if (!hasApiKey(model.provider)) continue;

    const modelConfig = aiPreferences?.models?.[model.id];
    if (modelConfig?.enabled === false) continue;

    if (isOpenAiCompatibleProviderId(model.provider)) {
      const endpointId = endpointIdFromProviderId(model.provider);
      const endpoint = getCompatEndpoint(aiPreferences, endpointId);
      if (!endpoint?.baseURL) continue;
    }

    out.push({ id: model.id, label: model.label, provider: model.provider });
  }
  return out;
};

const isKnownProviderId = (providerId, aiPreferences) => {
  if (PROVIDERS[providerId]) return true;
  const endpointId = endpointIdFromProviderId(providerId);
  if (!endpointId) return false;
  return Boolean(getCompatEndpoint(aiPreferences, endpointId));
};

const validateApiKeyForProvider = async ({ providerId, apiKey, aiPreferences }) => {
  if (PROVIDERS[providerId]) {
    return PROVIDERS[providerId].validateApiKey({ apiKey });
  }
  const endpointId = endpointIdFromProviderId(providerId);
  const endpoint = endpointId ? getCompatEndpoint(aiPreferences, endpointId) : null;
  if (!endpoint?.baseURL) {
    throw new Error('Endpoint Base URL is not configured');
  }
  const url = `${endpoint.baseURL.replace(/\/$/, '')}/models`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000)
  });
};

module.exports = {
  PROVIDERS,
  MODEL_DEFINITIONS,
  OPENAI_COMPATIBLE_PREFIX,
  listProviders,
  listModels,
  getModel,
  getAvailableModels,
  clearSdkCache,
  isOpenAiCompatibleProviderId,
  endpointIdFromProviderId,
  providerIdFromEndpointId,
  getCompatEndpoint,
  isKnownProviderId,
  validateApiKeyForProvider,
  providerLabel
};
