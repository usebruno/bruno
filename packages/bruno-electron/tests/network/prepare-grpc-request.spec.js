const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/ipc/network/interpolate-vars');
jest.mock('../../src/utils/collection');
jest.mock('../../src/store/process-env');
jest.mock('../../src/utils/oauth2');
jest.mock('../../src/ipc/network/prepare-request');

const prepareGrpcRequest = require('../../src/ipc/network/prepare-grpc-request');
const interpolateVars = require('../../src/ipc/network/interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, mergeAuth, getFormattedCollectionOauth2Credentials } = require('../../src/utils/collection');
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
    describe('Binary headers (-bin suffix)', () => {
      it('should handle multiple binary headers with different values', async () => {
        const base64Value1 = 'SGVsbG8='; // "Hello" in base64
        const base64Value2 = '';

        mockItem.request.headers = [
          { name: 'grpc-message-bin', value: base64Value1, enabled: true },
          { name: 'grpc-empty-bin', value: base64Value2, enabled: true }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(result.headers['grpc-message-bin']).toEqual(Buffer.from(base64Value1, 'base64'));
        expect(result.headers['grpc-empty-bin']).toEqual(Buffer.from(base64Value2, 'base64'));
      });
    });

    describe('Regular headers (non-binary)', () => {
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

      it('should handle headers that contain "bin" but do not end with "-bin"', async () => {
        mockItem.request.headers = [
          { name: 'binary-data', value: 'some-binary-data', enabled: true },
          { name: 'bin-header', value: 'not-binary', enabled: true },
          { name: 'my-bin-custom', value: 'also-not-binary', enabled: true }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(result.headers['binary-data']).toBe('some-binary-data');
        expect(result.headers['bin-header']).toBe('not-binary');
        expect(result.headers['my-bin-custom']).toBe('also-not-binary');
        expect(typeof result.headers['binary-data']).toBe('string');
        expect(typeof result.headers['bin-header']).toBe('string');
        expect(typeof result.headers['my-bin-custom']).toBe('string');
      });

      it('should handle mixed binary and regular headers', async () => {
        const base64Value = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64

        mockItem.request.headers = [
          { name: 'content-type', value: 'application/grpc', enabled: true },
          { name: 'grpc-status-bin', value: base64Value, enabled: true },
          { name: 'authorization', value: 'Bearer token123', enabled: true },
          { name: 'custom-bin', value: base64Value, enabled: true },
          { name: 'user-agent', value: 'bruno-client', enabled: true }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        // Regular headers should be strings
        expect(result.headers['content-type']).toBe('application/grpc');
        expect(result.headers['authorization']).toBe('Bearer token123');
        expect(result.headers['user-agent']).toBe('bruno-client');
        expect(typeof result.headers['content-type']).toBe('string');
        expect(typeof result.headers['authorization']).toBe('string');
        expect(typeof result.headers['user-agent']).toBe('string');

        // Binary headers should be Buffers
        expect(result.headers['grpc-status-bin']).toBeInstanceOf(Buffer);
        expect(result.headers['custom-bin']).toBeInstanceOf(Buffer);
        expect(result.headers['grpc-status-bin']).toEqual(Buffer.from(base64Value, 'base64'));
        expect(result.headers['custom-bin']).toEqual(Buffer.from(base64Value, 'base64'));
      });
    });

    describe('Header edge cases', () => {
      it('should skip disabled headers', async () => {
        const base64Value = 'SGVsbG8gV29ybGQ=';

        mockItem.request.headers = [
          { name: 'grpc-status-bin', value: base64Value, enabled: false },
          { name: 'content-type', value: 'application/grpc', enabled: false }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(result.headers).toEqual({});
      });
    });
  });
});
