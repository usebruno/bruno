describe('bruno-response protocol URL parsing', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('electron', () => ({
      protocol: {
        registerSchemesAsPrivileged: jest.fn(),
        handle: jest.fn()
      },
      net: { fetch: jest.fn() }
    }), { virtual: true });
  });

  afterEach(() => {
    jest.dontMock('electron');
  });

  test('parseBodyRefFromUrl extracts bodyRef', () => {
    const { SCHEME, parseBodyRefFromUrl } = require('./protocol');
    expect(parseBodyRefFromUrl(`${SCHEME}://body/abc-123`)).toBe('abc-123');
    expect(parseBodyRefFromUrl('https://example.com')).toBeNull();
    expect(parseBodyRefFromUrl(`${SCHEME}://other/abc`)).toBeNull();
    expect(parseBodyRefFromUrl(`${SCHEME}://body/`)).toBeNull();
  });
});

describe('response-body IPC adapter', () => {
  let store;
  let handlers;
  let chooseFileToSave;

  beforeEach(() => {
    jest.resetModules();
    handlers = {};
    chooseFileToSave = jest.fn(async () => '/out/saved.bin');

    jest.doMock('electron', () => ({
      ipcMain: {
        handle: (channel, fn) => {
          handlers[channel] = fn;
        }
      }
    }), { virtual: true });

    jest.doMock('content-disposition', () => ({
      parse: () => ({ parameters: {} })
    }), { virtual: true });

    jest.doMock('mime-types', () => ({
      extension: () => 'txt'
    }), { virtual: true });

    jest.doMock('../../utils/filesystem', () => ({
      chooseFileToSave: (...args) => chooseFileToSave(...args)
    }));

    const { createResponseBodyStore } = require('./store');
    const { createMemoryFileSystem } = require('./memory-fs');
    const { registerResponseBodyIpc } = require('./ipc');

    store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: (() => {
        let n = 0;
        return () => `b-${++n}`;
      })(),
      spillThreshold: 100
    });
    registerResponseBodyIpc({}, store);
  });

  afterEach(() => {
    jest.dontMock('electron');
    jest.dontMock('content-disposition');
    jest.dontMock('mime-types');
    jest.dontMock('../../utils/filesystem');
  });

  test('pin / release / save round-trip', async () => {
    const { CHANNELS } = require('./ipc');
    const { bodyRef } = await store.putBuffer(Buffer.from('hello'));

    const pinId = await handlers[CHANNELS.PIN]({}, bodyRef);
    expect(typeof pinId).toBe('string');

    const saveResult = await handlers[CHANNELS.SAVE]({}, {
      bodyRef,
      url: 'https://example.com/a.txt',
      headers: { 'content-type': 'text/plain' }
    });
    expect(saveResult).toEqual({ success: true, filePath: '/out/saved.bin' });
    expect(chooseFileToSave).toHaveBeenCalled();

    await expect(handlers[CHANNELS.RELEASE]({}, pinId)).resolves.toEqual({ success: true });
  });

  test('save cancelled returns cancelled flag', async () => {
    const { CHANNELS } = require('./ipc');
    chooseFileToSave.mockResolvedValueOnce(null);
    const { bodyRef } = await store.putBuffer(Buffer.from('x'));
    const result = await handlers[CHANNELS.SAVE]({}, { bodyRef });
    expect(result).toEqual({ success: false, cancelled: true });
  });
});

describe('bruno-response protocol handler', () => {
  let store;
  let protocolHandler;

  beforeEach(async () => {
    jest.resetModules();
    protocolHandler = null;

    jest.doMock('electron', () => ({
      protocol: {
        registerSchemesAsPrivileged: jest.fn(),
        handle: (_scheme, fn) => {
          protocolHandler = fn;
        }
      },
      net: {
        fetch: jest.fn(async () => {
          throw new Error('net.fetch unavailable in unit test');
        })
      }
    }), { virtual: true });

    const { createResponseBodyStore } = require('./store');
    const { createMemoryFileSystem } = require('./memory-fs');
    const { registerBrunoResponseProtocol } = require('./protocol');

    store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: (() => {
        let n = 0;
        return () => `p-${++n}`;
      })(),
      spillThreshold: 100
    });
    registerBrunoResponseProtocol(store);
  });

  afterEach(() => {
    jest.dontMock('electron');
  });

  const request = (url, headers = {}) => ({
    url,
    headers: {
      get: (name) => headers[name] || headers[name.toLowerCase()] || null
    }
  });

  test('returns 404 for missing bodyRef and unknown url', async () => {
    const missing = await protocolHandler(request('bruno-response://body/nope'));
    expect(missing.status).toBe(404);

    const badUrl = await protocolHandler(request('bruno-response://other/x'));
    expect(badUrl.status).toBe(404);
  });

  test('valid Range returns 206 Partial Content', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('abcdefghij'), {
      contentType: 'text/plain'
    });
    const res = await protocolHandler(
      request(`bruno-response://body/${bodyRef}`, { Range: 'bytes=2-5' })
    );
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect(res.headers.get('Content-Length')).toBe('4');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('cdef');
  });

  test('unsatisfiable Range returns 416', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('abcdefghij'));
    const res = await protocolHandler(
      request(`bruno-response://body/${bodyRef}`, { Range: 'bytes=20-30' })
    );
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe('bytes */10');
  });

  test('full body without Range returns 200', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('hello'), {
      contentType: 'image/png'
    });
    const res = await protocolHandler(request(`bruno-response://body/${bodyRef}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('hello');
  });
});
