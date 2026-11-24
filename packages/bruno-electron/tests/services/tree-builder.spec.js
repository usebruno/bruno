const path = require('node:path');
const { describe, it, expect } = require('@jest/globals');
const { getFolderTags } = require('@usebruno/common');
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
  it('leaves the folder tags in the root, where the tag helpers read them', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth', tags: ['auth', 'smoke'] }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    const authFolder = findFolder(tree.items, 'auth');
    expect(authFolder.root.meta.tags).toEqual(['auth', 'smoke']);
    expect(getFolderTags(authFolder)).toEqual(['auth', 'smoke']);
  });

  it('leaves a folder untagged when its root carries no tags', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth' }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    expect(getFolderTags(findFolder(tree.items, 'auth'))).toEqual([]);
  });

  it('leaves a folder with no folder root file untagged', () => {
    const tree = buildTree(COLLECTION_PATH, [requestEntry(path.join('auth', 'login.bru'))]);

    const authFolder = findFolder(tree.items, 'auth');
    expect(authFolder.root).toBeUndefined();
    expect(getFolderTags(authFolder)).toEqual([]);
  });

  it('keeps malformed entries as-is for the tag helpers to normalize', () => {
    const tree = buildTree(COLLECTION_PATH, [
      folderEntry('auth', { name: 'auth', tags: ['  auth  ', 42, null] }),
      requestEntry(path.join('auth', 'login.bru'))
    ]);

    const authFolder = findFolder(tree.items, 'auth');
    expect(authFolder.root.meta.tags).toEqual(['  auth  ', 42, null]);
    expect(getFolderTags(authFolder)).toEqual(['auth']);
  });

  it('tags a folder whose root file is the only entry in it', () => {
    const tree = buildTree(COLLECTION_PATH, [folderEntry('auth', { name: 'auth', tags: ['auth'] })]);

    const authFolder = findFolder(tree.items, 'auth');
    expect(getFolderTags(authFolder)).toEqual(['auth']);
    expect(authFolder.items).toEqual([]);
  });
});
