const { Readable } = require('node:stream');
const { createResponseBodyStore } = require('./store');
const { createMemoryFileSystem } = require('./memory-fs');
const { STORAGE_MEMORY, STORAGE_FILE } = require('./constants');
const { BodyNotFoundError, BodyTooLargeForScriptsError } = require('./errors');

describe('ResponseBodyStore', () => {
  let idSeq;
  let store;
  let fs;

  beforeEach(() => {
    idSeq = 0;
    fs = createMemoryFileSystem();
    store = createResponseBodyStore({
      fs,
      spillDir: '/spill',
      idGen: () => `body-${++idSeq}`,
      spillThreshold: 100
    });
  });

  const streamFrom = (data) => Readable.from([Buffer.from(data)]);

  test('keeps bodies under threshold in memory', async () => {
    const result = await store.ingestStream(streamFrom('hello world'), {
      contentType: 'text/plain'
    });

    expect(result).toMatchObject({
      bodyRef: 'body-1',
      size: 11,
      storage: STORAGE_MEMORY
    });
    expect(await store.readRange(result.bodyRef, 0, 5)).toEqual(Buffer.from('hello'));
    expect(store.getStat(result.bodyRef).storage).toBe(STORAGE_MEMORY);
  });

  test('spills to file when stream exceeds threshold', async () => {
    const payload = 'x'.repeat(150);
    const result = await store.ingestStream(streamFrom(payload));

    expect(result.storage).toBe(STORAGE_FILE);
    expect(result.size).toBe(150);
    expect(fs.existsSync('/spill/body-1')).toBe(true);
    expect(await store.readRange(result.bodyRef, 0, 10)).toEqual(Buffer.from('x'.repeat(10)));
    expect(await store.readRange(result.bodyRef, 140, 20)).toEqual(Buffer.from('x'.repeat(10)));
  });

  test('putBuffer spills when over threshold', async () => {
    const result = await store.putBuffer(Buffer.from('y'.repeat(120)));
    expect(result.storage).toBe(STORAGE_FILE);
    expect(await store.readRange(result.bodyRef)).toEqual(Buffer.from('y'.repeat(120)));
  });

  test('saveToPath copies memory and file bodies', async () => {
    const mem = await store.putBuffer(Buffer.from('abc'));
    await store.saveToPath(mem.bodyRef, '/out/mem.txt');
    expect(await fs.readFile('/out/mem.txt')).toEqual(Buffer.from('abc'));

    const file = await store.putBuffer(Buffer.from('z'.repeat(150)));
    await store.saveToPath(file.bodyRef, '/out/file.txt');
    expect(await fs.readFile('/out/file.txt')).toEqual(Buffer.from('z'.repeat(150)));
  });

  test('pin keeps entry until all pins released', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('pinned'));
    const pinId = store.pin(bodyRef);

    await store.release(bodyRef); // still pinned
    expect(store.getStat(bodyRef).size).toBe(6);

    await store.release(pinId);
    expect(() => store.getStat(bodyRef)).toThrow(BodyNotFoundError);
  });

  test('assertScriptAccessible fails for file-backed bodies', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('z'.repeat(150)));
    expect(() => store.assertScriptAccessible(bodyRef)).toThrow(BodyTooLargeForScriptsError);
    expect(() => store.getBufferForScripts(bodyRef)).toThrow(BodyTooLargeForScriptsError);
  });

  test('assertScriptAccessible allows memory bodies', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('ok'));
    expect(() => store.assertScriptAccessible(bodyRef)).not.toThrow();
    expect(store.getBufferForScripts(bodyRef)).toEqual(Buffer.from('ok'));
  });

  test('missing bodyRef throws BodyNotFoundError', async () => {
    expect(() => store.getStat('missing')).toThrow(BodyNotFoundError);
  });

  test('readRange at EOF returns empty buffer', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('abc'));
    expect(await store.readRange(bodyRef, 10, 5)).toEqual(Buffer.alloc(0));
  });
});
