const path = require('node:path');
const { buildFolderTree } = require('./build-tree');
const { getRequestUid } = require('../../cache/requestUids');

const COLLECTION_PATH = path.join(path.sep, 'collection');

const requestRow = (itemPath, { name, method = 'GET', url = 'https://x.test' } = {}) => ({
  type: 'request',
  itemPath,
  folderPath: path.dirname(itemPath) === '.' ? '' : path.dirname(itemPath),
  name: name || path.basename(itemPath),
  method,
  url,
  seq: null
});

const folderRow = (itemPath, { name, seq = null } = {}) => ({
  type: 'folder',
  itemPath,
  folderPath: path.dirname(itemPath) === '.' ? '' : path.dirname(itemPath),
  name: name || path.basename(itemPath),
  method: null,
  url: null,
  seq
});

const findByName = (items, name) => items.find((item) => item.name === name);

describe('buildFolderTree', () => {
  it('places a request at the collection root', () => {
    const items = buildFolderTree(COLLECTION_PATH, [requestRow('ping.bru', { name: 'Ping' })]);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Ping');
    expect(items[0].type).toBe('http-request');
    expect(items[0].request).toEqual({ method: 'GET', url: 'https://x.test' });
  });

  it('creates a folder node from its own folder.bru, applying the configured name and seq', () => {
    const items = buildFolderTree(COLLECTION_PATH, [
      folderRow('users', { name: 'Users', seq: 2 }),
      requestRow(path.join('users', 'get.bru'), { name: 'Get Users' })
    ]);

    const usersFolder = findByName(items, 'Users');
    expect(usersFolder.type).toBe('folder');
    expect(usersFolder.seq).toBe(2);
    expect(usersFolder.items).toHaveLength(1);
    expect(usersFolder.items[0].name).toBe('Get Users');
  });

  it('creates sibling folders independently, each with their own children', () => {
    const items = buildFolderTree(COLLECTION_PATH, [
      folderRow('users', { name: 'Users' }),
      folderRow('orders', { name: 'Orders' }),
      requestRow(path.join('users', 'get.bru'), { name: 'Get Users' }),
      requestRow(path.join('orders', 'get.bru'), { name: 'Get Orders' })
    ]);

    expect(items).toHaveLength(2);
    expect(findByName(items, 'Users').items.map((i) => i.name)).toEqual(['Get Users']);
    expect(findByName(items, 'Orders').items.map((i) => i.name)).toEqual(['Get Orders']);
  });

  it('builds an implicit folder for a directory that has no folder.bru of its own', () => {
    // `api` has no folder.bru — it exists only because `api/v2` has a request in it.
    const items = buildFolderTree(COLLECTION_PATH, [
      folderRow(path.join('api', 'v2'), { name: 'v2' }),
      requestRow(path.join('api', 'v2', 'get.bru'), { name: 'Get V2' })
    ]);

    expect(items).toHaveLength(1);
    const api = items[0];
    expect(api.name).toBe('api');
    expect(api.type).toBe('folder');

    const v2 = findByName(api.items, 'v2');
    expect(v2.items.map((i) => i.name)).toEqual(['Get V2']);
  });

  it('nests a folder inside its parent folder rather than flattening the tree', () => {
    const items = buildFolderTree(COLLECTION_PATH, [
      folderRow('api', { name: 'api' }),
      folderRow(path.join('api', 'v2'), { name: 'v2' }),
      requestRow(path.join('api', 'v2', 'get.bru'), { name: 'Get V2' })
    ]);

    expect(items).toHaveLength(1);
    const api = items[0];
    expect(api.items).toHaveLength(1);
    expect(api.items[0].name).toBe('v2');
    expect(api.items[0].items[0].name).toBe('Get V2');
  });

  it('assigns the same uid a real mount would, for the same path', () => {
    const absolutePath = path.join(COLLECTION_PATH, 'ping.bru');
    const expectedUid = getRequestUid(absolutePath);

    const items = buildFolderTree(COLLECTION_PATH, [requestRow('ping.bru', { name: 'Ping' })]);

    expect(items[0].uid).toBe(expectedUid);
  });
});
