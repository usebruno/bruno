const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeRequest = (overrides = {}) => ({
  url: 'https://api.example.com/path',
  method: 'GET',
  headers: {},
  ...overrides
});

describe('BrunoRequest - getHost(), getPath(), getQueryString()', () => {
  describe('resolved urls', () => {
    it('returns the host, path and query string', () => {
      const req = new BrunoRequest(makeRequest({ url: 'https://api.example.com/path/10?a=1&b=2' }));

      expect(req.getHost()).toBe('api.example.com');
      expect(req.getPath()).toBe('/path/10');
      expect(req.getQueryString()).toBe('a=1&b=2');
    });
  });

  describe('templated urls', () => {
    const envVariables = { BASEURL: 'https://api.example.com' };

    it('resolves variables before parsing the url', () => {
      const req = new BrunoRequest(makeRequest({ url: '{{BASEURL}}/path?a=1&b=2' }), { envVariables });

      expect(req.getHost()).toBe('api.example.com');
      expect(req.getPath()).toBe('/path');
      expect(req.getQueryString()).toBe('a=1&b=2');
    });

    it('applies path params, resolving templated values', () => {
      const req = new BrunoRequest(
        makeRequest({
          url: '{{BASEURL}}/path/:p1/:p2',
          pathParams: [
            { name: 'p1', value: '10' },
            { name: 'p2', value: '{{P2}}' }
          ],
          collectionVariables: { P2: '20' }
        }),
        { envVariables }
      );

      expect(req.getPath()).toBe('/path/10/20');
    });

    it('resolves variables from every scope', () => {
      const req = new BrunoRequest(
        makeRequest({
          url: '{{globalEnvVar}}{{envVar}}{{runtimeVar}}/{{collectionVar}}/{{folderVar}}/{{requestVar}}/{{oauth2Var}}/{{promptVar}}',
          globalEnvironmentVariables: { globalEnvVar: 'https://' },
          collectionVariables: { collectionVar: 'collection' },
          folderVariables: { folderVar: 'folder' },
          requestVariables: { requestVar: 'request' },
          oauth2CredentialVariables: { oauth2Var: 'oauth2' },
          promptVariables: { promptVar: 'prompt' }
        }),
        {
          envVariables: { envVar: 'api.example.com' },
          runtimeVariables: { runtimeVar: ':8080' }
        }
      );

      expect(req.getHost()).toBe('api.example.com:8080');
      expect(req.getPath()).toBe('/collection/folder/request/oauth2/prompt');
    });
  });
});
