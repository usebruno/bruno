import { transformCollectionToSaveToExportAsFile, transformRequestToSaveToFilesystem } from '../../collections/index';
import { transformItemsInCollection } from '../../importers/common';

describe('gRPC Export/Import', () => {
  describe('transformCollectionToSaveToExportAsFile', () => {
    it('should preserve gRPC-specific fields when exporting collection', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc-request',
            name: 'Test gRPC Request',
            request: {
              url: 'grpc://localhost:50051',
              method: '/randomService/randomMethod',
              methodType: 'unary',
              protoPath: 'proto/service.proto',
              headers: [],
              body: {
                mode: 'grpc',
                grpc: [{ name: 'message', content: '{}' }]
              }
            }
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const grpcRequest = result.items[0];

      expect(grpcRequest.request.methodType).toBe('unary');
      expect(grpcRequest.request.method).toBe('/randomService/randomMethod');
      expect(grpcRequest.request.protoPath).toBe('proto/service.proto');
      expect(grpcRequest.request.params).toBeUndefined();
    });

    it('should handle different gRPC method types correctly', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc-request',
            name: 'Streaming Request',
            request: {
              url: 'grpc://localhost:50051',
              method: '/randomService/randomMethod',    
              methodType: 'bidi-streaming',
              protoPath: 'proto/streaming.proto',
              headers: [],
              body: { mode: 'grpc', grpc: [] }
            }
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const grpcRequest = result.items[0];

      expect(grpcRequest.request.methodType).toBe('bidi-streaming');
      expect(grpcRequest.request.method).toBe('/randomService/randomMethod');
      expect(grpcRequest.request.protoPath).toBe('proto/streaming.proto');
    });

    it('should handle gRPC requests without method', () => {
      const collection = {
        uid: 'test-collection',
        name: 'Test Collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc-request',
            name: 'Streaming Request',
            request: {
              url: 'grpc://localhost:50051',
              methodType: 'unary',
              headers: [],
              body: { mode: 'grpc', grpc: [] }
            }
          }
        ]
      };

      const result = transformCollectionToSaveToExportAsFile(collection);
      const grpcRequest = result.items[0];

      expect(grpcRequest.request.methodType).toBe('unary');
      expect(grpcRequest.request.method).toBeUndefined();
      expect(grpcRequest.request.protoPath).toBeUndefined();
    });
  });

  describe('transformRequestToSaveToFilesystem', () => {
    it('should preserve gRPC fields and remove params for gRPC requests', () => {
      const grpcRequest = {
        uid: 'grpc-request-1',
        type: 'grpc-request',
        name: 'Test gRPC',
        request: {
          url: 'grpc://localhost:50051',
          method: '/randomService/randomMethod',
          methodType: 'server-streaming',
          protoPath: 'proto/service.proto',
          params: [{ uid: 'param-1', name: 'test', value: 'value' }],
          headers: [],
          body: { mode: 'grpc', grpc: [] }
        }
      };

      const result = transformRequestToSaveToFilesystem(grpcRequest);

      expect(result.request.methodType).toBe('server-streaming');
      expect(result.request.protoPath).toBe('proto/service.proto');
      expect(result.request.params).toBeUndefined();
    });

    it('should not remove params for non-gRPC requests', () => {
      const httpRequest = {
        uid: 'http-request-1',
        type: 'http-request',
        name: 'Test HTTP',
        request: {
          url: 'http://localhost:3000',
          method: 'GET',
          params: [{ uid: 'param-1', name: 'test', value: 'value' }],
          headers: [],
          body: { mode: 'json', json: '{}' }
        }
      };

      const result = transformRequestToSaveToFilesystem(httpRequest);

      expect(result.request.params).toHaveLength(1);
      expect(result.request.params[0].name).toBe('test');
    });
  });

  describe('transformItemsInCollection', () => {
    it('should transform gRPC request type correctly during import', () => {
      const collection = {
        uid: 'test-collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc',
            name: 'Test gRPC',
            request: {
              url: 'grpc://localhost:50051',
              methodType: 'unary',
              protoPath: 'proto/service.proto',
              body: { mode: 'grpc', grpc: [] }
            }
          }
        ]
      };

      transformItemsInCollection(collection);
      const grpcRequest = collection.items[0];

      expect(grpcRequest.type).toBe('grpc-request');
      expect(grpcRequest.request.methodType).toBe('unary');
      expect(grpcRequest.request.protoPath).toBe('proto/service.proto');
    });

    it('should handle gRPC requests without protoPath', () => {
      const collection = {
        uid: 'test-collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc',
            name: 'Test gRPC',
            request: {
              url: 'grpc://localhost:50051',
              method: '/randomService/randomMethod',
              methodType: 'client-streaming',
              body: { mode: 'grpc', grpc: [] }
            }
          }
        ]
      };

      transformItemsInCollection(collection);
      const grpcRequest = collection.items[0];

      expect(grpcRequest.type).toBe('grpc-request');
      expect(grpcRequest.request.methodType).toBe('client-streaming');
      expect(grpcRequest.request.protoPath).toBeUndefined();
    });

    it('should handle gRPC requests without method', () => {
      const collection = {
        uid: 'test-collection',
        items: [
          {
            uid: 'grpc-request-1',
            type: 'grpc',
            name: 'Test gRPC',
            request: {
              url: 'grpc://localhost:50051',
              methodType: 'unary',
              protoPath: 'proto/service.proto',
              body: { mode: 'grpc', grpc: [] }
            }
          }
        ]
      };

      transformItemsInCollection(collection);
      const grpcRequest = collection.items[0];

      expect(grpcRequest.type).toBe('grpc-request');
      expect(grpcRequest.request.method).toBeUndefined();
      expect(grpcRequest.request.methodType).toBe('unary');
      expect(grpcRequest.request.protoPath).toBe('proto/service.proto');
    });
  });
});
