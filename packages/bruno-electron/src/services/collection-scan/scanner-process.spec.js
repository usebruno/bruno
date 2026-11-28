const { EventEmitter } = require('node:events');
const os = require('node:os');

jest.mock('./scan');

const { scanLocations } = require('./scan');
const { runScannerProcess } = require('./scanner-process');

const createPort = () => Object.assign(new EventEmitter(), { postMessage: jest.fn() });

const startMessage = {
  locations: [{ id: 'work', path: '/work', kind: 'default-location' }, { id: 'computer', path: '/', kind: 'computer' }],
  recents: [{ path: '/elsewhere/api', name: 'API' }],
  excludedPaths: ['/app-data/tmp/transient'],
  homePath: '/home/me',
  knownFolders: ['/home/me/Desktop', '/home/me/Documents', '/home/me/Downloads']
};

const statuses = [{ id: 'work', status: 'done', found: 2 }];
const payments = { path: '/work/payments', name: 'Payments', mtime: 1, locationId: 'work' };
const orders = { path: '/work/orders', name: 'Orders', mtime: 2, locationId: 'work' };

describe('runScannerProcess', () => {
  let port;
  let exit;
  let setPriority;

  beforeEach(() => {
    jest.useFakeTimers();
    port = createPort();
    exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    setPriority = jest.spyOn(os, 'setPriority').mockImplementation(() => {});
    runScannerProcess(port);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    scanLocations.mockReset();
  });

  const receive = async (data) => {
    port.emit('message', { data, ports: [] });
    await jest.runAllTimersAsync();
  };

  const postedMessages = () => port.postMessage.mock.calls.map(([message]) => message);

  it('lowers its priority before scanning, sends found collections in batches, then reports done and exits with 0', async () => {
    scanLocations.mockImplementation(async ({ onCollection }) => {
      onCollection(payments);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onCollection(orders);
      return statuses;
    });

    await receive(startMessage);

    expect(setPriority).toHaveBeenCalledWith(os.constants.priority.PRIORITY_BELOW_NORMAL);
    expect(setPriority.mock.invocationCallOrder[0]).toBeLessThan(scanLocations.mock.invocationCallOrder[0]);
    expect(scanLocations).toHaveBeenCalledWith({
      locations: startMessage.locations,
      recents: startMessage.recents,
      excludedPaths: startMessage.excludedPaths,
      homePath: startMessage.homePath,
      knownFolders: startMessage.knownFolders,
      onCollection: expect.any(Function)
    });
    expect(postedMessages()).toEqual([
      { type: 'batch', collections: [payments] },
      { type: 'batch', collections: [orders] },
      { type: 'done', locations: statuses }
    ]);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('still scans when its priority cannot be lowered', async () => {
    setPriority.mockImplementation(() => {
      throw Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    });
    scanLocations.mockResolvedValue(statuses);

    await receive(startMessage);

    expect(postedMessages()).toEqual([{ type: 'done', locations: statuses }]);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('reports a failed scan with its message and exits with 1', async () => {
    scanLocations.mockRejectedValue(new Error('The disk went away'));

    await receive(startMessage);

    expect(postedMessages()).toEqual([{ type: 'error', message: 'The disk went away' }]);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('reports only done when nothing is found', async () => {
    scanLocations.mockResolvedValue(statuses);

    await receive(startMessage);

    expect(postedMessages()).toEqual([{ type: 'done', locations: statuses }]);
  });

  describe('when the module loads', () => {
    afterEach(() => {
      delete process.parentPort;
    });

    it('does nothing outside a utility process', () => {
      jest.isolateModules(() => {
        require('./scanner-process');
      });

      expect(exit).not.toHaveBeenCalled();
      expect(setPriority).not.toHaveBeenCalled();
    });

    it('listens on the parent port inside a utility process', async () => {
      const parentPort = createPort();
      process.parentPort = parentPort;

      jest.isolateModules(() => {
        require('./scanner-process');
      });
      parentPort.emit('message', { data: startMessage, ports: [] });
      await jest.runAllTimersAsync();

      expect(parentPort.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
      expect(exit).toHaveBeenCalledWith(0);
    });
  });
});
