let mockCredentials;
let mockSession;
let mockDeviceFlow;
let mockRuntime;

jest.mock('electron', () => ({
  app: { on: jest.fn() },
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

jest.mock('./copilot-runtime', () => ({
  listCopilotModels: (...args) => mockRuntime.listCopilotModels(...args),
  stopCopilotRuntime: (...args) => mockRuntime.stopCopilotRuntime(...args)
}));

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const accountBody = { login: 'octocat', name: 'Octo Cat', avatar_url: 'https://avatars.example/octocat' };
const account = { login: 'octocat', name: 'Octo Cat', avatarUrl: 'https://avatars.example/octocat' };
const catalog = [
  { modelId: 'auto', label: 'Auto', multiplier: 1 },
  { modelId: 'gpt-4.1', label: 'GPT-4.1', multiplier: 0 }
];

const routeAccount = (reply = () => jsonResponse(accountBody)) => {
  const calls = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url) === 'https://api.github.com/user') return reply();
    throw new Error(`Unexpected fetch: ${url}`);
  });
  return calls;
};

const tokenRefusedError = () => {
  const error = new Error('GitHub refused this token: Personal Access Token does not have "Copilot Requests" permission.');
  error.tokenRefused = true;
  return error;
};

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
    mockRuntime = {
      listCopilotModels: jest.fn(async () => catalog),
      stopCopilotRuntime: jest.fn(async () => {})
    };
    copilot = require('./copilot');
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

    it.each([
      ['GitHub sign-in', 'gho_secret', 'device'],
      ['fine-grained token', 'github_pat_secret', 'pat']
    ])('loads the account and the Copilot SDK model list for a %s', async (_label, token, method) => {
      mockCredentials['github-copilot'] = { token, method };
      const calls = routeAccount();

      await copilot.refreshModels();

      expect(mockSession).toEqual({ account, models: catalog });
      expect(mockRuntime.listCopilotModels).toHaveBeenCalledWith(token);
      expect(calls[0].init.headers).toEqual({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      });
    });

    it('keeps the account and records the error when the model list fails', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeAccount();
      mockRuntime.listCopilotModels.mockRejectedValue(new Error('GitHub Copilot request failed: overloaded (HTTP 503)'));

      await expect(copilot.refreshModels()).rejects.toThrow('overloaded (HTTP 503)');
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signed-in',
        account,
        error: 'GitHub Copilot request failed: overloaded (HTTP 503)'
      });
    });

    it('explains an account lookup failure', async () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      routeAccount(() => jsonResponse({ message: 'Server Error' }, 500));

      await expect(copilot.refreshModels()).rejects.toThrow('Failed to load the GitHub account: Server Error');
      expect(mockRuntime.listCopilotModels).not.toHaveBeenCalled();
    });
  });

  describe('saveToken', () => {
    it('stores a pasted token, restarts the runtime and loads models', async () => {
      routeAccount();

      await copilot.saveToken('  github_pat_abc  ');

      expect(mockCredentials['github-copilot']).toEqual({ token: 'github_pat_abc', method: 'pat' });
      expect(mockRuntime.stopCopilotRuntime).toHaveBeenCalled();
      expect(mockRuntime.listCopilotModels).toHaveBeenCalledWith('github_pat_abc');
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-in', authMethod: 'pat', account });
    });

    it('discards a token Copilot refuses and shows GitHub\'s reason', async () => {
      routeAccount();
      mockRuntime.listCopilotModels.mockRejectedValue(tokenRefusedError());

      await expect(copilot.saveToken('github_pat_abc'))
        .rejects.toThrow('GitHub refused this token: Personal Access Token does not have "Copilot Requests" permission.');
      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(mockSession).toBeNull();
      expect(copilot.getCopilotState()).toMatchObject({
        state: 'signed-out',
        error: 'GitHub refused this token: Personal Access Token does not have "Copilot Requests" permission.'
      });
    });

    it('discards a token GitHub rejects at the account lookup', async () => {
      routeAccount(() => jsonResponse({ message: 'Bad credentials' }, 401));

      await expect(copilot.saveToken('ghp_classic')).rejects.toThrow(copilot.TOKEN_REJECTED_MESSAGE);
      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-out', error: copilot.TOKEN_REJECTED_MESSAGE });
    });

    it('keeps the token when the failure is not about the token', async () => {
      routeAccount();
      mockRuntime.listCopilotModels.mockRejectedValue(new Error('GitHub Copilot request failed: overloaded (HTTP 503)'));

      await expect(copilot.saveToken('github_pat_abc')).rejects.toThrow('overloaded');
      expect(mockCredentials['github-copilot']).toEqual({ token: 'github_pat_abc', method: 'pat' });
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
      routeAccount();
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
      expect(mockRuntime.listCopilotModels).toHaveBeenCalledWith('gho_device');
      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-in', authMethod: 'device', userCode: null, account });
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
    it('removes the token and the cached session and stops the runtime', () => {
      mockCredentials['github-copilot'] = { token: 'gho_secret', method: 'device' };
      mockSession = { account: { login: 'octocat' }, models: catalog };

      copilot.signOut();

      expect(mockCredentials['github-copilot']).toBeUndefined();
      expect(mockSession).toBeNull();
      expect(mockRuntime.stopCopilotRuntime).toHaveBeenCalled();
      expect(copilot.getCopilotState()).toMatchObject({ state: 'signed-out', account: null, error: null });
    });
  });

  describe('findCopilotModel', () => {
    it('resolves Bruno model ids against the cached catalog', () => {
      mockSession = { account, models: catalog };
      expect(copilot.findCopilotModel('github-copilot:auto')).toEqual(catalog[0]);
      expect(copilot.findCopilotModel('github-copilot:retired')).toBeNull();
      expect(copilot.findCopilotModel('gpt-4.1')).toBeNull();
    });
  });
});
