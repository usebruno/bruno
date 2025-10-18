import { transformCollectionToSaveToExportAsFile, transformRequestToSaveToFilesystem } from '../../collections/index';
import { transformItemsInCollection } from '../../importers/common';
import { deleteUidsInItems, transformItem } from '../../collections/export';

describe('Examples Export/Import', () => {
  describe('transformCollectionToSaveToExportAsFile', () => {
    it('should preserve examples when exporting collection', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [
                { uid: 'header-1', name: 'Content-Type', value: 'application/json', enabled: true }
              ],
              params: [],
              body: {
                mode: 'json',
                json: '{"message": "test"}'
              }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Success Example',
                description: 'Example of successful response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [
                    { uid: 'ex-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  params: [],
                  body: {
                    mode: 'json',
                    json: '{"message": "test"}'
                  }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [
                    { uid: 'res-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  body: '{"success": true, "data": "test"}'
                }
              }
            ]
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const httpRequest = result.items[0];

      expect(httpRequest.examples).toHaveLength(1);
      expect(httpRequest.examples[0].name).toBe('Success Example');
      expect(httpRequest.examples[0].description).toBe('Example of successful response');
      expect(httpRequest.examples[0].type).toBe('http-request');
      expect(httpRequest.examples[0].request.url).toBe('https://api.example.com/test');
      expect(httpRequest.examples[0].request.method).toBe('POST');
      expect(httpRequest.examples[0].response.status).toBe('200');
      expect(httpRequest.examples[0].response.statusText).toBe('OK');
      expect(httpRequest.examples[0].response.body).toBe('{"success": true, "data": "test"}');
    });

    it('should handle multiple examples correctly', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'GET',
              headers: [],
              params: [],
              body: { mode: 'none' }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Success Example',
                description: '200 response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'GET',
                  headers: [],
                  params: [],
                  body: { mode: 'none' }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [],
                  body: '{"success": true}'
                }
              },
              {
                uid: 'example-2',
                itemUid: 'http-request-1',
                name: 'Error Example',
                description: '400 response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'GET',
                  headers: [],
                  params: [],
                  body: { mode: 'none' }
                },
                response: {
                  status: '400',
                  statusText: 'Bad Request',
                  headers: [],
                  body: '{"error": "Invalid request"}'
                }
              }
            ]
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const httpRequest = result.items[0];

      expect(httpRequest.examples).toHaveLength(2);
      expect(httpRequest.examples[0].name).toBe('Success Example');
      expect(httpRequest.examples[1].name).toBe('Error Example');
      expect(httpRequest.examples[0].response.status).toBe('200');
      expect(httpRequest.examples[1].response.status).toBe('400');
    });

    it('should handle examples with GraphQL requests', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'graphql-request-1',
            type: 'graphql-request',
            name: 'Test GraphQL Request',
            request: {
              url: 'https://api.example.com/graphql',
              method: 'POST',
              headers: [
                { uid: 'header-1', name: 'Content-Type', value: 'application/json', enabled: true }
              ],
              params: [],
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query { user { name } }',
                  variables: '{}'
                }
              }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'graphql-request-1',
                name: 'GraphQL Success',
                description: 'Successful GraphQL query',
                type: 'graphql-request',
                request: {
                  url: 'https://api.example.com/graphql',
                  method: 'POST',
                  headers: [
                    { uid: 'ex-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  params: [],
                  body: {
                    mode: 'graphql',
                    graphql: {
                      query: 'query { user { name } }',
                      variables: '{}'
                    }
                  }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [
                    { uid: 'res-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  body: '{"data": {"user": {"name": "John Doe"}}}'
                }
              }
            ]
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const graphqlRequest = result.items[0];

      expect(graphqlRequest.examples).toHaveLength(1);
      expect(graphqlRequest.examples[0].type).toBe('graphql-request');
      expect(graphqlRequest.examples[0].request.url).toBe('https://api.example.com/graphql');
      expect(graphqlRequest.examples[0].response.body).toBe('{"data": {"user": {"name": "John Doe"}}}');
    });

    it('should handle requests without examples', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'GET',
              headers: [],
              params: [],
              body: { mode: 'none' }
            }
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const httpRequest = result.items[0];

      expect(httpRequest.examples).toHaveLength(0);
    });
  });

  describe('transformRequestToSaveToFilesystem', () => {
    it('should preserve examples when saving request to filesystem', () => {
      const httpRequest = {
        uid: 'http-request-1',
        type: 'http-request',
        name: 'Test HTTP',
        request: {
          url: 'https://api.example.com/test',
          method: 'POST',
          headers: [],
          params: [],
          body: { mode: 'json', json: '{}' }
        },
        examples: [
          {
            uid: 'example-1',
            itemUid: 'http-request-1',
            name: 'Test Example',
            description: 'Test description',
            type: 'http-request',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [],
              params: [],
              body: { mode: 'json', json: '{}' }
            },
            response: {
              status: '200',
              statusText: 'OK',
              headers: [],
              body: '{"success": true}'
            }
          }
        ]
      };

      const result = transformRequestToSaveToFilesystem(httpRequest);

      expect(result.examples).toHaveLength(1);
      expect(result.examples[0].name).toBe('Test Example');
      expect(result.examples[0].response.status).toBe('200');
    });
  });

  describe('exportCollection', () => {
    it('should remove UIDs from examples during export', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [
                { uid: 'header-1', name: 'Content-Type', value: 'application/json', enabled: true }
              ],
              params: [],
              body: { mode: 'json', json: '{}' }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Test Example',
                description: 'Test description',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [
                    { uid: 'ex-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  params: [],
                  body: { mode: 'json', json: '{}' }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [
                    { uid: 'res-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  body: '{"success": true}'
                }
              }
            ]
          }
        ]
      };

      // Test the deleteUidsInItems function directly
      const itemsCopy = JSON.parse(JSON.stringify(collection.items));
      deleteUidsInItems(itemsCopy);

      const httpRequest = itemsCopy[0];
      expect(httpRequest.uid).toBeUndefined();
      expect(httpRequest.examples[0].uid).toBeUndefined();
      expect(httpRequest.examples[0].itemUid).toBeUndefined();
      expect(httpRequest.request.headers[0].uid).toBeUndefined();
      expect(httpRequest.examples[0].request.headers[0].uid).toBeUndefined();
      expect(httpRequest.examples[0].response.headers[0].uid).toBeUndefined();
    });

    it('should transform example types during export', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [],
              params: [],
              body: { mode: 'json', json: '{}' }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Test Example',
                description: 'Test description',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [],
                  params: [],
                  body: { mode: 'json', json: '{}' }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [],
                  body: '{"success": true}'
                }
              }
            ]
          }
        ]
      };

      // Test the transformItem function directly
      const itemsCopy = JSON.parse(JSON.stringify(collection.items));
      transformItem(itemsCopy);

      const httpRequest = itemsCopy[0];
      expect(httpRequest.type).toBe('http');
      expect(httpRequest.examples[0].type).toBe('http');
    });
  });

  describe('transformItemsInCollection', () => {
    it('should transform example types correctly during import', () => {
      const collection = {
        uid: 'test-collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http',
            name: 'Test HTTP',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [],
              params: [],
              body: { mode: 'json', json: '{}' }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Test Example',
                description: 'Test description',
                type: 'http',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [],
                  params: [],
                  body: { mode: 'json', json: '{}' }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [],
                  body: '{"success": true}'
                }
              }
            ]
          }
        ]
      };

      transformItemsInCollection(collection);
      const httpRequest = collection.items[0];

      expect(httpRequest.type).toBe('http-request');
      expect(httpRequest.examples[0].type).toBe('http-request');
    });

    it('should handle examples without UIDs during import', () => {
      const collection = {
        uid: 'test-collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http',
            name: 'Test HTTP',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [],
              params: [],
              body: { mode: 'json', json: '{}' }
            },
            examples: [
              {
                name: 'Test Example',
                description: 'Test description',
                type: 'http',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [],
                  params: [],
                  body: { mode: 'json', json: '{}' }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [],
                  body: '{"success": true}'
                }
              }
            ]
          }
        ]
      };

      // Test that examples are preserved during transformation
      transformItemsInCollection(collection);
      const httpRequest = collection.items[0];

      expect(httpRequest.examples).toHaveLength(1);
      expect(httpRequest.examples[0].name).toBe('Test Example');
      expect(httpRequest.examples[0].type).toBe('http-request');
    });
  });

  describe('Full Export/Import Cycle', () => {
    it('should preserve examples through export transformation', () => {
      const originalCollection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'http-request-1',
            type: 'http-request',
            name: 'Test HTTP Request',
            request: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: [
                { uid: 'header-1', name: 'Content-Type', value: 'application/json', enabled: true }
              ],
              params: [],
              body: { mode: 'json', json: '{"message": "test"}' }
            },
            examples: [
              {
                uid: 'example-1',
                itemUid: 'http-request-1',
                name: 'Success Example',
                description: 'Example of successful response',
                type: 'http-request',
                request: {
                  url: 'https://api.example.com/test',
                  method: 'POST',
                  headers: [
                    { uid: 'ex-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  params: [],
                  body: {
                    mode: 'json',
                    json: '{"message": "test"}'
                  }
                },
                response: {
                  status: '200',
                  statusText: 'OK',
                  headers: [
                    { uid: 'res-header-1', name: 'Content-Type', value: 'application/json', enabled: true }
                  ],
                  body: '{"success": true, "data": "test"}'
                }
              }
            ]
          }
        ]
      };

      // Step 1: Export transformation
      const exportedCollection = transformCollectionToSaveToExportAsFile(originalCollection);

      // Step 2: Simulate export process (remove UIDs and transform types)
      const collectionCopy = JSON.parse(JSON.stringify(exportedCollection));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);

      // Step 3: Simulate import process (transform types)
      transformItemsInCollection(collectionCopy);

      const originalRequest = originalCollection.items[0];
      const importedRequest = collectionCopy.items[0];

      // Verify the request data is preserved
      expect(importedRequest.name).toBe(originalRequest.name);
      expect(importedRequest.type).toBe('http-request');
      expect(importedRequest.request.url).toBe(originalRequest.request.url);
      expect(importedRequest.request.method).toBe(originalRequest.request.method);

      // Verify examples are preserved
      expect(importedRequest.examples).toHaveLength(1);
      expect(importedRequest.examples[0].name).toBe(originalRequest.examples[0].name);
      expect(importedRequest.examples[0].description).toBe(originalRequest.examples[0].description);
      expect(importedRequest.examples[0].type).toBe('http-request');
      expect(importedRequest.examples[0].request.url).toBe(originalRequest.examples[0].request.url);
      expect(importedRequest.examples[0].request.method).toBe(originalRequest.examples[0].request.method);
      expect(importedRequest.examples[0].response.status).toBe(originalRequest.examples[0].response.status);
      expect(importedRequest.examples[0].response.statusText).toBe(originalRequest.examples[0].response.statusText);
      expect(importedRequest.examples[0].response.body).toBe(originalRequest.examples[0].response.body);
    });
  });
});
