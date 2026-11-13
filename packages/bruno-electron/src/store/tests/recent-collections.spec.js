const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  app: { getPath: jest.fn(), getVersion: () => '2.0.0' },
  ipcMain: { on: jest.fn() }
}));

const { app } = require('electron');
const Store = require('electron-store');
const { RecentCollectionsStore } = require('../recent-collections');

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;
const projectsFolder = path.resolve('/projects');
const orders = path.join(projectsFolder, 'orders');
const users = path.join(projectsFolder, 'users');
const payments = path.join(projectsFolder, 'payments');

describe('recent collections store', () => {
  let userDataPath;

  const storeFile = () => path.join(userDataPath, 'recent-collections.json');
  const writeStoreFile = (content) => fs.writeFileSync(storeFile(), typeof content === 'string' ? content : JSON.stringify(content));
  const readStoreFile = () => JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  const pathsOf = (rows) => rows.map((row) => row.path);

  beforeEach(() => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-recents-'));
    app.getPath.mockReturnValue(userDataPath);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(userDataPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('lists nothing for a new profile and writes no file until something is recorded', () => {
    const store = new RecentCollectionsStore();

    expect(store.list()).toEqual([]);
    expect(fs.existsSync(storeFile())).toBe(false);
  });

  it('puts the latest use on top and keeps one row per collection', () => {
    const store = new RecentCollectionsStore();

    store.record([{ path: orders, name: 'Orders API' }], 'opened');
    store.record([{ path: users, name: 'Users API' }], 'opened');
    store.record([{ path: orders, name: 'Orders API' }], 'closed');

    const rows = [
      { path: orders, name: 'Orders API', usedAt: expect.any(Number), lastEvent: 'closed' },
      { path: users, name: 'Users API', usedAt: expect.any(Number), lastEvent: 'opened' }
    ];
    expect(store.list()).toEqual(rows);
    expect(readStoreFile()).toEqual({ version: 1, recent: rows });
  });

  it('puts a batch on top in the order given, at one time, in one write', () => {
    const store = new RecentCollectionsStore();
    const setSpy = jest.spyOn(Store.prototype, 'set');

    expect(store.record([{ path: orders }, { path: users }, { path: payments }], 'opened')).toBe(true);

    const rows = readStoreFile().recent;
    expect(pathsOf(rows)).toEqual([orders, users, payments]);
    rows.forEach((row) => expect(row.usedAt).toBe(rows[0].usedAt));
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it('puts a new batch on top and keeps every stored time when the clock moves back', () => {
    const store = new RecentCollectionsStore();
    store.record([{ path: orders }], 'opened');
    const [{ usedAt: ordersUsedAt }] = store.list();
    const now = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => now() - DAY);

    store.record([{ path: users }, { path: payments }], 'closed');
    Date.now.mockRestore();

    const rows = store.list();
    expect(pathsOf(rows)).toEqual([users, payments, orders]);
    expect(rows[0].usedAt).toBeLessThan(ordersUsedAt);
    expect(rows[2].usedAt).toBe(ordersUsedAt);
  });

  it('stamps rows recorded after a row from a clock a year ahead with the real time, above that row', () => {
    const store = new RecentCollectionsStore();
    const now = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => now() + YEAR);
    store.record([{ path: orders }], 'opened');
    Date.now.mockRestore();

    store.record([{ path: users }], 'opened');
    store.record([{ path: payments }], 'closed');

    const rows = store.list();
    expect(pathsOf(rows)).toEqual([payments, users, orders]);
    expect(rows[0].usedAt).toBeLessThanOrEqual(Date.now());
    expect(rows[1].usedAt).toBeLessThanOrEqual(Date.now());
  });

  it('lists a later record above a row stamped at the latest time a date can hold', () => {
    writeStoreFile({ version: 1, recent: [{ path: orders, name: 'Orders API', usedAt: 8.64e15, lastEvent: 'opened' }] });
    const store = new RecentCollectionsStore();

    store.record([{ path: users }], 'opened');

    const rows = store.list();
    expect(pathsOf(rows)).toEqual([users, orders]);
    expect(rows[0].usedAt).toBeLessThanOrEqual(Date.now());
    expect(rows[1].usedAt).toBe(8.64e15);
  });

  it('keeps the 50 newest collections', () => {
    const store = new RecentCollectionsStore();
    const collectionPaths = Array.from({ length: 60 }, (_value, index) => path.join(projectsFolder, `collection-${index}`));

    store.record(collectionPaths.map((collectionPath) => ({ path: collectionPath })), 'opened');
    store.record([{ path: orders }], 'opened');

    const rows = store.list();
    expect(rows).toHaveLength(50);
    expect(pathsOf(rows)).toEqual([orders, ...collectionPaths.slice(0, 49)]);
    expect(readStoreFile().recent).toHaveLength(50);
  });

  it('names a row after the given name, else the name it already has, else the folder', () => {
    const store = new RecentCollectionsStore();

    store.record([{ path: orders, name: 'Orders API' }], 'opened');
    store.record([{ path: orders, name: '  ' }, { path: users }], 'opened');

    expect(store.list().map((row) => row.name)).toEqual(['Orders API', 'users']);
  });

  it('cuts names to 256 characters', () => {
    const store = new RecentCollectionsStore();

    store.record([{ path: orders, name: 'x'.repeat(300) }], 'opened');

    expect(store.list()[0].name).toBe('x'.repeat(256));
  });

  it('treats the slash and backslash spellings of a Windows path as one collection', () => {
    const store = new RecentCollectionsStore({ platform: 'win32' });

    store.record([{ path: 'C:/Users/me/api', name: 'API' }], 'opened');
    store.record([{ path: 'C:\\Users\\me\\api' }], 'closed');
    store.record([{ path: 'c:\\users\\me\\api\\' }], 'opened');

    expect(store.list()).toEqual([{ path: 'c:\\users\\me\\api', name: 'API', usedAt: expect.any(Number), lastEvent: 'opened' }]);
    expect(store.forget(['C:/USERS/ME/API'])).toBe(true);
    expect(store.list()).toEqual([]);
  });

  it('ignores a trailing slash and keeps case variants apart outside Windows', () => {
    const store = new RecentCollectionsStore({ platform: 'darwin' });

    store.record([{ path: '/Users/me/api/' }, { path: '/Users/me/api' }, { path: '/Users/me/API' }], 'opened');

    expect(pathsOf(store.list())).toEqual(['/Users/me/api', '/Users/me/API']);
  });

  it('records nothing for relative, empty or missing paths', () => {
    const store = new RecentCollectionsStore();

    expect(store.record([{ path: 'projects/orders' }, { path: '' }, { path: 42 }, {}], 'opened')).toBe(false);
    expect(fs.existsSync(storeFile())).toBe(false);
  });

  it('never records transient collections but records other collections in app data', () => {
    const store = new RecentCollectionsStore();
    const transientFolder = path.join(userDataPath, 'tmp', 'transient');
    const defaultWorkspaceCollection = path.join(userDataPath, 'default-workspace', 'collections', 'api');

    store.record([
      { path: transientFolder },
      { path: path.join(transientFolder, '4242', 'bruno-scratch-abc') },
      { path: defaultWorkspaceCollection }
    ], 'opened');

    expect(pathsOf(store.list())).toEqual([defaultWorkspaceCollection]);
  });

  it('reads a file from a newer Bruno but never writes it', () => {
    const newerFile = JSON.stringify({ version: 2, recent: [{ path: orders, name: 'Orders API', usedAt: 5, lastEvent: 'opened', pinned: true }] });
    writeStoreFile(newerFile);
    const store = new RecentCollectionsStore();

    expect(store.list()).toEqual([{ path: orders, name: 'Orders API', usedAt: 5, lastEvent: 'opened' }]);
    expect(store.record([{ path: users }], 'opened')).toBe(false);
    expect(store.forget([orders])).toBe(false);
    expect(store.rename(orders, 'Orders')).toBe(false);
    expect(fs.readFileSync(storeFile(), 'utf8')).toBe(newerFile);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['corrupt JSON', '{ "version": 1, "recent": ['],
    ['no version', { recent: [{ path: orders, name: 'Orders API', usedAt: 5, lastEvent: 'opened' }] }],
    ['an unknown version', { version: '1', recent: [{ path: orders, name: 'Orders API', usedAt: 5, lastEvent: 'opened' }] }],
    ['rows that are not a list', { version: 1, recent: { [orders]: 5 } }]
  ])('reads a file with %s as empty and replaces it on the next write', (_label, content) => {
    writeStoreFile(content);
    const store = new RecentCollectionsStore();

    expect(store.list()).toEqual([]);
    store.record([{ path: users, name: 'Users API' }], 'opened');

    expect(readStoreFile()).toEqual({
      version: 1,
      recent: [{ path: users, name: 'Users API', usedAt: expect.any(Number), lastEvent: 'opened' }]
    });
  });

  it('cleans bad and duplicate rows on read, keeping file order, and writes them back clean', () => {
    writeStoreFile({
      version: 1,
      recent: [
        { path: orders, name: 'Orders API', usedAt: 10, lastEvent: 'closed', pathKey: orders },
        { path: users, name: '', usedAt: 30, lastEvent: 'moved' },
        { path: `${orders}${path.sep}`, name: 'Older Orders', usedAt: 5, lastEvent: 'opened' },
        { path: 'projects/relative', name: 'Relative', usedAt: 40, lastEvent: 'opened' },
        { path: payments, name: 'Payments', usedAt: '50', lastEvent: 'opened' },
        { path: payments, name: 'Payments', usedAt: 0, lastEvent: 'opened' },
        { path: payments, name: 'Payments', usedAt: 9e15, lastEvent: 'opened' },
        null,
        'text'
      ]
    });
    const store = new RecentCollectionsStore();
    const cleanRows = [
      { path: orders, name: 'Orders API', usedAt: 10, lastEvent: 'closed' },
      { path: users, name: 'users', usedAt: 30, lastEvent: 'opened' }
    ];

    expect(store.list()).toEqual(cleanRows);
    store.rename(users, 'Users API');

    expect(readStoreFile()).toEqual({ version: 1, recent: [cleanRows[0], { ...cleanRows[1], name: 'Users API' }] });
  });

  it('records every close when several closes run at once', async () => {
    const store = new RecentCollectionsStore();
    const collectionPaths = [orders, users, payments];

    await Promise.all(collectionPaths.map(async (collectionPath) => {
      await null;
      store.record([{ path: collectionPath }], 'closed');
    }));

    expect(pathsOf(store.list())).toEqual([payments, users, orders]);
  });

  it('logs and reports no change when the file cannot be written', () => {
    const store = new RecentCollectionsStore();
    jest.spyOn(Store.prototype, 'set').mockImplementation(() => {
      throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    });

    expect(store.record([{ path: orders }], 'opened')).toBe(false);
    expect(console.error).toHaveBeenCalledWith('[recent-collections] record failed:', expect.any(Error));
    expect(store.list()).toEqual([]);
  });

  it('throws from list when the file cannot be read, while a write still logs and reports no change', () => {
    const store = new RecentCollectionsStore();
    jest.spyOn(Store.prototype, 'store', 'get').mockImplementation(() => {
      throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    });

    expect(() => store.list()).toThrow('EACCES: permission denied');
    expect(store.record([{ path: orders }], 'opened')).toBe(false);
    expect(console.error).toHaveBeenCalledWith('[recent-collections] record failed:', expect.any(Error));
  });

  it('renames a row in place and reports no change for an unknown row or the same name', () => {
    const usersRow = { path: users, name: 'Users API', usedAt: 20, lastEvent: 'opened' };
    const ordersRow = { path: orders, name: 'Orders API', usedAt: 10, lastEvent: 'opened' };
    writeStoreFile({ version: 1, recent: [usersRow, ordersRow] });
    const store = new RecentCollectionsStore();

    expect(store.rename(orders, 'Orders')).toBe(true);
    expect(store.list()).toEqual([usersRow, { ...ordersRow, name: 'Orders' }]);
    expect(store.rename(orders, 'Orders')).toBe(false);
    expect(store.rename(payments, 'Payments')).toBe(false);
  });

  it('moves a row to its new folder, keeping its name, time and place, and drops a stale row there', () => {
    const movedOrders = path.join(projectsFolder, 'workspace', 'collections', 'orders');
    const usersRow = { path: users, name: 'Users API', usedAt: 30, lastEvent: 'opened' };
    const ordersRow = { path: orders, name: 'Orders API', usedAt: 20, lastEvent: 'opened' };
    writeStoreFile({ version: 1, recent: [usersRow, ordersRow, { path: movedOrders, name: 'Stale', usedAt: 10, lastEvent: 'opened' }] });
    const store = new RecentCollectionsStore();

    expect(store.move(orders, movedOrders)).toBe(true);
    expect(store.list()).toEqual([usersRow, { ...ordersRow, path: movedOrders }]);
    expect(store.move(payments, movedOrders)).toBe(false);
  });

  it('forgets rows and reports no change when none match', () => {
    const store = new RecentCollectionsStore();
    store.record([{ path: orders }, { path: users }], 'opened');

    expect(store.forget([orders, payments])).toBe(true);
    expect(pathsOf(store.list())).toEqual([users]);
    expect(store.forget([payments])).toBe(false);
  });

  it('lists what an earlier store wrote, as after a restart', () => {
    new RecentCollectionsStore().record([{ path: orders, name: 'Orders API' }], 'closed');

    expect(new RecentCollectionsStore().list()).toEqual([
      { path: orders, name: 'Orders API', usedAt: expect.any(Number), lastEvent: 'closed' }
    ]);
  });
});
