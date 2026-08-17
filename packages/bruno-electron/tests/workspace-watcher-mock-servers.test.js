jest.mock('chokidar', () => {
  const watchers = [];
  const watch = jest.fn((target) => {
    const handlers = {};
    const watcher = {
      target,
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
        return watcher;
      }),
      close: jest.fn(),
      emit: (event, ...args) => handlers[event]?.(...args)
    };
    watchers.push(watcher);
    return watcher;
  });

  return { watch, __watchers: watchers, __reset: () => {
    watchers.length = 0; watch.mockClear();
  } };
});

jest.mock('../src/app/dotenv-watcher', () => ({
  addWorkspaceWatcher: jest.fn(),
  removeWorkspaceWatcher: jest.fn(),
  closeAll: jest.fn()
}));

jest.mock('../src/utils/workspace-config', () => ({
  getWorkspaceUid: () => 'workspace-1',
  normalizeWorkspaceConfig: (config) => config
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const chokidar = require('chokidar');
const WorkspaceWatcher = require('../src/app/workspace-watcher');
const { saveMockServer, getMockServerUid } = require('../src/app/mock-server/mock-server-store');

describe('WorkspaceWatcher mock servers', () => {
  let workspacePath;
  let win;
  let watcher;

  const findMockServerWatcher = () => {
    const glob = path.join(workspacePath, 'mocks', '*.yml');
    return chokidar.__watchers.find((item) => item.target === glob);
  };

  beforeEach(() => {
    chokidar.__reset();
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-watch-'));
    fs.mkdirSync(path.join(workspacePath, 'mocks'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'name: Test\ntype: workspace\n');
    win = {
      isDestroyed: () => false,
      webContents: { send: jest.fn() }
    };
    watcher = new WorkspaceWatcher();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await watcher.closeAllWatchers();
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('watches mocks/*.yml and emits added/changed with the parsed mock server', () => {
    const instance = saveMockServer(workspacePath, {
      name: 'Dog API Mock',
      port: 4001,
      sourceType: 'manual',
      globalDelay: 0
    });

    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    const mockServerWatcher = findMockServerWatcher();
    expect(mockServerWatcher).toBeTruthy();

    mockServerWatcher.emit('add', instance.pathname);
    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:workspace-mock-server-added',
      'workspace-1',
      expect.objectContaining({
        instance: expect.objectContaining({ uid: instance.uid, name: 'Dog API Mock', port: 4001 }),
        responses: []
      })
    );

    mockServerWatcher.emit('change', instance.pathname);
    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:workspace-mock-server-changed',
      'workspace-1',
      expect.objectContaining({
        instance: expect.objectContaining({ uid: instance.uid })
      })
    );
  });

  it('emits deleted with the path-derived uid on unlink', () => {
    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    const pathname = path.join(workspacePath, 'mocks', 'Gone Mock.yml');
    findMockServerWatcher().emit('unlink', pathname);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:workspace-mock-server-deleted',
      'workspace-1',
      getMockServerUid(pathname)
    );
  });

  it('re-arms on the mocks directory when it does not exist yet', () => {
    fs.rmSync(path.join(workspacePath, 'mocks'), { recursive: true, force: true });

    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    const mocksDir = path.join(workspacePath, 'mocks');
    const dirWatcher = chokidar.__watchers.find((item) => item.target === mocksDir);
    expect(dirWatcher).toBeTruthy();

    fs.mkdirSync(mocksDir, { recursive: true });
    dirWatcher.emit('addDir', mocksDir);

    expect(findMockServerWatcher()).toBeTruthy();
  });
});
