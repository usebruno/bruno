jest.mock('../macos-keychain', () => ({
  getGenericPassword: jest.fn(),
  refreshGenericPassword: jest.fn(),
  validateGenericPasswordReference: jest.fn()
}));

const { getGenericPassword, refreshGenericPassword, validateGenericPasswordReference } = require('../macos-keychain');
const { getEnvVars, refreshKeychainEnvironmentValues, refreshKeychainUserExpression } = require('../collection');

describe('getEnvVars with macOS Keychain references', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the current password for a Keychain .secret expression', async () => {
    getGenericPassword.mockResolvedValue('latest-keychain-password');

    const environment = {
      name: 'Local',
      variables: [{
        name: 'apiToken',
        value: '@keychain.getUser:(developer::Bruno%20API::0123456789abcdef).secret',
        secret: false,
        enabled: true
      }]
    };

    await expect(getEnvVars(environment)).resolves.toEqual({ apiToken: 'latest-keychain-password', __name__: 'Local' });
    expect(getGenericPassword).toHaveBeenCalledWith({
      service: 'Bruno API',
      account: 'developer',
      keychainId: '0123456789abcdef'
    });
  });

  it('resolves .username from the selected Keychain account without reading its password', async () => {
    const environment = {
      name: 'Local',
      variables: [{
        name: 'user',
        value: '@keychain.getUser:(developer::Bruno%20API::0123456789abcdef).username',
        secret: false,
        enabled: true
      }]
    };

    await expect(getEnvVars(environment)).resolves.toEqual({ user: 'developer', __name__: 'Local' });
    expect(getGenericPassword).not.toHaveBeenCalled();
  });

  it('fails clearly for an invalid Keychain expression', async () => {
    const environment = {
      name: 'Local',
      variables: [{ name: 'apiToken', value: '@keychain.getUser:(not-json).secret', enabled: true }]
    };

    await expect(getEnvVars(environment)).rejects.toThrow('Invalid Keychain user reference');
    expect(getGenericPassword).not.toHaveBeenCalled();
  });

  it('refreshes linked Keychain passwords without returning them to the renderer', async () => {
    refreshGenericPassword.mockResolvedValue('refreshed-password');
    const expression = '@keychain.getUser:(developer::Bruno%20API::0123456789abcdef).secret';

    await expect(refreshKeychainUserExpression(expression)).resolves.toBe(true);
    await expect(refreshKeychainEnvironmentValues({
      variables: [{ name: 'apiToken', value: expression, enabled: true }]
    })).resolves.toBe(1);

    expect(refreshGenericPassword).toHaveBeenCalledWith({
      service: 'Bruno API',
      account: 'developer',
      keychainId: '0123456789abcdef'
    });
  });

  it('allows manual refresh of username links by validating the selected item', async () => {
    validateGenericPasswordReference.mockResolvedValue(true);
    const expression = '@keychain.getUser:(developer::Bruno%20API::0123456789abcdef).username';

    await expect(refreshKeychainUserExpression(expression)).resolves.toBe(true);
    expect(validateGenericPasswordReference).toHaveBeenCalledWith({
      service: 'Bruno API',
      account: 'developer',
      keychainId: '0123456789abcdef'
    });
    expect(refreshGenericPassword).not.toHaveBeenCalled();
  });
});
