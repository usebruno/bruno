import { SQLITE_FILE_CHANNEL, type FileRequest } from '../../src/shared/files';
import { registerFileIpc } from '../../src/node/index';
import { createTestDatabase, type TestDatabase } from '../utils';

describe('registerFileIpc', () => {
  let database: TestDatabase;
  let files: any;
  let handlers: Map<string, (event: unknown, request: FileRequest) => unknown>;
  let dispatch: (request: FileRequest) => Promise<unknown>;

  beforeEach(() => {
    database = createTestDatabase();
    files = database.files;
    handlers = new Map();
    dispatch = registerFileIpc(
      { handle: (channel: string, listener: any) => handlers.set(channel, listener) },
      files,
      { maxTransferBytes: 8 }
    );
  });

  afterEach(() => database.cleanup());

  it('registers a handler on the file channel', () => {
    expect(handlers.has(SQLITE_FILE_CHANNEL)).toBe(true);
  });

  it('serves stat through the registered handler', async () => {
    const { id } = await files.write('hello world', { contentType: 'text/plain' });

    const listener = handlers.get(SQLITE_FILE_CHANNEL)!;

    expect(await listener(null, { name: 'stat', params: { id } })).toMatchObject({ size: 11, contentType: 'text/plain' });
  });

  it('clamps a read to the transfer limit', async () => {
    const { id } = await files.write('hello world');

    const bytes = (await dispatch({ name: 'read', params: { id } })) as Uint8Array;

    expect(bytes.byteLength).toBe(8);
    expect(bytes.constructor).toBe(Uint8Array);
  });

  it('honours an explicit range under the limit', async () => {
    const { id } = await files.write('hello world');

    const bytes = (await dispatch({ name: 'read', params: { id, range: { offset: 6, length: 5 } } })) as Uint8Array;

    expect(Buffer.from(bytes).toString()).toBe('world');
  });

  it('returns null for an unknown id', async () => {
    expect(await dispatch({ name: 'stat', params: { id: 404 } })).toBeNull();
    expect(await dispatch({ name: 'read', params: { id: 404 } })).toBeNull();
  });

  it('rejects an unknown operation', async () => {
    await expect(dispatch({ name: 'nope', params: { id: 1 } } as unknown as FileRequest)).rejects.toThrow(/unknown file operation/);
  });
});
