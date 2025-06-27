const { getProcessEnvVars, setDotEnvVars } = require('../../src/store/process-env');

describe('process-env', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('setDotEnvVars', () => {
    it('should set global environment variables when envName is null', () => {
      const collectionUid = 'test-collection-1';
      const globalVars = { API_KEY: 'global-key', BASE_URL: 'https://api.example.com' };
      
      setDotEnvVars(collectionUid, null, globalVars);
      
      const result = getProcessEnvVars(collectionUid);
      expect(result[""]).toEqual(expect.objectContaining(globalVars));
    });

    it('should set environment-specific variables when envName is provided', () => {
      const collectionUid = 'test-collection-1';
      const envName = 'development';
      const envVars = { API_KEY: 'dev-key', DEBUG: 'true' };
      
      setDotEnvVars(collectionUid, envName, envVars);
      
      const result = getProcessEnvVars(collectionUid);
      expect(result[envName]).toEqual(expect.objectContaining(envVars));
    });

    it('should merge process.env with global and environment-specific vars', () => {
      const collectionUid = 'test-collection-1';
      const globalVars = { GLOBAL_VAR: 'global-value' };
      const envVars = { ENV_VAR: 'env-value' };
      
      // Set global vars
      setDotEnvVars(collectionUid, null, globalVars);
      
      // Set environment-specific vars
      setDotEnvVars(collectionUid, 'production', envVars);
      
      const result = getProcessEnvVars(collectionUid);
      
      // Check global vars (empty key)
      expect(result[""]).toEqual(expect.objectContaining(globalVars));
      expect(result[""]).toEqual(expect.objectContaining(process.env));
      
      // Check environment-specific vars
      expect(result['production']).toEqual(expect.objectContaining(globalVars));
      expect(result['production']).toEqual(expect.objectContaining(envVars));
      expect(result['production']).toEqual(expect.objectContaining(process.env));
    });

    it('should handle multiple environments for the same collection', () => {
      const collectionUid = 'test-collection-1';
      
      setDotEnvVars(collectionUid, null, { GLOBAL: 'global' });
      setDotEnvVars(collectionUid, 'development', { API_KEY: 'dev-key' });
      setDotEnvVars(collectionUid, 'production', { API_KEY: 'prod-key' });
      
      const result = getProcessEnvVars(collectionUid);
      
      expect(result[""]).toEqual(expect.objectContaining({ GLOBAL: 'global' }));
      expect(result['development']).toEqual(expect.objectContaining({ 
        GLOBAL: 'global',
        API_KEY: 'dev-key'
      }));
      expect(result['production']).toEqual(expect.objectContaining({ 
        GLOBAL: 'global',
        API_KEY: 'prod-key'
      }));
    });

    it('should handle multiple collections independently', () => {
      const collection1Uid = 'collection-1';
      const collection2Uid = 'collection-2';
      
      setDotEnvVars(collection1Uid, null, { COLLECTION1: 'value1' });
      setDotEnvVars(collection2Uid, null, { COLLECTION2: 'value2' });
      
      const result1 = getProcessEnvVars(collection1Uid);
      const result2 = getProcessEnvVars(collection2Uid);
      
      expect(result1[""]).toEqual(expect.objectContaining({ COLLECTION1: 'value1' }));
      expect(result2[""]).toEqual(expect.objectContaining({ COLLECTION2: 'value2' }));
      expect(result1[""]).not.toEqual(expect.objectContaining({ COLLECTION2: 'value2' }));
    });
  });

  describe('getProcessEnvVars', () => {
    it('should return empty object for new collection', () => {
      const originalProcessEnv = process.env;
      process.env = {}
      try {
        const result = getProcessEnvVars('new-collection');
        expect(result).toEqual({"": {}});
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should include process.env in all environment results', () => {
      const collectionUid = 'test-collection';
      const originalProcessEnv = process.env;
      process.env = {TEST_VAR: 'test-value'};
      
      try {
        setDotEnvVars(collectionUid, null, { CUSTOM_VAR: 'custom' });
        
        const result = getProcessEnvVars(collectionUid);
        
        expect(result[""]).toEqual(expect.objectContaining({ 
          TEST_VAR: 'test-value',
          CUSTOM_VAR: 'custom'
        }));
      } finally {
        process.env = originalProcessEnv
      }
    });
  });
}); 