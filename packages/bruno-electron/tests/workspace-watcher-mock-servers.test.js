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

  // The mock-server watcher is armed with one glob per supported YAML extension.
  const mockServerGlobs = () => [
    path.join(workspacePath, 'mocks', '*.yml'),
    path.join(workspacePath, 'mocks', '*.yaml')
  ];

  const findMockServerWatcher = () => {
    const globs = mockServerGlobs();
    return chokidar.__watchers.find(
      (item) => Array.isArray(item.target) && globs.every((glob) => item.target.includes(glob))
    );
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

  it('watches both mocks/*.yml and mocks/*.yaml', () => {
    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    expect(findMockServerWatcher().target).toEqual(mockServerGlobs());
  });

  it('emits added/changed for a .yaml mock server file', () => {
    // Hand-authored or converted workspaces may use `.yaml`; the watcher and reader must
    // treat it exactly like `.yml`.
    const instance = saveMockServer(workspacePath, {
      name: 'Cat API Mock',
      port: 4002,
      sourceType: 'manual',
      globalDelay: 0
    });
    const yamlPathname = instance.pathname.replace(/\.yml$/, '.yaml');
    fs.renameSync(instance.pathname, yamlPathname);

    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    findMockServerWatcher().emit('add', yamlPathname);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:workspace-mock-server-added',
      'workspace-1',
      expect.objectContaining({
        instance: expect.objectContaining({ uid: getMockServerUid(yamlPathname), name: 'Cat API Mock', port: 4002 })
      })
    );
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
