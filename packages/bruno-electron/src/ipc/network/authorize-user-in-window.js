const { BrowserWindow } = require('electron');
const { preferencesUtil } = require('../../store/preferences');

const matchesCallbackUrl = (url, callbackUrl) => {
  return url ? url.href.startsWith(callbackUrl.href) : false;
};

const authorizeUserInWindow = ({ authorizeUrl, callbackUrl, session }) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;
    let debugInfo = {
      data: []
    };
    let currentMainRequest = null;

    let allOpenWindows = BrowserWindow.getAllWindows();

    // Close all windows except the main window (assumed to have id 1)
    let windowsExcludingMain = allOpenWindows.filter((w) => w.id !== 1);
    windowsExcludingMain.forEach((w) => {
      w.close();
    });

    const window = new BrowserWindow({
      webPreferences: {
        nodeIntegration: false,
        partition: session
      },
      show: false
    });
    window.on('ready-to-show', window.show.bind(window));

    // Ensure the browser window complies with "SSL/TLS Certificate Verification" preference
    window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      event.preventDefault();
      callback(!preferencesUtil.shouldVerifyTls());
    });

    const { session: webSession } = window.webContents;

    // Intercept request events and gather data
    webSession.webRequest.onBeforeRequest((details, callback) => {
      const { id: requestId, url, method, resourceType, frameId } = details;
      if (resourceType === 'mainFrame') {
        // This is a main frame request
        currentMainRequest = {
          requestId,
          resourceType,
          frameId,
          request: {
            url,
            method,
            headers: {},
            error: null
          },
          response: {
            headers: {},
            status: null,
            statusText: null,
            error: null
          },
          fromCache: false,
          completed: true,
          requests: [], // No sub-requests in this context
        };
        // Add to mainRequests

        // pushing the currentMainRequest to debugInfo
        // the currentMainRequest will be further updated by object reference
        debugInfo.data.push(currentMainRequest);
      }

      callback({ cancel: false });
    });

    webSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const { id: requestId, requestHeaders, method, url } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.request = {
          url,
          headers: requestHeaders,
          method
        };
      }
      callback({ cancel: false, requestHeaders });
    });

    webSession.webRequest.onHeadersReceived((details, callback) => {
      const { id: requestId, url, statusCode, responseHeaders, method } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.response = {
          url,
          method,
          status: statusCode,
          headers: responseHeaders
        };
      }
      callback({ cancel: false, responseHeaders });
    });

    webSession.webRequest.onCompleted((details) => {
      const { id: requestId, fromCache } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.completed = true;
        currentMainRequest.fromCache = fromCache;
      }
    });

    webSession.webRequest.onErrorOccurred((details) => {
      const { id: requestId, error } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.response.error = error;
      }
    });

    function onWindowRedirect(url) {
      // Handle redirects as needed

      // Check if redirect is to the callback URL and contains an authorization code
      if (matchesCallbackUrl(new URL(url), new URL(callbackUrl))) {
        finalUrl = url;
        window.close();
      }

      // Handle OAuth error responses
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('error')) {
        const error = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        const errorUri = urlObj.searchParams.get('error_uri');
        let errorData = {
          message: 'Authorization Failed!',
          error,
          errorDescription,
          errorUri
        };
        reject(new Error(JSON.stringify(errorData)));
        window.close();
      }
    }

    // Update currentMainRequest when navigation occurs
    window.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) {
        // Reset currentMainRequest since a new navigation is starting
        currentMainRequest = null;
      }
    });

    window.webContents.on('did-navigate', (event, url) => {
      onWindowRedirect(url);
    });

    window.webContents.on('will-redirect', (event, url) => {
      onWindowRedirect(url);
    });

    window.on('close', () => {
      // Clean up listeners to prevent memory leaks
      window.webContents.removeAllListeners();
      webSession.webRequest.onBeforeRequest(null);
      webSession.webRequest.onBeforeSendHeaders(null);
      webSession.webRequest.onHeadersReceived(null);
      webSession.webRequest.onCompleted(null);
      webSession.webRequest.onErrorOccurred(null);

      if (finalUrl) {
        try {
          const callbackUrlWithCode = new URL(finalUrl);
          const authorizationCode = callbackUrlWithCode.searchParams.get('code');
          return resolve({ authorizationCode, debugInfo });
        } catch (error) {
          return reject(error);
        }
      } else {
        return reject(new Error('Authorization window closed'));
      }
    });

    try {
      await window.loadURL(authorizeUrl);
    } catch (error) {
      // Ignore ERR_ABORTED errors that occur during redirects
      if (error.code === 'ERR_ABORTED') {
        console.debug('Ignoring ERR_ABORTED during authorizeUserInWindow');
        return;
      }
      reject(error);
      window.close();
    }
  });
};

module.exports = { authorizeUserInWindow, matchesCallbackUrl };