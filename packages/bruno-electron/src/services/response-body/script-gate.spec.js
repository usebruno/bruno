const { createResponseBodyStore } = require('./store');
const { createMemoryFileSystem } = require('./memory-fs');

/**
 * Dual-writer keeps an in-memory buffer for every body, so scripts can always read it.
 */
describe('script access (dual-writer)', () => {
  test('large dual-written body remains script-accessible', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: () => 'big-1'
    });
    const { bodyRef, size } = await store.putBuffer(Buffer.alloc(50, 0x61));
    expect(size).toBe(50);
    expect(() => store.assertScriptAccessible(bodyRef)).not.toThrow();
    expect(store.getBufferForScripts(bodyRef).length).toBe(50);
  });

  test('small dual-written body remains script-accessible', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      idGen: () => 'small-1'
    });
    const { bodyRef } = await store.putBuffer(Buffer.from('ok'));
    expect(() => store.assertScriptAccessible(bodyRef)).not.toThrow();
    expect(store.getBufferForScripts(bodyRef).toString()).toBe('ok');
  });
});
