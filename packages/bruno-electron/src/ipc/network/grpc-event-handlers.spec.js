jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
    getVersion: jest.fn(() => '1.0.0')
  }
}));

jest.mock('./interpolate-string', () => ({
  interpolateString: (str) => str
}));

const mockIsConnectionActive = jest.fn();
const mockSendMessage = jest.fn();
const mockRunBeforeMessageSend = jest.fn();
const mockInterceptGrpcEvent = jest.fn();

// Only GrpcClient is faked - the rest of the package (getPacResolver, getCACertificates)
// is still needed by this module and its siblings at require time.
jest.mock('@usebruno/requests', () => ({
  ...jest.requireActual('@usebruno/requests'),
  GrpcClient: class FakeGrpcClient {
    constructor(eventCallback) {
      this.eventCallback = eventCallback;
      this.isConnectionActive = mockIsConnectionActive;
      this.sendMessage = mockSendMessage;
    }
  }
}));

jest.mock('./grpc-script-orchestration', () => ({
  createGrpcScriptOrchestration: () => ({
    runBeforeMessageSend: mockRunBeforeMessageSend,
    interceptGrpcEvent: mockInterceptGrpcEvent,
    closeAllCallSessions: jest.fn()
  })
}));

const { ipcMain } = require('electron');
const registerGrpcEventHandlers = require('./grpc-event-handlers');
const { resolveGrpcProxyConfig } = registerGrpcEventHandlers;

const emptyInterpolationOptions = {};

describe('resolveGrpcProxyConfig', () => {
  describe('proxyMode "off"', () => {
    it('should return null proxyUrl', async () => {
      await expect(resolveGrpcProxyConfig('off', {}, 'grpc://localhost:50051', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });
  });

  describe('proxyMode "on"', () => {
    it('should return proxy URL without auth', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: true }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://proxy.example.com:8080' });
    });

    it('should return proxy URL with auth when auth is enabled', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user', password: 'pass' }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://user:pass@proxy.example.com:8080' });
    });

    it('should URL-encode special characters in credentials', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { disabled: false, username: 'user@domain', password: 'p@ss:word' }
      };
      const result = await resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions);
      expect(result.proxyUrl).toBe('http://user%40domain:p%40ss%3Aword@proxy.example.com:8080');
    });

    it('should reject SOCKS proxy protocols', async () => {
      const proxyConfig = {
        protocol: 'socks5',
        hostname: 'proxy.example.com',
        port: '1080'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should reject HTTPS proxy protocol', async () => {
      const proxyConfig = {
        protocol: 'https',
        hostname: 'proxy.example.com',
        port: '8080'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when request URL is in bypassProxy list', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        bypassProxy: 'localhost,api.example.com'
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should omit port when not provided', async () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: 'proxy.example.com',
        auth: { disabled: true }
      };
      await expect(resolveGrpcProxyConfig('on', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://proxy.example.com' });
    });
  });

  describe('proxyMode "system"', () => {
    it('should use https_proxy when available', async () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://system-proxy.example.com:3128' });
    });

    it('should fall back to http_proxy when https_proxy is not set', async () => {
      const proxyConfig = {
        http_proxy: 'http://fallback-proxy.example.com:3128'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: 'http://fallback-proxy.example.com:3128' });
    });

    it('should return null when no system proxy is configured', async () => {
      await expect(resolveGrpcProxyConfig('system', {}, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should reject non-HTTP system proxy protocols', async () => {
      const proxyConfig = {
        https_proxy: 'socks5://system-proxy.example.com:1080'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when request URL matches no_proxy', async () => {
      const proxyConfig = {
        https_proxy: 'http://system-proxy.example.com:3128',
        no_proxy: 'api.example.com'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null for invalid system proxy URL', async () => {
      const proxyConfig = {
        https_proxy: 'not-a-valid-url'
      };
      await expect(resolveGrpcProxyConfig('system', proxyConfig, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });

    it('should return null when proxyConfig is null', async () => {
      await expect(resolveGrpcProxyConfig('system', null, 'grpc://api.example.com:443', emptyInterpolationOptions))
        .resolves.toEqual({ proxyUrl: null });
    });
  });
});

const fakeWindow = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: jest.fn() }
};

const REQUEST_ID = 'req-1';
const COLLECTION_UID = 'col-1';
const STREAM_NOT_OPEN = { success: false, error: 'Cannot send message: the gRPC stream is not open' };

describe('grpc:send-message', () => {
  let sendMessageHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnectionActive.mockReturnValue(true);
    mockRunBeforeMessageSend.mockResolvedValue(undefined);

    registerGrpcEventHandlers(fakeWindow);

    sendMessageHandler = ipcMain.handle.mock.calls.find(([channel]) => channel === 'grpc:send-message')?.[1];
  });

  const send = (message) => sendMessageHandler({}, REQUEST_ID, COLLECTION_UID, message);

  it('registers a handler for the channel', () => {
    expect(typeof sendMessageHandler).toBe('function');
  });

  it('rejects a malformed JSON message before touching the stream or the hook', async () => {
    const result = await send('{ not json');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^Failed to parse request body: /);
    expect(mockIsConnectionActive).not.toHaveBeenCalled();
    expect(mockRunBeforeMessageSend).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('reports the stream as closed when the connection is already inactive', async () => {
    mockIsConnectionActive.mockReturnValue(false);

    await expect(send('{}')).resolves.toEqual(STREAM_NOT_OPEN);
    expect(mockRunBeforeMessageSend).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('returns the hook error and leaves the stream untouched when beforeMessageSend throws', async () => {
    mockRunBeforeMessageSend.mockRejectedValue(new Error('beforeMessageSend aborted the message'));

    await expect(send('{}')).resolves.toEqual({ success: false, error: 'beforeMessageSend aborted the message' });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockInterceptGrpcEvent).not.toHaveBeenCalled();
  });

  it('rechecks the connection after the hook and does not send when the hook closed the stream', async () => {
    mockIsConnectionActive.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await expect(send('{}')).resolves.toEqual(STREAM_NOT_OPEN);
    expect(mockRunBeforeMessageSend).toHaveBeenCalledTimes(1);
    expect(mockIsConnectionActive).toHaveBeenCalledTimes(2);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('sends the message and emits grpc:message on success', async () => {
    const message = '{"greeting":"hi"}';

    await expect(send(message)).resolves.toEqual({ success: true });
    expect(mockSendMessage).toHaveBeenCalledWith(REQUEST_ID, COLLECTION_UID, message);
    expect(mockInterceptGrpcEvent).toHaveBeenCalledWith('grpc:message', REQUEST_ID, COLLECTION_UID, message);
  });

  it('hands the hook the parsed payload while the wire keeps the original string', async () => {
    const message = '{"greeting":"hi"}';

    await send(message);

    expect(mockRunBeforeMessageSend).toHaveBeenCalledWith({ requestId: REQUEST_ID, data: { greeting: 'hi' } });
    expect(mockSendMessage).toHaveBeenCalledWith(REQUEST_ID, COLLECTION_UID, message);
  });

  it('surfaces a write failure from the client', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSendMessage.mockImplementation(() => {
      throw new Error('stream write failed');
    });

    await expect(send('{}')).resolves.toEqual({ success: false, error: 'stream write failed' });
    expect(mockInterceptGrpcEvent).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
