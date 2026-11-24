import gitUrlParse from 'git-url-parse';

const isGitUrl = (str) => {
  try {
    const parsed = gitUrlParse(str);

    if (!parsed) {
      return false;
    }

    // Validate that it has the essential parts of a git URL and uses valid protocols
    const validProtocols = ['git', 'ssh', 'http', 'https'];
    return !!(
      parsed
      && parsed.owner
      && parsed.source
      && validProtocols.includes(parsed.protocol)
    );
  } catch (error) {
    return false;
  }
};

export const getRepoNameFromUrl = (url) => {
  try {
    const parsedUrl = gitUrlParse(url);
    return parsedUrl.name;
  } catch (error) {
    throw new Error('Invalid Git URL');
  }
};

export const containsGitHubToken = (remoteUrl) => {
  const GITHUB_TOKEN_REGEX = /(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{30,}/;
  return GITHUB_TOKEN_REGEX.test(remoteUrl);
};

export const getSafeGitRemoteUrls = (remotes = []) => {
  const remoteUrls = remotes
    ?.map((remote) => remote?.refs?.fetch)
    ?.filter((url) => typeof url === 'string' && url?.trim()?.length > 0);

  const safeRemoteUrls = remoteUrls
    ?.filter((remoteUrl) => !containsGitHubToken(remoteUrl));
  return safeRemoteUrls || [];
};

const URL_WITH_SCHEME = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i;
const SCP_LIKE_URL = /^([^@/\s]+)@[^:/\s]+:/;

// A user over ssh (git@host) is an account name; anywhere else, or with a password, it is a credential
export const hasUrlCredentials = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmedUrl = url.trim();
  const schemeMatch = URL_WITH_SCHEME.exec(trimmedUrl);
  if (schemeMatch) {
    const [, scheme, authority] = schemeMatch;
    const atIndex = authority.lastIndexOf('@');
    if (atIndex === -1) {
      return false;
    }
    return authority.slice(0, atIndex).includes(':') || !scheme.toLowerCase().includes('ssh');
  }
  const scpMatch = SCP_LIKE_URL.exec(trimmedUrl);
  return Boolean(scpMatch && scpMatch[1].includes(':'));
};

export const isGitRepositoryUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // First try the URL as-is
    if (isGitUrl(url)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};
