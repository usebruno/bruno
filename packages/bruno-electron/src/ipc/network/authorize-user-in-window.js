const { BrowserWindow } = require('electron');
const { preferencesUtil } = require('../../store/preferences');

const matchesCallbackUrl = (url, callbackUrl) => {
  return url ? url.href.startsWith(callbackUrl.href) : false;
};

const authorizeUserInWindow = ({ authorizeUrl, callbackUrl, session }) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;

    let allOpenWindows = BrowserWindow.getAllWindows();

    // main window id is '1'
    // get all other windows
    let windowsExcludingMain = allOpenWindows.filter((w) => w.id != 1);
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

    // We want browser window to comply with "SSL/TLS Certificate Verification" toggle in Preferences
    window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      event.preventDefault();
      callback(!preferencesUtil.shouldVerifyTls());
    });

    function onWindowRedirect(url) {
      // check if the redirect is to the callback URL and if it contains an authorization code
      if (matchesCallbackUrl(new URL(url), new URL(callbackUrl))) {
        if (!new URL(url).searchParams.has('code')) {
          reject(new Error('Invalid Callback URL: Does not contain an authorization code'));
        }
        finalUrl = url;
        window.close();
      }
      if (url.match(/(error=).*/) || url.match(/(error_description=).*/) || url.match(/(error_uri=).*/)) {
        const _url = new URL(url);
        const error = _url.searchParams.get('error');
        const errorDescription = _url.searchParams.get('error_description');
        const errorUri = _url.searchParams.get('error_uri');
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

    window.on('close', () => {
      if (finalUrl) {
        try {
          const callbackUrlWithCode = new URL(finalUrl);
          const authorizationCode = callbackUrlWithCode.searchParams.get('code');

          return resolve({ authorizationCode });
        } catch (error) {
          return reject(error);
        }
      } else {
        return reject(new Error('Authorization window closed'));
      }
    });

    // wait for the window to navigate to the callback url
    const didNavigateListener = (_, url) => {
      onWindowRedirect(url);
    };
    window.webContents.on('did-navigate', didNavigateListener);
    const willRedirectListener = (_, authorizeUrl) => {
      onWindowRedirect(authorizeUrl);
    };
    window.webContents.on('will-redirect', willRedirectListener);

    try {
      await window.loadURL(authorizeUrl);
    } catch (error) {
      // If browser redirects before load finished, loadURL throws an error with code ERR_ABORTED. This should be ignored.
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
