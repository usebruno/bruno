const { execSync } = require('child_process');

const getGitRemoteUrl = (collectionPath) => {
  try {
    const url = execSync('git remote get-url origin', {
      cwd: collectionPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000
    })
      .toString()
      .trim();
    return url || undefined;
  } catch (error) {
    return undefined;
  }
};

module.exports = { getGitRemoteUrl };
