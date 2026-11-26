const mockIpcListeners = {};

jest.mock('electron', () => ({
  app: { getVersion: () => '0.0.0' },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn((channel, listener) => {
      mockIpcListeners[channel] = listener;
    })
  }
}));

jest.mock('../../store/preferences', () => ({ getPreferences: () => ({}) }));
jest.mock('../../store/ai-copilot', () => ({
  aiCopilotStore: { getSession: () => null, getAuthSource: () => null }
}));
jest.mock('../../store/ai-keys', () => ({ aiKeyStore: { getKey: () => null } }));

const registerChatIpc = require('./chat');

describe('ipc/ai/chat — renderer:ai-chat-stream', () => {
  const send = jest.fn();
  const mainWindow = { webContents: { send, isDestroyed: () => false } };
  const resolveModel = jest.fn(() => {
    throw new Error('stop after model resolution');
  });

  const stream = (payload) => mockIpcListeners['renderer:ai-chat-stream']({}, {
    requestId: 'req-1',
    messages: [{ role: 'user', content: 'hi' }],
    model: 'some-model',
    ...payload
  });

  beforeAll(() => {
    registerChatIpc({ mainWindow, resolveModel, pickDefaultModelId: () => null, isAiEnabled: () => true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unsupported modelApiFormat before resolving the model', async () => {
    await stream({ modelApiFormat: 'respones' });

    expect(resolveModel).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith('main:ai-chat-error', {
      requestId: 'req-1',
      error: 'Invalid request: unsupported API format "respones"'
    });
  });

  it.each(['chat-completions', 'responses'])('passes the %s format through to model resolution', async (format) => {
    await stream({ modelApiFormat: format });

    expect(resolveModel).toHaveBeenCalledWith('some-model', { apiFormatOverride: format });
  });

  it.each([null, undefined])('treats a %s modelApiFormat as no override', async (format) => {
    await stream({ modelApiFormat: format });

    expect(resolveModel).toHaveBeenCalledWith('some-model', { apiFormatOverride: format });
  });
});
