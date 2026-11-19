const {
  getProcessEnvVars,
  getCollectionWorkspace,
  setDotEnvVars,
  clearDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
} = require('../process-env');

describe('getProcessEnvVars', () => {
  afterEach(() => {
    clearDotEnvVars('open-uid');
    clearCollectionWorkspace('open-uid');
    clearWorkspaceDotEnvVars('/workspace');
  });

  it('layers the workspace .env and then the collection .env of an open collection over process.env', () => {
    setWorkspaceDotEnvVars('/workspace', { SHARED: 'workspace', WORKSPACE_ONLY: 'w' });
    setCollectionWorkspace('open-uid', '/workspace');
    setDotEnvVars('open-uid', { SHARED: 'collection' });

    const processEnvVars = getProcessEnvVars('open-uid', { workspacePath: '/elsewhere', dotEnvVars: { SHARED: 'fallback' } });

    expect(processEnvVars.SHARED).toBe('collection');
    expect(processEnvVars.WORKSPACE_ONLY).toBe('w');
    expect(getCollectionWorkspace('open-uid')).toBe('/workspace');
  });

  it('uses the given workspace and .env variables for a collection that is not open', () => {
    setWorkspaceDotEnvVars('/workspace', { WORKSPACE_ONLY: 'w' });

    const processEnvVars = getProcessEnvVars('closed-uid', { workspacePath: '/workspace', dotEnvVars: { FROM_FILE: 'yes' } });

    expect(processEnvVars.WORKSPACE_ONLY).toBe('w');
    expect(processEnvVars.FROM_FILE).toBe('yes');
    expect(getCollectionWorkspace('closed-uid')).toBeUndefined();
  });
});
