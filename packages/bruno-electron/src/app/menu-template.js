const { ipcMain } = require('electron');
const os = require('os');
const { BrowserWindow } = require('electron');
const { version } = require('../../package.json');
const aboutBruno = require('./about-bruno');

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
      { type: 'separator' },
      {
        label: 'Reset Zoom',
        click() {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.setZoomLevel(0);
          }
        }
      },
      {
        label: 'Zoom In',
        click() {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            const current = focusedWindow.webContents.getZoomLevel();
            focusedWindow.webContents.setZoomLevel(current + 0.5);
          }
        }
      },
      {
        label: 'Zoom Out',
        click() {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            const current = focusedWindow.webContents.getZoomLevel();
            focusedWindow.webContents.setZoomLevel(current - 0.5);
          }
        }
      },
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
        click: () => {
          const aboutWindow = new BrowserWindow({
            width: 350,
            height: 250,
            webPreferences: {
              nodeIntegration: true
            }
          });
          aboutWindow.removeMenu();
          aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutBruno({ version }))}`);
        }
      },
      { label: 'Documentation', click: () => ipcMain.emit('main:open-docs') }
    ]
  }
];

module.exports = template;
