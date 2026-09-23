import { newHttpRequest, tryResponseExample } from './actions';

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

  describe('tryResponseExample', () => {
    const exampleRequest = {
      url: 'https://api.example.com/users/:id?verbose=true',
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
                request: { method: 'GET', url: 'https://api.example.com/users/1', auth: { mode: 'bearer', bearer: { token: 'abc' } } },
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
