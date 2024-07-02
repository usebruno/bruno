const { describe, it, expect } = require('@jest/globals');
const Bru = require('../src/bru');

describe('Bru', () => {
  describe('cwd', () => {
    it('Should return current working directory', () => {
      const bru = new Bru(null, null, null, 'anyCollectionPath');
      expect(bru.cwd()).toEqual('anyCollectionPath');
    });
  });

  describe('getEnvName', () => {
    it('Should return the env name', () => {
      const bru = new Bru(
        {
          __name__: 'anyEnvName'
        },
        null,
        null,
        null
      );
      expect(bru.getEnvName()).toEqual('anyEnvName');
    });
  });

  describe('getProcessEnv', () => {
    it('Should return any process env key', () => {
      const bru = new Bru(
        null,
        null,
        {
          anyKey: 'anyValue'
        },
        null
      );
      expect(bru.getProcessEnv('anyKey')).toEqual('anyValue');
    });
  });

  describe('setNextRequest', () => {
    it('Should set next request', () => {
      const bru = new Bru(null, null, null, null);
      bru.setNextRequest('anyNextRequest');
      expect(bru.nextRequest).toEqual('anyNextRequest');
    });
  });

  describe('EnvVars', () => {
    it('Should remove all env vars', () => {
      const envVars = {
        anyKey: 'anyValue',
        otherKey: 'otherValue'
      };
      const bru = new Bru(envVars, null, null, null);
      bru.clearEnvVars();
      expect(envVars).toEqual({});
    });

    it('Should return true if env var exists', () => {
      const bru = new Bru(
        {
          anyKey: 'anyValue'
        },
        null,
        null,
        null
      );
      expect(bru.hasEnvVar('anyKey')).toBeTruthy();
    });
    it('Should return false if env var does not exist', () => {
      const bru = new Bru(
        {
          anyKey: 'anyValue'
        },
        null,
        null,
        null
      );
      expect(bru.hasEnvVar('otherKey')).toBeFalsy();
    });

    it('Should get interpollated env var', () => {
      const bru = new Bru(
        {
          anyKey: 'anyValue {{process.env.anyKey}}'
        },
        null,
        {
          anyKey: 'nestedValue'
        },
        null
      );
      expect(bru.getEnvVar('anyKey')).toEqual('anyValue nestedValue');
    });

    it('Should unset env var', () => {
      const envVars = {
        anyKey: 'anyValue'
      };
      const bru = new Bru(envVars, null, null, null);
      bru.unsetEnvVar('anyKey');
      expect(envVars).toEqual({});
    });

    it('Should set env var', () => {
      const envVars = {
        anyKey: 'anyValue'
      };
      const bru = new Bru(envVars, null, null, null);
      bru.setEnvVar('anyKey', 'otherValue');
      expect(envVars.anyKey).toEqual('otherValue');
    });
  });

  describe('CollectionVars', () => {
    it('Should remove all collection vars', () => {
      const collectionVars = {
        anyKey: 'anyValue',
        otherKey: 'otherValue'
      };
      const bru = new Bru(null, collectionVars, null, null);
      bru.clearVars();
      expect(collectionVars).toEqual({});
    });

    it('Should return true if collection var exists', () => {
      const bru = new Bru(
        null,
        {
          anyKey: 'anyValue'
        },
        null,
        null
      );
      expect(bru.hasVar('anyKey')).toBeTruthy();
    });
    it('Should return false if collection var does not exist', () => {
      const bru = new Bru(
        null,
        {
          anyKey: 'anyValue'
        },
        null,
        null
      );
      expect(bru.hasVar('otherKey')).toBeFalsy();
    });

    it('Should get collection var', () => {
      const bru = new Bru(
        null,
        {
          anyKey: 'anyValue {{nestedKey}}',
          nestedKey: 'nestedValue'
        },
        null,
        null
      );
      expect(bru.getVar('anyKey')).toEqual('anyValue {{nestedKey}}');
    });

    it('Should unset collection var', () => {
      const collectionVars = {
        anyKey: 'anyValue'
      };
      const bru = new Bru(null, collectionVars, null, null);
      bru.unsetVar('anyKey');
      expect(collectionVars).toEqual({});
    });

    it('Should set collection var', () => {
      const collectionVars = {
        anyKey: 'anyValue'
      };
      const bru = new Bru(null, collectionVars, null, null);
      bru.setVar('anyKey', 'otherValue');
      expect(collectionVars.anyKey).toEqual('otherValue');
    });
  });
});
