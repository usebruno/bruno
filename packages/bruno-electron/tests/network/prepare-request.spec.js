const { describe, it, expect } = require('@jest/globals');

const { prepareRequest } = require('../../src/ipc/network/prepare-request');
const { buildFormUrlEncodedPayload } = require('../../src/utils/form-data');

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

    it('should handle single key-value pair', () => {
      const requestObj = [{ name: 'item', value: 2 }];
      const expected = 'item=2';
      const result = buildFormUrlEncodedPayload(requestObj);
      expect(result).toEqual(expected);
    });

    it('should handle multiple key-value pairs with unique keys', () => {
      const requestObj = [
        { name: 'item1', value: 2 },
        { name: 'item2', value: 3 }
      ];
      const expected = 'item1=2&item2=3';
      const result = buildFormUrlEncodedPayload(requestObj);
      expect(result).toEqual(expected);
    });

    it('should handle multiple key-value pairs with the same key', () => {
      const requestObj = [
        { name: 'item', value: 2 },
        { name: 'item', value: 3 }
      ];
      const expected = 'item=2&item=3';
      const result = buildFormUrlEncodedPayload(requestObj);
      expect(result).toEqual(expected);
    });

    it('should handle mixed key-value pairs with unique and duplicate keys', () => {
      const requestObj = [
        { name: 'item1', value: 2 },
        { name: 'item2', value: 3 },
        { name: 'item1', value: 4 }
      ];
      const expected = 'item1=2&item2=3&item1=4';
      const result = buildFormUrlEncodedPayload(requestObj);
      expect(result).toEqual(expected);
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
});