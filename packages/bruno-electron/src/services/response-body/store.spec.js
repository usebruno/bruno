const { Readable } = require('node:stream');
const { createResponseBodyStore } = require('./store');
const { createMemoryFileSystem } = require('./memory-fs');
const { STORAGE_FILE } = require('./constants');
const { BodyNotFoundError } = require('./errors');

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
      idGen: () => `body-${++idSeq}`
    });
  });

  const streamFrom = (data) => Readable.from([Buffer.from(data)]);

  test('dual-writes small bodies to memory and file', async () => {
    const result = await store.ingestStream(streamFrom('hello world'), {
      contentType: 'text/plain'
    });

    expect(result).toMatchObject({
      bodyRef: 'body-1',
      size: 11,
      storage: STORAGE_FILE
    });
    expect(fs.existsSync('/spill/body-1')).toBe(true);
    expect(store.getBufferForScripts(result.bodyRef)).toEqual(Buffer.from('hello world'));
    expect(await store.readRange(result.bodyRef, 0, 5)).toEqual(Buffer.from('hello'));
    expect(store.getFilePath(result.bodyRef)).toBe('/spill/body-1');
  });

  test('dual-writes large streams to memory and file', async () => {
    const payload = 'x'.repeat(150);
    const result = await store.ingestStream(streamFrom(payload));

    expect(result.storage).toBe(STORAGE_FILE);
    expect(result.size).toBe(150);
    expect(fs.existsSync('/spill/body-1')).toBe(true);
    expect(store.getBufferForScripts(result.bodyRef)).toEqual(Buffer.from(payload));
    expect(await store.readRange(result.bodyRef, 0, 10)).toEqual(Buffer.from('x'.repeat(10)));
    expect(await store.readRange(result.bodyRef, 140, 20)).toEqual(Buffer.from('x'.repeat(10)));
  });

  test('putBuffer always writes file and keeps buffer', async () => {
    const result = await store.putBuffer(Buffer.from('y'.repeat(120)));
    expect(result.storage).toBe(STORAGE_FILE);
    expect(fs.existsSync('/spill/body-1')).toBe(true);
    expect(store.getBufferForScripts(result.bodyRef)).toEqual(Buffer.from('y'.repeat(120)));
    expect(await store.readRange(result.bodyRef)).toEqual(Buffer.from('y'.repeat(120)));
  });

  test('saveToPath copies from file', async () => {
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

  test('scripts can read dual-written bodies of any size', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('z'.repeat(150)));
    expect(store.getBufferForScripts(bodyRef)).toEqual(Buffer.from('z'.repeat(150)));
  });

  test('missing bodyRef throws BodyNotFoundError', async () => {
    expect(() => store.getStat('missing')).toThrow(BodyNotFoundError);
  });

  test('readRange at EOF returns empty buffer', async () => {
    const { bodyRef } = await store.putBuffer(Buffer.from('abc'));
    expect(await store.readRange(bodyRef, 10, 5)).toEqual(Buffer.alloc(0));
  });

  test('ingestStream cleans up partial file on mid-stream error', async () => {
    let chunkCount = 0;
    const failing = new Readable({
      read() {
        chunkCount += 1;
        if (chunkCount === 1) {
          this.push(Buffer.from('x'.repeat(120)));
          return;
        }
        this.destroy(new Error('boom'));
      }
    });

    await expect(store.ingestStream(failing)).rejects.toThrow('boom');
    expect(fs.existsSync('/spill/body-1')).toBe(false);
    expect(() => store.getStat('body-1')).toThrow(BodyNotFoundError);
  });
});
