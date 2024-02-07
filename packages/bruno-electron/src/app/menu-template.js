const { ipcMain, dialog, app } = require('electron');
const openAboutWindow = require('about-window').default;
const { saveFullResizeState, loadWindowState } = require('../utils/window');
const { join } = require('path');

const toggleButtonState = () => {
  const { isFullResize } = loadWindowState();

  if (!isFullResize) {
    saveFullResizeState(true);
  } else {
    saveFullResizeState(false);
  }
};

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
        click: () => {
          const { isFullResize } = loadWindowState();

          if (!isFullResize) {
            // Open a dialog
            const options = {
              type: 'info',
              buttons: ['Cancel', 'Confirm'],
              defaultId: 1,
              title: 'Reboot Confirmation',
              message:
                'Are you sure you want to set App window to Full Resize mode and reboot the App? It might break some UI Components output.',
              detail: 'Changes will be saved for further usage'
            };
            dialog.showMessageBox(null, options).then((response) => {
              if (response.response === 1) {
                // User confirmed, initiate reboot
                toggleButtonState();
                app.relaunch();
                app.quit();
              }
            });
          } else {
            toggleButtonState();
            app.relaunch();
            app.quit();
          }
        }
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

module.exports = template;
