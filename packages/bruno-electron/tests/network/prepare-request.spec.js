const { describe, it, expect } = require('@jest/globals');

const { prepareRequest } = require('../../src/ipc/network/prepare-request');

describe('prepare-request: prepareRequest', () => {
  describe('Decomments request body', () => {
    it('If request body is valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": "{{someVar}}" // comment\n}' };
      const expected = `{
\"test\": \"{{someVar}}\" 
}`;
      const result = await prepareRequest({ request: { body }, collection: { pathname: '' } });
      expect(result.data).toEqual(expected);
    });

    it('If request body is not valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": {{someVar}} // comment\n}' };
      const expected = '{\n"test": {{someVar}} \n}';
      const result = await prepareRequest({ request: { body }, collection: { pathname: '' } });
      expect(result.data).toEqual(expected);
    });
  });

  describe.each(['POST', 'PUT', 'PATCH'])('POST request with no body', (method) => {
    it('Should set content-type header to false if method is ' + method + ' and there is no data in the body', async () => {
      const request = { method: method, url: 'test-domain', body: { mode: 'none' }, auth: { mode: 'none' } };
      const result = await prepareRequest({ request, collection: { pathname: '' } });
      expect(result.headers['content-type']).toEqual(false);
    });
    it('Should respect the content-type header if explicitly set', async () => {
      const request = {
        method: method,
        url: 'test-domain',
        body: { mode: 'none' },
        headers: [{ name: 'content-type', value: 'application/json', enabled: true }],
        auth: { mode: 'none' }
      };
      const result = await prepareRequest({ request, collection: { pathname: '' } });
      expect(result.headers['content-type']).toEqual('application/json');
    });
  });

  describe('GraphQL request', () => {
    it('keeps variables as string for interpolation', async () => {
      const item = {
        request: {
          method: 'POST',
          headers: [],
          params: [],
          url: 'https://example.com',
          body: {
            mode: 'graphql',
            graphql: {
              query: 'query { x }',
              variables: '{"apiPermissions": {{permissionsJSON}}}'
            }
          }
        }
      };
      const result = await prepareRequest(item);
      expect(result.mode).toBe('graphql');
      expect(result.data).toMatchObject({ query: 'query { x }' });
      expect(typeof result.data.variables).toBe('string');
      expect(result.data.variables).toBe('{"apiPermissions": {{permissionsJSON}}}');
    });
  });
});
