const { ipcMain } = require('electron');
const openAboutWindow = require('about-window').default;
const { join } = require('path');

const template = [
  {
    label: 'Collection',
    submenu: [
      {
        label: 'Open Local Collection',
        click() {
          ipcMain.emit('main:open-collection');
        }
      },
      { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    role: 'window',
    submenu: [{ role: 'minimize' }, { role: 'close' }]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'About Bruno',
        click: () =>
          openAboutWindow({
            icon_path: join(__dirname, '../../resources/icons/png/128x128.png'),
            homepage: 'https://www.usebruno.com/',
            package_json_dir: join(__dirname, '../..')
          })
      },
      { label: 'Learn More' }
    ]
  }
];

module.exports = template;
