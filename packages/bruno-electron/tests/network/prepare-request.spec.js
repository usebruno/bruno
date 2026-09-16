const path = require('path');
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

  describe('Effective tags', () => {
    // prepareRequest resolves tags against the tree, and electron walks it by uid,
    // so the item must be reachable in collection.items under the same uid
    const COLLECTION_PATH = path.join(path.sep, 'collection');

    const httpRequest = (uid, tags) => ({
      uid,
      type: 'http-request',
      name: uid,
      pathname: path.join(COLLECTION_PATH, `${uid}.bru`),
      ...(tags !== undefined ? { tags } : {}),
      request: {
        method: 'GET',
        url: 'https://example.com',
        headers: [],
        params: [],
        script: {},
        vars: {},
        auth: { mode: 'none' },
        body: { mode: 'none' }
      }
    });

    const folder = (uid, tags, items) => ({
      uid,
      type: 'folder',
      name: uid,
      pathname: path.join(COLLECTION_PATH, uid),
      root: { meta: { name: uid, tags } },
      items
    });

    const collectionWith = (items) => ({ pathname: COLLECTION_PATH, root: {}, items });

    it('carries the request own tags when it sits at the collection root', async () => {
      const item = httpRequest('req-login', ['smoke', 'fast']);
      const result = await prepareRequest(item, collectionWith([item]));

      expect(result.tags).toEqual(['smoke', 'fast']);
    });

    it('is an empty list when neither request nor folders carry tags', async () => {
      const item = httpRequest('req-login');
      const result = await prepareRequest(item, collectionWith([item]));

      expect(result.tags).toEqual([]);
    });

    it('inherits the tags of the folder holding the request', async () => {
      const item = httpRequest('req-login', ['smoke']);
      const result = await prepareRequest(item, collectionWith([folder('folder-auth', ['auth'], [item])]));

      expect(result.tags).toEqual(['smoke', 'auth']);
    });

    it('accumulates tags from every folder above the request', async () => {
      const item = httpRequest('req-users', ['smoke']);
      const collection = collectionWith([
        folder('folder-api', ['api'], [folder('folder-v2', ['v2'], [item])])
      ]);

      const result = await prepareRequest(item, collection);

      expect(result.tags).toEqual(['smoke', 'api', 'v2']);
    });

    it('does not pick up tags from a sibling folder', async () => {
      const item = httpRequest('req-login');
      const collection = collectionWith([
        folder('folder-auth', ['auth'], [item]),
        folder('folder-billing', ['billing'], [httpRequest('req-invoice')])
      ]);

      const result = await prepareRequest(item, collection);

      expect(result.tags).toEqual(['auth']);
    });

    it('prefers the request draft tags over its saved tags', async () => {
      const item = httpRequest('req-login', ['saved']);
      item.draft = { request: item.request, tags: ['drafted'] };
      const collection = collectionWith([folder('folder-auth', ['auth'], [item])]);

      const result = await prepareRequest(item, collection);

      expect(result.tags).toEqual(['drafted', 'auth']);
    });

    it('prefers the folder draft tags over its saved tags', async () => {
      const item = httpRequest('req-login', ['smoke']);
      const authFolder = folder('folder-auth', ['saved'], [item]);
      authFolder.draft = { meta: { tags: ['drafted'] } };

      const result = await prepareRequest(item, collectionWith([authFolder]));

      expect(result.tags).toEqual(['smoke', 'drafted']);
    });

    it('de-duplicates a tag the request repeats from its folder', async () => {
      const item = httpRequest('req-login', ['smoke']);
      const collection = collectionWith([folder('folder-auth', ['auth', 'smoke'], [item])]);

      const result = await prepareRequest(item, collection);

      expect(result.tags).toEqual(['smoke', 'auth']);
    });

    it('normalizes malformed tags on the request and its folders', async () => {
      const item = httpRequest('req-login', [' smoke ', 'smoke', 42, null]);
      const collection = collectionWith([folder('folder-auth', ['  auth  ', '', undefined], [item])]);

      const result = await prepareRequest(item, collection);

      expect(result.tags).toEqual(['smoke', 'auth']);
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
