const path = require('node:path');
const os = require('node:os');
const { getRequestUid, moveRequestUid, deleteRequestUid, clearRequestUidsForCollection } = require('./requestUids');

describe('requestUids cache', () => {
  const collectionRoot = path.join(os.tmpdir(), 'requestUids-spec-collection');

  afterEach(() => {
    clearRequestUidsForCollection(collectionRoot);
  });

  test('returns a stable uid for the same pathname across repeated calls', () => {
    const pathname = path.join(collectionRoot, 'request-one.bru');

    const first = getRequestUid(pathname);
    const second = getRequestUid(pathname);

    expect(second).toBe(first);
  });

  test('returns different uids for different pathnames', () => {
    const uidOne = getRequestUid(path.join(collectionRoot, 'request-one.bru'));
    const uidTwo = getRequestUid(path.join(collectionRoot, 'request-two.bru'));

    expect(uidOne).not.toBe(uidTwo);
  });

  test('moveRequestUid preserves the uid under the new pathname and frees the old one', () => {
    const oldPathname = path.join(collectionRoot, 'folder-a', 'request.bru');
    const newPathname = path.join(collectionRoot, 'folder-b', 'request.bru');

    const uidBeforeMove = getRequestUid(oldPathname);
    moveRequestUid(oldPathname, newPathname);

    expect(getRequestUid(newPathname)).toBe(uidBeforeMove);
    // The old pathname no longer holds a claim on that uid; querying it again mints a fresh one.
    expect(getRequestUid(oldPathname)).not.toBe(uidBeforeMove);
  });

  // Regression test for the cross-collection drag-and-drop bug: `renderer:move-item` used to
  // call moveRequestUid only *after* the filesystem copy/remove had already run. The collection
  // watcher can observe and broadcast the new path as soon as the copy starts, so whatever a
  // caller reads for that path before moveRequestUid runs is a mismatched, freshly-minted uid —
  // and that value is already out the door (e.g. sent over IPC) by the time the cache
  // self-corrects. The fix reorders the call so every caller reads the new path only after the
  // identity has been carried over.
  test('a caller that reads the new pathname before moveRequestUid runs gets a mismatched uid', () => {
    const oldPathname = path.join(collectionRoot, 'folder-a', 'request.bru');
    const newPathname = path.join(collectionRoot, 'folder-b', 'request.bru');

    const uidBeforeMove = getRequestUid(oldPathname);

    // Simulates the watcher discovering (and broadcasting) the new path before the move is tracked.
    const prematurelyMintedUid = getRequestUid(newPathname);
    expect(prematurelyMintedUid).not.toBe(uidBeforeMove);

    moveRequestUid(oldPathname, newPathname);

    // The cache is now correct for anyone who asks after the fact...
    expect(getRequestUid(newPathname)).toBe(uidBeforeMove);
    // ...but that's cold comfort to the caller who already read (and acted on) the wrong
    // value moments earlier — proving moveRequestUid must run before the path is ever queried.
    expect(prematurelyMintedUid).not.toBe(uidBeforeMove);
  });

  test('deleteRequestUid removes a pathname from the cache', () => {
    const pathname = path.join(collectionRoot, 'request-one.bru');
    const uidBeforeDelete = getRequestUid(pathname);

    deleteRequestUid(pathname);

    expect(getRequestUid(pathname)).not.toBe(uidBeforeDelete);
  });

  test('clearRequestUidsForCollection purges every uid under the collection root', () => {
    const pathname = path.join(collectionRoot, 'folder-a', 'request.bru');
    const uidBeforeClear = getRequestUid(pathname);

    clearRequestUidsForCollection(collectionRoot);

    expect(getRequestUid(pathname)).not.toBe(uidBeforeClear);
  });
});
