const { BodyTooLargeForScriptsError } = require('./errors');
const { createResponseBodyStore } = require('./store');
const { createMemoryFileSystem } = require('./memory-fs');

/**
 * Mirrors network fail-closed gate: file-backed bodies must not enter script getBody().
 */
describe('script fail-closed gate (6B)', () => {
  test('file-backed body raises a clear BodyTooLargeForScriptsError', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      spillThreshold: 10,
      idGen: () => 'big-1'
    });
    const { bodyRef, size } = await store.putBuffer(Buffer.alloc(50, 0x61));
    expect(() => store.assertScriptAccessible(bodyRef)).toThrow(BodyTooLargeForScriptsError);

    try {
      store.assertScriptAccessible(bodyRef);
    } catch (err) {
      expect(err.message).toMatch(/file-backed/i);
      expect(err.message).toMatch(/Download the response instead/);
      expect(err.bodyRef).toBe(bodyRef);
      expect(err.size).toBe(size);
      expect(err.code).toBe('BODY_TOO_LARGE_FOR_SCRIPTS');
    }
  });

  test('memory-backed body remains script-accessible', async () => {
    const store = createResponseBodyStore({
      fs: createMemoryFileSystem(),
      spillDir: '/spill',
      spillThreshold: 1000,
      idGen: () => 'small-1'
    });
    const { bodyRef } = await store.putBuffer(Buffer.from('ok'));
    expect(() => store.assertScriptAccessible(bodyRef)).not.toThrow();
    expect(store.getBufferForScripts(bodyRef).toString()).toBe('ok');
  });
});
