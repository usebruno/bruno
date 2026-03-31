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

  describe('Body comment stripping', () => {
    beforeEach(() => {
      mockItem.request.body = {
        mode: 'grpc',
        grpc: []
      };
    });

    describe('Single-line comments (//) ', () => {
      it('should strip end-of-line comment', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "name": "test" // This is a comment\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(result.body.grpc[0].content).not.toContain('//');
        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test' });
      });

      it('should strip comment on its own line', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  // Comment on its own line\n  "name": "test"\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test' });
      });

      it('should strip multiple single-line comments', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  // First comment\n  "name": "test", // inline comment\n  // Another comment\n  "age": 30\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test', age: 30 });
      });

      it('should preserve URLs containing // in string values', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "url": "https://example.com/path" // comment\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ url: 'https://example.com/path' });
      });
    });

    describe('Multi-line comments (/* */)', () => {
      it('should strip inline multi-line comment', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "name": /* comment */ "test"\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test' });
      });

      it('should strip multi-line comment spanning multiple lines', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "name": "test",\n  /* This is a\n     multi-line\n     comment */\n  "age": 30\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test', age: 30 });
      });

      it('should strip block comment at end of line', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "name": "test" /* end comment */\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test' });
      });
    });

    describe('Mixed comment types', () => {
      it('should strip both single-line and multi-line comments', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  // Single line comment\n  "name": "test", /* block comment */\n  "age": 30 // another single line\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test', age: 30 });
      });

      it('should handle nested-looking comments correctly', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "name": "test" /* comment with // inside */\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test' });
      });
    });

    describe('Multiple messages', () => {
      it('should handle multiple messages with different comment styles', async () => {
        mockItem.request.body.grpc = [
          { name: 'msg1', content: '{"key": "value1"} // single-line comment' },
          { name: 'msg2', content: '{"key": "value2"} /* block comment */' },
          { name: 'msg3', content: '{\n  // comment\n  "key": "value3"\n}' }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ key: 'value1' });
        expect(JSON.parse(result.body.grpc[1].content)).toEqual({ key: 'value2' });
        expect(JSON.parse(result.body.grpc[2].content)).toEqual({ key: 'value3' });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty or null content gracefully', async () => {
        mockItem.request.body.grpc = [
          { name: 'msg1', content: null },
          { name: 'msg2', content: '' },
          { name: 'msg3', content: '{"valid": true}' }
        ];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(result.body.grpc[0].content).toBeNull();
        expect(result.body.grpc[1].content).toBe('');
        expect(JSON.parse(result.body.grpc[2].content)).toEqual({ valid: true });
      });

      it('should pass through standard JSON unchanged', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{"name": "test", "age": 30}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ name: 'test', age: 30 });
      });

      it('should handle comment-only content gracefully', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '// just a comment'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        // After stripping comment, content should be empty/whitespace
        expect(result.body.grpc[0].content.trim()).toBe('');
      });

      it('should handle deeply nested objects with comments', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "user": {\n    // User details\n    "name": "test",\n    "address": {\n      "city": "NYC" /* primary city */\n    }\n  }\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({
          user: {
            name: 'test',
            address: { city: 'NYC' }
          }
        });
      });

      it('should handle arrays with comments', async () => {
        mockItem.request.body.grpc = [{
          name: 'message1',
          content: '{\n  "items": [\n    "item1", // first item\n    "item2" /* second item */\n  ]\n}'
        }];

        const result = await prepareGrpcRequest(mockItem, mockCollection, mockEnvironment, mockRuntimeVariables);

        expect(JSON.parse(result.body.grpc[0].content)).toEqual({ items: ['item1', 'item2'] });
      });
    });
  });
});
