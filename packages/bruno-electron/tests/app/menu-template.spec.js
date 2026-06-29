const mockLoadURL = jest.fn();
const mockRemoveMenu = jest.fn();
const mockBrowserWindow = jest.fn(() => ({
  loadURL: mockLoadURL,
  removeMenu: mockRemoveMenu
}));

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '2.3.0')
  },
  BrowserWindow: mockBrowserWindow,
  ipcMain: {
    emit: jest.fn()
  }
}));

const menuTemplate = require('../../src/app/menu-template');

describe('app: menu template', () => {
  beforeEach(() => {
    mockLoadURL.mockClear();
    mockRemoveMenu.mockClear();
    mockBrowserWindow.mockClear();
  });

  test('renders About Bruno with the Electron runtime version', () => {
    const helpMenu = menuTemplate.find((item) => item.role === 'help');
    const aboutItem = helpMenu.submenu.find((item) => item.label === 'About Bruno');

    aboutItem.click();

    expect(mockBrowserWindow).toHaveBeenCalledTimes(1);
    expect(mockRemoveMenu).toHaveBeenCalledTimes(1);
    expect(mockLoadURL).toHaveBeenCalledTimes(1);

    const url = mockLoadURL.mock.calls[0][0];
    const html = decodeURIComponent(url.replace('data:text/html;charset=utf-8,', ''));

    expect(html).toContain('Bruno 2.3.0');
    expect(html).not.toContain('Bruno 2.0.0');
  });
});
