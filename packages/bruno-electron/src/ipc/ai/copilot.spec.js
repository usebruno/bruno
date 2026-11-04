const { generateText } = require('ai');

let mockCredentials;
let mockSession;
let mockDeviceFlow;

jest.mock('electron', () => ({
  app: { getVersion: () => '9.9.9' },
  ipcMain: { handle: jest.fn() }
}));

jest.mock('../../store/oauth-credentials', () => ({
  oauthCredentialsStore: {
    getCredential: (key) => mockCredentials[key] || null,
    setCredential: (key, value) => {
      mockCredentials[key] = value;
    },
    clearCredential: (key) => {
      delete mockCredentials[key];
    }
  }
}));

jest.mock('../../store/ai-copilot', () => ({
  aiCopilotStore: {
    getSession: () => mockSession,
    setSession: (session) => {
      mockSession = session;
    },
    clearSession: () => {
      mockSession = null;
    }
  }
}));

jest.mock('../../utils/github-device-flow', () => ({
  requestDeviceCode: (...args) => mockDeviceFlow.requestDeviceCode(...args),
  pollForToken: (...args) => mockDeviceFlow.pollForToken(...args)
}));

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const rawModel = (overrides = {}) => ({
  id: 'gpt-4o',
  name: overrides.id || 'GPT-4o',
  model_picker_enabled: true,
  is_chat_default: false,
  billing: { is_premium: false, multiplier: 0 },
  capabilities: {
    type: 'chat',
    family: 'gpt-4o',
    limits: { max_output_tokens: 4096 },
    supports: { streaming: true, tool_calls: true }
  },
  ...overrides
});

const accountBody = { login: 'octocat', name: 'Octo Cat', avatar_url: 'https://avatars.example/octocat' };
const endpointBody = { data: { viewer: { copilotEndpoints: { api: 'https://api.business.githubcopilot.com/' } } } };

const routeFetch = (routes) => {
  const calls = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const route = routes.find((r) => String(url).includes(r.match));
    if (!route) throw new Error(`Unexpected fetch: ${url}`);
    return route.reply(String(url), init);
  });
  return calls;
};

const sessionRoutes = (modelsReply = () => jsonResponse({ data: [rawModel()] })) => [
  { match: '/user', reply: () => jsonResponse(accountBody) },
  { match: '/graphql', reply: () => jsonResponse(endpointBody) },
  { match: '/models', reply: modelsReply }
];

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ipc/ai/copilot', () => {
  let copilot;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    mockCredentials = {};
    mockSession = null;
    mockDeviceFlow = {
      requestDeviceCode: jest.fn(),
      pollForToken: jest.fn()
    };
    copilot = require('./copilot');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('normalizeModelCatalog', () => {
    it('keeps only picker-enabled, streaming chat models with an accepted policy', () => {
      const models = copilot.normalizeModelCatalog([
        rawModel(),
        rawModel({ id: 'hidden', model_picker_enabled: false }),
        rawModel({ id: 'embed', capabilities: { ...rawModel().capabilities, type: 'embeddings' } }),
        rawModel({ id: 'pending', policy: { state: 'pending' } }),
        rawModel({ id: 'accepted', policy: { state: 'enabled' } }),
        rawModel({ id: 'no-stream', capabilities: { ...rawModel().capabilities, supports: { streaming: false } } }),
        { unrelated: true }
      ]);
      expect(models.map((m) => m.modelId)).toEqual(['gpt-4o', 'accepted']);
    });

    it('keeps plan-enabled models on personal plans even when Copilot sends no picker flag', () => {
      const models = copilot.normalizeModelCatalog([
        rawModel({ id: 'gpt-4.1', model_picker_enabled: false, policy: { state: 'enabled' } }),
        rawModel({ id: 'claude-haiku-4.5', model_picker_enabled: false, policy: { state: 'enabled' } }),
        rawModel({ id: 'claude-sonnet-5.5', model_picker_enabled: false, policy: { state: 'disabled' } }),
        rawModel({ id: 'gpt-4-0613', model_picker_enabled: false }),
        rawModel({ id: 'copilot-search-a', model_picker_enabled: false }),
        rawModel({ id: 'text-embedding-3-small', model_picker_enabled: false, capabilities: { type: 'embeddings', supports: {} } })
      ]);
      expect(models.map((m) => m.modelId)).toEqual(['gpt-4.1', 'claude-haiku-4.5']);
    });

    it('lists one model per display name, preferring the shortest id among plain variants', () => {
      const enabled = { model_picker_enabled: false, policy: { state: 'enabled' } };
      const models = copilot.normalizeModelCatalog([
        rawModel({ ...enabled, id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1' }),
        rawModel({ ...enabled, id: 'kimi-k3-copilot', name: 'Kimi K3 (GitHub)' }),
        rawModel({ ...enabled, id: 'mai-code-1-flash-secondary', name: 'MAI-Code-1.1-Flash' }),
        rawModel({ ...enabled, id: 'gpt-4.1', name: 'GPT-4.1' }),
        rawModel({ ...enabled, id: 'kimi-k3-base', name: 'Kimi K3 (GitHub)' }),
        rawModel({ ...enabled, id: 'mai-code-1.1-flash', name: 'MAI-Code-1.1-Flash' }),
        rawModel({ ...enabled, id: 'mai-code-1-flash-4th', name: 'MAI-Code-1.1-Flash' })
      ]);
      expect(models.map((m) => [m.modelId, m.label])).toEqual([
        ['gpt-4.1', 'GPT-4.1'],
        ['kimi-k3-base', 'Kimi K3 (GitHub)'],
        ['mai-code-1.1-flash', 'MAI-Code-1.1-Flash']
      ]);
    });

    it('prefers the chat default, then a picker model, over a shorter id with the same name', () => {
      const models = copilot.normalizeModelCatalog([
        rawModel({ id: 'gpt-x', name: 'GPT X', model_picker_enabled: false, policy: { state: 'enabled' } }),
        rawModel({ id: 'gpt-x-picker', name: 'GPT X', model_picker_enabled: true }),
        rawModel({ id: 'gpt-y', name: 'GPT Y', model_picker_enabled: true }),
        rawModel({ id: 'gpt-y-default', name: 'GPT Y', model_picker_enabled: true, is_chat_default: true })
      ]);
      expect(models.map((m) => m.modelId)).toEqual(['gpt-y-default', 'gpt-x-picker']);
    });

    it('puts the chat default first and maps limits, billing and reasoning', () => {
      const models = copilot.normalizeModelCatalog([
        rawModel({
          id: 'gpt-5',
          name: 'GPT-5',
          billing: { is_premium: true, multiplier: 1 },
          capabilities: {
            type: 'chat',
            limits: { max_output_tokens: 32000 },
            supports: { streaming: true, reasoning_effort: ['low', 'high'] }
          }
        }),
        rawModel({ id: 'gpt-4.1', name: 'GPT-4.1', is_chat_default: true, billing: undefined, capabilities: { type: 'chat', supports: { streaming: true } } }),
        rawModel({ id: 'claude', name: 'Claude', billing: { multiplier: 3 }, capabilities: { type: 'chat', supports: { streaming: true, thinking: true } } })
      ]);
      expect(models).toEqual([
        { modelId: 'gpt-4.1', label: 'GPT-4.1', reasoning: false, maxOutputTokens: 0, multiplier: 1 },
        { modelId: 'gpt-5', label: 'GPT-5', reasoning: true, maxOutputTokens: 32000, multiplier: 1 },
        { modelId: 'claude', label: 'Claude', reasoning: true, maxOutputTokens: 0, multiplier: 3 }
      ]);
    });

    it('tolerates a missing or malformed list', () => {
      expect(copilot.normalizeModelCatalog(undefined)).toEqual([]);
      expect(copilot.normalizeModelCatalog('nope')).toEqual([]);
    });
  });

  describe('isUserInitiatedRequest', () => {
    it('treats a trailing user message as user-initiated', () => {
      expect(copilot.isUserInitiatedRequest(JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }))).toBe(true);
    });

    it('treats tool-result follow-ups as agent-initiated', () => {
      const body = JSON.stringify({
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', tool_calls: [] },
          { role: 'tool', content: '{}' }
        ]
      });
      expect(copilot.isUserInitiatedRequest(body)).toBe(false);
    });

    it('defaults to user-initiated for bodies it cannot read', () => {
      expect(copilot.isUserInitiatedRequest('not json')).toBe(true);
      expect(copilot.isUserInitiatedRequest(undefined)).toBe(true);
    });
  });

  describe('getCopilotState', () => {
    it('reports signed-out with no stored token', () => {
      expect(copilot.getCopilotState()).toEqual({
        state: 'signed-out',
        authMethod: null,
        userCode: null,
        verificationUri: null,
        account: null,
        error: null
      });
    });

    it('reports signed-in with the method and cached account', () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      mockSession = { account: { login: 'octocat' } };
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signed-in',
        authMethod: 'device',
        account: { login: 'octocat' }
      });
    });
  });

  describe('refreshModels', () => {
    it('refuses without a stored token', async () => {
      await expect(copilot.refreshModels()).rejects.toThrow(copilot.NO_TOKEN_MESSAGE);
    });

    it('loads account, discovered endpoint and models', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      const calls = routeFetch(sessionRoutes());

      await copilot.refreshModels();

      expect(mockSession).toEqual({
        account: { login: 'octocat', name: 'Octo Cat', avatarUrl: 'https://avatars.example/octocat' },
        apiEndpoint: 'https://api.business.githubcopilot.com',
        models: [{ modelId: 'gpt-4o', label: 'GPT-4o', reasoning: false, maxOutputTokens: 4096, multiplier: 0 }]
      });
      expect(calls.find((c) => c.url.endsWith('/user')).init.headers).toEqual({
        Authorization: 'Bearer gho_secret',
        Accept: 'application/vnd.github+json'
      });
      const modelsCall = calls.find((c) => c.url.endsWith('/models'));
      expect(modelsCall.url).toBe('https://api.business.githubcopilot.com/models');
      expect(modelsCall.init.headers).toMatchObject({
        'Authorization': 'Bearer gho_secret',
        'Editor-Version': 'Bruno/9.9.9',
        'X-GitHub-Api-Version': '2025-10-01'
      });
    });

    it('logs why every returned model was filtered out', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({ data: [rawModel({ id: 'claude', policy: { state: 'unconfigured' } })] })));
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await copilot.refreshModels();

      expect(mockSession.models).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 models from api.business.githubcopilot.com but none are usable: claude type=chat picker=true policy=unconfigured streaming=true'));
      warn.mockRestore();
    });

    it('logs when Copilot returns an empty model list', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({ data: [] })));
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await copilot.refreshModels();

      expect(warn).toHaveBeenCalledWith('[AI] Copilot returned no models from api.business.githubcopilot.com');
      warn.mockRestore();
    });

    it('falls back to the public endpoint when discovery fails', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      const calls = routeFetch([
        { match: '/user', reply: () => jsonResponse(accountBody) },
        { match: '/graphql', reply: () => jsonResponse({ errors: [{ message: 'nope' }] }, 500) },
        { match: '/models', reply: () => jsonResponse({ data: [rawModel()] }) }
      ]);

      await copilot.refreshModels();

      expect(mockSession.apiEndpoint).toBe('https://api.githubcopilot.com');
      expect(calls.find((c) => c.url.endsWith('/models')).url).toBe('https://api.githubcopilot.com/models');
    });

    it('maps 403 from the models endpoint to the no-access message and keeps the account', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({}, 403)));

      await expect(copilot.refreshModels()).rejects.toThrow(copilot.NO_ACCESS_MESSAGE);
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signed-in',
        account: { login: 'octocat' },
        error: copilot.NO_ACCESS_MESSAGE
      });
    });

    it('shows GitHub\'s reason when a 403 from the models endpoint explains it', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({ message: 'Copilot is disabled for third-party editors by your organization.' }, 403)));

      await expect(copilot.refreshModels())
        .rejects.toThrow('GitHub Copilot access denied: Copilot is disabled for third-party editors by your organization.');
    });

    it('reads a nested error message from a 403', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({ error: { message: 'Resource not accessible by personal access token' } }, 403)));

      await expect(copilot.refreshModels())
        .rejects.toThrow('GitHub Copilot access denied: Resource not accessible by personal access token');
    });

    it('names the Copilot server and logs the body for an unexplained failure', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => new Response('<html>Service Unavailable</html>', { status: 503 })));
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(copilot.refreshModels())
        .rejects.toThrow('Failed to load Copilot models from api.business.githubcopilot.com (HTTP 503)');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('<html>Service Unavailable</html>'));
      warn.mockRestore();
    });

    it('includes the server\'s message for a failure that explains itself', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => jsonResponse({ message: 'Upstream timeout' }, 503)));

      await expect(copilot.refreshModels())
        .rejects.toThrow('Failed to load Copilot models from api.business.githubcopilot.com: Upstream timeout');
    });

    it('falls back to the no-access message for a 403 without a readable body', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeFetch(sessionRoutes(() => new Response('Forbidden', { status: 403 })));

      await expect(copilot.refreshModels()).rejects.toThrow(copilot.NO_ACCESS_MESSAGE);
    });
  });

  describe('saveToken', () => {
    it('stores a pasted token and loads the session', async () => {
      routeFetch(sessionRoutes());

      await copilot.saveToken('  github_pat_abc  ');

      expect(mockCredentials['github-copilot']).toEqual({ token: 'github_pat_abc', method: 'pat' });
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-in', authMethod: 'pat' });
    });

    it('discards a token GitHub rejects', async () => {
      routeFetch([{ match: '/user', reply: () => jsonResponse({ message: 'Bad credentials' }, 401) }]);

      await expect(copilot.saveToken('ghp_classic')).rejects.toThrow(copilot.TOKEN_REJECTED_MESSAGE);
      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-out', error: copilot.TOKEN_REJECTED_MESSAGE });
    });

    it('rejects an empty token', async () => {
      await expect(copilot.saveToken('   ')).rejects.toThrow('Token cannot be empty');
    });
  });

  describe('startSignIn', () => {
    const device = {
      deviceCode: 'dev-123',
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5
    };

    it('exposes the user code while waiting, then stores the token and loads models', async () => {
      const poll = deferred();
      mockDeviceFlow.requestDeviceCode.mockResolvedValue(device);
      mockDeviceFlow.pollForToken.mockReturnValue(poll.promise);
      routeFetch(sessionRoutes());
      const onSettled = jest.fn();

      await copilot.startSignIn({ onSettled });

      expect(mockDeviceFlow.requestDeviceCode).toHaveBeenCalledWith({ clientId: expect.any(String), scope: 'read:user' });
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signing-in',
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device'
      });

      poll.resolve({ accessToken: 'gho_device' });
      await flush();
      await flush();

      expect(mockCredentials['github-copilot']).toEqual({ token: 'gho_device', method: 'device' });
      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signed-in',
        authMethod: 'device',
        userCode: null,
        account: { login: 'octocat' }
      });
    });

    it('records the failure when GitHub denies the sign-in', async () => {
      const poll = deferred();
      mockDeviceFlow.requestDeviceCode.mockResolvedValue(device);
      mockDeviceFlow.pollForToken.mockReturnValue(poll.promise);
      const onSettled = jest.fn();

      await copilot.startSignIn({ onSettled });
      poll.reject(new Error('Sign-in was cancelled on GitHub.'));
      await flush();

      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-out', error: 'Sign-in was cancelled on GitHub.' });
    });

    it('ignores the outcome of a cancelled attempt', async () => {
      const poll = deferred();
      mockDeviceFlow.requestDeviceCode.mockResolvedValue(device);
      mockDeviceFlow.pollForToken.mockReturnValue(poll.promise);
      const onSettled = jest.fn();

      await copilot.startSignIn({ onSettled });
      copilot.cancelSignIn();
      expect(mockDeviceFlow.pollForToken.mock.calls[0][0].signal.aborted).toBe(true);

      poll.resolve({ accessToken: 'gho_late' });
      await flush();

      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(onSettled).not.toHaveBeenCalled();
      expect(copilot.getCopilotState().state).toBe('signed-out');
    });

    it('throws when the sign-in cannot start', async () => {
      mockDeviceFlow.requestDeviceCode.mockRejectedValue(new Error('GitHub sign-in could not start (HTTP 502)'));
      await expect(copilot.startSignIn({ onSettled: jest.fn() })).rejects.toThrow('HTTP 502');
      expect(copilot.getCopilotState().state).toBe('signed-out');
    });
  });

  describe('signOut', () => {
    it('removes the token and the cached session', () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      mockSession = { account: { login: 'octocat' }, apiEndpoint: 'x', models: [] };

      copilot.signOut();

      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(mockSession).toBeNull();
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-out', account: null, error: null });
    });
  });

  describe('createCopilotSdk', () => {
    const completion = {
      id: 'x',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4o',
      choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
    };

    const headersOf = (call) => Object.fromEntries(new Headers(call.init.headers).entries());

    it('sends Copilot headers and marks user-initiated requests', async () => {
      const calls = routeFetch([{ match: '/chat/completions', reply: () => jsonResponse(completion) }]);
      const sdk = copilot.createCopilotSdk({ token: 'gho_secret', apiEndpoint: 'https://api.githubcopilot.com' });
      const { text } = await generateText({ model: sdk.chat('gpt-4o'), prompt: 'hello' });

      expect(text).toBe('hi');
      expect(calls[0].url).toBe('https://api.githubcopilot.com/chat/completions');
      expect(headersOf(calls[0])).toMatchObject({
        'authorization': 'Bearer gho_secret',
        'editor-version': 'Bruno/9.9.9',
        'x-github-api-version': '2025-10-01',
        'openai-intent': 'conversation-panel',
        'x-initiator': 'user'
      });
    });

    it('marks tool-result follow-ups as agent-initiated', async () => {
      const calls = routeFetch([{ match: '/chat/completions', reply: () => jsonResponse(completion) }]);
      const sdk = copilot.createCopilotSdk({ token: 'gho_secret', apiEndpoint: 'https://api.githubcopilot.com' });
      await generateText({
        model: sdk.chat('gpt-4o'),
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'lookup', input: {} }] },
          { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 'lookup', output: { type: 'text', value: 'ok' } }] }
        ]
      });
      expect(headersOf(calls[0])['x-initiator']).toBe('agent');
    });

    it('turns 401 into a sign-in-expired error', async () => {
      routeFetch([{ match: '/chat/completions', reply: () => jsonResponse({ message: 'Bad credentials' }, 401) }]);
      const sdk = copilot.createCopilotSdk({ token: 'gho_secret', apiEndpoint: 'https://api.githubcopilot.com' });
      await expect(generateText({ model: sdk.chat('gpt-4o'), prompt: 'hello' }))
        .rejects.toThrow('GitHub Copilot sign-in is no longer valid');
    });

    it('turns 403 into the no-access error', async () => {
      routeFetch([{ match: '/chat/completions', reply: () => jsonResponse({}, 403) }]);
      const sdk = copilot.createCopilotSdk({ token: 'gho_secret', apiEndpoint: 'https://api.githubcopilot.com' });
      await expect(generateText({ model: sdk.chat('gpt-4o'), prompt: 'hello' }))
        .rejects.toThrow(copilot.NO_ACCESS_MESSAGE);
    });

    it('shows GitHub\'s reason when a chat 403 explains it', async () => {
      routeFetch([{ match: '/chat/completions', reply: () => jsonResponse({ error: { message: 'Model is not enabled for your plan' } }, 403) }]);
      const sdk = copilot.createCopilotSdk({ token: 'gho_secret', apiEndpoint: 'https://api.githubcopilot.com' });
      await expect(generateText({ model: sdk.chat('gpt-4o'), prompt: 'hello' }))
        .rejects.toThrow('GitHub Copilot access denied: Model is not enabled for your plan');
    });
  });
});
