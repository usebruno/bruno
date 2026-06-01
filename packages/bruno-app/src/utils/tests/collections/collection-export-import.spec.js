import { transformCollectionToSaveToExportAsFile } from 'utils/collections/index';
import { deleteUidsInItems, transformItem } from 'utils/collections/export';
import { transformItemsInCollection, hydrateSeqInCollection } from 'utils/importers/common';

describe('Collection Export/Import - Folders & Environments', () => {
  const makeCollection = (items = []) => ({
    uid: 'coll-1',
    name: 'Test Collection',
    version: '1',
    type: 'collection',
    items
  });

  const makeHttpRequest = (name, overrides = {}) => ({
    uid: `req-${name}`,
    type: 'http-request',
    name,
    seq: 1,
    request: {
      method: 'GET',
      url: 'https://api.example.com/test',
      params: [],
      headers: [],
      auth: { mode: 'none' },
      body: { mode: 'none' },
      vars: { req: [], res: [] },
      assertions: [],
      tests: ''
    },
    ...overrides
  });

  const makeFolder = (name, items = [], overrides = {}) => ({
    uid: `folder-${name}`,
    type: 'folder',
    name,
    seq: 1,
    items,
    ...overrides
  });

  describe('Folder structure preservation', () => {
    it('should preserve flat folder structure during export→import cycle', () => {
      const collection = makeCollection([
        makeFolder('Users', [
          makeHttpRequest('Get Users', {
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              params: [],
              headers: [],
              auth: { mode: 'none' },
              body: { mode: 'none' },
              vars: { req: [], res: [] },
              assertions: [],
              tests: ''
            }
          }),
          makeHttpRequest('Create User', {
            request: {
              method: 'POST',
              url: 'https://api.example.com/users',
              params: [],
              headers: [],
              auth: { mode: 'none' },
              body: { mode: 'json', json: '{"name":"test"}' },
              vars: { req: [], res: [] },
              assertions: [],
              tests: ''
            }
          })
        ]),
        makeHttpRequest('Health Check')
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      expect(collectionCopy.items).toHaveLength(2);

      const folder = collectionCopy.items.find((i) => i.type === 'folder');
      expect(folder).toBeDefined();
      expect(folder.name).toBe('Users');
      expect(folder.items).toHaveLength(2);
      expect(folder.items[0].name).toBe('Get Users');
      expect(folder.items[1].name).toBe('Create User');
      expect(folder.items[0].request.method).toBe('GET');
      expect(folder.items[1].request.method).toBe('POST');

      const healthCheck = collectionCopy.items.find((i) => i.name === 'Health Check');
      expect(healthCheck).toBeDefined();
    });

    it('should preserve nested folder structures', () => {
      const collection = makeCollection([
        makeFolder('API', [
          makeFolder('v1', [
            makeHttpRequest('Get Data', {
              request: {
                method: 'GET',
                url: 'https://api.example.com/v1/data',
                params: [],
                headers: [],
                auth: { mode: 'none' },
                body: { mode: 'none' },
                vars: { req: [], res: [] },
                assertions: [],
                tests: ''
              }
            })
          ]),
          makeFolder('v2', [
            makeHttpRequest('Get Data', {
              request: {
                method: 'GET',
                url: 'https://api.example.com/v2/data',
                params: [],
                headers: [],
                auth: { mode: 'none' },
                body: { mode: 'none' },
                vars: { req: [], res: [] },
                assertions: [],
                tests: ''
              }
            })
          ])
        ])
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      const apiFolder = collectionCopy.items[0];
      expect(apiFolder.type).toBe('folder');
      expect(apiFolder.items).toHaveLength(2);

      const v1Folder = apiFolder.items.find((i) => i.name === 'v1');
      expect(v1Folder).toBeDefined();
      expect(v1Folder.items).toHaveLength(1);
      expect(v1Folder.items[0].name).toBe('Get Data');
      expect(v1Folder.items[0].request.url).toBe('https://api.example.com/v1/data');

      const v2Folder = apiFolder.items.find((i) => i.name === 'v2');
      expect(v2Folder).toBeDefined();
      expect(v2Folder.items[0].request.url).toBe('https://api.example.com/v2/data');
    });

    it('should preserve 3-level deep nested folders', () => {
      const collection = makeCollection([
        makeFolder('Level1', [
          makeFolder('Level2', [
            makeFolder('Level3', [
              makeHttpRequest('Deep Request', {
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/deep',
                  params: [],
                  headers: [],
                  auth: { mode: 'none' },
                  body: { mode: 'none' },
                  vars: { req: [], res: [] },
                  assertions: [],
                  tests: ''
                }
              })
            ])
          ])
        ])
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      let current = collectionCopy.items[0];
      expect(current.name).toBe('Level1');
      current = current.items[0];
      expect(current.name).toBe('Level2');
      current = current.items[0];
      expect(current.name).toBe('Level3');
      expect(current.items[0].name).toBe('Deep Request');
    });

    it('should preserve empty folders', () => {
      const collection = makeCollection([
        makeFolder('Empty Folder', [])
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      expect(collectionCopy.items[0].name).toBe('Empty Folder');
      expect(collectionCopy.items[0].type).toBe('folder');
    });
  });

  describe('Collection metadata preservation', () => {
    it('should preserve collection name through export cycle', () => {
      const collection = makeCollection([makeHttpRequest('Test')]);
      const exported = transformCollectionToSaveToExportAsFile(collection);

      expect(exported.name).toBe('Test Collection');
      expect(exported.items).toHaveLength(1);
    });

    it('should preserve item sequencing', () => {
      const collection = makeCollection([
        makeHttpRequest('Third', { seq: 3 }),
        makeHttpRequest('First', { seq: 1 }),
        makeHttpRequest('Second', { seq: 2 })
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      expect(collectionCopy.items[0].seq).toBe(3);
      expect(collectionCopy.items[1].seq).toBe(1);
      expect(collectionCopy.items[2].seq).toBe(2);
    });
  });

  describe('Mixed request types in collection', () => {
    it('should handle collection with HTTP, GraphQL, and gRPC requests', () => {
      const collection = makeCollection([
        makeHttpRequest('HTTP Req'),
        {
          uid: 'gql-1',
          type: 'graphql-request',
          name: 'GraphQL Req',
          seq: 2,
          request: {
            method: 'POST',
            url: 'https://api.example.com/graphql',
            params: [],
            headers: [],
            auth: { mode: 'none' },
            body: { mode: 'graphql', graphql: { query: 'query { user { name } }', variables: '{}' } },
            vars: { req: [], res: [] },
            assertions: [],
            tests: ''
          }
        },
        {
          uid: 'grpc-1',
          type: 'grpc-request',
          name: 'gRPC Req',
          seq: 3,
          request: {
            method: '/test.Service/Method',
            url: 'grpc://localhost:50051',
            methodType: 'unary',
            protoPath: 'proto/service.proto',
            params: [],
            headers: [],
            auth: { mode: 'none' },
            body: { mode: 'none' },
            vars: { req: [], res: [] },
            assertions: [],
            tests: ''
          }
        }
      ]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      expect(collectionCopy.items).toHaveLength(3);
      expect(collectionCopy.items.find((i) => i.type === 'http-request')).toBeDefined();
      expect(collectionCopy.items.find((i) => i.type === 'graphql-request')).toBeDefined();
      expect(collectionCopy.items.find((i) => i.type === 'grpc-request')).toBeDefined();
    });
  });

  describe('hydrateSeqInCollection', () => {
    it('should assign sequential seq values for items without seq', () => {
      const collection = makeCollection([
        { uid: 'i1', type: 'http-request', name: 'A', request: { method: 'GET', url: 'http://a.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } },
        { uid: 'i2', type: 'http-request', name: 'B', request: { method: 'GET', url: 'http://b.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } },
        { uid: 'i3', type: 'http-request', name: 'C', request: { method: 'GET', url: 'http://c.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } }
      ]);
      delete collection.uid;

      const result = hydrateSeqInCollection(JSON.parse(JSON.stringify(collection)));

      expect(result.items[0].seq).toBeDefined();
      expect(result.items[1].seq).toBeDefined();
      expect(result.items[2].seq).toBeDefined();
      expect(typeof result.items[0].seq).toBe('number');
    });

    it('should preserve existing seq values', () => {
      const collection = makeCollection([
        { uid: 'i1', type: 'http-request', name: 'A', seq: 10, request: { method: 'GET', url: 'http://a.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } },
        { uid: 'i2', type: 'http-request', name: 'B', seq: 20, request: { method: 'GET', url: 'http://b.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } }
      ]);
      delete collection.uid;

      const result = hydrateSeqInCollection(JSON.parse(JSON.stringify(collection)));

      expect(result.items[0].seq).toBe(10);
      expect(result.items[1].seq).toBe(20);
    });

    it('should handle nested folder items without seq', () => {
      const collection = makeCollection([
        makeFolder('Test Folder', [
          { uid: 'i1', type: 'http-request', name: 'Inner Req', request: { method: 'GET', url: 'http://test.com', params: [], headers: [], auth: {}, body: {}, vars: { req: [], res: [] }, assertions: [], tests: '' } }
        ])
      ]);
      delete collection.uid;

      const result = hydrateSeqInCollection(JSON.parse(JSON.stringify(collection)));

      const folder = result.items[0];
      expect(folder.seq).toBeDefined();
      expect(folder.items[0].seq).toBeDefined();
    });
  });
});
