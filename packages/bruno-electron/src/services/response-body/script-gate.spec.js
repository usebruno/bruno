const { createResponseBodyStore } = require('./store');
const { createMemoryFileSystem } = require('./memory-fs');
const { VIEW_MAX_BYTES } = require('./constants');
const { populateResponseDataForScripts } = require('./script-access');

const parsePassthrough = (response) => ({
  data: response.data?.toString?.('utf8') ?? response.data,
  dataBuffer: Buffer.isBuffer(response.data) ? response.data.toString('base64') : ''
});

describe('script access (dual-writer)', () => {
  test('bodies within VIEW_MAX remain script-accessible', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: () => 'ok-1'
    });
    const { bodyRef, size } = await store.putBuffer(Buffer.from('ok'));
    const response = { bodyRef, size };
    populateResponseDataForScripts(store, response, parsePassthrough);
    expect(response.data).toBe('ok');
    expect(response.scriptBodyError).toBeUndefined();
  });

  test('bodies larger than VIEW_MAX set scriptBodyError and discard RAM', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: () => 'big-1'
    });
    const { bodyRef, size } = await store.putBuffer(Buffer.alloc(VIEW_MAX_BYTES + 1, 0x61));
    const response = { bodyRef, size };
    populateResponseDataForScripts(store, response, parsePassthrough);

    expect(response.data).toBeUndefined();
    expect(response.dataBuffer).toBeUndefined();
    expect(response.scriptBodyError).toMatch(/too large to use in scripts/);
    expect(response.scriptBodyError).toMatch(String(VIEW_MAX_BYTES));
    expect(() => store.getBufferForScripts(bodyRef)).toThrow(/discarded/);
    // Spill file still readable for Download / View IPC paths that use readRange
    expect((await store.readRange(bodyRef)).length).toBe(VIEW_MAX_BYTES + 1);
  });
});
