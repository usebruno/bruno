jest.mock('electron', () => ({
  app: { getVersion: () => '0.0.0' },
  ipcMain: { handle: jest.fn(), on: jest.fn() }
}));

jest.mock('../../store/ai-copilot', () => ({
  aiCopilotStore: { getSession: () => null, getAuthSource: () => null }
}));

jest.mock('../../store/ai-keys', () => ({
  aiKeyStore: { getKey: () => null }
}));

const {
  normalizeModelCatalog,
  isUserInitiatedRequest,
  createCopilotLanguageModel
} = require('./copilot');

const chatModel = (id, supportedEndpoints) => ({
  id,
  name: id,
  capabilities: { type: 'chat', supports: { streaming: true } },
  policy: { state: 'enabled' },
  ...(supportedEndpoints ? { supported_endpoints: supportedEndpoints } : {})
});

/** A minimal LanguageModelV3 that records the options each call receives. */
const makeRecordingModel = (modelId) => {
  const calls = [];
  return {
    calls,
    model: {
      specificationVersion: 'v3',
      provider: 'openai.responses',
      modelId,
      supportedUrls: {},
      doGenerate: async (options) => {
        calls.push(options);
        return { content: [], finishReason: 'stop', usage: {}, warnings: [] };
      },
      doStream: async (options) => {
        calls.push(options);
        return { stream: new ReadableStream({ start: (controller) => controller.close() }) };
      }
    }
  };
};

describe('ipc/ai/copilot', () => {
  describe('normalizeModelCatalog — apiFormat', () => {
    it('uses the Responses API whenever a model lists it, and Chat Completions otherwise', () => {
      const catalog = normalizeModelCatalog([
        chatModel('gpt-responses-only', ['/responses', 'ws:/responses']),
        chatModel('model-with-both', ['/chat/completions', '/responses']),
        chatModel('claude-like', ['/v1/messages', '/chat/completions']),
        chatModel('legacy-without-endpoints')
      ]);

      const formats = Object.fromEntries(catalog.map((m) => [m.modelId, m.apiFormat]));
      expect(formats).toEqual({
        'gpt-responses-only': 'responses',
        'model-with-both': 'responses',
        'claude-like': 'chat-completions',
        'legacy-without-endpoints': 'chat-completions'
      });
    });
  });

  describe('isUserInitiatedRequest', () => {
    it('treats a Chat Completions turn ending in a user message as user-initiated', () => {
      const body = JSON.stringify({ messages: [{ role: 'system' }, { role: 'user' }] });
      expect(isUserInitiatedRequest(body)).toBe(true);
    });

    it('treats a Chat Completions turn ending in a tool result as an agent follow-up', () => {
      const body = JSON.stringify({ messages: [{ role: 'user' }, { role: 'assistant' }, { role: 'tool' }] });
      expect(isUserInitiatedRequest(body)).toBe(false);
    });

    it('treats a Responses API turn ending in a user message as user-initiated', () => {
      const body = JSON.stringify({ input: [{ role: 'system' }, { role: 'user', content: [] }] });
      expect(isUserInitiatedRequest(body)).toBe(true);
    });

    it('treats a Responses API turn ending in a function_call_output as an agent follow-up', () => {
      const body = JSON.stringify({
        input: [
          { role: 'user', content: [] },
          { type: 'function_call', call_id: 'c1' },
          { type: 'function_call_output', call_id: 'c1' }
        ]
      });
      expect(isUserInitiatedRequest(body)).toBe(false);
    });
  });

  describe('createCopilotLanguageModel', () => {
    const makeSdk = (recording) => ({
      chat: jest.fn((modelId) => ({ via: 'chat', modelId })),
      responses: jest.fn(() => recording.model)
    });

    it('uses Chat Completions for chat-completions models', () => {
      const sdk = makeSdk(makeRecordingModel('claude-like'));

      const model = createCopilotLanguageModel(sdk, { modelId: 'claude-like', apiFormat: 'chat-completions' });

      expect(model).toEqual({ via: 'chat', modelId: 'claude-like' });
      expect(sdk.responses).not.toHaveBeenCalled();
    });

    it('uses Chat Completions when the catalog entry has no apiFormat', () => {
      const sdk = makeSdk(makeRecordingModel('stale-entry'));

      createCopilotLanguageModel(sdk, { modelId: 'stale-entry', apiFormat: undefined });

      expect(sdk.chat).toHaveBeenCalledWith('stale-entry');
      expect(sdk.responses).not.toHaveBeenCalled();
    });

    it('sends Responses API calls without server-side storage, keeping caller provider options', async () => {
      const recording = makeRecordingModel('gpt-responses-only');
      const sdk = makeSdk(recording);

      const model = createCopilotLanguageModel(sdk, { modelId: 'gpt-responses-only', apiFormat: 'responses' });
      await model.doGenerate({
        prompt: [],
        providerOptions: { openai: { reasoningEffort: 'low', include: ['file_search_call.results'] } }
      });
      await model.doStream({ prompt: [] });

      expect(sdk.responses).toHaveBeenCalledWith('gpt-responses-only');
      expect(model.modelId).toBe('gpt-responses-only');
      expect(recording.calls[0].providerOptions.openai).toEqual({
        reasoningEffort: 'low',
        store: false,
        include: ['file_search_call.results', 'reasoning.encrypted_content']
      });
      expect(recording.calls[1].providerOptions.openai).toEqual({
        store: false,
        include: ['reasoning.encrypted_content']
      });
    });
  });
});
