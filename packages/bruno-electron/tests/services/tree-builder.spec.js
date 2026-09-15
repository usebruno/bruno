const path = require('node:path');
const { describe, it, expect } = require('@jest/globals');
const { buildTree } = require('../../src/services/mount/tree-builder');

const COLLECTION_PATH = path.join(path.sep, 'collection');

// parserResults is an iterable of [relativePath, { data, raw, error }] pairs
const folderEntry = (dir, meta) => [path.join(dir, 'folder.bru'), { data: { meta }, raw: '' }];
const requestEntry = (relativePath, data = {}) => [
  relativePath,
  { data: { type: 'http-request', name: path.basename(relativePath, '.bru'), request: {}, ...data }, raw: '' }
];

const findFolder = (items, name) => items.find((item) => item.type === 'folder' && item.name === name);

describe('buildTree: folder tags', () => {
  it('carries the tags from a folder root onto the folder node', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth', tags: ['auth', 'smoke'] }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    expect(findFolder(tree.items, 'auth').tags).toEqual(['auth', 'smoke']);
  });

  it('sets an empty list when the folder root carries no tags', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth' }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    expect(findFolder(tree.items, 'auth').tags).toEqual([]);
  });

  it('sets an empty list when tags are not an array', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth', tags: 'auth' }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    expect(findFolder(tree.items, 'auth').tags).toEqual([]);
  });

  it('keeps malformed entries as-is for the tag helpers to normalize', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth', tags: ['  auth  ', 42, null] }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    expect(findFolder(tree.items, 'auth').tags).toEqual(['  auth  ', 42, null]);
  });

  it('leaves tags unset on a folder that has no folder root file', () => {
    const tree = buildTree(COLLECTION_PATH, [requestEntry(path.join('auth', 'login.bru'))]);

    expect(findFolder(tree.items, 'auth').tags).toBeUndefined();
  });

  it('tags a folder whose root file is the only entry in it', () => {
    const tree = buildTree(COLLECTION_PATH, [folderEntry('auth', { name: 'auth', tags: ['auth'] })]);

    const authFolder = findFolder(tree.items, 'auth');
    expect(authFolder.tags).toEqual(['auth']);
    expect(authFolder.items).toEqual([]);
  });
});
