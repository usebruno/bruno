import {
  calculateDraggedItemNewPathname,
  canCollectionItemBeDropped,
  determineCollectionItemDrop,
  getReorderedItemsInTargetDirectory
} from 'utils/collections/index';
import path from 'utils/common/path';

const collectionPathname = path.join(path.sep, 'collections', 'my-collection');
const folderPathname = path.join(collectionPathname, 'users');
const requestPathname = path.join(folderPathname, 'get-users.bru');

const folderItem = {
  uid: 'folder-1',
  type: 'folder',
  name: 'users',
  pathname: folderPathname
};

const requestItem = {
  uid: 'request-1',
  type: 'http-request',
  name: 'get-users',
  filename: 'get-users.bru',
  pathname: requestPathname,
  request: { method: 'GET', url: 'https://example.com' }
};

const draggedRequest = {
  uid: 'request-2',
  type: 'http-request',
  name: 'create-user',
  filename: 'create-user.bru',
  pathname: path.join(collectionPathname, 'create-user.bru'),
  request: { method: 'POST', url: 'https://example.com' },
  sourceCollectionUid: 'collection-1'
};

const createBoundingRect = (top = 100, height = 32) => ({
  top,
  height,
  bottom: top + height,
  left: 0,
  right: 200
});

describe('determineCollectionItemDrop', () => {
  it('returns null when hover bounds or client offset are missing', () => {
    expect(
      determineCollectionItemDrop({
        item: requestItem,
        hoverBoundingRect: null,
        clientOffset: { x: 0, y: 110 }
      })
    ).toBeNull();
  });

  it('returns adjacent+above for the top half of a request row', () => {
    const rect = createBoundingRect(100, 32);

    expect(
      determineCollectionItemDrop({
        item: requestItem,
        hoverBoundingRect: rect,
        clientOffset: { x: 0, y: 110 }
      })
    ).toEqual({ dropType: 'adjacent', dropPosition: 'above' });
  });

  it('returns adjacent+below for the bottom half of a request row', () => {
    const rect = createBoundingRect(100, 32);

    expect(
      determineCollectionItemDrop({
        item: requestItem,
        hoverBoundingRect: rect,
        clientOffset: { x: 0, y: 122 }
      })
    ).toEqual({ dropType: 'adjacent', dropPosition: 'below' });
  });

  it('returns adjacent+above for the top 35% of a folder row', () => {
    const rect = createBoundingRect(100, 40);

    expect(
      determineCollectionItemDrop({
        item: folderItem,
        hoverBoundingRect: rect,
        clientOffset: { x: 0, y: 112 }
      })
    ).toEqual({ dropType: 'adjacent', dropPosition: 'above' });
  });

  it('returns inside for the bottom 65% of a folder row', () => {
    const rect = createBoundingRect(100, 40);

    expect(
      determineCollectionItemDrop({
        item: folderItem,
        hoverBoundingRect: rect,
        clientOffset: { x: 0, y: 128 }
      })
    ).toEqual({ dropType: 'inside', dropPosition: null });
  });
});

describe('calculateDraggedItemNewPathname', () => {
  it('returns a path inside the target folder for inside drops', () => {
    const result = calculateDraggedItemNewPathname({
      draggedItem: draggedRequest,
      targetItem: folderItem,
      dropType: 'inside',
      collectionPathname
    });

    expect(result).toBe(path.join(folderPathname, 'create-user.bru'));
  });

  it('returns a sibling path for adjacent drops', () => {
    const result = calculateDraggedItemNewPathname({
      draggedItem: draggedRequest,
      targetItem: requestItem,
      dropType: 'adjacent',
      collectionPathname
    });

    expect(result).toBe(path.join(folderPathname, 'create-user.bru'));
  });

  it('returns null when dropping inside a request', () => {
    const result = calculateDraggedItemNewPathname({
      draggedItem: draggedRequest,
      targetItem: requestItem,
      dropType: 'inside',
      collectionPathname
    });

    expect(result).toBeNull();
  });
});

describe('canCollectionItemBeDropped', () => {
  it('returns false when dragging an item onto itself', () => {
    const result = canCollectionItemBeDropped({
      draggedItem: { ...requestItem, sourceCollectionUid: 'collection-1' },
      targetItem: requestItem,
      dropType: 'adjacent',
      collectionUid: 'collection-1',
      collectionPathname
    });

    expect(result).toBe(false);
  });

  it('returns false when dropping a folder onto its descendant', () => {
    const parentFolder = {
      uid: 'parent-folder',
      type: 'folder',
      pathname: '/collections/my-collection/parent',
      filename: 'parent'
    };
    const childFolder = {
      uid: 'child-folder',
      type: 'folder',
      pathname: '/collections/my-collection/parent/child',
      filename: 'child'
    };

    const result = canCollectionItemBeDropped({
      draggedItem: { ...parentFolder, sourceCollectionUid: 'collection-1' },
      targetItem: childFolder,
      dropType: 'inside',
      collectionUid: 'collection-1',
      collectionPathname
    });

    expect(result).toBe(false);
  });

  it('allows dropping a folder next to a sibling whose name shares its prefix', () => {
    const usersFolder = {
      uid: 'users-folder',
      type: 'folder',
      pathname: '/collections/my-collection/users',
      filename: 'users'
    };
    const usersArchiveFolder = {
      uid: 'users-archive-folder',
      type: 'folder',
      pathname: '/collections/my-collection/users-archive',
      filename: 'users-archive'
    };

    const result = canCollectionItemBeDropped({
      draggedItem: { ...usersFolder, sourceCollectionUid: 'collection-1' },
      targetItem: usersArchiveFolder,
      dropType: 'inside',
      collectionUid: 'collection-1',
      collectionPathname
    });

    expect(result).toBe(true);
  });

  it('returns true for valid same-collection adjacent drops regardless of position', () => {
    const result = canCollectionItemBeDropped({
      draggedItem: { ...draggedRequest, sourceCollectionUid: 'collection-1' },
      targetItem: requestItem,
      dropType: 'adjacent',
      collectionUid: 'collection-1',
      collectionPathname
    });

    expect(result).toBe(true);
  });

  it('allows cross-collection drops without same-collection path checks', () => {
    const result = canCollectionItemBeDropped({
      draggedItem: { ...draggedRequest, sourceCollectionUid: 'other-collection' },
      targetItem: folderItem,
      dropType: 'inside',
      collectionUid: 'collection-1',
      collectionPathname
    });

    expect(result).toBe(true);
  });
});

describe('getReorderedItemsInTargetDirectory', () => {
  const folderItems = [
    { uid: 'a', name: 'A', seq: 1 },
    { uid: 'b', name: 'B', seq: 2 },
    { uid: 'c', name: 'C', seq: 3 },
    { uid: 'd', name: 'D', seq: 4 }
  ];

  const getSeqMap = (reorderedItems) =>
    Object.fromEntries(reorderedItems.map((item) => [item.uid, item.seq]));

  it('moves an item above the target', () => {
    const reorderedItems = getReorderedItemsInTargetDirectory({
      items: folderItems,
      targetItemUid: 'b',
      draggedItemUid: 'd',
      dropPosition: 'above'
    });

    expect(getSeqMap(reorderedItems)).toEqual({
      d: 2,
      b: 3,
      c: 4
    });
  });

  it('moves an item below the target', () => {
    const reorderedItems = getReorderedItemsInTargetDirectory({
      items: folderItems,
      targetItemUid: 'b',
      draggedItemUid: 'a',
      dropPosition: 'below'
    });

    // a moves from seq 1 to 2; b shifts up from 2 to 1
    expect(getSeqMap(reorderedItems)).toEqual({
      b: 1,
      a: 2
    });
  });

  it('moves an item from below to below the target', () => {
    const reorderedItems = getReorderedItemsInTargetDirectory({
      items: folderItems,
      targetItemUid: 'b',
      draggedItemUid: 'd',
      dropPosition: 'below'
    });

    // d moves from seq 4 to 3; c shifts down from 3 to 4
    expect(getSeqMap(reorderedItems)).toEqual({
      d: 3,
      c: 4
    });
  });

  it('returns an empty array when target or dragged item is missing', () => {
    expect(
      getReorderedItemsInTargetDirectory({
        items: folderItems,
        targetItemUid: 'missing',
        draggedItemUid: 'a'
      })
    ).toEqual([]);

    expect(
      getReorderedItemsInTargetDirectory({
        items: folderItems,
        targetItemUid: 'a',
        draggedItemUid: 'missing'
      })
    ).toEqual([]);
  });

  it('returns an empty array when no sequence changes are needed', () => {
    const reorderedItems = getReorderedItemsInTargetDirectory({
      items: folderItems,
      targetItemUid: 'b',
      draggedItemUid: 'b'
    });

    expect(reorderedItems).toEqual([]);
  });
});
