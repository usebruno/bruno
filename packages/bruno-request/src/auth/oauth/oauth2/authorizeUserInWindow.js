import { BrowserWindow } from 'electron';
import { URL } from 'url';
import { matchesCallbackUrl } from '../../../utils';
// import { preferencesUtil } from '../../utils/preferencesUtil';

const authorizeUserInWindow = ({
  authorizeUrl,
  callbackUrl,
  session
}) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;
    const debugInfo = { data: [] };
    let currentMainRequest = null;

    const allOpenWindows = BrowserWindow.getAllWindows();

    // Close all windows except the main window (assumed to have id 1)
    const windowsExcludingMain = allOpenWindows.filter((w) => w.id !== 1);
    windowsExcludingMain.forEach((w) => w.close());

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
      // callback(!preferencesUtil.shouldVerifyTls());
      // Fixme:Bring back the preferencesUTil here
      callback(!true);
    });

    const { session: webSession } = window.webContents;

    // Intercept request events and gather data
    webSession.webRequest.onBeforeRequest((details, callback) => {
      // fixme:frameid is removed as it not present in the details object
      const { id: requestId, url, method, resourceType } = details;
      if (resourceType === 'mainFrame') {
        currentMainRequest = {
          requestId,
          resourceType,
          request: { url, method, headers: {}, error: null },
          response: { headers: {}, status: null, statusText: null, error: null },
          fromCache: false,
          completed: true,
          requests: [] // No sub-requests in this context
        };
        debugInfo.data.push(currentMainRequest);
      }
      callback({ cancel: false });
    });

    webSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const { id: requestId, requestHeaders, method, url } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.request = { url, headers: requestHeaders, method };
      }
      callback({ cancel: false, requestHeaders });
    });

    webSession.webRequest.onHeadersReceived((details, callback) => {
      const { id: requestId, url, statusCode, responseHeaders, method } = details;
      if (currentMainRequest?.requestId === requestId) {
        currentMainRequest.response = { url, method, status: statusCode, headers: responseHeaders };
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
        const errorData = { message: 'Authorization Failed!', error, errorDescription, errorUri };
        reject(new Error(JSON.stringify(errorData)));
        window.close();
      }
    }

    // Update currentMainRequest when navigation occurs
    window.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) {
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
          if (!authorizationCode) {
            reject(new Error('Authorization code not found in callback URL'));
            return;
          }
          resolve({ authorizationCode, debugInfo });
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Authorization window closed'));
      }
    });

    try {
      await window.loadURL(authorizeUrl);
    } catch (error) {
      if (error?.code === 'ERR_ABORTED') {
        console.debug('Ignoring ERR_ABORTED during authorizeUserInWindow');
        return;
      }
      reject(error);
      window.close();
    }
  });
};

export { authorizeUserInWindow };
