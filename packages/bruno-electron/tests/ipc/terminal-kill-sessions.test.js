jest.mock('electron', () => ({ ipcMain: { handle: jest.fn(), on: jest.fn() } }));
jest.mock('@lydell/node-pty', () => ({ spawn: jest.fn() }));
jest.mock('electron-is-dev', () => false);

const path = require('path');
const TerminalManager = require('../../src/ipc/terminal');

const WORKSPACE = path.resolve('/workspaces/team');

const addSession = (manager, sessionId, cwd) => {
  const session = { pty: { kill: jest.fn() }, cwd };
  manager.terminals.set(sessionId, session);
  return session;
};

describe('TerminalManager.killSessionsInside', () => {
  it('kills sessions started in the folder or below it, and keeps the rest', () => {
    const manager = new TerminalManager();
    const atRoot = addSession(manager, 'root', WORKSPACE);
    const nested = addSession(manager, 'nested', path.join(WORKSPACE, 'collections', 'payments'));
    const outside = addSession(manager, 'outside', path.resolve('/workspaces/other'));
    const lookalike = addSession(manager, 'lookalike', path.resolve('/workspaces/team-2'));

    manager.killSessionsInside(WORKSPACE);

    expect(atRoot.pty.kill).toHaveBeenCalled();
    expect(nested.pty.kill).toHaveBeenCalled();
    expect(outside.pty.kill).not.toHaveBeenCalled();
    expect(lookalike.pty.kill).not.toHaveBeenCalled();
    expect([...manager.terminals.keys()]).toEqual(['outside', 'lookalike']);
  });
});
