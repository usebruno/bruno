import { containsGitHubToken, getSafeGitRemoteUrls, hasUrlCredentials, isGitRepositoryUrl } from './index';

describe('hasUrlCredentials', () => {
  it.each([
    ['https://ghp_token@github.com/acme/api.git', true],
    ['https://user:pass@github.com/acme/api.git', true],
    ['http://user@example.com/acme/api.git', true],
    ['  https://ghp_token@github.com/acme/api.git  ', true],
    ['git+https://ghp_token@github.com/acme/api.git', true],
    ['git://ghp_token@github.com/acme/api.git', true],
    ['https://ghp_token@github.com:abc/acme/api.git', true],
    ['https://ghp_token@github.com\\acme\\api.git', true],
    ['ssh://git:ghp_token@github.com/acme/api.git', true],
    ['user:pass@github.com:acme/api.git', true],
    ['https:/ghp_token@github.com/acme/api.git', true],
    ['https:ghp_token@github.com/acme/api.git', true],
    ['https:///ghp_token@github.com/acme/api.git', true],
    ['http:/user:pass@github.com/acme/api.git', true],
    ['https://github.com/acme/api.git', false],
    ['https://github.com/acme/api.git?ref=a@b', false],
    ['ssh://git@github.com/acme/api.git', false],
    ['git@github.com:acme/api.git', false],
    ['github.com/acme/api', false],
    ['', false],
    [null, false]
  ])('%p -> %p', (url, expected) => {
    expect(hasUrlCredentials(url)).toBe(expected);
  });
});

describe('containsGitHubToken', () => {
  test('should return true for a URL containing a GitHub token', () => {
    expect(containsGitHubToken('https://ghp_abcdefgh1234567890abcdefgh12345678@github.com'))
      .toBe(true);
  });

  test('should return false for a URL without a GitHub token', () => {
    expect(containsGitHubToken('https://github.com/user/repo.git'))
      .toBe(false);
  });

  test('should return false for an empty string', () => {
    expect(containsGitHubToken(''))
      .toBe(false);
  });

  test('should return false for a null value', () => {
    expect(containsGitHubToken(null))
      .toBe(false);
  });

  test('should return false for a URL with a similar but invalid token', () => {
    expect(containsGitHubToken('https://ghz_abcdefgh1234567890@github.com'))
      .toBe(false);
  });
});

describe('getSafeGitRemoteUrls', () => {
  test('should filter out URLs containing GitHub tokens', () => {
    const remotes = [
      { refs: { fetch: 'https://ghp_abcdefgh1234567890abcdefgh12345678@github.com' } },
      { refs: { fetch: 'https://github.com/user/repo.git' } },
      { refs: { fetch: 'git@github.com:user/repo.git' } }
    ];
    expect(getSafeGitRemoteUrls(remotes)).toEqual([
      'https://github.com/user/repo.git',
      'git@github.com:user/repo.git'
    ]);
  });

  test('should return an empty array if all URLs contain GitHub tokens', () => {
    const remotes = [
      { refs: { fetch: 'https://ghp_abcdefgh1234567890abcdefgh12345678@github.com' } },
      { refs: { fetch: 'https://gho_abcdefgh1234567890abcdefgh12345678@github.com' } }
    ];
    expect(getSafeGitRemoteUrls(remotes)).toEqual([]);
  });

  test('should return an empty array if no valid URLs are present', () => {
    const remotes = [
      { refs: { fetch: '' } },
      { refs: { fetch: null } },
      { refs: { fetch: undefined } }
    ];
    expect(getSafeGitRemoteUrls(remotes)).toEqual([]);
  });

  test('should return an empty array if input is null or undefined', () => {
    expect(getSafeGitRemoteUrls(null)).toEqual([]);
    expect(getSafeGitRemoteUrls(undefined)).toEqual([]);
  });

  test('should ignore remotes with no fetch property', () => {
    const remotes = [
      { refs: {} },
      {}
    ];
    expect(getSafeGitRemoteUrls(remotes)).toEqual([]);
  });
});

describe('isGitRepositoryUrl', () => {
  test('should return true for valid HTTPS GitHub URLs', () => {
    expect(isGitRepositoryUrl('https://github.com/user/repo.git')).toBe(true);
    expect(isGitRepositoryUrl('https://github.com/user/repo')).toBe(true); // automatically adds .git suffix
  });

  test('should return true for valid SSH GitHub URLs', () => {
    expect(isGitRepositoryUrl('git@github.com:user/repo.git')).toBe(true);
  });

  test('should return true for custom Git server URLs', () => {
    expect(isGitRepositoryUrl('https://git.example.com/user/repo.git')).toBe(true);
    expect(isGitRepositoryUrl('git@git.example.com:user/repo.git')).toBe(true);
  });

  test('should return false for invalid URLs', () => {
    expect(isGitRepositoryUrl('')).toBe(false);
    expect(isGitRepositoryUrl('not-a-url')).toBe(false);
    expect(isGitRepositoryUrl('https://example.com')).toBe(false);
    expect(isGitRepositoryUrl('ftp://github.com/user/repo.git')).toBe(false);
  });

  test('should return true for HTTPS URLs without .git suffix for valid Git hosts', () => {
    expect(isGitRepositoryUrl('https://github.com/user/repo')).toBe(true);
    expect(isGitRepositoryUrl('https://gitlab.com/user/repo')).toBe(true);
    expect(isGitRepositoryUrl('https://bitbucket.org/user/repo')).toBe(true);
  });

  test('should return false for null or undefined', () => {
    expect(isGitRepositoryUrl(null)).toBe(false);
    expect(isGitRepositoryUrl(undefined)).toBe(false);
  });

  test('should handle malformed URLs gracefully', () => {
    expect(isGitRepositoryUrl('https://')).toBe(false);
    expect(isGitRepositoryUrl('git@')).toBe(false);
    expect(isGitRepositoryUrl('://invalid')).toBe(false);
  });
});
