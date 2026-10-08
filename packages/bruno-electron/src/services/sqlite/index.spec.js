const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let mockUserData;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => mockUserData) }
}));

const SECRET = 'Bearer super-secret-runner-token';

describe('sqlite service', () => {
  let sqlite;
  let warn;

  beforeEach(() => {
    jest.resetModules();
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sqlite-service-'));
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    sqlite = require('./index');
    sqlite.openDatabase();
  });

  afterEach(() => {
    sqlite.shutdown();
    warn.mockRestore();
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const databaseBytes = () =>
    ['bruno.db', 'bruno.db-wal']
      .map((name) => path.join(mockUserData, name))
      .filter((file) => fs.existsSync(file))
      .map((file) => fs.readFileSync(file).toString('latin1'))
      .join('');

  const storeSecret = () => sqlite.getFiles().write(JSON.stringify({ headers: { authorization: SECRET } }));

  it('leaves deleted bytes on disk without secure delete', async () => {
    const { id } = await storeSecret();

    await sqlite.getFiles().remove(id);

    expect(databaseBytes()).toContain(SECRET);
  });

  it('scrubs deleted bytes from the database and its wal', async () => {
    const { id } = await storeSecret();

    await sqlite.withSecureDelete(() => sqlite.getFiles().remove(id));

    expect(databaseBytes()).not.toContain(SECRET);
    expect(fs.statSync(path.join(mockUserData, 'bruno.db-wal')).size).toBe(0);
  });

  it('keeps secure delete on until the outermost scrub finishes', async () => {
    const first = await storeSecret();
    const second = await storeSecret();

    await sqlite.withSecureDelete(async () => {
      await sqlite.withSecureDelete(() => sqlite.getFiles().remove(first.id));
      await sqlite.getFiles().remove(second.id);
    });

    expect(databaseBytes()).not.toContain(SECRET);
  });

  it('returns what the callback returns', async () => {
    expect(await sqlite.withSecureDelete(() => 42)).toBe(42);
  });

  it('runs the callback when the database is unavailable', async () => {
    sqlite.shutdown();

    expect(await sqlite.withSecureDelete(() => 'ran')).toBe('ran');
  });
});
