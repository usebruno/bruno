/**
 * GitHub Integration IPC Handlers
 *
 * Electron main-process handlers for GitHub API operations.
 * These run in the main process and have access to Node.js APIs.
 */
const https = require('https');

const GITHUB_API = 'api.github.com';

// Get token from environment variable
const getGitHubToken = () => {
  return process.env.GITHUB_TOKEN || null;
};

/**
 * Make an HTTPS request to GitHub API
 */
const makeGitHubRequest = (path) => {
  const token = getGitHubToken();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: GITHUB_API,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Bruno-Integration-GitHub',
        'Accept': 'application/vnd.github.v3+json',
        ...(token ? { Authorization: `token ${token}` } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || `GitHub API error: ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse GitHub response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
};

/**
 * Register GitHub integration IPC handlers
 * @param {BrowserWindow} mainWindow - Electron main window reference
 */
const registerGitHubIpc = (mainWindow, ipcMain) => {
  // Search repositories
  ipcMain.handle('integration:github:search', async (event, { query }) => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const result = await makeGitHubRequest(
        `/search/repositories?q=${encodeURIComponent(query)}&per_page=10&sort=stars`
      );
      console.log({ result });
      return result.items || [];
    } catch (err) {
      console.error('GitHub search error:', err.message);
      return [];
    }
  });

  // Check if GitHub is configured (has token)
  ipcMain.handle('integration:github:check-config', async () => {
    const token = getGitHubToken();
    return { configured: !!token };
  });

  // Get recent repositories for authenticated user
  ipcMain.handle('integration:github:recent-repos', async () => {
    const token = getGitHubToken();
    if (!token) {
      return { repos: [] };
    }

    try {
      const repos = await makeGitHubRequest('/user/repos?sort=updated&per_page=5');
      return { repos: Array.isArray(repos) ? repos : [] };
    } catch (err) {
      console.error('Failed to fetch user repos:', err.message);
      return { repos: [] };
    }
  });

  console.log('GitHub integration IPC handlers registered');
};

// eslint-disable-next-line no-undef
module.exports = registerGitHubIpc;
