jest.mock('electron', () => ({
  Menu: {
    buildFromTemplate: jest.fn()
  }
}));

const { Menu } = require('electron');
const registerContextMenu = require('./context-menu');

describe('registerContextMenu', () => {
  let contextMenuHandler;
  let mainWindow;
  let popup;

  beforeEach(() => {
    jest.clearAllMocks();

    popup = jest.fn();
    Menu.buildFromTemplate.mockReturnValue({ popup });

    mainWindow = {
      webContents: {
        on: jest.fn((event, handler) => {
          if (event === 'context-menu') {
            contextMenuHandler = handler;
          }
        }),
        copyImageAt: jest.fn()
      }
    };

    registerContextMenu(mainWindow);
  });

  it('copies a response image from the context menu', () => {
    const params = {
      mediaType: 'image',
      srcURL: 'data:image/png;base64,aW1hZ2U=',
      x: 20,
      y: 30
    };

    contextMenuHandler({}, params);

    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1);

    const template = Menu.buildFromTemplate.mock.calls[0][0];
    expect(template[0].label).toBe('Copy image');

    template[0].click();

    expect(mainWindow.webContents.copyImageAt).toHaveBeenCalledWith(20, 30);
    expect(popup).toHaveBeenCalledWith({ window: mainWindow });
  });

  it('does not show the menu for non-response images', () => {
    contextMenuHandler({}, {
      mediaType: 'image',
      srcURL: 'https://example.com/image.png',
      x: 20,
      y: 30
    });

    contextMenuHandler({}, {
      mediaType: 'none',
      srcURL: '',
      x: 20,
      y: 30
    });

    expect(Menu.buildFromTemplate).not.toHaveBeenCalled();
  });
});
