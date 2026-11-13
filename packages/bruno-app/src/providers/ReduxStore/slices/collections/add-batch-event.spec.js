import path from 'utils/common/path';
import reducer, {
  collectionAddBatchEvent,
  collectionAddDirectoryEvent,
  collectionAddFileEvent
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const COLLECTION_PATH = path.join(path.sep, 'coll');

const initialState = () => ({
  collections: [{ uid: COLLECTION_UID, pathname: COLLECTION_PATH, items: [], root: {} }]
});

const dirEvent = (name, uid) => ({
  type: 'addDir',
  payload: { meta: { collectionUid: COLLECTION_UID, pathname: path.join(COLLECTION_PATH, name), name, uid } }
});

const fileEvent = (dir, index, overrides = {}) => {
  const name = `req-${index}.bru`;
  return {
    type: 'addFile',
    payload: {
      meta: { collectionUid: COLLECTION_UID, pathname: path.join(COLLECTION_PATH, dir, name), name },
      data: { uid: `${dir}-${index}`, name: `req ${index}`, type: 'http-request', seq: index, request: { url: `/${index}` } },
      partial: false,
      loading: false,
      ...overrides
    }
  };
};

const folderRootEvent = (dir) => ({
  type: 'addFile',
  payload: {
    meta: { collectionUid: COLLECTION_UID, pathname: path.join(COLLECTION_PATH, dir, 'folder.bru'), name: 'folder.bru', folderRoot: true },
    data: { meta: { name: `${dir} renamed`, seq: 7 } }
  }
});

const scanEvents = () => {
  const events = [];
  ['alpha', 'beta'].forEach((dir) => {
    events.push(dirEvent(dir, `${dir}-uid`));
    for (let i = 0; i < 100; i++) {
      events.push(fileEvent(dir, i));
    }
    events.push(folderRootEvent(dir));
  });
  events.push(fileEvent('alpha', 3, { partial: true, loading: true }));
  events.push(fileEvent('alpha', 3));
  return events;
};

const applyOneByOne = (state, events) => events.reduce((acc, { type, payload }) => (
  type === 'addDir'
    ? reducer(acc, collectionAddDirectoryEvent({ dir: payload }))
    : reducer(acc, collectionAddFileEvent({ file: payload }))
), state);

describe('collectionAddBatchEvent', () => {
  it('builds the same tree as dispatching each add event one by one', () => {
    const events = scanEvents();

    const batched = reducer(initialState(), collectionAddBatchEvent({ events }));

    expect(batched).toEqual(applyOneByOne(initialState(), events));
    expect(batched.collections[0].items.map((item) => item.name)).toEqual(['alpha renamed', 'beta renamed']);
    expect(batched.collections[0].items[0].items).toHaveLength(100);
  });
});
