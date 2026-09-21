import { newHttpRequest, warmSearchIndex, fetchItemRaw, resolveJsItemsRaw } from './actions';

const mockUuid = jest.fn();

jest.mock('utils/common', () => ({
  uuid: () => mockUuid(),
  waitForNextTick: () => Promise.resolve(),
  safeParseJSON: (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  },
  safeStringifyJSON: (value) => JSON.stringify(value)
}));

describe('collection actions', () => {
  beforeEach(() => {
    mockUuid
      .mockReturnValueOnce('request-uid')
      .mockReturnValueOnce('task-uid');

    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('newHttpRequest', () => {
    it('should pass requestPaneTab into the queued open request task', async () => {
      const dispatch = jest.fn();
      const getState = () => ({
        collections: {
          tempDirectories: {
            'collection-uid': 'C:\\bruno\\tmp\\transient\\collection'
          },
          collections: [
            {
              uid: 'collection-uid',
              pathname: 'C:\\bruno\\collection',
              format: 'bru',
              items: []
            }
          ]
        }
      });

      await newHttpRequest({
        requestName: 'demo.pdf',
        filename: 'demo.pdf',
        requestType: 'http-request',
        requestUrl: 'https://example-bucket.s3.amazonaws.com/demo.pdf?x-id=PutObject',
        requestMethod: 'PUT',
        collectionUid: 'collection-uid',
        itemUid: null,
        isTransient: true,
        requestPaneTab: 'body',
        auth: {
          mode: 'none'
        },
        settings: {
          encodeUrl: false
        }
      })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('demo.pdf.bru'),
        expect.objectContaining({
          uid: 'request-uid',
          isTransient: true,
          request: expect.objectContaining({
            method: 'PUT',
            url: 'https://example-bucket.s3.amazonaws.com/demo.pdf?x-id=PutObject',
            auth: {
              mode: 'none'
            }
          }),
          settings: {
            encodeUrl: false
          }
        })
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'app/insertTaskIntoQueue',
        payload: expect.objectContaining({
          uid: 'task-uid',
          type: 'OPEN_REQUEST',
          collectionUid: 'collection-uid',
          preview: false,
          requestPaneTab: 'body'
        })
      });
    });
  });

  describe('warmSearchIndex', () => {
    const activeWorkspace = {
      uid: 'ws-1',
      collections: [{ path: '/c1' }, { path: '/c2' }]
    };

    const getState = (collections) => () => ({
      workspaces: { workspaces: [activeWorkspace], activeWorkspaceUid: 'ws-1' },
      collections: { collections, collectionSortOrder: 'default' }
    });

    it('warms every not-mounted collection in the active workspace', async () => {
      const dispatch = jest.fn();
      const collections = [
        { uid: 'c1', pathname: '/c1', name: 'One', mountStatus: 'unmounted', brunoConfig: { ignore: ['dist'] } },
        { uid: 'c2', pathname: '/c2', name: 'Two', mountStatus: 'mounting' }
      ];

      await warmSearchIndex()(dispatch, getState(collections));

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-index-warm', {
        collections: [
          { uid: 'c1', pathname: '/c1', name: 'One', ignore: ['dist'] },
          { uid: 'c2', pathname: '/c2', name: 'Two', ignore: undefined }
        ]
      });
    });

    it('excludes a collection that is already mounted', async () => {
      const dispatch = jest.fn();
      const collections = [
        { uid: 'c1', pathname: '/c1', name: 'One', mountStatus: 'mounted' },
        { uid: 'c2', pathname: '/c2', name: 'Two', mountStatus: 'unmounted' }
      ];

      await warmSearchIndex()(dispatch, getState(collections));

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:search-index-warm', {
        collections: [{ uid: 'c2', pathname: '/c2', name: 'Two', ignore: undefined }]
      });
    });

    it('does nothing when every collection in the workspace is already mounted', async () => {
      const dispatch = jest.fn();
      const collections = [
        { uid: 'c1', pathname: '/c1', name: 'One', mountStatus: 'mounted' },
        { uid: 'c2', pathname: '/c2', name: 'Two', mountStatus: 'mounted' }
      ];

      await warmSearchIndex()(dispatch, getState(collections));

      expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    });

    it('does nothing when there is no active workspace', async () => {
      const dispatch = jest.fn();
      const state = () => ({
        workspaces: { workspaces: [], activeWorkspaceUid: null },
        collections: { collections: [], collectionSortOrder: 'default' }
      });

      await warmSearchIndex()(dispatch, state);

      expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    });

    it('does not throw when the main process call rejects', async () => {
      const dispatch = jest.fn();
      window.ipcRenderer.invoke.mockRejectedValueOnce(new Error('boom'));
      const collections = [{ uid: 'c1', pathname: '/c1', name: 'One', mountStatus: 'unmounted' }];

      await expect(warmSearchIndex()(dispatch, getState(collections))).resolves.toBeUndefined();
    });
  });

  describe('fetchItemRaw', () => {
    it('fetches raw content over IPC and dispatches setItemRaw with it', async () => {
      const dispatch = jest.fn();
      window.ipcRenderer.invoke.mockResolvedValueOnce('meta {\n  name: Ping\n}');

      const raw = await fetchItemRaw({ collectionUid: 'col-1', itemUid: 'item-1', pathname: '/coll/ping.bru' })(dispatch);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-item-raw', { pathname: '/coll/ping.bru' });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'collections/setItemRaw',
        payload: { collectionUid: 'col-1', itemUid: 'item-1', raw: 'meta {\n  name: Ping\n}' }
      });
      expect(raw).toBe('meta {\n  name: Ping\n}');
    });
  });

  describe('resolveJsItemsRaw', () => {
    // A real store's dispatch also runs thunks it's handed (redux-thunk); this stands in for
    // that so fetchItemRaw's dispatch(fetchItemRaw(...)) call inside resolveJsItemsRaw resolves.
    const makeThunkDispatch = () => {
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch) : action));
      return dispatch;
    };

    it('fetches raw for every js-type item and leaves everything else untouched', async () => {
      const dispatch = makeThunkDispatch();
      window.ipcRenderer.invoke.mockResolvedValue('console.log("hi")');
      const collectionCopy = {
        uid: 'col-1',
        items: [
          { uid: 'js-1', type: 'js', pathname: '/coll/util.js', raw: null },
          { uid: 'req-1', type: 'http-request', pathname: '/coll/ping.bru' }
        ]
      };

      const result = await resolveJsItemsRaw(collectionCopy)(dispatch);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(1);
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-item-raw', { pathname: '/coll/util.js' });
      expect(result.items[0].raw).toBe('console.log("hi")');
      expect(result.items[1].raw).toBeUndefined();
      expect(result).toBe(collectionCopy);
    });

    it('skips a js item that already has raw', async () => {
      const dispatch = makeThunkDispatch();
      const collectionCopy = {
        uid: 'col-1',
        items: [{ uid: 'js-1', type: 'js', pathname: '/coll/util.js', raw: 'already here' }]
      };

      await resolveJsItemsRaw(collectionCopy)(dispatch);

      expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    });

    it('resolves raw for js items nested inside folders', async () => {
      const dispatch = makeThunkDispatch();
      window.ipcRenderer.invoke.mockResolvedValue('nested content');
      const collectionCopy = {
        uid: 'col-1',
        items: [{
          uid: 'folder-1',
          type: 'folder',
          items: [{ uid: 'js-1', type: 'js', pathname: '/coll/api/util.js', raw: undefined }]
        }]
      };

      await resolveJsItemsRaw(collectionCopy)(dispatch);

      expect(collectionCopy.items[0].items[0].raw).toBe('nested content');
    });
  });
});
