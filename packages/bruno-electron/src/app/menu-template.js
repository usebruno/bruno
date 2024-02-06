const { ipcMain, ipcRenderer } = require('electron');
const openAboutWindow = require('about-window').default;
const { join } = require('path');

let isButtonEnabled = false;

const toggleButtonState = () => {
  isButtonEnabled = !isButtonEnabled;

  console.log('Button triggered');
};

const getFullResizeState = () => {
  return isButtonEnabled;
};

const menuTemplate = [
  {
    label: 'Collection',
    submenu: [
      {
        label: 'Open Collection',
        click() {
          ipcMain.emit('main:open-collection');
        }
      },
      {
        label: 'Preferences',
        accelerator: 'CommandOrControl+,',
        click() {
          ipcMain.emit('main:open-preferences');
        }
      },
      { type: 'separator' },
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
      { role: 'paste' },
      { role: 'selectAll' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' }
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
    submenu: [
      { role: 'minimize' },
      { role: 'close', accelerator: 'CommandOrControl+Shift+Q' },
      { type: 'separator' },
      {
        label: 'Full Resize',
        click: toggleButtonState
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'About Bruno',
        click: () =>
          openAboutWindow({
            product_name: 'Bruno',
            icon_path: join(__dirname, '../about/256x256.png'),
            css_path: join(__dirname, '../about/about.css'),
            homepage: 'https://www.usebruno.com/',
            package_json_dir: join(__dirname, '../..')
          })
      },
      { label: 'Documentation', click: () => ipcMain.emit('main:open-docs') }
    ]
  }
];

module.exports = {
  menuTemplate,
  toggleButtonState,
  isButtonEnabled,
  getFullResizeState
};
