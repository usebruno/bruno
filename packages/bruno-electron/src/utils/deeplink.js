const { handleOauth2ProtocolUrl } = require('./oauth2-protocol-handler');

// Store appProtocolUrl - will be handled in the `did-finish-load` event handler
const getAppProtocolUrlFromArgv = (argv) => {
  return argv.find((arg) => arg.startsWith('bruno://'));
};

// Handle app protocol URLs
function handleAppProtocolUrl(url, mainWindow) {
  try {
    const workspaceRepositoryUrl = getWorkspaceRepositoryUrl(url);

    console.log('workspaceRepositoryUrl', workspaceRepositoryUrl);
    if (workspaceRepositoryUrl) {
      mainWindow?.webContents?.send?.('main:bruno-workspace-git-url-import', workspaceRepositoryUrl);
      return;
    }

    // Handle OAuth2 callback URLs - `bruno://app/oauth2/callback`
    if (isOauth2Url(url)) {
      handleOauth2ProtocolUrl(url);
      return;
    }

    console.error('Unsupported Bruno Deeplink URL');
  } catch (error) {
    console.error('Invalid protocol URL:', url, error?.message);
  }
}

function getWorkspaceRepositoryUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const parsedUrl = new URL(url);
    const { pathname: parsedUrlPathname } = parsedUrl;

    if (parsedUrlPathname !== '/workspace/import/git') {
      return null;
    }

    return parsedUrl?.searchParams?.get?.('url') || null;
  } catch (error) {
    console.error('Failed to parse deep link URL:', error?.message);
    return null;
  }
}

const isOauth2Url = (url) => {
  try {
    const urlObj = new URL(url);

    if (urlObj.pathname === '/oauth2/callback') {
      return true;
    }
  } catch (error) {
    console.error('[Protocol Handler] Error handling protocol URL:', error);
  }
  return false;
};

module.exports = {
  getAppProtocolUrlFromArgv,
  handleAppProtocolUrl,
  getWorkspaceRepositoryUrl,
  isOauth2Url
};
