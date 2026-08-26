const { SCHEME, parseBodyRefFromUrl } = require('./protocol-url');

describe('bruno-response protocol URL parsing', () => {
  test('parseBodyRefFromUrl extracts bodyRef', () => {
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

    jest.doMock('../../../utils/filesystem', () => ({
      chooseFileToSave: (...args) => chooseFileToSave(...args)
    }));

    const { createResponseBodyStore } = require('../core/store');
    const { createMemoryFileSystem } = require('../core/memory-fs');
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
    jest.dontMock('../../../utils/filesystem');
  });

  test('stat / read / pin / release / save round-trip', async () => {
    const { CHANNELS } = require('./ipc');
    const { bodyRef } = await store.putBuffer(Buffer.from('hello'));

    expect(await handlers[CHANNELS.STAT]({}, bodyRef)).toMatchObject({ size: 5, storage: 'memory' });
    const b64 = await handlers[CHANNELS.READ]({}, bodyRef, 0, 5);
    expect(Buffer.from(b64, 'base64').toString()).toBe('hello');

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
