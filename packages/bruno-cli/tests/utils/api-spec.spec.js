const path = require('path');
const { describe, it, expect } = require('@jest/globals');
const { toApiSpecCollectionData } = require('../../src/utils/api-spec');

const collectionPath = path.join(path.sep, 'tmp', 'collection');

const request = (name, ...segments) => ({
  name,
  type: 'http-request',
  pathname: path.join(collectionPath, ...segments),
  request: { method: 'GET', url: `{{baseUrl}}/${name}` }
});

const folder = (name, items) => ({
  name,
  type: 'folder',
  pathname: path.join(collectionPath, name),
  items
});

const collectionOf = (items, root = {}, brunoConfig = {}) => ({ pathname: collectionPath, root, brunoConfig, items });

describe('toApiSpecCollectionData', () => {
  it('flattens nested folders into a list of requests', () => {
    const users = request('users', 'users.bru');
    const login = request('login', 'auth', 'login.bru');
    const token = request('token', 'auth', 'oauth', 'token.bru');
    const collection = collectionOf([folder('auth', [folder('oauth', [token]), login]), users]);

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => item.name)).toEqual(['login', 'token', 'users']);
  });

  it('orders requests by path, segment by segment, whatever order the collection lists them in', () => {
    const collection = collectionOf([
      folder('b', [request('two', 'b', 'two.bru'), request('one', 'b', 'one.bru')]),
      folder('a', [request('nested', 'a', 'c', 'nested.bru')]),
      request('Z', 'Z.bru'),
      request('a-request', 'a.bru')
    ]);

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => item.name)).toEqual(['Z', 'nested', 'a-request', 'one', 'two']);
  });

  it('leaves out requests in folders the app never reads', () => {
    const collection = collectionOf([
      folder('.bruno', [request('internal', '.bruno', 'internal.bru')]),
      folder('.svn', [request('svn', '.svn', 'svn.bru')]),
      folder('.hg', [request('hg', '.hg', 'hg.bru')]),
      folder('node_modules', [request('dependency', 'node_modules', 'pkg', 'dependency.bru')]),
      request('users', 'users.bru')
    ]);

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => item.name)).toEqual(['users']);
  });

  it('leaves out requests under a folder named in the collection\'s ignore list', () => {
    const collection = collectionOf(
      [
        folder('drafts', [request('draft', 'drafts', 'draft.bru'), folder('old', [request('older', 'drafts', 'old', 'older.bru')])]),
        folder('drafts-final', [request('final', 'drafts-final', 'final.bru')]),
        request('users', 'users.bru')
      ],
      {},
      { ignore: ['drafts/'] }
    );

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => item.name)).toEqual(['final', 'users']);
  });

  it('leaves out requests that match a glob in the collection\'s ignore list', () => {
    const collection = collectionOf(
      [folder('api', [request('wip-users', 'api', 'wip-users.bru'), request('users', 'api', 'users.bru')]), request('wip-root', 'wip-root.bru')],
      {},
      { ignore: ['**/wip-*.bru'] }
    );

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => item.name)).toEqual(['users']);
  });

  it('keeps every request when the collection has no ignore list', () => {
    const collection = collectionOf([folder('drafts', [request('draft', 'drafts', 'draft.bru')])], {}, undefined);

    expect(toApiSpecCollectionData(collection, []).requests.map((item) => item.name)).toEqual(['draft']);
  });

  it('sets depth to the number of path segments below the collection root', () => {
    const collection = collectionOf([
      request('users', 'users.bru'),
      folder('auth', [request('login', 'auth', 'login.bru'), folder('oauth', [request('token', 'auth', 'oauth', 'token.bru')])])
    ]);

    const { requests } = toApiSpecCollectionData(collection, []);

    expect(requests.map((item) => [item.name, item.depth])).toEqual([
      ['login', 2],
      ['token', 3],
      ['users', 1]
    ]);
  });

  it('keeps every request field, including the absolute pathname', () => {
    const users = request('users', 'users.bru');

    const { requests } = toApiSpecCollectionData(collectionOf([users]), []);

    expect(requests[0]).toEqual({ ...users, depth: 1 });
  });

  it('does not change the collection it is given', () => {
    const users = request('users', 'users.bru');
    const collection = collectionOf([folder('api', [users])]);

    toApiSpecCollectionData(collection, []);

    expect(users).not.toHaveProperty('depth');
  });

  it('returns no requests for an empty collection', () => {
    expect(toApiSpecCollectionData(collectionOf([]), []).requests).toEqual([]);
  });

  it('keys environment variables by environment name', () => {
    const localVariables = [{ name: 'baseUrl', value: 'http://localhost', enabled: true, secret: false }];
    const prodVariables = [{ name: 'token', value: 'abc', enabled: true, secret: true }];
    const environments = [
      { name: 'Local', variables: localVariables },
      { name: 'Prod', variables: prodVariables }
    ];

    const { envVariables } = toApiSpecCollectionData(collectionOf([]), environments);

    expect(envVariables).toEqual({ Local: localVariables, Prod: prodVariables });
  });

  it('orders environments by name, comparing character codes, so uppercase names come first', () => {
    const environments = ['dev', 'Local', 'Prod', 'staging'].map((name) => ({ name, variables: [] }));

    const { envVariables } = toApiSpecCollectionData(collectionOf([]), environments);

    expect(Object.keys(envVariables)).toEqual(['Local', 'Prod', 'dev', 'staging']);
  });

  it('returns no environment variables when there are no environments', () => {
    expect(toApiSpecCollectionData(collectionOf([]), []).envVariables).toEqual({});
  });

  it('reads enabled collection-level request variables as name/value pairs', () => {
    const root = {
      request: {
        vars: {
          req: [
            { name: 'baseUrl', value: 'https://api.example.com', enabled: true },
            { name: 'version', value: 'v1', enabled: true },
            { name: 'unused', value: 'x', enabled: false }
          ]
        }
      }
    };

    const { collectionVariables } = toApiSpecCollectionData(collectionOf([], root), []);

    expect(collectionVariables).toEqual({ baseUrl: 'https://api.example.com', version: 'v1' });
  });

  it('returns no collection variables when the collection root has none', () => {
    expect(toApiSpecCollectionData(collectionOf([], {}), []).collectionVariables).toEqual({});
    expect(toApiSpecCollectionData(collectionOf([], undefined), []).collectionVariables).toEqual({});
  });

  it('returns exactly the keys the exporter reads', () => {
    expect(Object.keys(toApiSpecCollectionData(collectionOf([]), [])).sort()).toEqual(['collectionVariables', 'envVariables', 'requests']);
  });
});
