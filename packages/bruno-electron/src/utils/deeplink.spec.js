const { getCollectionRepositoryUrl, getWorkspaceRepositoryUrl, getAppProtocolUrlFromArgv, handleAppProtocolUrl, getOpenApiSpecUrl } = require('./deeplink');

describe('Deeplink URL Functions', () => {
  describe('getAppProtocolUrlFromArgv', () => {
    it('should return the first valid deeplink URL from argv', () => {
      const argv = ['some-command', 'bruno://app/collection/import/git?url=https://github.com/user/repo'];
      expect(getAppProtocolUrlFromArgv(argv)).toBe('bruno://app/collection/import/git?url=https://github.com/user/repo');
    });

    it('should return undefined if no valid deeplink URL is found', () => {
      const argv = ['some-command', 'random-string'];
      expect(getAppProtocolUrlFromArgv(argv)).toBeUndefined();
    });
  });

  describe('getWorkspaceRepositoryUrl', () => {
    it('should extract the repository URL from a valid workspace deeplink URL', () => {
      const url = 'bruno://app/workspace/import/git?url=https://github.com/user/workspace-repo';
      expect(getWorkspaceRepositoryUrl(url)).toBe('https://github.com/user/workspace-repo');
    });

    it('should return null for null input', () => {
      expect(getWorkspaceRepositoryUrl(null)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(getWorkspaceRepositoryUrl(42)).toBeNull();
    });

    it('should return null for collection path', () => {
      const url = 'bruno://app/collection/import/git?url=https://github.com/user/repo';
      expect(getWorkspaceRepositoryUrl(url)).toBeNull();
    });

    it('should return null for invalid workspace path', () => {
      const url = 'bruno://app/workspace/invalid/path?url=https://github.com/user/repo';
      expect(getWorkspaceRepositoryUrl(url)).toBeNull();
    });

    it('should return null if no URL parameter is present', () => {
      const url = 'bruno://app/workspace/import/git';
      expect(getWorkspaceRepositoryUrl(url)).toBeNull();
    });
  });

  describe('handleAppProtocolUrl', () => {
    let mockSend;

    beforeEach(() => {
      mockSend = jest.fn();
      global.mainWindow = { webContents: { send: mockSend } };
    });

    afterEach(() => {
      global.mainWindow = undefined;
    });

    it('should send the extracted URL to the main process if valid', () => {
      const url = 'bruno://app/collection/import/git?url=https://github.com/user/repo';
      handleAppProtocolUrl(url, global.mainWindow);
      expect(mockSend).toHaveBeenCalledWith('main:bruno-collection-git-url-import', 'https://github.com/user/repo');
    });

    it('should send workspace URL to main:bruno-workspace-git-url-import for workspace deeplink', () => {
      const url = 'bruno://app/workspace/import/git?url=https://github.com/user/workspace-repo';
      handleAppProtocolUrl(url, global.mainWindow);
      expect(mockSend).toHaveBeenCalledWith('main:bruno-workspace-git-url-import', 'https://github.com/user/workspace-repo');
    });

    it('should send the extracted OpenAPI spec URL to the main process if valid', () => {
      const url = 'bruno://app/collection/import/openapi?url=https://example.com/api-spec.json';
      handleAppProtocolUrl(url, global.mainWindow);
      expect(mockSend).toHaveBeenCalledWith('main:bruno-openapi-spec-url-import', 'https://example.com/api-spec.json');
    });

    it('should log an error for an unsupported deeplink URL', () => {
      console.error = jest.fn();
      const url = 'bruno://app/collection/invalid/path?url=https://github.com/user/repo';
      handleAppProtocolUrl(url);
      expect(console.error).toHaveBeenCalledWith('Unsupported Bruno Deeplink URL');
    });

    it('should log an error for an invalid URL', () => {
      console.error = jest.fn();
      const url = 'invalid-url';
      handleAppProtocolUrl(url);
      expect(console.error).toHaveBeenCalledTimes(5);
      expect(console.error).toHaveBeenNthCalledWith(1, 'Failed to parse deep link URL:', 'Invalid URL');
      expect(console.error).toHaveBeenNthCalledWith(2, 'Failed to parse deep link URL:', 'Invalid URL');
      expect(console.error).toHaveBeenNthCalledWith(3, 'Failed to parse deep link URL:', 'Invalid URL');
      expect(console.error).toHaveBeenNthCalledWith(4, 'Failed to parse deep link URL:', 'Invalid URL');
      expect(console.error).toHaveBeenNthCalledWith(5, 'Unsupported Bruno Deeplink URL');
    });
  });
});
