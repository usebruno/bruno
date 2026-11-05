const path = require('path');

let mockSdk;
let mockApp;

jest.mock('electron', () => ({
  get app() {
    return mockApp;
  }
}));

jest.mock('@github/copilot-sdk', () => ({
  defineTool: (name, config) => ({ name, ...config }),
  RuntimeConnection: {
    forStdio: (opts) => ({ kind: 'stdio', ...opts })
  },
  CopilotClient: jest.fn().mockImplementation((options) => {
    const client = {
      options,
      started: false,
      stopped: false,
      start: jest.fn(async () => {
        if (mockSdk.startError) throw mockSdk.startError;
        client.started = true;
      }),
      stop: jest.fn(async () => {
        client.stopped = true;
        return [];
      }),
      rpc: {
        models: {
          list: jest.fn(async () => {
            if (mockSdk.listError) throw mockSdk.listError;
            return mockSdk.modelList;
          })
        }
      },
      deleteSession: jest.fn(async () => {}),
      createSession: jest.fn(async (config) => {
        const session = {
          sessionId: `session-${mockSdk.sessions.length + 1}`,
          config,
          handler: null,
          sentPrompts: [],
          on: jest.fn((handler) => {
            session.handler = handler;
            return () => {};
          }),
          send: jest.fn(async ({ prompt }) => {
            session.sentPrompts.push(prompt);
            mockSdk.onSend(session);
            return 'message-1';
          }),
          abort: jest.fn(async () => {}),
          disconnect: jest.fn(async () => {})
        };
        mockSdk.sessions.push(session);
        return session;
      })
    };
    mockSdk.clients.push(client);
    return client;
  })
}));

const emit = (session, type, data = {}) => session.handler({ type, data });

const model = (modelId) => ({ kind: 'github-copilot-sdk', token: 'gho_one', modelId });

const collect = async (stream) => {
  const parts = [];
  for await (const part of stream.fullStream) parts.push(part);
  return parts;
};

describe('ipc/ai/copilot-runtime', () => {
  let runtime;

  beforeEach(() => {
    jest.resetModules();
    mockApp = {
      isPackaged: false,
      getPath: () => require('os').tmpdir(),
      getVersion: () => '9.9.9'
    };
    mockSdk = {
      clients: [],
      sessions: [],
      startError: null,
      listError: null,
      modelList: { models: [] },
      onSend: (session) => emit(session, 'session.idle')
    };
    runtime = require('./copilot-runtime');
  });

  afterEach(async () => {
    await runtime.stopCopilotRuntime();
  });

  describe('client lifecycle', () => {
    it('starts one SDK client per token with only Bruno-supplied settings', async () => {
      const client = await runtime.getCopilotClient('github_pat_abc');

      expect(client.started).toBe(true);
      expect(client.options).toMatchObject({
        gitHubToken: 'github_pat_abc',
        useLoggedInUser: false,
        mode: 'empty',
        baseDirectory: path.join(require('os').tmpdir(), 'copilot-sdk'),
        workingDirectory: path.join(require('os').tmpdir(), 'copilot-sdk'),
        clientInfo: { applicationName: 'Bruno', applicationVersion: '9.9.9' }
      });
      expect(client.options.connection).toBeUndefined();
      await expect(runtime.getCopilotClient('github_pat_abc')).resolves.toBe(client);
      expect(mockSdk.clients).toHaveLength(1);
    });

    it('stops the old client when the token changes', async () => {
      const first = await runtime.getCopilotClient('gho_one');
      const second = await runtime.getCopilotClient('gho_two');

      expect(first.stopped).toBe(true);
      expect(second).not.toBe(first);
      expect(second.options.gitHubToken).toBe('gho_two');
    });

    it('stops the client on request', async () => {
      const client = await runtime.getCopilotClient('gho_one');
      await runtime.stopCopilotRuntime();
      expect(client.stopped).toBe(true);
    });

    it('starts the unpacked runtime binary in a packaged app', async () => {
      mockApp.isPackaged = true;
      const client = await runtime.getCopilotClient('gho_one');
      const platform = `${process.platform}-${process.arch}`;
      const wrapper = process.platform === 'win32' ? 'copilot-runtime.exe' : 'copilot-runtime';

      expect(client.options.connection).toMatchObject({ kind: 'stdio' });
      expect(client.options.connection.path.endsWith(path.join('prebuilds', platform, wrapper))).toBe(true);
    });

    it('forgets a client that failed to start', async () => {
      mockSdk.startError = new Error('spawn failed');
      await expect(runtime.getCopilotClient('gho_one')).rejects.toThrow('spawn failed');

      mockSdk.startError = null;
      const client = await runtime.getCopilotClient('gho_one');
      expect(client.started).toBe(true);
      expect(mockSdk.clients).toHaveLength(2);
    });
  });

  describe('listCopilotModels', () => {
    it('lists selectable models, puts Auto first and drops disabled ones', async () => {
      mockSdk.modelList = {
        auto: { defaultTier: 'standard', tiers: [] },
        models: [
          { id: 'gpt-4.1', name: 'GPT-4.1', capabilities: { limits: { max_output_tokens: 16384 } }, billing: { multiplier: 0 } },
          { id: 'claude-sonnet-5.5', name: 'Claude Sonnet 5.5', policy: { state: 'disabled' } },
          { id: 'gpt-6-luna', name: 'GPT-6 Luna', supportedReasoningEfforts: ['low', 'high'] }
        ]
      };

      await expect(runtime.listCopilotModels('gho_one')).resolves.toEqual([
        { modelId: 'auto', label: 'Auto', multiplier: 1 },
        { modelId: 'gpt-4.1', label: 'GPT-4.1', multiplier: 0 },
        { modelId: 'gpt-6-luna', label: 'GPT-6 Luna', multiplier: 1 }
      ]);
    });

    it('shows only Auto for plans without manual model selection', async () => {
      mockSdk.modelList = { models: [] };
      await expect(runtime.listCopilotModels('github_pat_abc')).resolves.toEqual([
        { modelId: 'auto', label: 'Auto', multiplier: 1 }
      ]);
    });

    it('always offers Auto first, even when the runtime reports no auto metadata', async () => {
      mockSdk.modelList = { models: [{ id: 'gpt-4.1', name: 'GPT-4.1' }] };
      const models = await runtime.listCopilotModels('gho_one');
      expect(models.map((m) => m.modelId)).toEqual(['auto', 'gpt-4.1']);
    });

    it('turns a refused token into a readable error', async () => {
      mockSdk.listError = new Error(
        'Request models.list failed with message: GenericFailure, '
        + JSON.stringify({
          kind: 'http',
          status: 401,
          statusText: 'Unauthorized',
          body: 'checking third-party user token: unauthorized: Personal Access Token does not have "Copilot Requests" permission\n'
        })
      );

      await expect(runtime.listCopilotModels('github_pat_abc')).rejects.toMatchObject({
        message: 'GitHub refused this token: Personal Access Token does not have "Copilot Requests" permission.',
        tokenRefused: true
      });
    });

    it('explains other HTTP failures without the raw details', async () => {
      mockSdk.listError = new Error(
        'Request models.list failed with message: GenericFailure, '
        + JSON.stringify({ kind: 'http', status: 503, statusText: 'Service Unavailable', body: 'upstream: overloaded' })
      );

      await expect(runtime.listCopilotModels('gho_one')).rejects.toThrow('GitHub Copilot request failed: overloaded (HTTP 503)');
    });
  });

  describe('streamCopilotText', () => {
    it('runs a session with only Bruno tools and streams text, tool calls and results', async () => {
      const execute = jest.fn(async ({ query }) => `found ${query}`);
      mockSdk.onSend = (session) => {
        emit(session, 'assistant.message_delta', { deltaContent: 'Looking ' });
        emit(session, 'tool.execution_start', { toolCallId: 'call-1', toolName: 'search_variables', arguments: { query: 'token' } });
        emit(session, 'tool.execution_complete', { toolCallId: 'call-1', success: true });
        emit(session, 'assistant.message_delta', { deltaContent: 'done.' });
        emit(session, 'assistant.message', { content: 'Looking done.' });
        emit(session, 'session.idle');
      };

      const parts = await collect(runtime.streamCopilotText({
        model: model('gpt-4.1'),
        system: 'You are Bruno.',
        messages: [{ role: 'user', content: 'Find my token variable' }],
        tools: {
          search_variables: { description: 'Search variables', inputSchema: { type: 'object' }, execute }
        }
      }));

      expect(parts).toEqual([
        { type: 'text-delta', text: 'Looking ' },
        { type: 'tool-call', toolName: 'search_variables', input: { query: 'token' } },
        { type: 'tool-result', toolName: 'search_variables' },
        { type: 'text-delta', text: 'done.' }
      ]);

      const [session] = mockSdk.sessions;
      expect(session.config).toMatchObject({
        model: 'gpt-4.1',
        streaming: true,
        availableTools: ['custom:*'],
        systemMessage: { mode: 'replace', content: 'You are Bruno.' }
      });
      expect(session.config.onPermissionRequest()).toMatchObject({ kind: 'reject' });
      expect(session.config.tools).toHaveLength(1);
      expect(session.config.tools[0]).toMatchObject({ name: 'search_variables', description: 'Search variables', skipPermission: true });
      await expect(session.config.tools[0].handler({ query: 'token' })).resolves.toBe('found token');
      expect(execute).toHaveBeenCalledWith({ query: 'token' });
      expect(session.sentPrompts).toEqual(['Find my token variable']);
      await new Promise((resolve) => setImmediate(resolve));
      expect(session.disconnect).toHaveBeenCalled();
      expect(mockSdk.clients[0].deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('allows no tools at all when the caller passes none', async () => {
      await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello' }));
      expect(mockSdk.sessions[0].config).toMatchObject({ model: 'auto', availableTools: [], tools: [] });
      expect(mockSdk.sessions[0].config.systemMessage).toBeUndefined();
    });

    it('uses the final message when the model does not stream deltas', async () => {
      mockSdk.onSend = (session) => {
        emit(session, 'assistant.message', { content: 'Whole answer' });
        emit(session, 'session.idle');
      };
      const parts = await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello' }));
      expect(parts).toEqual([{ type: 'text-delta', text: 'Whole answer' }]);
    });

    it('reports session errors as stream errors', async () => {
      mockSdk.onSend = (session) => emit(session, 'session.error', { errorType: 'quota', message: 'Monthly limit reached' });
      const parts = await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello' }));
      expect(parts).toHaveLength(1);
      expect(parts[0].type).toBe('error');
      expect(parts[0].error.message).toBe('You have reached your GitHub Copilot usage limit: Monthly limit reached');
    });

    it('reports a runtime that cannot start as a stream error', async () => {
      mockSdk.startError = new Error('spawn failed');
      const parts = await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello' }));
      expect(parts).toEqual([{ type: 'error', error: expect.objectContaining({ message: 'spawn failed' }) }]);
    });

    it('aborts the session and ends the stream when the caller aborts', async () => {
      const controller = new AbortController();
      mockSdk.onSend = (session) => {
        emit(session, 'assistant.message_delta', { deltaContent: 'partial' });
        controller.abort();
      };
      const parts = await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello', abortSignal: controller.signal }));
      expect(parts).toEqual([{ type: 'text-delta', text: 'partial' }]);
      expect(mockSdk.sessions[0].abort).toHaveBeenCalled();
    });

    it('does not start a session when already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const parts = await collect(runtime.streamCopilotText({ model: model('auto'), prompt: 'hello', abortSignal: controller.signal }));
      expect(parts).toEqual([]);
      expect(mockSdk.sessions).toHaveLength(0);
    });
  });

  describe('buildCopilotPrompt', () => {
    it('sends a single message as is', () => {
      expect(runtime.buildCopilotPrompt({ messages: [{ role: 'user', content: 'hi' }] })).toBe('hi');
      expect(runtime.buildCopilotPrompt({ prompt: 'plain prompt' })).toBe('plain prompt');
    });

    it('folds earlier turns into the prompt because sessions take one prompt', () => {
      expect(runtime.buildCopilotPrompt({
        messages: [
          { role: 'user', content: 'Context' },
          { role: 'assistant', content: [{ type: 'text', text: 'Noted' }] },
          { role: 'user', content: 'Write a test' }
        ]
      })).toBe('Conversation so far:\n\nUser:\nContext\n\nAssistant:\nNoted\n\nUser:\nWrite a test');
    });
  });

  describe('generateCopilotText', () => {
    it('returns the streamed text', async () => {
      mockSdk.onSend = (session) => {
        emit(session, 'assistant.message_delta', { deltaContent: 'expect(' });
        emit(session, 'assistant.message_delta', { deltaContent: 'res.status)' });
        emit(session, 'session.idle');
      };
      await expect(runtime.generateCopilotText({ model: model('auto'), prompt: 'complete' })).resolves.toEqual({ text: 'expect(res.status)' });
    });

    it('throws stream errors', async () => {
      mockSdk.onSend = (session) => emit(session, 'session.error', { errorType: 'rate_limit', message: 'Slow down' });
      await expect(runtime.generateCopilotText({ model: model('auto'), prompt: 'complete' }))
        .rejects.toThrow('GitHub Copilot is rate limiting requests: Slow down');
    });
  });

  it('identifies Copilot model references', () => {
    const ref = runtime.createCopilotModelRef({ token: 'gho_one', modelId: 'auto' });
    expect(runtime.isCopilotModelRef(ref)).toBe(true);
    expect(runtime.isCopilotModelRef({ modelId: 'gpt-4.1' })).toBe(false);
    expect(runtime.isCopilotModelRef(undefined)).toBe(false);
  });
});
