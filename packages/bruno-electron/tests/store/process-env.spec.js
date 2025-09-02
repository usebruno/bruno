const { getProcessEnvVars, setDotEnvVars, getProcessEnvVarsForActiveEnv, clearDotEnvVars } = require('../../src/store/process-env');

describe('process-env', () => {
  beforeEach(() => {
    jest.resetModules();
    clearDotEnvVars();
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

  describe('getProcessEnvVarsForActiveEnv', () => {
    const collectionUid = 'test-collection';
    const testProcessEnv = { TEST_VAR: 'test-value' };
    const globalVars = { API_KEY: 'global-key', BASE_URL: 'https://api.example.com' };
    const globalVarsWithoutConflict = { GLOBAL_VAR: 'global-value' };
    const envVars = { ENV_VAR: 'env-value', API_KEY: 'env-key' };
    const overrideEnvVars = { API_KEY: 'env-specific-key' }; // Override API_KEY

    it('should return process.env merged with global vars when no environment is provided', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVars);
        
        const result = getProcessEnvVarsForActiveEnv(null, collectionUid);
        
        expect(result).toEqual(expect.objectContaining(globalVars));
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should return process.env merged with global and environment-specific vars when environment is provided', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVarsWithoutConflict);
        setDotEnvVars(collectionUid, 'development', envVars);
        
        const environment = { name: 'development' };
        const result = getProcessEnvVarsForActiveEnv(environment, collectionUid);
        
        expect(result).toEqual(expect.objectContaining(globalVarsWithoutConflict));
        expect(result).toEqual(expect.objectContaining(envVars));
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should return process.env merged with global vars when environment has empty name', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVars);
        
        const environment = { name: '' };
        const result = getProcessEnvVarsForActiveEnv(environment, collectionUid);
        
        expect(result).toEqual(expect.objectContaining(globalVars));
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should return process.env merged with global vars when environment has undefined name', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVars);
        
        const environment = { name: undefined };
        const result = getProcessEnvVarsForActiveEnv(environment, collectionUid);
        
        expect(result).toEqual(expect.objectContaining(globalVars));
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should return empty object when environment does not exist and no vars are set', () => {
      const result = getProcessEnvVarsForActiveEnv({ name: 'development' }, collectionUid);
      expect(result).toEqual({});
    });

    it('should handle environment-specific vars overriding global vars', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVars);
        setDotEnvVars(collectionUid, 'production', overrideEnvVars);
        
        const environment = { name: 'production' };
        const result = getProcessEnvVarsForActiveEnv(environment, collectionUid);
        
        expect(result.API_KEY).toBe('env-specific-key'); // Should be overridden
        expect(result.BASE_URL).toBe('https://api.example.com'); // Should remain from global
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should return empty object when collection does not exist', () => {
      const result = getProcessEnvVarsForActiveEnv({ name: 'development' }, 'non-existent-collection');
      
      expect(result).toEqual({});
    });

    it('should handle environment with no name property', () => {
      const originalProcessEnv = process.env;
      process.env = testProcessEnv;
      
      try {
        setDotEnvVars(collectionUid, null, globalVars);
        
        const environment = {}; // No name property
        const result = getProcessEnvVarsForActiveEnv(environment, collectionUid);
        
        expect(result).toEqual(expect.objectContaining(globalVars));
        expect(result).toEqual(expect.objectContaining(testProcessEnv));
      } finally {
        process.env = originalProcessEnv;
      }
    });
  });
}); 