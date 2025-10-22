const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/ipc/network/interpolate-vars');
jest.mock('../../src/utils/collection');
jest.mock('../../src/store/process-env');
jest.mock('../../src/utils/oauth2');
jest.mock('../../src/ipc/network/prepare-request');

const prepareGrpcRequest = require('../../src/ipc/network/prepare-grpc-request');
const interpolateVars = require('../../src/ipc/network/interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem } = require('../../src/utils/collection');
const { getProcessEnvVars } = require('../../src/store/process-env');
const { setAuthHeaders } = require('../../src/ipc/network/prepare-request');

describe('prepare-grpc-request: prepareGrpcRequest', () => {
  let mockItem;
  let mockCollection;
  let mockEnvironment;
  let mockRuntimeVariables;

  beforeEach(() => {
    jest.clearAllMocks();

    getEnvVars.mockReturnValue({});
    getTreePathFromCollectionToItem.mockReturnValue([]);
    getProcessEnvVars.mockReturnValue({});
    setAuthHeaders.mockImplementation((request) => request);
    interpolateVars.mockImplementation((request) => request);

    mockItem = {
      uid: 'test-item-uid',
      request: {
        method: 'POST',
        methodType: 'unary',
        url: 'grpc://localhost:50051',
        headers: [],
        body: {
          mode: 'json',
          json: '{"test": "data"}'
        },
        protoPath: '/path/to/proto.proto',
        auth: { mode: 'none' }
      }
    };

    mockCollection = {
      uid: 'test-collection-uid',
      root: {
        request: {
          headers: []
        }
      },
      brunoConfig: {
        scripts: {
          flow: 'sandwich'
        }
      }
    };

    mockEnvironment = {};
    mockRuntimeVariables = {};
  });

  describe('Header processing', () => {
    it('should keep regular headers as strings', async () => {
      mockItem.request.headers = [
        { name: 'content-type', value: 'application/grpc', enabled: true },
        { name: 'authorization', value: 'Bearer token123', enabled: true },
        { name: 'user-agent', value: 'bruno-client', enabled: true }
      ];

      const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

      expect(result.headers['content-type']).toBe('application/grpc');
      expect(result.headers['authorization']).toBe('Bearer token123');
      expect(result.headers['user-agent']).toBe('bruno-client');
      expect(typeof result.headers['content-type']).toBe('string');
      expect(typeof result.headers['authorization']).toBe('string');
      expect(typeof result.headers['user-agent']).toBe('string');
    });

    it('should skip disabled headers', async () => {
      mockItem.request.headers = [
        { name: 'content-type', value: 'application/grpc', enabled: false },
        { name: 'authorization', value: 'Bearer token123', enabled: false }
      ];

      const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

      expect(result.headers).toEqual({});
    });
  });
});
