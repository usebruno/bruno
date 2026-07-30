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

describe('WorkspaceWatcher mock store', () => {
  let workspacePath;
  let win;
  let watcher;

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

  it('watches mocks/mockserver.yml and emits store-updated on change', () => {
    watcher.addWatcher(win, workspacePath);
    jest.advanceTimersByTime(100);

    const mockStorePath = path.join(workspacePath, 'mocks', 'mockserver.yml');
    const mockWatcher = chokidar.__watchers.find((item) => item.target === mockStorePath);
    expect(mockWatcher).toBeTruthy();

    mockWatcher.emit('change');
    jest.advanceTimersByTime(150);

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:mock-server-store-updated',
      workspacePath,
      'workspace-1'
    );
  });
});
