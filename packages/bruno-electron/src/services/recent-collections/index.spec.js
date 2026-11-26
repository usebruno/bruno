const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let mockUserData;

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => mockUserData) }
}));

jest.mock('../sqlite', () => ({ getStatements: jest.fn(), transaction: jest.fn() }));

const { createDatabase } = require('@usebruno/sqlite');
const { getStatements, transaction } = require('../sqlite');
const recentCollections = require('./index');

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;
const projectsFolder = path.resolve('/projects');
const orders = path.join(projectsFolder, 'orders');
const users = path.join(projectsFolder, 'users');
const payments = path.join(projectsFolder, 'payments');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const onPlatform = (platform) => Object.defineProperty(process, 'platform', { value: platform });

describe('recent collections service', () => {
  let opened;

  const useDatabase = (database) => {
    getStatements.mockReturnValue(database.statements);
    transaction.mockImplementation((callback) => database.db._transaction(callback));
  };

  const storedRowCount = () => opened.db._db.prepare('SELECT COUNT(*) AS count FROM recent_collections').get().count;

  const pathsOf = (rows) => rows.map((row) => row.path);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-recents-'));
    opened = createDatabase(':memory:');
    useDatabase(opened);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process, 'platform', originalPlatform);
    opened.db.close();
    fs.rmSync(mockUserData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('lists nothing for a new profile', () => {
    expect(recentCollections.list()).toEqual([]);
  });

  it('puts the latest use on top and keeps one row per collection', () => {
    expect(recentCollections.record([{ path: orders, name: 'Orders API' }], 'opened')).toBe(true);
    recentCollections.record([{ path: users, name: 'Users API' }], 'opened');
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'closed');

    expect(recentCollections.list()).toEqual([
      { path: orders, name: 'Orders API', usedAt: expect.any(Number), lastEvent: 'closed' },
      { path: users, name: 'Users API', usedAt: expect.any(Number), lastEvent: 'opened' }
    ]);
    expect(storedRowCount()).toBe(2);
  });

  it('puts a batch on top in the order given, at one time, in one transaction', () => {
    expect(recentCollections.record([{ path: orders }, { path: users }, { path: payments }], 'opened')).toBe(true);

    const rows = recentCollections.list();
    expect(pathsOf(rows)).toEqual([orders, users, payments]);
    rows.forEach((row) => expect(row.usedAt).toBe(rows[0].usedAt));
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('puts a new batch on top and keeps every stored time when the clock moves back', () => {
    recentCollections.record([{ path: orders }], 'opened');
    const [{ usedAt: ordersUsedAt }] = recentCollections.list();
    const now = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => now() - DAY);

    recentCollections.record([{ path: users }, { path: payments }], 'closed');
    Date.now.mockRestore();

    const rows = recentCollections.list();
    expect(pathsOf(rows)).toEqual([users, payments, orders]);
    expect(rows[0].usedAt).toBeLessThan(ordersUsedAt);
    expect(rows[2].usedAt).toBe(ordersUsedAt);
  });

  it('stamps rows recorded after a row from a clock a year ahead with the real time, above that row', () => {
    const now = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => now() + YEAR);
    recentCollections.record([{ path: orders }], 'opened');
    Date.now.mockRestore();

    recentCollections.record([{ path: users }], 'opened');
    recentCollections.record([{ path: payments }], 'closed');

    const rows = recentCollections.list();
    expect(pathsOf(rows)).toEqual([payments, users, orders]);
    expect(rows[0].usedAt).toBeLessThanOrEqual(Date.now());
    expect(rows[1].usedAt).toBeLessThanOrEqual(Date.now());
  });

  it('lists a later record above a row stamped at the latest time a date can hold', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(8.64e15);
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'opened');

    recentCollections.record([{ path: users }], 'opened');

    const rows = recentCollections.list();
    expect(pathsOf(rows)).toEqual([users, orders]);
    expect(rows[0].usedAt).toBeLessThanOrEqual(Date.now());
    expect(rows[1].usedAt).toBe(8.64e15);
  });

  it('keeps the 50 newest collections', () => {
    const collectionPaths = Array.from({ length: 60 }, (_value, index) => path.join(projectsFolder, `collection-${index}`));

    recentCollections.record(collectionPaths.map((collectionPath) => ({ path: collectionPath })), 'opened');
    recentCollections.record([{ path: orders }], 'opened');

    expect(pathsOf(recentCollections.list())).toEqual([orders, ...collectionPaths.slice(0, 49)]);
    expect(storedRowCount()).toBe(50);
  });

  it('names a row after the given name, else the name it already has, else the folder', () => {
    const fileSystemRoot = path.parse(projectsFolder).root;

    recentCollections.record([{ path: orders, name: 'Orders API' }], 'opened');
    recentCollections.record([{ path: orders, name: '  ' }, { path: users, name: 42 }, { path: fileSystemRoot }], 'opened');

    expect(recentCollections.list().map((row) => row.name)).toEqual(['Orders API', 'users', fileSystemRoot]);
  });

  it('cuts names to 256 characters', () => {
    recentCollections.record([{ path: orders, name: 'x'.repeat(300) }], 'opened');

    expect(recentCollections.list()[0].name).toBe('x'.repeat(256));

    recentCollections.rename(orders, 'y'.repeat(300));

    expect(recentCollections.list()[0].name).toBe('y'.repeat(256));
  });

  it('treats the slash and backslash spellings of a Windows path as one collection', () => {
    onPlatform('win32');

    recentCollections.record([{ path: 'C:/Users/me/api', name: 'API' }], 'opened');
    recentCollections.record([{ path: 'C:\\Users\\me\\api' }], 'closed');
    recentCollections.record([{ path: 'c:\\users\\me\\api\\' }], 'opened');

    expect(recentCollections.list()).toEqual([{ path: 'c:\\users\\me\\api', name: 'API', usedAt: expect.any(Number), lastEvent: 'opened' }]);
    expect(recentCollections.move('C:\\Users\\me\\api', 'C:\\Users\\Me\\API')).toBe(true);
    expect(pathsOf(recentCollections.list())).toEqual(['C:\\Users\\Me\\API']);
    expect(recentCollections.forget(['C:/USERS/ME/API'])).toBe(true);
    expect(recentCollections.list()).toEqual([]);
  });

  it('ignores a trailing slash and keeps case variants apart outside Windows', () => {
    onPlatform('darwin');

    recentCollections.record([{ path: '/Users/me/api/' }, { path: '/Users/me/api' }, { path: '/Users/me/API' }], 'opened');

    expect(pathsOf(recentCollections.list())).toEqual(['/Users/me/api', '/Users/me/API']);
  });

  it('records nothing for relative, empty or missing paths', () => {
    expect(recentCollections.record([{ path: 'projects/orders' }, { path: '' }, { path: 42 }, {}], 'opened')).toBe(false);
    expect(storedRowCount()).toBe(0);
  });

  it('never records transient collections but records other collections in app data', () => {
    const transientFolder = path.join(mockUserData, 'tmp', 'transient');
    const notesCollection = path.join(mockUserData, 'tmp', 'transient-notes');
    const defaultWorkspaceCollection = path.join(mockUserData, 'default-workspace', 'collections', 'api');

    recentCollections.record([
      { path: transientFolder },
      { path: path.join(transientFolder, '4242', 'bruno-scratch-abc') },
      { path: notesCollection },
      { path: defaultWorkspaceCollection }
    ], 'opened');

    expect(pathsOf(recentCollections.list())).toEqual([notesCollection, defaultWorkspaceCollection]);
  });

  it('records every close when several closes run at once', async () => {
    await Promise.all([orders, users, payments].map(async (collectionPath) => {
      await null;
      recentCollections.record([{ path: collectionPath }], 'closed');
    }));

    expect(pathsOf(recentCollections.list())).toEqual([payments, users, orders]);
  });

  it('records nothing and logs when the event is not one a row can hold', () => {
    expect(recentCollections.record([{ path: orders }], 'archived')).toBe(false);

    expect(console.error).toHaveBeenCalledWith(
      '[recent-collections] record failed:',
      expect.objectContaining({ message: expect.stringContaining('CHECK constraint failed') })
    );
    expect(storedRowCount()).toBe(0);
  });

  it.each([
    ['a row', (name, params) => name === 'record_recent_collection' && params.path === payments],
    ['the trim', (name) => name === 'trim_recent_collections']
  ])('keeps every row as it was, logs and reports no change when writing %s of a batch fails', (_label, isFailing) => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(10).mockReturnValueOnce(20);
    recentCollections.record([{ path: users, name: 'Users API' }], 'opened');
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'opened');
    const writeError = new Error('database or disk is full');
    const { execute } = opened.statements;
    jest.spyOn(opened.statements, 'execute').mockImplementation((name, params) => {
      if (isFailing(name, params)) {
        throw writeError;
      }
      return execute.call(opened.statements, name, params);
    });

    expect(recentCollections.record([{ path: payments }, { path: users }, { path: orders, name: 'Orders' }], 'closed')).toBe(false);

    expect(console.error).toHaveBeenCalledWith('[recent-collections] record failed:', writeError);
    expect(recentCollections.list()).toEqual([
      { path: orders, name: 'Orders API', usedAt: 20, lastEvent: 'opened' },
      { path: users, name: 'Users API', usedAt: 10, lastEvent: 'opened' }
    ]);
  });

  it('fails the list, and logs every write and reports no change, while the database is unavailable', () => {
    const sqlite = jest.requireActual('../sqlite');
    getStatements.mockImplementation(sqlite.getStatements);
    transaction.mockImplementation(sqlite.transaction);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => recentCollections.list()).toThrow('The database is unavailable, cannot run statement "list_recent_collections"');
    expect(recentCollections.record([{ path: orders }], 'opened')).toBe(false);
    expect(recentCollections.forget([orders])).toBe(false);
    expect(recentCollections.move(orders, users)).toBe(false);
    expect(recentCollections.rename(orders, 'Orders')).toBe(false);
    expect(console.error.mock.calls.map(([message, error]) => [message, error.message])).toEqual([
      ['[recent-collections] record failed:', 'The database is unavailable, cannot run a transaction'],
      ['[recent-collections] forget failed:', 'The database is unavailable, cannot run a transaction'],
      ['[recent-collections] move failed:', 'The database is unavailable, cannot run a transaction'],
      ['[recent-collections] rename failed:', 'The database is unavailable, cannot run a transaction']
    ]);
  });

  it('renames a row in place and reports no change for an unknown row, a blank name or the same name', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(10).mockReturnValueOnce(20);
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'opened');
    recentCollections.record([{ path: users, name: 'Users API' }], 'closed');

    expect(recentCollections.rename(orders, 'Orders')).toBe(true);
    expect(recentCollections.list()).toEqual([
      { path: users, name: 'Users API', usedAt: 20, lastEvent: 'closed' },
      { path: orders, name: 'Orders', usedAt: 10, lastEvent: 'opened' }
    ]);
    expect(recentCollections.rename(orders, 'Orders')).toBe(false);
    expect(recentCollections.rename(orders, '  ')).toBe(false);
    expect(recentCollections.rename(payments, 'Payments')).toBe(false);
  });

  it('moves a row to its new folder, keeping its name, time and place, and drops a stale row there', () => {
    const movedOrders = path.join(projectsFolder, 'workspace', 'collections', 'orders');
    jest.spyOn(Date, 'now').mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(30);
    recentCollections.record([{ path: movedOrders, name: 'Stale' }], 'opened');
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'closed');
    recentCollections.record([{ path: users, name: 'Users API' }], 'opened');

    expect(recentCollections.move(orders, movedOrders)).toBe(true);
    expect(recentCollections.list()).toEqual([
      { path: users, name: 'Users API', usedAt: 30, lastEvent: 'opened' },
      { path: movedOrders, name: 'Orders API', usedAt: 20, lastEvent: 'closed' }
    ]);
    expect(recentCollections.move(payments, movedOrders)).toBe(false);
    expect(recentCollections.move(movedOrders, 'workspace/collections/orders')).toBe(false);
  });

  it('forgets rows and reports no change when none match', () => {
    recentCollections.record([{ path: orders }, { path: users }], 'opened');

    expect(recentCollections.forget([orders, payments])).toBe(true);
    expect(pathsOf(recentCollections.list())).toEqual([users]);
    expect(recentCollections.forget([payments])).toBe(false);
    expect(recentCollections.forget([])).toBe(false);
  });

  it('lists what it recorded before the database file was closed and opened again, as after a restart', () => {
    const databasePath = path.join(mockUserData, 'bruno.db');
    const openDatabaseFile = () => {
      opened.db.close();
      opened = createDatabase(databasePath, { pragmas: { auto_vacuum: 'INCREMENTAL', journal_mode: 'WAL' } });
      useDatabase(opened);
    };
    jest.spyOn(Date, 'now').mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(30);

    openDatabaseFile();
    recentCollections.record([{ path: orders, name: 'Orders API' }], 'closed');
    recentCollections.record([{ path: users, name: 'Users API' }], 'opened');
    openDatabaseFile();
    recentCollections.record([{ path: payments, name: 'Payments' }], 'opened');

    expect(recentCollections.list()).toEqual([
      { path: payments, name: 'Payments', usedAt: 30, lastEvent: 'opened' },
      { path: users, name: 'Users API', usedAt: 20, lastEvent: 'opened' },
      { path: orders, name: 'Orders API', usedAt: 10, lastEvent: 'closed' }
    ]);
  });
});
