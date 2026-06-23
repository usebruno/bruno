import {
  buildDocsContextFromCollection,
  buildDocsContextFromFolder,
  buildRequestContextFromItem
} from './index';

describe('utils/ai', () => {
  const collection = {
    name: 'Pet Store API',
    items: [
      {
        uid: 'f1',
        type: 'folder',
        name: 'Users',
        items: [
          {
            uid: 'r1',
            type: 'http-request',
            name: 'List Users',
            request: { method: 'GET', url: '{{base}}/users' }
          },
          {
            uid: 'f2',
            type: 'folder',
            name: 'Admin',
            items: [
              {
                uid: 'r2',
                type: 'http-request',
                name: 'Delete User',
                request: { method: 'DELETE', url: '{{base}}/users/1' }
              }
            ]
          }
        ]
      },
      {
        uid: 'r3',
        type: 'http-request',
        name: 'Health Check',
        request: { method: 'GET', url: '{{base}}/health' }
      }
    ]
  };

  describe('buildDocsContextFromCollection', () => {
    it('summarizes top-level folders and requests', () => {
      expect(buildDocsContextFromCollection(collection)).toEqual({
        scope: 'collection',
        name: 'Pet Store API',
        folders: [
          {
            name: 'Users',
            requestCount: 1,
            subfolderCount: 1
          }
        ],
        requests: [
          {
            name: 'Health Check',
            method: 'GET',
            url: '{{base}}/health',
            type: 'http-request'
          }
        ]
      });
    });

    it('returns null when collection is missing', () => {
      expect(buildDocsContextFromCollection(null)).toBeNull();
    });
  });

  describe('buildDocsContextFromFolder', () => {
    it('summarizes direct child folders and requests for the folder scope', () => {
      const folder = collection.items[0];

      expect(buildDocsContextFromFolder(collection, folder)).toEqual({
        scope: 'folder',
        name: 'Users',
        collectionName: 'Pet Store API',
        folders: [
          {
            name: 'Admin',
            requestCount: 1,
            subfolderCount: 0
          }
        ],
        requests: [
          {
            name: 'List Users',
            method: 'GET',
            url: '{{base}}/users',
            type: 'http-request'
          }
        ]
      });
    });

    it('returns null when folder is missing', () => {
      expect(buildDocsContextFromFolder(collection, null)).toBeNull();
    });
  });

  describe('buildRequestContextFromItem', () => {
    it('builds request details for request-level docs', () => {
      const item = collection.items[1];

      expect(buildRequestContextFromItem(item)).toEqual({
        url: '{{base}}/health',
        method: 'GET',
        headers: [],
        params: [],
        body: null
      });
    });
  });
});
