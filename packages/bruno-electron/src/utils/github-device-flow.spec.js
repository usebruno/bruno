const { requestDeviceCode, pollForToken } = require('./github-device-flow');

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const queueResponses = (bodies) => {
  const calls = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    const next = bodies.shift();
    if (!next) throw new Error(`Unexpected fetch: ${url}`);
    return jsonResponse(next.body, next.status);
  });
  return calls;
};

describe('utils/github-device-flow', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  describe('requestDeviceCode', () => {
    it('posts the client id and scope and maps the response', async () => {
      const calls = queueResponses([{
        body: {
          device_code: 'dev-123',
          user_code: 'WDJB-MJHT',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5
        }
      }]);

      const result = await requestDeviceCode({ clientId: 'client-1', scope: 'read:user' });

      expect(result).toEqual({
        deviceCode: 'dev-123',
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5
      });
      expect(calls[0].url).toBe('https://github.com/login/device/code');
      expect(calls[0].init.method).toBe('POST');
      expect(calls[0].init.headers.Accept).toBe('application/json');
      expect(Object.fromEntries(new URLSearchParams(calls[0].init.body))).toEqual({
        client_id: 'client-1',
        scope: 'read:user'
      });
    });

    it('surfaces GitHub errors such as device flow being disabled', async () => {
      queueResponses([{
        body: { error: 'device_flow_disabled', error_description: 'Device Flow must be explicitly enabled for this App' }
      }]);

      await expect(requestDeviceCode({ clientId: 'client-1', scope: 'read:user' }))
        .rejects.toMatchObject({
          code: 'device_flow_disabled',
          message: 'GitHub sign-in could not start: Device Flow must be explicitly enabled for this App'
        });
    });

    it('reports the HTTP status when the body is unreadable', async () => {
      global.fetch = jest.fn(async () => new Response('oops', { status: 502 }));

      await expect(requestDeviceCode({ clientId: 'client-1', scope: 'read:user' }))
        .rejects.toThrow('GitHub sign-in could not start (HTTP 502)');
    });
  });

  describe('pollForToken', () => {
    const poll = (overrides = {}) => pollForToken({
      clientId: 'client-1',
      deviceCode: 'dev-123',
      interval: 0,
      expiresIn: 60,
      ...overrides
    });

    it('keeps polling while authorization is pending and returns the token', async () => {
      const calls = queueResponses([
        { body: { error: 'authorization_pending' } },
        { body: { error: 'authorization_pending' } },
        { body: { access_token: 'gho_token', token_type: 'bearer', scope: 'read:user' } }
      ]);

      await expect(poll()).resolves.toEqual({ accessToken: 'gho_token' });
      expect(calls).toHaveLength(3);
      expect(calls[0].url).toBe('https://github.com/login/oauth/access_token');
      expect(Object.fromEntries(new URLSearchParams(calls[0].init.body))).toEqual({
        client_id: 'client-1',
        device_code: 'dev-123',
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      });
    });

    it('waits longer after slow_down', async () => {
      jest.useFakeTimers();
      const calls = queueResponses([
        { body: { error: 'slow_down', interval: 10 } },
        { body: { access_token: 'gho_token' } }
      ]);

      const result = poll({ interval: 5 });

      await jest.advanceTimersByTimeAsync(5000);
      expect(calls).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(9000);
      expect(calls).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(1000);
      await expect(result).resolves.toEqual({ accessToken: 'gho_token' });
      expect(calls).toHaveLength(2);
    });

    it('explains an expired code', async () => {
      queueResponses([{ body: { error: 'expired_token' } }]);
      await expect(poll()).rejects.toMatchObject({
        code: 'expired_token',
        message: 'The sign-in code expired. Start the sign-in again.'
      });
    });

    it('explains a cancelled authorization', async () => {
      queueResponses([{ body: { error: 'access_denied' } }]);
      await expect(poll()).rejects.toMatchObject({
        code: 'access_denied',
        message: 'Sign-in was cancelled on GitHub.'
      });
    });

    it('passes through unknown errors', async () => {
      queueResponses([{ body: { error: 'unsupported_grant_type', error_description: 'Bad grant' } }]);
      await expect(poll()).rejects.toThrow('Bad grant');
    });

    it('stops when the code lifetime runs out', async () => {
      queueResponses([]);
      await expect(poll({ expiresIn: 0 })).rejects.toMatchObject({ code: 'expired_token' });
    });

    it('stops polling when aborted', async () => {
      jest.useFakeTimers();
      const calls = queueResponses([{ body: { error: 'authorization_pending' } }]);
      const controller = new AbortController();

      const result = poll({ interval: 5, signal: controller.signal });
      controller.abort();

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
      expect(calls).toHaveLength(0);
    });
  });
});
