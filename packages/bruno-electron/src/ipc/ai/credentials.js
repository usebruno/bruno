const { aiKeyStore } = require('../../store/ai-keys');
const { COPILOT_PROVIDER_ID, resolveCopilotToken } = require('./copilot');

const getProviderKey = (providerId) => providerId === COPILOT_PROVIDER_ID
  ? resolveCopilotToken()
  : aiKeyStore.getKey(providerId);

const hasProviderKey = (providerId) => Boolean(getProviderKey(providerId));

module.exports = {
  getProviderKey,
  hasProviderKey
};
