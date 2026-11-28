const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const { CollectionScanner, SCANNER_ENTRY } = require('./index');

const createChild = () => Object.assign(new EventEmitter(), { postMessage: jest.fn(), kill: jest.fn(() => true) });

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const work = { id: '/work', path: '/work', kind: 'default-location' };
const team = { id: '/team', path: '/team', kind: 'workspace' };
const projects = { id: '/projects', path: '/projects', kind: 'user' };
const computer = { id: 'computer', path: '/', kind: 'computer' };
const recents = [{ path: '/elsewhere/api', name: 'API' }];
const excludedPaths = ['/app-data/tmp/transient'];
const homePath = '/home/me';
const knownFolders = ['/home/me/Desktop', '/home/me/Documents', '/home/me/Downloads'];
const payments = { path: '/work/payments', name: 'Payments', mtime: 1, locationId: '/work' };

const idleLocations = [work, team, projects].map((location) => ({ ...location, status: 'idle', found: 0 }));

describe('CollectionScanner', () => {
  let children;
  let fork;
  let send;
  let readLocations;
  let readRecents;
  let readExcludedPaths;
  let readHomePath;
  let readKnownFolders;
  let scanner;

  beforeEach(() => {
    children = [];
    fork = jest.fn(() => {
      const child = createChild();
      children.push(child);
      return child;
    });
    send = jest.fn();
    readLocations = jest.fn(async () => [work, team, projects]);
    readRecents = jest.fn(() => recents);
    readExcludedPaths = jest.fn(() => excludedPaths);
    readHomePath = jest.fn(() => homePath);
    readKnownFolders = jest.fn(() => knownFolders);
    scanner = new CollectionScanner({ fork, send, readLocations, readRecents, readExcludedPaths, readHomePath, readKnownFolders });
  });

  const doneEvents = () => send.mock.calls.filter(([channel]) => channel === 'main:collection-scan:done').map(([, payload]) => payload);

  it('forks the scanner and posts one start message with the location ids, paths and kinds, the recents, the excluded paths, the home folder and the known folders', async () => {
    readLocations.mockResolvedValueOnce([work, computer]);

    await expect(scanner.start('scan-1')).resolves.toEqual({ locations: [work, computer] });

    expect(fork).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledWith(SCANNER_ENTRY, [], expect.any(Object));
    expect(children[0].postMessage.mock.calls).toEqual([[{
      locations: [{ id: '/work', path: '/work', kind: 'default-location' }, { id: 'computer', path: '/', kind: 'computer' }],
      recents,
      excludedPaths,
      homePath,
      knownFolders
    }]]);
  });

  it('relays found collections, then sends done with each location’s status and count matched by id', async () => {
    await scanner.start('scan-1');

    children[0].emit('message', { type: 'batch', collections: [payments] });
    children[0].emit('message', {
      type: 'done',
      locations: [{ id: '/projects', status: 'missing', found: 0 }, { id: '/work', status: 'done', found: 1 }]
    });
    children[0].emit('exit', 0);

    expect(send.mock.calls).toEqual([
      ['main:collection-scan:batch', { scanId: 'scan-1', collections: [payments] }],
      ['main:collection-scan:done', {
        scanId: 'scan-1',
        locations: [
          { ...work, status: 'done', found: 1 },
          { ...team, status: 'idle', found: 0 },
          { ...projects, status: 'missing', found: 0 }
        ],
        error: null
      }]
    ]);
  });

  it.each([
    ['an error message', (child) => {
      child.emit('message', { type: 'error', message: 'The disk went away' });
      child.emit('exit', 1);
    }, 'The disk went away'],
    ['an error message without text', (child) => {
      child.emit('message', { type: 'error' });
      child.emit('exit', 1);
    }, 'The collection scan stopped unexpectedly.'],
    ['an exit before done', (child) => {
      child.emit('exit', 1);
    }, 'The collection scan stopped unexpectedly.'],
    ['a V8 fatal error', (child) => {
      child.emit('error', 'FatalError', 'v8::Context::New()', '{}');
      child.emit('exit', 11);
    }, 'The collection scan stopped unexpectedly.']
  ])('sends done with the error and every location idle after %s', async (_label, failChild, error) => {
    await scanner.start('scan-1');

    failChild(children[0]);

    expect(doneEvents()).toEqual([{ scanId: 'scan-1', locations: idleLocations, error }]);
  });

  it('kills the running child before forking the next scan, and ignores that child from then on', async () => {
    await scanner.start('scan-1');
    await scanner.start('scan-2');

    expect(children[0].kill).toHaveBeenCalledTimes(1);
    expect(children[0].kill.mock.invocationCallOrder[0]).toBeLessThan(fork.mock.invocationCallOrder[1]);

    children[0].emit('message', { type: 'batch', collections: [payments] });
    children[0].emit('message', { type: 'done', locations: [] });
    children[0].emit('exit', 0);
    expect(send).not.toHaveBeenCalled();

    children[1].emit('message', { type: 'done', locations: [] });
    expect(doneEvents()).toEqual([{ scanId: 'scan-2', locations: idleLocations, error: null }]);
  });

  it.each([
    ['cancelled', () => scanner.cancel('scan-1')],
    ['replaced by a newer scan', () => scanner.start('scan-2')],
    ['stopped', () => scanner.stop()]
  ])('returns nothing and forks no child when the scan is %s while the locations are read', async (_label, takeOver) => {
    const locations = deferred();
    readLocations.mockReturnValueOnce(locations.promise);

    const started = scanner.start('scan-1');
    await takeOver();
    const forkCount = fork.mock.calls.length;
    locations.resolve([work]);

    await expect(started).resolves.toBeNull();
    expect(fork).toHaveBeenCalledTimes(forkCount);
  });

  it('cancels only the scan it names', async () => {
    await scanner.start('scan-1');

    scanner.cancel('scan-2');
    scanner.cancel(undefined);
    expect(children[0].kill).not.toHaveBeenCalled();

    scanner.cancel('scan-1');
    expect(children[0].kill).toHaveBeenCalledTimes(1);

    children[0].emit('exit', 0);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a second start with the id that is running and keeps that scan going', async () => {
    await scanner.start('scan-1');

    await expect(scanner.start('scan-1')).rejects.toThrow('Collection scan scan-1 is already running');

    expect(fork).toHaveBeenCalledTimes(1);
    expect(children[0].kill).not.toHaveBeenCalled();
    children[0].emit('message', { type: 'done', locations: [] });
    expect(doneEvents()).toHaveLength(1);
  });

  it.each([
    ['reading the locations', () => readLocations.mockRejectedValueOnce(new Error('Preferences are unreadable')), 'Preferences are unreadable'],
    ['reading the recents', () => readRecents.mockImplementationOnce(() => {
      throw new Error('The database is unavailable');
    }), 'The database is unavailable'],
    ['reading the excluded paths', () => readExcludedPaths.mockImplementationOnce(() => {
      throw new Error('No user data folder');
    }), 'No user data folder'],
    ['reading the home folder', () => readHomePath.mockImplementationOnce(() => {
      throw new Error('No home folder');
    }), 'No home folder'],
    ['reading the known folders', () => readKnownFolders.mockImplementationOnce(() => {
      throw new Error('Failed to get \'desktop\' path');
    }), 'Failed to get \'desktop\' path'],
    ['forking the child', () => fork.mockImplementationOnce(() => {
      throw new Error('utilityProcess cannot be created before app is ready');
    }), 'utilityProcess cannot be created before app is ready']
  ])('rejects the start and clears the running scan when %s fails', async (_label, breakStep, message) => {
    breakStep();

    await expect(scanner.start('scan-1')).rejects.toThrow(message);

    await expect(scanner.start('scan-1')).resolves.toEqual({ locations: [work, team, projects] });
  });

  it('keeps a newer scan running when an older scan fails to read its locations', async () => {
    const olderLocations = deferred();
    readLocations.mockReturnValueOnce(olderLocations.promise);

    const older = scanner.start('scan-1');
    await scanner.start('scan-2');
    olderLocations.reject(new Error('Preferences are unreadable'));
    await expect(older).rejects.toThrow('Preferences are unreadable');

    children[0].emit('message', { type: 'done', locations: [] });
    expect(doneEvents()).toEqual([{ scanId: 'scan-2', locations: idleLocations, error: null }]);
  });

  it('kills the running child on stop and sends nothing for it', async () => {
    expect(() => scanner.stop()).not.toThrow();

    await scanner.start('scan-1');
    scanner.stop();

    expect(children[0].kill).toHaveBeenCalledTimes(1);
    children[0].emit('exit', 0);
    expect(send).not.toHaveBeenCalled();
  });

  it('kills a child that had not spawned yet as soon as it spawns', async () => {
    await scanner.start('scan-1');
    children[0].kill.mockReturnValueOnce(false);

    scanner.cancel('scan-1');
    expect(children[0].kill).toHaveBeenCalledTimes(1);

    children[0].emit('spawn');
    expect(children[0].kill).toHaveBeenCalledTimes(2);
  });

  it('points at a scanner entry that exists on disk', () => {
    expect(fs.existsSync(SCANNER_ENTRY)).toBe(true);
  });
});
