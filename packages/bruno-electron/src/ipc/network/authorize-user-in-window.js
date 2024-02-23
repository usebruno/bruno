const { BrowserWindow } = require('electron');

const authorizeUserInWindow = ({ authorizeUrl, callbackUrl }) => {
  return new Promise(async (resolve, reject) => {
    let finalUrl = null;

    const window = new BrowserWindow({
      webPreferences: {
        nodeIntegration: false
      },
      show: false
    });
    window.on('ready-to-show', window.show.bind(window));

    function onWindowRedirect(url) {
      // check if the url contains an authorization code
      if (url.match(/(code=).*/)) {
        finalUrl = url;
        if (url && finalUrl.includes(callbackUrl)) {
          window.close();
        } else {
          reject(new Error('Invalid Callback Url'));
        }
      }
    }

    window.on('close', () => {
      if (finalUrl) {
        try {
          const callbackUrlWithCode = new URL(finalUrl);
          const authorizationCode = callbackUrlWithCode.searchParams.get('code');

          return resolve(authorizationCode);
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
      reject(error);
      window.close();
    }
  });
};

module.exports = { authorizeUserInWindow };
