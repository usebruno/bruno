const { isAppUrl, isTrustedSender, restrictIpcToAppFrames } = require('./trusted-url');

jest.mock('electron-is-dev', () => false);

const FILE_APP = 'file:///opt/bruno/web/index.html';
const DEV_APP = 'http://localhost:3000';

describe('isAppUrl', () => {
  it('accepts the app document, ignoring hash/query', () => {
    expect(isAppUrl(`${FILE_APP}#x`, FILE_APP)).toBe(true);
    expect(isAppUrl(`${DEV_APP}/?a=1#b`, DEV_APP)).toBe(true);
  });

  it.each([
    'https://attacker.example/',
    'file:///etc/passwd',
    'file:///opt/bruno/web/other.html',
    'javascript:alert(1)',
    'data:text/html,hi',
    'http://localhost.evil.com',
    'http://localhost:3001',
    undefined,
    ''
  ])('rejects %s', (url) => {
    expect(isAppUrl(url, DEV_APP)).toBe(false);
    expect(isAppUrl(url, FILE_APP)).toBe(false);
  });
});

describe('isTrustedSender', () => {
  const mainFrame = { url: DEV_APP };
  const trusted = { sender: { mainFrame }, senderFrame: mainFrame };

  it('trusts internal emits and the app main frame', () => {
    expect(isTrustedSender(undefined, DEV_APP)).toBe(true);
    expect(isTrustedSender(trusted, DEV_APP)).toBe(true);
  });

  it('rejects foreign origins, subframes and destroyed frames', () => {
    const foreign = { url: 'https://attacker.example/' };
    expect(isTrustedSender({ sender: { mainFrame: foreign }, senderFrame: foreign }, DEV_APP)).toBe(false);
    expect(isTrustedSender({ sender: { mainFrame }, senderFrame: { url: DEV_APP } }, DEV_APP)).toBe(false);
    expect(isTrustedSender({ sender: { mainFrame }, senderFrame: null }, DEV_APP)).toBe(false);
  });
});

describe('restrictIpcToAppFrames', () => {
  const setup = () => {
    const registered = {};
    const ipcMain = {
      handle: (c, l) => { registered[`h:${c}`] = l; },
      on: (c, l) => { registered[`o:${c}`] = l; }
    };
    restrictIpcToAppFrames(ipcMain, DEV_APP);
    return { ipcMain, registered };
  };
  const mainFrame = { url: DEV_APP };
  const foreignFrame = { url: 'https://attacker.example/' };

  it('runs handlers for the app frame and blocks foreign frames', () => {
    const { ipcMain, registered } = setup();
    const fn = jest.fn(() => 'ok');
    ipcMain.handle('terminal:create', fn);
    expect(registered['h:terminal:create']({ sender: { mainFrame }, senderFrame: mainFrame })).toBe('ok');
    expect(() => registered['h:terminal:create']({ sender: { mainFrame: foreignFrame }, senderFrame: foreignFrame })).toThrow(/Blocked IPC/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('silently drops foreign send() events', () => {
    const { ipcMain, registered } = setup();
    const fn = jest.fn();
    ipcMain.on('terminal:input', fn);
    registered['o:terminal:input']({ sender: { mainFrame: foreignFrame }, senderFrame: foreignFrame }, 'id', 'rm -rf');
    expect(fn).not.toHaveBeenCalled();
  });
});
