import type { Codec } from '../../src/node/codec';
import type { Migration, StatementDef } from '../../src/shared/types';

const migrations: Migration[] = [
  {
    sequence: 1,
    name: 'create-secrets',
    up: 'CREATE TABLE secrets (uid TEXT PRIMARY KEY, first TEXT, second TEXT)',
    down: 'DROP TABLE secrets'
  }
];

const statements: StatementDef[] = [
  {
    name: 'upsertSecret',
    type: 'exec',
    sql: `INSERT OR REPLACE INTO secrets (uid, first, second) VALUES (
      @uid,
      COALESCE(bruno_encrypt(@first), (SELECT first FROM secrets WHERE uid = @uid)),
      COALESCE(bruno_encrypt(@second), (SELECT second FROM secrets WHERE uid = @uid))
    )`,
    tables: ['secrets']
  },
  {
    name: 'getSecret',
    type: 'one',
    sql: 'SELECT bruno_decrypt(first) AS first, bruno_decrypt(second) AS second FROM secrets WHERE uid = @uid',
    tables: ['secrets']
  }
];

jest.doMock('../../src/generated/node/migrations', () => ({ migrations }));
jest.doMock('../../src/generated/node/statements', () => ({ statements }));

const { DB } = require('../../src/node/db');
const { createDatabase } = require('../../src/node/index');

const IN_MEMORY = ':memory:';

const codec: Codec = {
  encrypt: (value) => `$01:${Buffer.from(value).toString('hex')}`,
  decrypt: (value) => (value.startsWith('$01:') ? Buffer.from(value.slice(4), 'hex').toString() : '')
};

const first = '{"url":"https://usebruno.com"}';
const second = '{"status":200}';

describe('codec', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
  });

  const storedRow = (db: any) => db._db.prepare('SELECT first, second FROM secrets WHERE uid = ?').get('s1');

  it('round-trips a value written and read through a statement', () => {
    const { db, statements: prepared } = createDatabase(IN_MEMORY, { codec });

    prepared.execute('upsertSecret', { uid: 's1', first, second });

    expect(prepared.execute('getSecret', { uid: 's1' })).toEqual({ first, second });
    db.close();
  });

  it('stores ciphertext rather than the plaintext it was given', () => {
    const { db, statements: prepared } = createDatabase(IN_MEMORY, { codec });

    prepared.execute('upsertSecret', { uid: 's1', first, second });

    expect(storedRow(db)).toEqual({ first: codec.encrypt(first), second: codec.encrypt(second) });
    db.close();
  });

  it('leaves a null parameter null so a partial write keeps the sibling column', () => {
    const { db, statements: prepared } = createDatabase(IN_MEMORY, { codec });

    prepared.execute('upsertSecret', { uid: 's1', first, second: null });
    prepared.execute('upsertSecret', { uid: 's1', first: null, second });

    expect(prepared.execute('getSecret', { uid: 's1' })).toEqual({ first, second });
    db.close();
  });

  it('surfaces the codec fallback for a stored value it cannot decrypt', () => {
    const { db, statements: prepared } = createDatabase(IN_MEMORY, { codec });
    db._db.prepare('INSERT INTO secrets (uid, first, second) VALUES (?, ?, ?)').run('s1', first, second);

    expect(prepared.execute('getSecret', { uid: 's1' })).toEqual({ first: '', second: '' });
    db.close();
  });

  it('is registered before the migrations run', () => {
    const seeding: Migration[] = [
      {
        sequence: 1,
        name: 'seed-encrypted',
        up: `CREATE TABLE seeded (secret TEXT); INSERT INTO seeded (secret) VALUES (bruno_encrypt('seed'));`,
        down: 'DROP TABLE seeded'
      }
    ];
    const db = new DB(IN_MEMORY, seeding, { codec });

    expect(db._db.prepare('SELECT secret FROM seeded').get()).toEqual({ secret: codec.encrypt('seed') });
    db.close();
  });

  it('warns and stores plaintext when no codec is provided', () => {
    const { db, statements: prepared } = createDatabase(IN_MEMORY);

    prepared.execute('upsertSecret', { uid: 's1', first, second });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no codec was provided'));
    expect(storedRow(db)).toEqual({ first, second });
    db.close();
  });

  it('aborts the write and stores nothing when the codec throws', () => {
    const failing: Codec = {
      encrypt: () => {
        throw new Error('keychain unavailable');
      },
      decrypt: (value) => value
    };
    const { db, statements: prepared } = createDatabase(IN_MEMORY, { codec: failing });

    expect(() => prepared.execute('upsertSecret', { uid: 's1', first, second })).toThrow('keychain unavailable');

    expect(db._db.prepare('SELECT count(*) AS rows FROM secrets').get()).toEqual({ rows: 0 });
    db.close();
  });
});
