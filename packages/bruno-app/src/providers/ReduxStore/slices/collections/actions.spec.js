import { newHttpRequest, revealItemInSidebar, revealTabInSidebar, tryResponseExample } from './actions';
import { SIDEBAR_REVEAL_STATUS } from 'utils/common/constants';

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

  const makeCollection = (overrides = {}) => ({
    uid: 'collection-uid',
    collapsed: true,
    mountStatus: 'mounted',
    isLoading: false,
    items: [
      {
        uid: 'folder-a',
        type: 'folder',
        collapsed: true,
        items: [
          {
            uid: 'folder-b',
            type: 'folder',
            collapsed: true,
            items: [{ uid: 'deep-req', type: 'http-request', request: {}, collapsed: true }]
          }
        ]
      }
    ],
    ...overrides
  });

  const makeGetState = (collection) => () => ({ collections: { collections: [collection] } });

  describe('revealItemInSidebar', () => {
    it('expands the collapsed collection and every ancestor folder, leaving the target alone', () => {
      const dispatch = jest.fn();
      const status = revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'deep-req' })(
        dispatch,
        makeGetState(makeCollection())
      );

      expect(status).toBe(SIDEBAR_REVEAL_STATUS.REVEALED);
      expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
        { type: 'collections/expandCollection', payload: 'collection-uid' },
        { type: 'collections/expandItem', payload: { collectionUid: 'collection-uid', itemUid: 'folder-a' } },
        { type: 'collections/expandItem', payload: { collectionUid: 'collection-uid', itemUid: 'folder-b' } }
      ]);
    });

    it('does not dispatch for ancestors that are already expanded', () => {
      const collection = makeCollection({ collapsed: false });
      collection.items[0].collapsed = false;

      const dispatch = jest.fn();
      revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'deep-req' })(
        dispatch,
        makeGetState(collection)
      );

      expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
        { type: 'collections/expandItem', payload: { collectionUid: 'collection-uid', itemUid: 'folder-b' } }
      ]);
    });

    it('expands the target itself when expandTarget is set', () => {
      const dispatch = jest.fn();
      revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'deep-req', expandTarget: true })(
        dispatch,
        makeGetState(makeCollection())
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'collections/expandItem',
        payload: { collectionUid: 'collection-uid', itemUid: 'deep-req' }
      });
    });

    it('leaves the sidebar untouched for a tab uid that is not a tree item', () => {
      const dispatch = jest.fn();
      const status = revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'collection-uid' })(
        dispatch,
        makeGetState(makeCollection())
      );

      expect(status).toBe(SIDEBAR_REVEAL_STATUS.SKIPPED);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('reports pending while the collection is still loading so the caller can retry', () => {
      const dispatch = jest.fn();
      const loading = revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'not-yet-loaded' })(
        dispatch,
        makeGetState(makeCollection({ isLoading: true }))
      );
      const mounting = revealItemInSidebar({ collectionUid: 'collection-uid', itemUid: 'not-yet-loaded' })(
        dispatch,
        makeGetState(makeCollection({ mountStatus: 'mounting' }))
      );

      expect(loading).toBe(SIDEBAR_REVEAL_STATUS.PENDING);
      expect(mounting).toBe(SIDEBAR_REVEAL_STATUS.PENDING);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('skips an unknown collection', () => {
      const dispatch = jest.fn();
      const status = revealItemInSidebar({ collectionUid: 'missing', itemUid: 'deep-req' })(
        dispatch,
        makeGetState(makeCollection())
      );

      expect(status).toBe(SIDEBAR_REVEAL_STATUS.SKIPPED);
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('revealTabInSidebar', () => {
    const makeGetStateWithTabs = (collection, tabs) => () => ({
      collections: { collections: [collection] },
      tabs: { tabs }
    });

    it('reveals the item behind a request tab', () => {
      const getState = makeGetStateWithTabs(makeCollection(), [
        { uid: 'deep-req', collectionUid: 'collection-uid', type: 'http-request' }
      ]);
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      expect(revealTabInSidebar('deep-req')(dispatch, getState)).toBe(SIDEBAR_REVEAL_STATUS.REVEALED);
      expect(dispatch).toHaveBeenCalledWith({
        type: 'collections/expandItem',
        payload: { collectionUid: 'collection-uid', itemUid: 'folder-a' }
      });
    });

    it('reveals the parent request behind a response-example tab and expands it', () => {
      const getState = makeGetStateWithTabs(makeCollection(), [
        { uid: 'example-uid', collectionUid: 'collection-uid', type: 'response-example', itemUid: 'deep-req' }
      ]);
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      revealTabInSidebar('example-uid')(dispatch, getState);

      expect(dispatch).toHaveBeenCalledWith({
        type: 'collections/expandItem',
        payload: { collectionUid: 'collection-uid', itemUid: 'deep-req' }
      });
    });

    it('skips a tab that belongs to no collection', () => {
      const getState = makeGetStateWithTabs(makeCollection(), [{ uid: 'workspace-overview', type: 'workspaceOverview' }]);
      const dispatch = jest.fn();

      expect(revealTabInSidebar('workspace-overview')(dispatch, getState)).toBe(SIDEBAR_REVEAL_STATUS.SKIPPED);
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('tryResponseExample', () => {
    const exampleRequest = {
      url: 'http://localhost:8081/api/echo/anything/:id?verbose=true',
      method: 'POST',
      headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }],
      params: [
        { uid: 'p1', name: 'verbose', value: 'true', type: 'query', enabled: true },
        { uid: 'p2', name: 'id', value: '42', type: 'path', enabled: true }
      ],
      body: { mode: 'json', json: '{"name":"bruno"}' }
    };

    const buildState = ({ transientNames = [] } = {}) => ({
      collections: {
        tempDirectories: { 'collection-uid': '/tmp/transient/collection' },
        collections: [
          {
            uid: 'collection-uid',
            pathname: '/bruno/collection',
            format: 'yml',
            items: [
              {
                uid: 'item-uid',
                type: 'http-request',
                name: 'Get User',
                pathname: '/bruno/collection/get-user.yml',
                request: { method: 'GET', url: exampleRequest.url, auth: { mode: 'bearer', bearer: { token: 'abc' } } },
                examples: [{ uid: 'example-uid', name: 'Success', type: 'http-request', request: exampleRequest }]
              },
              ...transientNames.map((name, index) => ({
                uid: `transient-${index}`,
                type: 'http-request',
                name,
                isTransient: true,
                pathname: `/tmp/transient/collection/${name}.yml`,
                request: { method: 'GET', url: '' }
              }))
            ]
          }
        ]
      }
    });

    it('creates a transient request from the example and queues an auto-sent open task', async () => {
      const getState = () => buildState();
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      await tryResponseExample({ itemUid: 'item-uid', collectionUid: 'collection-uid', exampleUid: 'example-uid' })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('Untitled 1.yml'),
        expect.objectContaining({
          name: 'Untitled 1',
          isTransient: true,
          request: expect.objectContaining({
            method: 'POST',
            url: exampleRequest.url,
            headers: exampleRequest.headers,
            params: exampleRequest.params,
            body: exampleRequest.body,
            auth: { mode: 'inherit' }
          })
        })
      );

      const queuedTask = dispatch.mock.calls.map(([action]) => action).find((action) => action?.type === 'app/insertTaskIntoQueue');
      expect(queuedTask.payload).toEqual(
        expect.objectContaining({
          type: 'OPEN_REQUEST',
          collectionUid: 'collection-uid',
          preview: false,
          autoSend: true
        })
      );
    });

    it('numbers the request after the transient requests already open', async () => {
      const getState = () => buildState({ transientNames: ['Untitled 1', 'Untitled 2'] });
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      await tryResponseExample({ itemUid: 'item-uid', collectionUid: 'collection-uid', exampleUid: 'example-uid' })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('Untitled 3.yml'),
        expect.objectContaining({ name: 'Untitled 3' })
      );
    });
  });
});
