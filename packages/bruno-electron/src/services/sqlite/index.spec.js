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

  const storeSecret = (secret = SECRET) => sqlite.getFiles().write(JSON.stringify({ headers: { authorization: secret } }));

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  it('keeps secure delete on while another clear is still running', async () => {
    const quick = await storeSecret('Bearer quick-clear-token');
    const slow = await storeSecret('Bearer slow-clear-token');

    await Promise.all([
      sqlite.withSecureDelete(() => sqlite.getFiles().remove(quick.id)),
      sqlite.withSecureDelete(async () => {
        await sleep(20);
        await sqlite.getFiles().remove(slow.id);
      })
    ]);

    expect(databaseBytes()).not.toContain('Bearer quick-clear-token');
    expect(databaseBytes()).not.toContain('Bearer slow-clear-token');
  });

  it('returns what the callback returns', async () => {
    expect(await sqlite.withSecureDelete(() => 42)).toBe(42);
  });

  it('runs the callback when the database is unavailable', async () => {
    sqlite.shutdown();

    expect(await sqlite.withSecureDelete(() => 'ran')).toBe('ran');
  });
});
