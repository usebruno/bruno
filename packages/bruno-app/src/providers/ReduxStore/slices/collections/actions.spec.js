import { newHttpRequest, warmSearchIndex } from './actions';

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
});
