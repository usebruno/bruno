const fs = require('fs');
const path = require('path');
const { execSync } = require('node:child_process');
const isDev = require('electron-is-dev');
const os = require('os');

if (isDev) {
  if (!fs.existsSync(path.join(__dirname, '../../bruno-js/src/sandbox/bundle-browser-rollup.js'))) {
    console.log('JS Sandbox libraries have not been bundled yet');
    console.log('Please run the below command \nnpm run sandbox:bundle-libraries --workspace=packages/bruno-js');
    throw new Error('JS Sandbox libraries have not been bundled yet');
  }
}

const { format } = require('url');
const { BrowserWindow, app, session, Menu, globalShortcut, ipcMain, nativeTheme } = require('electron');
const { setContentSecurityPolicy } = require('electron-util');

if (isDev && process.env.ELECTRON_USER_DATA_PATH) {
  console.debug('`ELECTRON_USER_DATA_PATH` found, modifying `userData` path: \n'
    + `\t${app.getPath('userData')} -> ${process.env.ELECTRON_USER_DATA_PATH}`);

  app.setPath('userData', process.env.ELECTRON_USER_DATA_PATH);
}

// Command line switches
if (os.platform() === 'linux') {
  // Use portal version 4 that supports current_folder option
  // to address https://github.com/usebruno/bruno/issues/5471
  // Runtime sets the default version to 3, refs https://github.com/electron/electron/pull/44426
  app.commandLine.appendSwitch('xdg-portal-required-version', '4');
}

const menuTemplate = require('./app/menu-template');
const { openCollection } = require('./app/collections');
const LastOpenedCollections = require('./store/last-opened-collections');
const registerNetworkIpc = require('./ipc/network');
const registerCollectionsIpc = require('./ipc/collection');
const registerFilesystemIpc = require('./ipc/filesystem');
const registerPreferencesIpc = require('./ipc/preferences');
const registerSystemMonitorIpc = require('./ipc/system-monitor');
const registerWorkspaceIpc = require('./ipc/workspace');
const registerApiSpecIpc = require('./ipc/apiSpec');
const collectionWatcher = require('./app/collection-watcher');
const WorkspaceWatcher = require('./app/workspace-watcher');
const ApiSpecWatcher = require('./app/apiSpecsWatcher');
const { loadWindowState, saveBounds, saveMaximized } = require('./utils/window');
const { globalEnvironmentsManager } = require('./store/workspace-environments');
const registerNotificationsIpc = require('./ipc/notifications');
const registerGlobalEnvironmentsIpc = require('./ipc/global-environments');
const TerminalManager = require('./ipc/terminal');
const { safeParseJSON, safeStringifyJSON } = require('./utils/common');
const { getDomainsWithCookies } = require('./utils/cookies');
const { cookiesStore } = require('./store/cookies');
const onboardUser = require('./app/onboarding');
const SystemMonitor = require('./app/system-monitor');
const { getIsRunningInRosetta } = require('./utils/arch');
const { handleAppProtocolUrl, getAppProtocolUrlFromArgv } = require('./utils/deeplink');

const lastOpenedCollections = new LastOpenedCollections();
const systemMonitor = new SystemMonitor();
const terminalManager = new TerminalManager();

const workspaceWatcher = new WorkspaceWatcher();
const apiSpecWatcher = new ApiSpecWatcher();

// Reference: https://content-security-policy.com/
const contentSecurityPolicy = [
  'default-src \'self\'',
  'connect-src \'self\' https://*.posthog.com',
  'font-src \'self\' https: data:;',
  'frame-src data:',
  'script-src \'self\' data:',
  // this has been commented out to make oauth2 work
  // "form-action 'none'",
  // we make an exception and allow http for images so that
  // they can be used as link in the embedded markdown editors
  'img-src \'self\' blob: data: http: https:',
  'media-src \'self\' blob: data: https:',
  'style-src \'self\' \'unsafe-inline\' https:'
];

setContentSecurityPolicy(contentSecurityPolicy.join(';') + ';');

const menu = Menu.buildFromTemplate(menuTemplate);
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

let mainWindow;
let appProtocolUrl;

// Helper function to focus and restore the main window
const focusMainWindow = () => {
  if (mainWindow) {
    app.focus({ steal: true });
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
};

// Parse protocol URL from command line arguments (if any)
appProtocolUrl = getAppProtocolUrlFromArgv(process.argv);

// Single instance lock - ensures only one instance of Bruno runs at a time (enabled by default)
const useSingleInstance = process.env.DISABLE_SINGLE_INSTANCE !== 'true';
const gotTheLock = useSingleInstance ? app.requestSingleInstanceLock() : true;

if (useSingleInstance && !gotTheLock) {
  // Another instance is already running, quit immediately
  app.quit();
} else {
  // This is the primary instance (or single instance is disabled)

  // Try to remove any existing registrations
  app.removeAsDefaultProtocolClient('bruno');
  // Register as default handler for `bruno://` protocol URLs
  app.setAsDefaultProtocolClient('bruno');

  if (isLinux) {
    try {
      execSync('xdg-mime default bruno.desktop x-scheme-handler/bruno');
    } catch (err) {}
  }

  // Handle protocol URLs for MacOS
  if (isMac) {
    app.on('open-url', (event, url) => {
      event.preventDefault();
      if (url) {
        if (mainWindow) {
          focusMainWindow();
          handleAppProtocolUrl(url);
        } else {
          // Store for handling after window is ready
          appProtocolUrl = url;
        }
      }
    });
  }

  // Handle second instance attempts - focus primary window on all platforms
  app.on('second-instance', (event, commandLine) => {
    focusMainWindow();
    // Extract and handle protocol URL from the second instance attempt
    const url = getAppProtocolUrlFromArgv(commandLine);
    if (url) {
      handleAppProtocolUrl(url);
    }
  });
}

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  if (isDev) {
    const { installExtension, REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
    try {
      const extensions = await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS], {
        loadExtensionOptions: { allowFileAccess: true }
      });
      console.log(`Added Extensions:  ${extensions.map((ext) => ext.name).join(', ')}`);
      await require('node:timers/promises').setTimeout(1000);
      session.defaultSession.getAllExtensions().map((ext) => {
        console.log(`Loading Extension: ${ext.name}`);
        session.defaultSession.loadExtension(ext.path);
      });
    } catch (err) {
      console.error('An error occurred while loading extensions: ', err);
    }
  }

  // Initialize system proxy cache early (non-blocking)
  const { initializeSystemProxy } = require('./store/system-proxy');
  initializeSystemProxy().catch((err) => {
    console.warn('Failed to initialize system proxy cache:', err);
  });

  Menu.setApplicationMenu(menu);
  const { maximized, x, y, width, height } = loadWindowState();

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 700,
    minHeight: 400,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    title: 'Bruno',
    icon: path.join(__dirname, 'about/256x256.png'),
    titleBarStyle: isMac ? 'hiddenInset' : isWindows ? 'hidden' : undefined,
    frame: isLinux ? false : true,
    trafficLightPosition: isMac ? { x: 12, y: 10 } : undefined
    // we will bring this back
    // see https://github.com/usebruno/bruno/issues/440
    // autoHideMenuBar: true
  });

  if (maximized) {
    mainWindow.maximize();
  }

  ipcMain.on('renderer:window-minimize', () => {
    if (!isWindows && !isLinux) return;
    mainWindow.minimize();
  });

  ipcMain.on('renderer:window-maximize', () => {
    if (!isWindows && !isLinux) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('renderer:window-close', () => {
    if (!isWindows && !isLinux) return;
    mainWindow.close();
  });

  ipcMain.handle('renderer:window-is-maximized', () => {
    if (!isWindows && !isLinux) return false;
    return mainWindow.isMaximized();
  });

  ipcMain.handle('renderer:open-preferences', () => {
    ipcMain.emit('main:open-preferences');
  });

  ipcMain.handle('renderer:toggle-devtools', () => {
    mainWindow.webContents.toggleDevTools();
  });

  ipcMain.handle('renderer:reset-zoom', () => {
    mainWindow.webContents.setZoomLevel(0);
  });

  ipcMain.handle('renderer:zoom-in', () => {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
  });

  ipcMain.handle('renderer:zoom-out', () => {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
  });

  ipcMain.handle('renderer:toggle-fullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  ipcMain.handle('renderer:open-docs', () => {
    ipcMain.emit('main:open-docs');
  });

  ipcMain.handle('renderer:open-about', () => {
    const { version } = require('../package.json');
    const aboutBruno = require('./app/about-bruno');
    const aboutWindow = new BrowserWindow({
      width: 350,
      height: 250,
      webPreferences: {
        nodeIntegration: true
      }
    });
    aboutWindow.removeMenu();
    aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutBruno({ version }))}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  const devPort = process.env.BRUNO_DEV_PORT || 3000;
  const url = isDev
    ? `http://localhost:${devPort}`
    : format({
        pathname: path.join(__dirname, '../web/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(url).catch((reason) => {
    console.error(`Error: Failed to load URL: "${url}" (Electron shows a blank screen because of this).`);
    console.error('Original message:', reason);
    if (isDev) {
      console.error(
        'Could not connect to Next.Js dev server, is it running?'
        + ' Start the dev server using "npm run dev:web" and restart electron'
      );
    } else {
      console.error(
        'If you are using an official production build: the above error is most likely a bug! '
        + ' Please report this under: https://github.com/usebruno/bruno/issues'
      );
    }
  });

  let boundsTimeout;
  const handleBoundsChange = () => {
    if (!mainWindow.isMaximized()) {
      if (boundsTimeout) {
        clearTimeout(boundsTimeout);
      }
      boundsTimeout = setTimeout(() => {
        saveBounds(mainWindow);
      }, 100);
    }
  };

  mainWindow.on('resize', handleBoundsChange);
  mainWindow.on('move', handleBoundsChange);

  mainWindow.on('maximize', () => {
    saveMaximized(true);
    mainWindow.webContents.send('main:window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    saveMaximized(false);
    mainWindow.webContents.send('main:window-unmaximized');
  });

  // Full screen events for title bar padding adjustment
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('main:enter-full-screen');
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('main:leave-full-screen');
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    terminalManager.cleanup(mainWindow.webContents);
    ipcMain.emit('main:start-quit-flow');
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    event.preventDefault();
    if (/^(http:\/\/|https:\/\/)/.test(url)) {
      require('electron').shell.openExternal(url);
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (appProtocolUrl) {
      handleAppProtocolUrl(appProtocolUrl);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (['https:', 'http:'].includes(protocol)) {
        require('electron').shell.openExternal(url);
      }
    } catch (e) {
      console.error(e);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    let ogSend = mainWindow.webContents.send;
    mainWindow.webContents.send = function (channel, ...args) {
      return ogSend.apply(this, [channel, ...args?.map((_) => {
        // todo: replace this with @msgpack/msgpack encode/decode
        return safeParseJSON(safeStringifyJSON(_));
      })]);
    };

    // Handle onboarding
    await onboardUser(mainWindow, lastOpenedCollections);

    // Send cookies list after renderer is ready
    try {
      cookiesStore.initializeCookies();
      const cookiesList = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', cookiesList);
    } catch (err) {
      console.error('Failed to load cookies for renderer', err);
    }

    mainWindow.webContents.send('main:app-loaded', {
      isRunningInRosetta: getIsRunningInRosetta()
    });
  });

  // register all ipc handlers
  registerNetworkIpc(mainWindow);
  registerGlobalEnvironmentsIpc(mainWindow, globalEnvironmentsManager);
  registerCollectionsIpc(mainWindow, collectionWatcher);
  registerPreferencesIpc(mainWindow, collectionWatcher);
  registerWorkspaceIpc(mainWindow, workspaceWatcher);
  registerApiSpecIpc(mainWindow, apiSpecWatcher);
  registerNotificationsIpc(mainWindow, collectionWatcher);
  registerFilesystemIpc(mainWindow);
  registerSystemMonitorIpc(mainWindow, systemMonitor);
});

// Quit the app once all windows are closed
app.on('before-quit', () => {
  // Release single instance lock to allow other instances to take over
  if (useSingleInstance && gotTheLock) {
    app.releaseSingleInstanceLock();
  }

  try {
    cookiesStore.saveCookieJar(true);
  } catch (err) {
    console.warn('Failed to flush cookies on quit', err);
  }

  // Stop system monitoring
  systemMonitor.stop();

  try {
    terminalManager.killAll();
  } catch (err) {
    console.error('Failed to kill all terminals on quit', err);
  }
});

app.on('window-all-closed', app.quit);

// Open collection from Recent menu (#1521)
app.on('open-file', (event, path) => {
  openCollection(mainWindow, collectionWatcher, path);
});

// Register the global shortcuts
app.on('browser-window-focus', () => {
  // Quick fix for Electron issue #29996: https://github.com/electron/electron/issues/29996
  globalShortcut.register('Ctrl+=', () => {
    mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 1);
  });
});

// Disable global shortcuts when not focused
app.on('browser-window-blur', () => {
  globalShortcut.unregisterAll();
});
