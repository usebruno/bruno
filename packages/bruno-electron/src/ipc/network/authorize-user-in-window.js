const { BrowserWindow } = require('electron');
const { preferencesUtil } = require('../../store/preferences');

const matchesCallbackUrl = (url, callbackUrl) => {
  return url ? url.href.startsWith(callbackUrl.href) : false;
};

const openNewWindow = (session) => {
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

  return window;
};

const authorizeUserInWindow = ({ authorizeUrl, callbackUrl, session }) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;

    let window = openNewWindow(session);

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

const authorizeUserInWindowImplicit = ({ authorizeUrl, callbackUrl, session }) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;

    let window = openNewWindow(session);

    const handleRedirect = (_, url) => {
      const currentUrl = new URL(url);
      // Skip any intermediate redirects
      if (currentUrl.href.startsWith(new URL(callbackUrl).href)) {
        // If the resource owner grants the access request, the authorization
        // server issues an access token and delivers it to the client by adding
        // the following parameters to the FRAGMENT component of the redirection
        // URI using the "application/x-www-form-urlencoded" format:
        //   access_token (REQUIRED),
        //   token_type (REQUIRED),
        //   expires_in (RECOMMENDED),
        //   scope (OPTIONAL),
        //   state (if sent from client)
        // i.e. We expect the FRAGMENT component to be parsable as URLSearchParams
        const uriFragmentWithResponse = new URLSearchParams(new URL(url).hash.slice(1));

        if (uriFragmentWithResponse.has('access_token')) {
          finalUrl = currentUrl;
          window.close();
        }

        // If the resource owner denies the access request or if the request
        // fails for reasons other than a missing or invalid redirection URI,
        // the authorization server informs the client by adding the following
        // parameters to the FRAGMENT component of the redirection URI using the
        // "application/x-www-form-urlencoded" format:
        //   error (REQUIRED),
        //   errorDescription (OPTIONAL),
        //   error_uri (OPTIONAL),
        //   state (if sent from client)
        if (uriFragmentWithResponse.has('error')) {
          let errorData = {
            message: 'Access Denied',
            error: uriFragmentWithResponse.get('error'),
            errorDescription: uriFragmentWithResponse.get('errorDescription'),
            error_uri: uriFragmentWithResponse.get('error_uri')
          };

          reject(new Error(JSON.stringify(errorData)));
          window.close();
        }
      }
    };

    const handleClose = () => {
      if (finalUrl) {
        try {
          const uriFragmentWithToken = new URLSearchParams(new URL(finalUrl).hash.slice(1));
          const credentials = {
            access_token: uriFragmentWithToken.get('access_token'),
            token_type: uriFragmentWithToken.get('token_type'),
            expires_in: uriFragmentWithToken.get('expires_in')
          };
          return resolve({ credentials });
        } catch (error) {
          return reject(error);
        }
      } else {
        return reject(new Error('Authorization window closed'));
      }
    };

    // wait for the window to navigate to the callback url
    window.webContents.on('did-navigate', handleRedirect);

    window.webContents.on('will-redirect', handleRedirect);

    window.on('close', handleClose);

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

module.exports = {
  authorizeUserInWindow,
  authorizeUserInWindowImplicit,
  matchesCallbackUrl
};
