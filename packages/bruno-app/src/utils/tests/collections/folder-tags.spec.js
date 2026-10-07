import {
  getEffectiveTagsByItemUid,
  getEffectiveTagsForItem,
  getInheritedTagSourcesForItem,
  getInheritedTagsForItem,
  getRequestItemsForCollectionRun,
  getUniqueTagsFromItems,
  transformCollectionToSaveToExportAsFile,
  transformFolderRootToSave
} from 'utils/collections/index';

const request = ({ uid, name = uid, type = 'http-request', tags, draft, ...rest }) => ({
  uid,
  name,
  type,
  request: {},
  ...(tags ? { tags } : {}),
  ...(draft ? { draft } : {}),
  ...rest
});

// folders must not carry an own `request` key — `isItemAFolder` keys off its absence
const folder = ({ uid, name = uid, tags, draft, items = [], ...rest }) => ({
  uid,
  name,
  type: 'folder',
  items,
  ...(tags ? { root: { meta: { name, tags } } } : {}),
  ...(draft ? { draft } : {}),
  ...rest
});

/**
 * collection
 * ├── outer (tags: smoke, api)
 * │   ├── inner (tags: api, slow)   — `api` is re-declared, `outer` still owns it
 * │   │   └── deep-request (tags: critical)
 * │   └── inner-request
 * ├── untagged-folder
 * │   └── plain-request (tags: smoke)
 * └── root-request
 */
const makeCollection = () => ({
  uid: 'col1',
  items: [
    folder({
      uid: 'outer',
      tags: ['smoke', 'api'],
      items: [
        folder({
          uid: 'inner',
          tags: ['api', 'slow'],
          items: [request({ uid: 'deep-request', tags: ['critical'] })]
        }),
        request({ uid: 'inner-request' })
      ]
    }),
    folder({ uid: 'untagged-folder', items: [request({ uid: 'plain-request', tags: ['smoke'] })] }),
    request({ uid: 'root-request' })
  ]
});

const findItem = (collection, uid) => {
  const walk = (items) => {
    for (const item of items) {
      if (item.uid === uid) return item;
      const found = item.items ? walk(item.items) : null;
      if (found) return found;
    }
    return null;
  };
  return walk(collection.items);
};

describe('getInheritedTagsForItem', () => {
  it('collects the tags of every folder above the item, outermost first', () => {
    const collection = makeCollection();
    expect(getInheritedTagsForItem(collection, findItem(collection, 'deep-request'))).toEqual([
      'smoke',
      'api',
      'slow'
    ]);
  });

  it('does not include an item\'s own tags', () => {
    const collection = makeCollection();
    const inner = findItem(collection, 'inner');

    const inherited = getInheritedTagsForItem(collection, inner);
    expect(inherited).toEqual(['smoke', 'api']);
    expect(inherited).not.toContain('slow');
  });

  it('returns nothing for a top-level request and for an item outside the collection', () => {
    const collection = makeCollection();
    expect(getInheritedTagsForItem(collection, findItem(collection, 'root-request'))).toEqual([]);
    expect(getInheritedTagsForItem(collection, { uid: 'not-in-tree' })).toEqual([]);
  });

  it('reads unsaved folder tags from the folder draft', () => {
    const collection = {
      uid: 'col1',
      items: [
        folder({
          uid: 'f1',
          tags: ['saved'],
          draft: { meta: { tags: ['unsaved'] } },
          items: [request({ uid: 'r1' })]
        })
      ]
    };

    expect(getInheritedTagsForItem(collection, findItem(collection, 'r1'))).toEqual(['unsaved']);
  });
});

describe('getInheritedTagSourcesForItem', () => {
  it('pairs each tag with the folder it came from', () => {
    const collection = makeCollection();

    expect(
      getInheritedTagSourcesForItem(collection, findItem(collection, 'deep-request')).map(({ tag, folder: src }) => [
        tag,
        src.uid
      ])
    ).toEqual([
      ['smoke', 'outer'],
      ['api', 'outer'],
      ['slow', 'inner']
    ]);
  });

  it('attributes a tag declared twice to the outermost folder that declares it', () => {
    const collection = makeCollection();

    const api = getInheritedTagSourcesForItem(collection, findItem(collection, 'deep-request')).filter(
      ({ tag }) => tag === 'api'
    );
    expect(api).toHaveLength(1);
    expect(api[0].folder.uid).toBe('outer');
  });
});

describe('getEffectiveTagsForItem', () => {
  it('combines own tags with inherited ones, own tags first', () => {
    const collection = makeCollection();
    expect(getEffectiveTagsForItem(collection, findItem(collection, 'deep-request'))).toEqual([
      'critical',
      'smoke',
      'api',
      'slow'
    ]);
  });

  it('does not repeat a tag the item declares and also inherits', () => {
    const collection = makeCollection();
    expect(getEffectiveTagsForItem(collection, findItem(collection, 'plain-request'))).toEqual(['smoke']);
  });

  it('prefers a request\'s draft tags over its saved tags', () => {
    const collection = {
      uid: 'col1',
      items: [
        folder({
          uid: 'f1',
          tags: ['inherited'],
          items: [request({ uid: 'r1', tags: ['saved'], draft: { tags: ['drafted'] } })]
        })
      ]
    };

    expect(getEffectiveTagsForItem(collection, findItem(collection, 'r1'))).toEqual(['drafted', 'inherited']);
  });

  it('returns the folder\'s own tags plus its ancestors\' for a folder', () => {
    const collection = makeCollection();
    expect(getEffectiveTagsForItem(collection, findItem(collection, 'inner'))).toEqual(['api', 'slow', 'smoke']);
  });
});

describe('getEffectiveTagsByItemUid', () => {
  // this walk accumulates inner folder first, where getEffectiveTagsForItem walks the tree path
  // outermost first — the two agree as sets, and every caller treats them as such
  it('resolves every request in the tree, at every depth, keyed by uid', () => {
    expect(getEffectiveTagsByItemUid(makeCollection().items)).toEqual({
      'deep-request': ['critical', 'api', 'slow', 'smoke'],
      'inner-request': ['smoke', 'api'],
      'plain-request': ['smoke'],
      'root-request': []
    });
  });

  it('agrees with getEffectiveTagsForItem on the tags each request carries', () => {
    const collection = makeCollection();
    const byUid = getEffectiveTagsByItemUid(collection.items);

    ['deep-request', 'inner-request', 'plain-request', 'root-request'].forEach((uid) => {
      expect([...byUid[uid]].sort()).toEqual([...getEffectiveTagsForItem(collection, findItem(collection, uid))].sort());
    });
  });

  it('keys only requests, never the folders they sit in', () => {
    const byUid = getEffectiveTagsByItemUid(makeCollection().items);
    expect(byUid).not.toHaveProperty('outer');
    expect(byUid).not.toHaveProperty('untagged-folder');
  });

  it('applies seed tags to every request, for a run started inside a folder', () => {
    const items = [folder({ uid: 'f1', tags: ['own'], items: [request({ uid: 'r1' })] })];

    expect(getEffectiveTagsByItemUid(items, ['from-parent'])).toEqual({ r1: ['own', 'from-parent'] });
  });

  it('returns an empty map for an empty tree', () => {
    expect(getEffectiveTagsByItemUid()).toEqual({});
  });
});

describe('getRequestItemsForCollectionRun', () => {
  const uids = (items) => items.map((item) => item.uid);

  it('walks nested folders when recursive', () => {
    const items = makeCollection().items;

    expect(uids(getRequestItemsForCollectionRun({ recursive: true, items }))).toEqual([
      'deep-request',
      'inner-request',
      'plain-request',
      'root-request'
    ]);
  });

  it('returns only the direct request children when not recursive', () => {
    const items = makeCollection().items;

    expect(uids(getRequestItemsForCollectionRun({ recursive: false, items }))).toEqual(['root-request']);
  });

  it('skips request types the runner cannot execute, and transient requests', () => {
    const items = [
      request({ uid: 'http' }),
      request({ uid: 'graphql', type: 'graphql-request' }),
      request({ uid: 'ws', type: 'ws-request' }),
      request({ uid: 'grpc', type: 'grpc-request' }),
      request({ uid: 'transient', isTransient: true })
    ];

    expect(uids(getRequestItemsForCollectionRun({ recursive: true, items }))).toEqual(['http', 'graphql']);
  });

  it('includes an untagged request whose folder carries the included tag', () => {
    const items = makeCollection().items;

    const included = getRequestItemsForCollectionRun({
      recursive: true,
      items,
      tags: { include: ['api'], exclude: [] }
    });

    expect(uids(included)).toEqual(['deep-request', 'inner-request']);
  });

  it('excludes a request on an inherited excluded tag, even when it is included by its own', () => {
    const items = makeCollection().items;

    const included = getRequestItemsForCollectionRun({
      recursive: true,
      items,
      tags: { include: ['critical'], exclude: ['slow'] }
    });

    expect(uids(included)).toEqual([]);
  });

  it('applies seed tags from the folder the run starts at', () => {
    const items = [request({ uid: 'r1' })];

    expect(
      uids(getRequestItemsForCollectionRun({ recursive: true, items, tags: { include: ['smoke'], exclude: [] } }))
    ).toEqual([]);
    expect(
      uids(
        getRequestItemsForCollectionRun({
          recursive: true,
          items,
          tags: { include: ['smoke'], exclude: [] },
          inheritedTags: ['smoke']
        })
      )
    ).toEqual(['r1']);
  });

  it('filters on a request\'s draft tags rather than its saved ones', () => {
    const items = [request({ uid: 'r1', tags: ['saved'], draft: { tags: ['drafted'] } })];

    expect(
      uids(getRequestItemsForCollectionRun({ recursive: true, items, tags: { include: ['drafted'], exclude: [] } }))
    ).toEqual(['r1']);
    expect(
      uids(getRequestItemsForCollectionRun({ recursive: true, items, tags: { include: ['saved'], exclude: [] } }))
    ).toEqual([]);
  });

  it('keeps every runnable request when no tag filter is supplied', () => {
    const items = makeCollection().items;

    expect(getRequestItemsForCollectionRun({ recursive: true, items, tags: undefined })).toHaveLength(4);
    expect(getRequestItemsForCollectionRun({ recursive: true, items, tags: { include: [], exclude: [] } })).toHaveLength(
      4
    );
  });

  it('returns an empty list for an empty tree', () => {
    expect(getRequestItemsForCollectionRun({ recursive: true })).toEqual([]);
  });
});

describe('getUniqueTagsFromItems — folder tags', () => {
  const items = [
    folder({
      uid: 'f1',
      tags: ['folder-saved'],
      draft: { meta: { tags: ['folder-draft'] } },
      items: [request({ uid: 'r1', tags: ['request-saved'] })]
    })
  ];

  it('includes folder tags in the collection-wide vocabulary, drafts first', () => {
    expect(getUniqueTagsFromItems(items)).toEqual(['folder-draft', 'request-saved']);
  });

  it('reads a folder\'s saved tags when drafts are excluded', () => {
    expect(getUniqueTagsFromItems(items, { includeDrafts: false })).toEqual(['folder-saved', 'request-saved']);
  });
});

describe('transformFolderRootToSave — tags', () => {
  it('writes the folder\'s unsaved tags into meta', () => {
    const folderItem = folder({
      uid: 'f1',
      name: 'my-folder',
      seq: 2,
      tags: ['saved'],
      draft: { meta: { tags: ['drafted'] }, request: {} },
      root: { meta: { tags: ['saved'] }, request: {} }
    });

    expect(transformFolderRootToSave(folderItem).meta).toEqual({ name: 'my-folder', seq: 2, tags: ['drafted'] });
  });

  it('omits the tags key entirely when the folder has none', () => {
    const folderItem = folder({
      uid: 'f1',
      name: 'my-folder',
      seq: 1,
      draft: { meta: { tags: [] }, request: {} },
      root: { meta: {}, request: {} }
    });

    expect(transformFolderRootToSave(folderItem).meta).not.toHaveProperty('tags');
  });

  it('saves a folder whose root carries no request block', () => {
    const folderItem = folder({ uid: 'f1', name: 'my-folder', seq: 1, root: { meta: { tags: ['saved'] } } });

    const saved = transformFolderRootToSave(folderItem);
    expect(saved.meta.tags).toEqual(['saved']);
    expect(saved.request.headers).toEqual([]);
  });
});

describe('transformCollectionToSaveToExportAsFile — folder tags', () => {
  const collectionOf = (folderRoot) => ({
    name: 'collection',
    items: [folder({ uid: 'f1', name: 'my-folder', seq: 1, root: folderRoot, items: [] })]
  });

  it('carries the folder tags through in the root meta, where an import reads them back', () => {
    const exported = transformCollectionToSaveToExportAsFile(
      collectionOf({ meta: { name: 'my-folder', seq: 1, tags: ['smoke'] } })
    );

    expect(exported.items[0].root.meta).toEqual({ name: 'my-folder', seq: 1, tags: ['smoke'] });
  });

  it('omits the tags key for an untagged folder', () => {
    const exported = transformCollectionToSaveToExportAsFile(collectionOf({ meta: { name: 'my-folder', seq: 1 } }));

    expect(exported.items[0].root.meta).not.toHaveProperty('tags');
  });
});
