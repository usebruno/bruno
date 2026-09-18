import path from 'utils/common/path';
import { getFolderTags } from '@usebruno/common';
import reducer, {
  addFolderTag,
  deleteFolderTag,
  saveFolderDraft,
  collectionAddFileEvent,
  collectionChangeFileEvent
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const FOLDER_UID = 'folder-1';
const COLLECTION_PATH = path.join(path.sep, 'coll');
const FOLDER_PATH = path.join(COLLECTION_PATH, 'my-folder');
const FOLDER_ROOT_PATH = path.join(FOLDER_PATH, 'folder.bru');

const makeFolder = (overrides = {}) => ({
  uid: FOLDER_UID,
  name: 'my-folder',
  type: 'folder',
  pathname: FOLDER_PATH,
  root: { meta: { name: 'my-folder' }, request: {} },
  items: [],
  ...overrides
});

const makeState = (items) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: COLLECTION_PATH,
      items
    }
  ]
});

const folderIn = (state) => state.collections[0].items[0];

describe('addFolderTag', () => {
  it('stages the tag on a draft cloned from the folder root, leaving the saved root untouched', () => {
    const state = makeState([makeFolder({ root: { meta: { name: 'my-folder' }, docs: 'hello' } })]);

    const next = reducer(state, addFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual(['smoke']);
    expect(folderIn(next).draft.docs).toBe('hello');
    expect(folderIn(next).root.meta.tags).toBeUndefined();
  });

  it('appends to an existing draft rather than starting a new one', () => {
    const state = makeState([makeFolder({ draft: { meta: { name: 'my-folder', tags: ['smoke'] } } })]);

    const next = reducer(state, addFolderTag({ tag: 'api', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual(['smoke', 'api']);
  });

  it('trims the tag and ignores one the folder already carries', () => {
    const state = makeState([makeFolder()]);

    let next = reducer(state, addFolderTag({ tag: '  smoke  ', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));
    next = reducer(next, addFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual(['smoke']);
  });

  it('refreshes the collection-wide tag list with folder tags', () => {
    const state = makeState([
      makeFolder({ items: [{ uid: 'r1', type: 'http-request', request: {}, tags: ['request-tag'] }] })
    ]);

    const next = reducer(state, addFolderTag({ tag: 'folder-tag', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(next.collections[0].allTags).toEqual(['folder-tag', 'request-tag']);
  });

  it('tags a folder whose root has not loaded yet', () => {
    const state = makeState([makeFolder({ root: undefined })]);

    const next = reducer(state, addFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual(['smoke']);
  });

  it('does nothing for an unknown collection, an unknown folder, a request uid, or a blank tag', () => {
    const state = makeState([
      makeFolder(),
      { uid: 'req-1', name: 'a-request', type: 'http-request', request: {} }
    ]);

    const cases = [
      addFolderTag({ tag: 'smoke', collectionUid: 'nope', folderUid: FOLDER_UID }),
      addFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: 'nope' }),
      addFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: 'req-1' }),
      addFolderTag({ tag: '   ', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID })
    ];

    cases.forEach((action) => {
      const next = reducer(state, action);
      expect(folderIn(next).draft).toBeUndefined();
      expect(next.collections[0].items[1].draft).toBeUndefined();
    });
  });
});

describe('deleteFolderTag', () => {
  it('removes the tag from the draft', () => {
    const state = makeState([makeFolder({ draft: { meta: { name: 'my-folder', tags: ['smoke', 'api'] } } })]);

    const next = reducer(state, deleteFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual(['api']);
  });

  it('drafts the removal of a saved tag without touching the saved root', () => {
    const state = makeState([
      makeFolder({ tags: ['smoke'], root: { meta: { name: 'my-folder', tags: ['smoke'] } } })
    ]);

    const next = reducer(state, deleteFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).draft.meta.tags).toEqual([]);
    expect(folderIn(next).root.meta.tags).toEqual(['smoke']);
  });

  it('trims the tag before matching and leaves an unknown tag alone', () => {
    const state = makeState([makeFolder({ draft: { meta: { name: 'my-folder', tags: ['smoke', 'api'] } } })]);

    let next = reducer(state, deleteFolderTag({ tag: ' smoke ', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));
    expect(folderIn(next).draft.meta.tags).toEqual(['api']);

    next = reducer(next, deleteFolderTag({ tag: 'never-set', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));
    expect(folderIn(next).draft.meta.tags).toEqual(['api']);
  });

  it('drops the removed tag from the collection-wide tag list', () => {
    const state = makeState([makeFolder({ draft: { meta: { name: 'my-folder', tags: ['folder-tag'] } } })]);

    const next = reducer(state, deleteFolderTag({ tag: 'folder-tag', collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(next.collections[0].allTags).toEqual([]);
  });

  it('does nothing for an unknown collection, an unknown folder, or a request uid', () => {
    const state = makeState([
      makeFolder({ root: { meta: { name: 'my-folder', tags: ['smoke'] } } }),
      { uid: 'req-1', name: 'a-request', type: 'http-request', request: {}, tags: ['smoke'] }
    ]);

    [
      deleteFolderTag({ tag: 'smoke', collectionUid: 'nope', folderUid: FOLDER_UID }),
      deleteFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: 'nope' }),
      deleteFolderTag({ tag: 'smoke', collectionUid: COLLECTION_UID, folderUid: 'req-1' })
    ].forEach((action) => {
      const next = reducer(state, action);
      expect(folderIn(next).draft).toBeUndefined();
      expect(next.collections[0].items[1].tags).toEqual(['smoke']);
    });
  });
});

describe('saveFolderDraft', () => {
  it('promotes the drafted tags to the saved root and clears the draft', () => {
    const state = makeState([
      makeFolder({
        root: { meta: { name: 'my-folder', tags: ['smoke'] } },
        draft: { meta: { name: 'my-folder', tags: ['smoke', 'api'] } }
      })
    ]);

    const next = reducer(state, saveFolderDraft({ collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).root.meta.tags).toEqual(['smoke', 'api']);
    expect(getFolderTags(folderIn(next))).toEqual(['smoke', 'api']);
    expect(folderIn(next).draft).toBeNull();
  });

  it('clears the saved tags when the last one is removed', () => {
    const state = makeState([
      makeFolder({
        root: { meta: { name: 'my-folder', tags: ['smoke'] } },
        draft: { meta: { name: 'my-folder', tags: [] } }
      })
    ]);

    const next = reducer(state, saveFolderDraft({ collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).root.meta.tags).toEqual([]);
  });

  it('leaves a folder with no draft untouched', () => {
    const state = makeState([makeFolder({ root: { meta: { name: 'my-folder', tags: ['smoke'] } } })]);

    const next = reducer(state, saveFolderDraft({ collectionUid: COLLECTION_UID, folderUid: FOLDER_UID }));

    expect(folderIn(next).root.meta.tags).toEqual(['smoke']);
  });
});

describe('folder root file events — tags from disk', () => {
  const folderRootFile = (tags) => ({
    file: {
      meta: {
        collectionUid: COLLECTION_UID,
        pathname: FOLDER_ROOT_PATH,
        folderRoot: true
      },
      data: { meta: { name: 'my-folder', seq: 3, ...(tags === undefined ? {} : { tags }) } }
    }
  });

  describe.each([
    ['collectionAddFileEvent', collectionAddFileEvent],
    ['collectionChangeFileEvent', collectionChangeFileEvent]
  ])('%s', (_name, action) => {
    it('takes the tags written on disk into the folder root', () => {
      const next = reducer(makeState([makeFolder()]), action(folderRootFile(['smoke', 'api'])));

      expect(getFolderTags(folderIn(next))).toEqual(['smoke', 'api']);
    });

    it('drops the folder tags when the file no longer declares any', () => {
      const state = makeState([makeFolder({ root: { meta: { name: 'my-folder', tags: ['smoke'] } } })]);

      const next = reducer(state, action(folderRootFile(undefined)));

      expect(getFolderTags(folderIn(next))).toEqual([]);
    });
  });
});
