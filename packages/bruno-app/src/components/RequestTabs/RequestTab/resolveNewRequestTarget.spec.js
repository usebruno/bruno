const { resolveNewRequestTarget } = require('./resolveNewRequestTarget');

describe('resolveNewRequestTarget', () => {
  const collection = {
    uid: 'col-1',
    items: [
      {
        uid: 'folder-1',
        type: 'folder',
        pathname: '/col/folder',
        items: [
          { uid: 'req-nested', type: 'http-request', pathname: '/col/folder/req.bru' }
        ]
      },
      { uid: 'req-root', type: 'http-request', pathname: '/col/req.bru' }
    ]
  };

  const folder = { uid: 'folder-1', type: 'folder', pathname: '/col/folder' };

  it('returns null when there is no collection', () => {
    expect(resolveNewRequestTarget({
      tab: { type: 'http-request' },
      item: null,
      collection: null,
      folder: null
    })).toBeNull();
  });

  it('targets collection root for a root-level request tab', () => {
    expect(resolveNewRequestTarget({
      tab: { type: 'http-request' },
      item: { uid: 'req-root', pathname: '/col/req.bru' },
      collection,
      folder: null
    })).toEqual({ collectionUid: 'col-1', item: null });
  });

  it('targets parent folder for a nested request tab', () => {
    const result = resolveNewRequestTarget({
      tab: { type: 'http-request' },
      item: { uid: 'req-nested', pathname: '/col/folder/req.bru' },
      collection,
      folder: null
    });

    expect(result).toEqual({
      collectionUid: 'col-1',
      item: expect.objectContaining({ uid: 'folder-1', type: 'folder', pathname: '/col/folder' })
    });
  });

  it('targets the folder for folder-settings tab', () => {
    expect(resolveNewRequestTarget({
      tab: { type: 'folder-settings' },
      item: null,
      collection,
      folder
    })).toEqual({ collectionUid: 'col-1', item: folder });
  });

  it('targets collection root for folder-settings without a folder', () => {
    expect(resolveNewRequestTarget({
      tab: { type: 'folder-settings' },
      item: null,
      collection,
      folder: null
    })).toEqual({ collectionUid: 'col-1', item: null });
  });

  it('targets collection root for collection-settings tab', () => {
    expect(resolveNewRequestTarget({
      tab: { type: 'collection-settings' },
      item: null,
      collection,
      folder: null
    })).toEqual({ collectionUid: 'col-1', item: null });
  });
});
