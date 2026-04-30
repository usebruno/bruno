const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/ipc/network/interpolate-vars');
jest.mock('../../src/ipc/network/cert-utils');
jest.mock('../../src/utils/collection');
jest.mock('../../src/store/process-env');
jest.mock('../../src/utils/oauth2');
jest.mock('../../src/ipc/network/prepare-request');

const prepareGrpcRequest = require('../../src/ipc/network/prepare-grpc-request');
const { configureRequest } = require('../../src/ipc/network/prepare-grpc-request');
const interpolateVars = require('../../src/ipc/network/interpolate-vars');
const { getCertsAndProxyConfig } = require('../../src/ipc/network/cert-utils');
const { getEnvVars, getTreePathFromCollectionToItem } = require('../../src/utils/collection');
const { getProcessEnvVars } = require('../../src/store/process-env');
const { getOAuth2TokenUsingClientCredentials } = require('../../src/utils/oauth2');
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
    getCertsAndProxyConfig.mockResolvedValue({});
    setAuthHeaders.mockImplementation((grpcRequest, request) => {
      if (request?.auth?.mode === 'oauth2') {
        return {
          ...grpcRequest,
          oauth2: request.auth.oauth2
        };
      }

      return grpcRequest;
    });
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

    it('should not add the OAuth2 token when tokenPlacement is none', async () => {
      getOAuth2TokenUsingClientCredentials.mockResolvedValue({
        credentials: { access_token: 'token123' },
        url: 'https://auth.example.com/token',
        credentialsId: 'credentials',
        debugInfo: {}
      });

      mockItem.request.url = 'grpc://localhost:50051?existing=1';
      mockItem.request.headers = [];
      mockItem.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: 'https://auth.example.com/token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          tokenPlacement: 'none',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token'
        }
      };

      const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

      await configureRequest(
        result,
        mockItem.request,
        mockCollection,
        result.envVars,
        mockRuntimeVariables,
        result.processEnvVars,
        result.promptVariables,
        {}
      );

      expect(result.headers['Authorization']).toBeUndefined();
      expect(result.url).toBe('grpc://localhost:50051?existing=1');
      expect(result.oauth2Credentials.credentials.access_token).toBe('token123');
    });
  });
});
