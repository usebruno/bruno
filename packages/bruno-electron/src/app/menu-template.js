const { ipcMain } = require('electron');
const os = require('os');
const openAboutWindow = require('about-window').default;
const { join } = require('path');

const template = [
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
        label: 'Open Recent',
        role: 'recentdocuments',
        visible: os.platform() == 'darwin',
        submenu: [
          {
            label: 'Clear Recent',
            role: 'clearrecentdocuments'
          }
        ]
      },
      {
        label: 'Preferences',
        accelerator: 'CommandOrControl+,',
        click() {
          ipcMain.emit('main:open-preferences');
        }
      },
      { type: 'separator' },
      { role: 'quit' },
      {
        label: 'Force Quit',
        click() {
          process.exit();
        }
      }
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
      { role: 'resetZoom' },
      { role: 'zoomIn', accelerator: 'CommandOrControl+=' },
      { role: 'zoomOut' },
      { type: 'separator' },      
      { role: 'togglefullscreen' }
    ]
  },
  {
    role: 'window',
    submenu: [{ role: 'minimize' }, { role: 'close', accelerator: 'CommandOrControl+Shift+Q' }]
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

module.exports = template;
