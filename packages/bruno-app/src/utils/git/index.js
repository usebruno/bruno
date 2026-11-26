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

const TOKEN_PREFIX = /^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|gldt-|ATBB|ATATT)/;
const MIN_TOKEN_LENGTH = 30;

const isCredentialUser = (userInfo) => userInfo.includes(':') || TOKEN_PREFIX.test(userInfo) || userInfo.length >= MIN_TOKEN_LENGTH;

// git still reads a user from URLs with a missing or extra slash, like https:/token@host
const hasParsedNonSshUser = (url) => {
  try {
    const { user, protocol } = gitUrlParse(url);
    return Boolean(user) && protocol !== 'ssh';
  } catch {
    return false;
  }
};

export const hasUrlCredentials = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmedUrl = url.trim();
  const schemeMatch = URL_WITH_SCHEME.exec(trimmedUrl);
  if (schemeMatch) {
    const authority = schemeMatch[2];
    const atIndex = authority.lastIndexOf('@');
    if (atIndex !== -1) {
      return isCredentialUser(authority.slice(0, atIndex));
    }
  } else {
    const scpMatch = SCP_LIKE_URL.exec(trimmedUrl);
    if (scpMatch && isCredentialUser(scpMatch[1])) {
      return true;
    }
  }
  return hasParsedNonSshUser(trimmedUrl);
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

export const isPasteIntoUrlHost = ({ value, selectionStart, pastedText }) => {
  if (typeof value !== 'string' || typeof pastedText !== 'string' || pastedText.includes('/')) {
    return false;
  }
  const trimmedValue = value.trimStart();
  const match = URL_WITH_SCHEME.exec(trimmedValue);
  if (!match) {
    return false;
  }
  const hostStart = value.length - trimmedValue.length + match[1].length + '://'.length;
  const hostEnd = hostStart + match[2].length;
  return selectionStart >= hostStart && selectionStart <= hostEnd;
};
