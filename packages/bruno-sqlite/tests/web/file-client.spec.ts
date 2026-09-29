import type { FileRequest } from '../../src/shared/files';
import { createFileClient } from '../../src/web/files';
import { createTestDatabase, type TestDatabase } from '../utils';
import { registerFileIpc } from '../../src/node/index';

const TRANSFER = 16;

describe('createFileClient over the ipc bridge', () => {
  let database: TestDatabase;
  let files: any;
  let client: ReturnType<typeof createFileClient>;

  beforeEach(() => {
    database = createTestDatabase({ inlineMaxBytes: 32 });
    files = database.files;

    const dispatch = registerFileIpc({ handle: () => undefined }, files, { maxTransferBytes: TRANSFER });
    client = createFileClient({ invoke: (_channel: string, request: FileRequest) => dispatch(request) });
  });

  afterEach(() => database.cleanup());

  it('reads a payload that fits in one transfer', async () => {
    const { id } = await files.write('hello');

    expect(await client.readText(id)).toBe('hello');
    expect(Buffer.from((await client.read(id))!).toString()).toBe('hello');
  });

  it('walks a payload longer than one transfer', async () => {
    const payload = 'x'.repeat(TRANSFER * 5 + 3);
    const { id } = await files.write(payload);

    expect((await client.read(id))!.byteLength).toBe(payload.length);
    expect(await client.readText(id)).toBe(payload);
  });

  it('walks a spilled payload the same way', async () => {
    const payload = 'y'.repeat(200);
    const { id } = await files.write(payload);

    expect(files.stat(id)!.inline).toBe(false);
    expect(await client.readText(id)).toBe(payload);
  });

  it('reads an explicit range', async () => {
    const { id } = await files.write('hello world');

    expect(Buffer.from((await client.read(id, { offset: 6, length: 5 }))!).toString()).toBe('world');
  });

  it('stats a file', async () => {
    const { id } = await files.write('hello', { contentType: 'text/plain' });

    expect(await client.stat(id)).toMatchObject({ size: 5, contentType: 'text/plain', inline: true });
  });

  it('returns null for an unknown id', async () => {
    expect(await client.stat(404)).toBeNull();
    expect(await client.read(404)).toBeNull();
    expect(await client.readText(404)).toBeNull();
  });

  describe('the main side owns the transfer size', () => {
    const clientFor = (dispatch: (request: FileRequest) => Promise<unknown>) =>
      createFileClient({ invoke: (_channel: string, request: FileRequest) => dispatch(request) });

    it('chunks by whatever cap the main side was configured with', async () => {
      const payload = 'z'.repeat(250);
      const { id } = await files.write(payload);
      const asked: number[] = [];
      const dispatch = registerFileIpc({ handle: () => undefined }, files, { maxTransferBytes: 8 });
      const capped = clientFor((request) => {
        if (request.name === 'read') asked.push(request.params.range!.length!);
        return dispatch(request);
      });

      expect(Buffer.from((await capped.read(id))!).toString()).toBe(payload);
      expect(await capped.readText(id)).toBe(payload);
      // the client asks for the whole remainder every time and never names a chunk size
      expect(asked[0]).toBe(250);
      expect(asked[1]).toBe(242);
    });

    it('still assembles the whole payload when a chunk comes back short', async () => {
      const payload = 'abcdefghij'.repeat(12);
      const { id } = await files.write(payload);
      const dispatch = registerFileIpc({ handle: () => undefined }, files, { maxTransferBytes: TRANSFER });
      const short = clientFor(async (request) => {
        const result = await dispatch(request);
        if (request.name !== 'read' || !(result instanceof Uint8Array)) return result;
        return result.subarray(0, Math.max(1, Math.floor(result.byteLength / 2)));
      });

      expect(Buffer.from((await short.read(id))!).toString()).toBe(payload);
      expect(await short.readText(id)).toBe(payload);
    });
  });
});
