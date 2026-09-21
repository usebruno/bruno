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
      })()
    });
    registerResponseBodyIpc({}, store);
  });

  afterEach(() => {
    jest.dontMock('electron');
    jest.dontMock('content-disposition');
    jest.dontMock('mime-types');
    jest.dontMock('../../utils/filesystem');
  });

  test('save / read round-trip (utf8, base64, bytes)', async () => {
    const { CHANNELS } = require('./ipc');
    const { bodyRef } = await store.putBuffer(Buffer.from('hello'));

    const readResult = await handlers[CHANNELS.READ]({}, bodyRef);
    expect(readResult).toEqual({ data: 'hello', size: 5, contentType: null });

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const { bodyRef: pngRef } = await store.putBuffer(png);
    const base64Result = await handlers[CHANNELS.READ]({}, pngRef, { encoding: 'base64' });
    expect(base64Result).toEqual({
      dataBuffer: png.toString('base64'),
      size: png.length,
      contentType: null
    });
    expect(base64Result.data).toBeUndefined();

    const bytesResult = await handlers[CHANNELS.READ]({}, pngRef, { encoding: 'bytes' });
    expect(bytesResult.size).toBe(png.length);
    expect(Buffer.from(bytesResult.bytes)).toEqual(png);

    const saveResult = await handlers[CHANNELS.SAVE]({}, {
      bodyRef,
      url: 'https://example.com/a.txt',
      headers: { 'content-type': 'text/plain' }
    });
    expect(saveResult).toEqual({ success: true, filePath: '/out/saved.bin' });
    expect(chooseFileToSave).toHaveBeenCalled();
  });

  test('read works after discardBuffer (file-backed)', async () => {
    const { CHANNELS } = require('./ipc');
    const { bodyRef } = await store.putBuffer(Buffer.from('from-disk'));
    store.discardBuffer(bodyRef);
    expect(() => store.getBufferForScripts(bodyRef)).toThrow(/discarded/);

    const readResult = await handlers[CHANNELS.READ]({}, bodyRef);
    expect(readResult).toEqual({ data: 'from-disk', size: 8, contentType: null });
  });

  test('read rejects bodies larger than VIEW_MAX_BYTES', async () => {
    const { CHANNELS } = require('./ipc');
    const { VIEW_MAX_BYTES } = require('./constants');
    const { BodyTooLargeForViewError } = require('./errors');
    const { bodyRef } = await store.putBuffer(Buffer.alloc(VIEW_MAX_BYTES + 1, 0x61));
    await expect(handlers[CHANNELS.READ]({}, bodyRef)).rejects.toBeInstanceOf(BodyTooLargeForViewError);
  });

  test('save cancelled returns cancelled flag', async () => {
    const { CHANNELS } = require('./ipc');
    chooseFileToSave.mockResolvedValueOnce(null);
    const { bodyRef } = await store.putBuffer(Buffer.from('x'));
    const result = await handlers[CHANNELS.SAVE]({}, { bodyRef });
    expect(result).toEqual({ success: false, cancelled: true });
  });
});
