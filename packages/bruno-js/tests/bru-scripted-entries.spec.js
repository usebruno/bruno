// Mocked so we can drive onComplete directly without hitting the network.
jest.mock('@usebruno/requests', () => {
  const realCookies = jest.requireActual('@usebruno/requests').cookies;
  return {
    cookies: realCookies,
    scripting: {
      createSendRequest: jest.fn((_config, options) => {
        return async (requestConfig) => {
          const normalized = typeof requestConfig === 'string' ? { url: requestConfig } : requestConfig;
          options?.onComplete?.({
            request: {
              method: (normalized.method || 'GET').toUpperCase(),
              url: normalized.url,
              headers: normalized.headers || {},
              data: normalized.data
            },
            response: {
              statusCode: 200,
              statusText: 'OK',
              headers: { 'content-type': 'text/plain' },
              data: 'ok',
              dataBuffer: Buffer.from('ok').toString('base64'),
              size: 2,
              duration: 4
            },
            error: null,
            startedAt: 1,
            completedAt: 5
          });
          return { status: 200, data: 'ok' };
        };
      })
    }
  };
});

const Bru = require('../src/bru');

const makeBru = () =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/coll',
    collectionName: 'Test',
    certsAndProxyConfig: { collectionPath: '/coll' }
  });

describe('Bru — scripted request capture', () => {
  test('starts with an empty scriptedRequestEntries array', () => {
    const bru = makeBru();
    expect(bru.scriptedRequestEntries).toEqual([]);
  });

  test('records a sendRequest call with source = "sendRequest"', async () => {
    const bru = makeBru();
    await bru.sendRequest({ method: 'get', url: 'https://example.com/ping' });

    expect(bru.scriptedRequestEntries).toHaveLength(1);
    expect(bru.scriptedRequestEntries[0]).toEqual(
      expect.objectContaining({
        source: 'sendRequest',
        request: expect.objectContaining({ method: 'GET', url: 'https://example.com/ping' }),
        response: expect.objectContaining({ statusCode: 200, statusText: 'OK' })
      })
    );
  });

  test('records null scope when no _currentScope is set', async () => {
    const bru = makeBru();
    await bru.sendRequest('https://example.com');
    expect(bru.scriptedRequestEntries[0].scope).toBeNull();
  });

  test('stamps the current scope onto each entry (snapshot, not reference)', async () => {
    const bru = makeBru();

    bru._currentScope = { type: 'collection', sourceFile: 'collection.bru' };
    await bru.sendRequest('https://example.com/a');

    // Flip scope — the earlier entry must keep its original snapshot.
    bru._currentScope = { type: 'request', sourceFile: 'auth/login.bru' };
    await bru.sendRequest('https://example.com/b');

    expect(bru.scriptedRequestEntries).toHaveLength(2);
    expect(bru.scriptedRequestEntries[0].scope).toEqual({ type: 'collection', sourceFile: 'collection.bru' });
    expect(bru.scriptedRequestEntries[1].scope).toEqual({ type: 'request', sourceFile: 'auth/login.bru' });
  });

  test('_recordScriptedRequest accepts entries from other sources (e.g. runRequest)', () => {
    const bru = makeBru();
    bru._currentScope = { type: 'folder', sourceFile: 'auth/folder.bru' };
    bru._recordScriptedRequest({
      source: 'runRequest',
      request: { method: 'GET', url: 'https://example.com/user' },
      response: { statusCode: 200, statusText: 'OK', headers: {}, data: 'x', dataBuffer: '', size: 0, duration: 1 },
      error: null,
      startedAt: 10,
      completedAt: 11
    });

    expect(bru.scriptedRequestEntries).toHaveLength(1);
    expect(bru.scriptedRequestEntries[0]).toEqual(
      expect.objectContaining({
        source: 'runRequest',
        scope: { type: 'folder', sourceFile: 'auth/folder.bru' }
      })
    );
  });
});
