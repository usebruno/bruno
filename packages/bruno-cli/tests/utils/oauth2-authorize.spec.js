const { describe, it, expect } = require('@jest/globals');
const http = require('node:http');
const net = require('node:net');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const {
  AUTHORIZATION_ERROR_CODES,
  isInteractiveSession,
  getLoopbackCallback,
  getBrowserCommand,
  openBrowser,
  listenForLoopbackCallback,
  promptForCallbackUrl,
  createCliAuthorizer
} = require('../../src/utils/oauth2-authorize');

const httpGet = (url, method = 'GET') =>
  new Promise((resolve, reject) => {
    // A fresh socket per request, so a closed listener shows up as ECONNREFUSED rather than a reset keep-alive socket
    const req = http.request(url, { method, agent: false }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });

const getFreePort = () =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

// Stands in for child_process.spawn; `onLaunch` receives the URL the browser would open
const fakeSpawn = ({ fail = false, onLaunch = () => {} } = {}) => {
  const calls = [];
  const spawnProcess = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.unref = jest.fn();
    process.nextTick(() => {
      if (fail) {
        child.emit('error', new Error('spawn xdg-open ENOENT'));
        return;
      }
      child.emit('spawn');
      onLaunch(args[args.length - 1]);
    });
    return child;
  };
  return { spawnProcess, calls };
};

const interactiveStdin = () => Object.assign(new PassThrough(), { isTTY: true });

describe('oauth2-authorize', () => {
  describe('isInteractiveSession', () => {
    it('is interactive only for a TTY outside CI', () => {
      expect(isInteractiveSession({ stdin: { isTTY: true }, env: {} })).toBe(true);
      expect(isInteractiveSession({ stdin: { isTTY: false }, env: {} })).toBe(false);
      expect(isInteractiveSession({ stdin: {}, env: {} })).toBe(false);
      expect(isInteractiveSession({ stdin: { isTTY: true }, env: { CI: 'true' } })).toBe(false);
      expect(isInteractiveSession({ stdin: { isTTY: true }, env: { CI: 'false' } })).toBe(true);
    });
  });

  describe('getLoopbackCallback', () => {
    it('listens on both loopback families for localhost, and only the named one otherwise', () => {
      expect(getLoopbackCallback('http://localhost:8765/callback')).toMatchObject({
        port: 8765,
        addresses: [{ address: '127.0.0.1' }, { address: '::1', optional: true }]
      });
      expect(getLoopbackCallback('http://127.0.0.1:9000/oauth/cb')).toMatchObject({ port: 9000, addresses: [{ address: '127.0.0.1' }] });
      expect(getLoopbackCallback('http://[::1]:9001/cb')).toMatchObject({ port: 9001, addresses: [{ address: '::1' }] });
    });

    it('rejects callbacks the CLI cannot receive', () => {
      expect(getLoopbackCallback('https://oauth.usebruno.com/callback')).toBeNull();
      expect(getLoopbackCallback('https://localhost:8765/callback')).toBeNull();
      expect(getLoopbackCallback('http://example.com:8765/callback')).toBeNull();
      expect(getLoopbackCallback('not a url')).toBeNull();
    });
  });

  describe('openBrowser', () => {
    const url = 'https://auth.example.com/authorize?a=1&b=2';

    it('passes the URL as a single argument, without a shell', () => {
      expect(getBrowserCommand(url, 'darwin')).toEqual({ command: 'open', args: [url] });
      expect(getBrowserCommand(url, 'win32')).toEqual({ command: 'rundll32', args: ['url.dll,FileProtocolHandler', url] });
      expect(getBrowserCommand(url, 'linux')).toEqual({ command: 'xdg-open', args: [url] });
    });

    it('resolves true once the browser process starts', async () => {
      const { spawnProcess, calls } = fakeSpawn();

      await expect(openBrowser(url, { platform: 'linux', spawnProcess })).resolves.toBe(true);
      expect(calls[0].options).not.toHaveProperty('shell');
    });

    it('resolves false when the browser cannot be launched', async () => {
      const { spawnProcess } = fakeSpawn({ fail: true });

      await expect(openBrowser(url, { platform: 'linux', spawnProcess })).resolves.toBe(false);
    });

    it('never launches non-http URLs', async () => {
      const { spawnProcess, calls } = fakeSpawn();

      await expect(openBrowser('file:///etc/passwd', { platform: 'linux', spawnProcess })).resolves.toBe(false);
      expect(calls).toHaveLength(0);
    });
  });

  describe('listenForLoopbackCallback', () => {
    const startListener = async (options) => {
      const listener = listenForLoopbackCallback(getLoopbackCallback('http://127.0.0.1:0/callback'), options);
      const [address] = await listener.ready;
      return { ...listener, address, baseUrl: `http://127.0.0.1:${address.port}` };
    };

    it('binds only to the loopback interface', async () => {
      const { address, baseUrl, callback } = await startListener();

      expect(address.address).toBe('127.0.0.1');
      await httpGet(`${baseUrl}/callback?code=x&state=y`);
      await callback;
    });

    describe('localhost', () => {
      // localhost binds two sockets that must share the configured port, so a fixed free port is used
      const startLocalhostListener = async () => {
        const port = await getFreePort();
        const listener = listenForLoopbackCallback(getLoopbackCallback(`http://localhost:${port}/callback`));
        return { ...listener, addresses: await listener.ready, port };
      };

      it('listens on IPv4 and IPv6 loopback only', async () => {
        const { addresses, port, callback } = await startLocalhostListener();

        expect(addresses.map(({ address }) => address).sort()).toEqual(['127.0.0.1', '::1']);
        await httpGet(`http://127.0.0.1:${port}/callback?code=x&state=y`);
        await callback;
      });

      it('accepts a browser that resolves localhost to ::1, then closes both listeners', async () => {
        const { port, callback } = await startLocalhostListener();

        await httpGet(`http://[::1]:${port}/callback?code=from-ipv6&state=s`);

        expect(new URL(await callback).searchParams.get('code')).toBe('from-ipv6');
        await expect(httpGet(`http://[::1]:${port}/callback?code=again`)).rejects.toThrow(/ECONNREFUSED/);
        await expect(httpGet(`http://127.0.0.1:${port}/callback?code=again`)).rejects.toThrow(/ECONNREFUSED/);
      });

      it('accepts a browser that resolves localhost to 127.0.0.1', async () => {
        const { port, callback } = await startLocalhostListener();

        await httpGet(`http://127.0.0.1:${port}/callback?code=from-ipv4&state=s`);

        expect(new URL(await callback).searchParams.get('code')).toBe('from-ipv4');
      });

      it('still listens on IPv4 when IPv6 loopback is unavailable', async () => {
        const port = await getFreePort();
        // ::2 is never assigned locally, so binding it fails the way a host without IPv6 loopback does
        const listener = listenForLoopbackCallback({
          url: new URL(`http://localhost:${port}/callback`),
          port,
          addresses: [{ address: '127.0.0.1' }, { address: '::2', optional: true }]
        });

        expect((await listener.ready).map(({ address }) => address)).toEqual(['127.0.0.1']);
        await httpGet(`http://127.0.0.1:${port}/callback?code=x&state=s`);
        await listener.callback;
      });

      it('fails when another process already holds the port on ::1', async () => {
        const port = await getFreePort();
        const blocker = http.createServer();
        await new Promise((resolve) => blocker.listen(port, '::1', resolve));

        try {
          const listener = listenForLoopbackCallback(getLoopbackCallback(`http://localhost:${port}/callback`));
          await expect(listener.ready).rejects.toThrow(`Could not listen for the OAuth2 callback on http://localhost:${port}`);
          // The IPv4 socket that did bind is closed again
          await expect(httpGet(`http://127.0.0.1:${port}/callback?code=x`)).rejects.toThrow(/ECONNREFUSED/);
        } finally {
          blocker.close();
        }
      });
    });

    it('binds only IPv6 loopback for an explicit [::1] callback', async () => {
      const port = await getFreePort();
      const listener = listenForLoopbackCallback(getLoopbackCallback(`http://[::1]:${port}/callback`));

      expect((await listener.ready).map(({ address }) => address)).toEqual(['::1']);
      await expect(httpGet(`http://127.0.0.1:${port}/callback?code=x`)).rejects.toThrow(/ECONNREFUSED/);
      await httpGet(`http://[::1]:${port}/callback?code=x&state=s`);
      await listener.callback;
    });

    it('captures the callback on the configured path, then closes', async () => {
      const { baseUrl, callback } = await startListener();

      const response = await httpGet(`${baseUrl}/callback?code=secret-code&state=abc`);
      const callbackResponseUrl = new URL(await callback);

      expect(response.status).toBe(200);
      expect(response.body).toContain('You can close this tab');
      expect(response.body).not.toContain('secret-code');
      expect(callbackResponseUrl.searchParams.get('code')).toBe('secret-code');
      expect(callbackResponseUrl.searchParams.get('state')).toBe('abc');
      await expect(httpGet(`${baseUrl}/callback?code=again`)).rejects.toThrow(/ECONNREFUSED/);
    });

    it('answers 404 to other paths, methods and non-OAuth requests while still waiting', async () => {
      const { baseUrl, callback } = await startListener();

      expect((await httpGet(`${baseUrl}/favicon.ico`)).status).toBe(404);
      expect((await httpGet(`${baseUrl}/callback/extra?code=x`)).status).toBe(404);
      expect((await httpGet(`${baseUrl}/callback?code=x`, 'POST')).status).toBe(404);
      expect((await httpGet(`${baseUrl}/callback`)).status).toBe(404);

      await httpGet(`${baseUrl}/callback?code=real&state=s`);
      expect(new URL(await callback).searchParams.get('code')).toBe('real');
    });

    it('hands an IdP error response back for the OAuth2 helper to report', async () => {
      const { baseUrl, callback } = await startListener();

      await httpGet(`${baseUrl}/callback?error=access_denied&state=s`);

      expect(new URL(await callback).searchParams.get('error')).toBe('access_denied');
    });

    it('times out and closes the listener', async () => {
      const { baseUrl, callback } = await startListener({ timeoutMs: 50 });

      await expect(callback).rejects.toMatchObject({ code: AUTHORIZATION_ERROR_CODES.TIMED_OUT, message: expect.stringContaining('Timed out') });
      await expect(httpGet(`${baseUrl}/callback?code=late`)).rejects.toThrow(/ECONNREFUSED/);
    });

    it('fails clearly when the callback port is already in use', async () => {
      const blocker = http.createServer();
      await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
      const { port } = blocker.address();

      try {
        const listener = listenForLoopbackCallback(getLoopbackCallback(`http://127.0.0.1:${port}/callback`));
        await expect(listener.ready).rejects.toThrow(`Could not listen for the OAuth2 callback on http://127.0.0.1:${port}`);
      } finally {
        blocker.close();
      }
    });
  });

  describe('promptForCallbackUrl', () => {
    const callbackUrl = 'https://oauth.usebruno.com/callback';

    const prompt = (answer, options = {}) => {
      const input = new PassThrough();
      const output = new PassThrough();
      const result = promptForCallbackUrl(callbackUrl, { input, output, ...options });
      if (answer !== undefined) {
        input.write(`${answer}\n`);
      }
      return { result, input };
    };

    it('returns the pasted callback URL', async () => {
      const { result } = prompt('  https://oauth.usebruno.com/callback?code=abc&state=xyz  ');

      await expect(result).resolves.toBe('https://oauth.usebruno.com/callback?code=abc&state=xyz');
    });

    it('rejects a bare code, since the state could not be validated', async () => {
      await expect(prompt('abc123').result).rejects.toThrow('Paste the full callback URL');
    });

    it('rejects when input ends without an answer', async () => {
      const { result, input } = prompt();
      input.end();

      await expect(result).rejects.toMatchObject({ code: AUTHORIZATION_ERROR_CODES.CANCELLED, message: expect.stringContaining('no callback URL was entered') });
    });

    it('times out', async () => {
      await expect(prompt(undefined, { timeoutMs: 50 }).result).rejects.toMatchObject({ code: AUTHORIZATION_ERROR_CODES.TIMED_OUT });
    });
  });

  describe('createCliAuthorizer', () => {
    it('fails without waiting when the session is not interactive', async () => {
      const { spawnProcess, calls } = fakeSpawn();
      const authorize = createCliAuthorizer({ stdin: { isTTY: false }, stderr: new PassThrough(), env: {}, spawnProcess });

      await expect(authorize('https://auth.example.com/authorize', { callbackUrl: 'http://localhost:8765/callback' })).rejects.toThrow(
        'OAuth2 authorization code flow needs an interactive terminal'
      );
      expect(calls).toHaveLength(0);
    });

    it('prints the URL, opens the browser and captures the loopback redirect', async () => {
      const port = await getFreePort();
      const callbackUrl = `http://localhost:${port}/callback`;
      const stderr = new PassThrough();
      let printed = '';
      stderr.on('data', (chunk) => { printed += chunk; });
      // The "browser" completes sign-in by following the IdP redirect to the callback
      const { spawnProcess } = fakeSpawn({ onLaunch: () => httpGet(`http://127.0.0.1:${port}/callback?code=c1&state=s1`) });

      const authorize = createCliAuthorizer({ stdin: interactiveStdin(), stderr, env: {}, platform: 'linux', spawnProcess });
      const callbackResponseUrl = await authorize('https://auth.example.com/authorize?client_id=app', { callbackUrl });

      expect(new URL(callbackResponseUrl).searchParams.get('code')).toBe('c1');
      expect(printed).toContain('https://auth.example.com/authorize?client_id=app');
    });

    it('falls back to the pasted URL when the browser cannot be launched', async () => {
      const stdin = interactiveStdin();
      const { spawnProcess } = fakeSpawn({ fail: true });
      const authorize = createCliAuthorizer({ stdin, stderr: new PassThrough(), env: {}, platform: 'linux', spawnProcess });

      const result = authorize('https://auth.example.com/authorize', { callbackUrl: 'https://oauth.usebruno.com/callback' });
      setImmediate(() => stdin.write('https://oauth.usebruno.com/callback?code=c2&state=s2\n'));

      await expect(result).resolves.toBe('https://oauth.usebruno.com/callback?code=c2&state=s2');
    });
  });
});
