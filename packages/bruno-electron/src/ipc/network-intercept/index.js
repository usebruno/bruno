const { ipcMain } = require('electron');
const { getProxyServer, DEFAULT_PORT } = require('./proxy-server');
const { getCAManager } = require('./ca-manager');
const { getBrowserLauncher } = require('./browser-launcher');

/**
 * Register all network intercept IPC handlers
 * @param {BrowserWindow} mainWindow - The main Electron window
 */
const registerNetworkInterceptIpc = (mainWindow) => {
  const proxyServer = getProxyServer();
  const caManager = getCAManager();
  const browserLauncher = getBrowserLauncher();

  // Forward proxy events to renderer
  proxyServer.on('request', (request) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('network-intercept:request', request);
    }
  });

  proxyServer.on('response', (data) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('network-intercept:response', data);
    }
  });

  proxyServer.on('error', (error) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('network-intercept:error', error);
    }
  });

  // Start proxy server
  ipcMain.handle('network-intercept:start', async (event, options = {}) => {
    try {
      const port = options.port || DEFAULT_PORT;
      const result = await proxyServer.start(port);
      return { success: true, port: result.port };
    } catch (error) {
      console.error('Failed to start proxy:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop proxy server
  ipcMain.handle('network-intercept:stop', async () => {
    try {
      await proxyServer.stop();
      // Also close any launched browsers
      await browserLauncher.closeAll();
      return { success: true };
    } catch (error) {
      console.error('Failed to stop proxy:', error);
      return { success: false, error: error.message };
    }
  });

  // Get proxy status
  ipcMain.handle('network-intercept:status', async () => {
    return proxyServer.getStatus();
  });

  // Get CA certificate info
  ipcMain.handle('network-intercept:get-ca-info', async () => {
    try {
      await caManager.initialize();
      return { success: true, info: caManager.getCAInfo() };
    } catch (error) {
      console.error('Failed to get CA info:', error);
      return { success: false, error: error.message };
    }
  });

  // Get CA certificate PEM for download/installation
  ipcMain.handle('network-intercept:get-ca-cert', async () => {
    try {
      await caManager.initialize();
      return { success: true, cert: caManager.getCACertPem(), path: caManager.caCertPath };
    } catch (error) {
      console.error('Failed to get CA cert:', error);
      return { success: false, error: error.message };
    }
  });

  // Regenerate CA certificate
  ipcMain.handle('network-intercept:regenerate-ca', async () => {
    try {
      const info = await caManager.regenerateCA();
      return { success: true, info };
    } catch (error) {
      console.error('Failed to regenerate CA:', error);
      return { success: false, error: error.message };
    }
  });

  // Get available browsers
  ipcMain.handle('network-intercept:get-browsers', async () => {
    try {
      const browsers = await browserLauncher.detectBrowsers();
      return { success: true, browsers };
    } catch (error) {
      console.error('Failed to detect browsers:', error);
      return { success: false, error: error.message };
    }
  });

  // Launch browser with proxy
  ipcMain.handle('network-intercept:launch-browser', async (event, browserType) => {
    try {
      const port = proxyServer.getPort();
      if (!proxyServer.isRunning) {
        return { success: false, error: 'Proxy server is not running' };
      }
      const result = await browserLauncher.launch(browserType, port);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to launch browser:', error);
      return { success: false, error: error.message };
    }
  });

  // Close launched browser
  ipcMain.handle('network-intercept:close-browser', async (event, browserId) => {
    try {
      await browserLauncher.close(browserId);
      return { success: true };
    } catch (error) {
      console.error('Failed to close browser:', error);
      return { success: false, error: error.message };
    }
  });

  // Get launched browsers
  ipcMain.handle('network-intercept:get-launched-browsers', async () => {
    return browserLauncher.getLaunchedBrowsers();
  });

  // Get terminal setup command
  ipcMain.handle('network-intercept:get-terminal-setup', async () => {
    const port = proxyServer.getPort();
    const isRunning = proxyServer.isRunning;

    if (!isRunning) {
      return { success: false, error: 'Proxy server is not running' };
    }

    const bashCommand = `export HTTP_PROXY=http://127.0.0.1:${port} HTTPS_PROXY=http://127.0.0.1:${port}`;
    const powershellCommand = `$env:HTTP_PROXY="http://127.0.0.1:${port}"; $env:HTTPS_PROXY="http://127.0.0.1:${port}"`;

    return {
      success: true,
      port,
      commands: {
        bash: bashCommand,
        zsh: bashCommand,
        powershell: powershellCommand,
        cmd: `set HTTP_PROXY=http://127.0.0.1:${port} && set HTTPS_PROXY=http://127.0.0.1:${port}`
      }
    };
  });

  // Cleanup on app quit
  const cleanup = async () => {
    try {
      await proxyServer.stop();
      await browserLauncher.closeAll();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Handle app quit
  mainWindow.on('close', cleanup);

  return {
    cleanup
  };
};

module.exports = registerNetworkInterceptIpc;
