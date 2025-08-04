import { getActiveProcessEnvVariables } from 'utils/collections/index';

const globalVars = { API_KEY: 'global-key', GLOBAL_VAR: 'global' };

const processEnvVariables = {
  '': globalVars,
  'development': { API_KEY: 'dev-key' },
  'production': { API_KEY: 'prod-key' }
};

describe('getActiveProcessEnvVariables', () => {
  it('should return environment-specific process env vars when active environment exists', () => {
    const collection = {
      activeEnvironmentUid: 'env-123',
      environments: [
        { uid: 'env-123', name: 'development' }
      ],
      processEnvVariables,
    };

    const result = getActiveProcessEnvVariables(collection);
    expect(result).toEqual({API_KEY: 'dev-key'});
  });

  it('should return global process env vars when no environment is selected', () => {
    const collection = {
      activeEnvironmentUid: null,
      processEnvVariables,
    };

    const result = getActiveProcessEnvVariables(collection);
    expect(result).toEqual(globalVars);
  });

  it('should return global process env vars when active environment has no name', () => {
    const collection = {
      activeEnvironmentUid: 'env-123',
      environments: [
        { uid: 'env-123', name: null }
      ],
      processEnvVariables,
    };

    const result = getActiveProcessEnvVariables(collection);
    expect(result).toEqual(globalVars);
  });

  it('should return global process env vars when environment name doesnt exist in processEnvVariables', () => {
    const collection = {
      activeEnvironmentUid: 'env-123',
      environments: [
        { uid: 'other-env', name: 'doesnt-exist' }
      ],
      processEnvVariables,
    };

    const result = getActiveProcessEnvVariables(collection);
    expect(result).toEqual(globalVars);
  });

  it('should return empty object when collection has no processEnvVariables', () => {
    const collection = {
      activeEnvironmentUid: 'env-123',
      environments: [
        { uid: 'env-123', name: 'development' }
      ]
    };

    const result = getActiveProcessEnvVariables(collection);

    expect(result).toEqual({});
  });

  it('should return global process env vars for a collection with no activeEnvironmentUid', () => {
    const collection = {
      processEnvVariables,
    };

    const result = getActiveProcessEnvVariables(collection);
    expect(result).toEqual(globalVars);
  });
}); 