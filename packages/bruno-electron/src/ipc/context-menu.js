const { Menu } = require('electron');

const registerContextMenu = (mainWindow) => {
  mainWindow.webContents.on('context-menu', (event, params) => {
    const isResponseImage = params.mediaType === 'image'
      && params.srcURL.startsWith('data:image/');

    if (!isResponseImage) {
      return;
    }

    const menu = Menu.buildFromTemplate([
      {
        label: 'Copy image',
        click: () => {
          mainWindow.webContents.copyImageAt(params.x, params.y);
        }
      }
    ]);

    menu.popup({ window: mainWindow });
  });
};

module.exports = registerContextMenu;
