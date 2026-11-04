let mockSession;

jest.mock('electron', () => ({
  app: { getVersion: () => '9.9.9' },
  ipcMain: { handle: jest.fn() }
}));

jest.mock('../../store/oauth-credentials', () => ({
  oauthCredentialsStore: {
    getCredential: () => null,
    setCredential: jest.fn(),
    clearCredential: jest.fn()
  }
}));

jest.mock('../../store/ai-copilot', () => ({
  aiCopilotStore: {
    getSession: () => mockSession,
    setSession: jest.fn(),
    clearSession: jest.fn()
  }
}));

const {
  listProviders,
  listModels,
  getModel,
  getAvailableModels,
  isKnownProviderId,
  isReasoningModel,
  resolveMaxOutputTokens,
  providerLabel,
  clearSdkCache
} = require('./providers');

const copilotSession = () => ({
  account: { login: 'octocat' },
  apiEndpoint: 'https://api.githubcopilot.com',
  models: [
    { modelId: 'gpt-4o', label: 'GPT-4o', reasoning: false, maxOutputTokens: 4096, multiplier: 0 },
    { modelId: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', reasoning: true, maxOutputTokens: 0, multiplier: 1 }
  ]
});

const enabledPrefs = (overrides = {}) => ({
  providers: { 'github-copilot': { enabled: true } },
  models: {},
  ...overrides
});

describe('ipc/ai/providers with GitHub Copilot', () => {
  beforeEach(() => {
    mockSession = copilotSession();
    clearSdkCache();
  });

  it('lists Copilot as a built-in provider', () => {
    expect(listProviders({})).toContainEqual({ id: 'github-copilot', label: 'GitHub Copilot', isCustom: false });
    expect(isKnownProviderId('github-copilot', {})).toBe(true);
    expect(providerLabel('github-copilot', {})).toBe('GitHub Copilot');
  });

  it('lists catalog models under prefixed ids so they never collide with built-ins', () => {
    const copilotModels = listModels({}).filter((m) => m.provider === 'github-copilot');
    expect(copilotModels).toEqual([
      { id: 'github-copilot:gpt-4o', label: 'GPT-4o', provider: 'github-copilot', isCustom: false, multiplier: 0 },
      { id: 'github-copilot:claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'github-copilot', isCustom: false, multiplier: 1 }
    ]);
    expect(listModels({}).filter((m) => m.id === 'gpt-4o')).toHaveLength(1);
  });

  it('lists no Copilot models before a session is loaded', () => {
    mockSession = null;
    expect(listModels({}).some((m) => m.provider === 'github-copilot')).toBe(false);
  });

  describe('getModel', () => {
    it('returns a chat-completions model against the discovered endpoint', () => {
      const model = getModel('github-copilot:gpt-4o', { aiPreferences: enabledPrefs(), getApiKey: () => 'gho_secret' });
      expect(model.modelId).toBe('gpt-4o');
      expect(model.provider).toBe('openai.chat');
    });

    it('requires the provider to be enabled', () => {
      expect(() => getModel('github-copilot:gpt-4o', { aiPreferences: { providers: {} }, getApiKey: () => 'gho_secret' }))
        .toThrow('GitHub Copilot is not enabled');
    });

    it('requires a sign-in', () => {
      expect(() => getModel('github-copilot:gpt-4o', { aiPreferences: enabledPrefs(), getApiKey: () => null }))
        .toThrow('Not signed in to GitHub Copilot');
    });

    it('requires a discovered endpoint', () => {
      mockSession = { ...copilotSession(), apiEndpoint: null };
      expect(() => getModel('github-copilot:gpt-4o', { aiPreferences: enabledPrefs(), getApiKey: () => 'gho_secret' }))
        .toThrow('GitHub Copilot models are still loading');
    });

    it('rejects a model missing from the catalog', () => {
      expect(() => getModel('github-copilot:retired', { aiPreferences: enabledPrefs(), getApiKey: () => 'gho_secret' }))
        .toThrow('Unknown model: github-copilot:retired');
    });
  });

  describe('getAvailableModels', () => {
    it('offers Copilot models only when signed in and enabled', () => {
      const signedIn = getAvailableModels({ aiPreferences: enabledPrefs(), hasApiKey: (id) => id === 'github-copilot' });
      expect(signedIn.map((m) => m.id)).toEqual(['github-copilot:gpt-4o', 'github-copilot:claude-sonnet-4.5']);

      expect(getAvailableModels({ aiPreferences: enabledPrefs(), hasApiKey: () => false })).toEqual([]);
      expect(getAvailableModels({ aiPreferences: { providers: {} }, hasApiKey: () => true })
        .some((m) => m.provider === 'github-copilot')).toBe(false);
    });

    it('respects per-model toggles', () => {
      const aiPreferences = enabledPrefs({ models: { 'github-copilot:gpt-4o': { enabled: false } } });
      const available = getAvailableModels({ aiPreferences, hasApiKey: () => true });
      expect(available.map((m) => m.id)).toEqual(['github-copilot:claude-sonnet-4.5']);
    });
  });

  it('reads reasoning support from the catalog', () => {
    expect(isReasoningModel('github-copilot:claude-sonnet-4.5')).toBe(true);
    expect(isReasoningModel('github-copilot:gpt-4o')).toBe(false);
  });

  describe('resolveMaxOutputTokens', () => {
    it('keeps the requested cap for built-in models', () => {
      expect(resolveMaxOutputTokens('gpt-4o', 16000)).toBe(16000);
    });

    it('clamps Copilot models to their catalog limit', () => {
      expect(resolveMaxOutputTokens('github-copilot:gpt-4o', 16000)).toBe(4096);
      expect(resolveMaxOutputTokens('github-copilot:gpt-4o', 1000)).toBe(1000);
    });

    it('keeps the requested cap for Copilot models without a known limit', () => {
      expect(resolveMaxOutputTokens('github-copilot:claude-sonnet-4.5', 16000)).toBe(16000);
    });

    it('lets OpenAI-compatible servers apply their own default', () => {
      expect(resolveMaxOutputTokens('some-custom-model', 16000)).toBeUndefined();
    });
  });
});
