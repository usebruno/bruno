/**
 * @jest-environment node
 */

// Store captured values for assertions
let capturedChannelOptions = null;
let capturedHost = null;

// Mock GrpcReflection to capture options
const mockListServices = jest.fn().mockResolvedValue(['test.Service']);
const mockListMethods = jest.fn().mockResolvedValue([
  {
    path: '/test.Service/TestMethod',
    definition: {
      requestStream: false,
      responseStream: false
    }
  }
]);

jest.mock('grpc-js-reflection-client', () => ({
  GrpcReflection: jest.fn().mockImplementation((host, credentials, options) => {
    capturedChannelOptions = options;
    capturedHost = host;
    return {
      listServices: mockListServices,
      listMethods: mockListMethods
    };
  })
}));

// Mock @grpc/grpc-js
jest.mock('@grpc/grpc-js', () => {
  const createMockMetadata = () => {
    const map = {};
    return {
      add: jest.fn((key, value) => {
        if (map[key] === undefined) {
          map[key] = value;
        } else if (Array.isArray(map[key])) {
          map[key].push(value);
        } else {
          map[key] = [map[key], value];
        }
      }),
      getMap: jest.fn(() => map)
    };
  };

  // Create a mock RPC object with event emitter interface
  const createMockRpc = () => {
    const handlers = {};
    const mockRpc = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
        return mockRpc; // Return the mock object for chaining
      }),
      write: jest.fn(),
      end: jest.fn(),
      cancel: jest.fn(),
      call: {
        channel: { close: jest.fn() }
      }
    };
    return mockRpc;
  };

  return {
    makeGenericClientConstructor: jest.fn(() => {
      return jest.fn().mockImplementation((host, credentials, options) => {
        capturedChannelOptions = options;
        capturedHost = host;
        const mockRpc = createMockRpc();
        return {
          close: jest.fn(),
          makeUnaryRequest: jest.fn().mockReturnValue(mockRpc),
          makeClientStreamRequest: jest.fn().mockReturnValue(mockRpc),
          makeServerStreamRequest: jest.fn().mockReturnValue(mockRpc),
          makeBidiStreamRequest: jest.fn().mockReturnValue(mockRpc)
        };
      });
    }),
    ChannelCredentials: {
      createInsecure: jest.fn().mockReturnValue('insecure-credentials'),
      createSsl: jest.fn().mockReturnValue('ssl-credentials'),
      createFromSecureContext: jest.fn().mockReturnValue('secure-context-credentials')
    },
    Metadata: jest.fn().mockImplementation(() => createMockMetadata()),
    status: {},
    credentials: {},
    CallCredentials: {
      createFromMetadataGenerator: jest.fn().mockReturnValue('call-credentials')
    }
  };
});

// Mock proto-loader
jest.mock('@grpc/proto-loader', () => ({
  load: jest.fn().mockResolvedValue({})
}));

import { GrpcClient } from './grpc-client';

describe('GrpcClient', () => {
  let grpcClient;
  let mockEventCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedChannelOptions = null;
    capturedHost = null;
    mockEventCallback = jest.fn();
    grpcClient = new GrpcClient(mockEventCallback);
  });

  describe('User-Agent behavior in loadMethodsFromReflection', () => {
    const baseRequest = {
      url: 'grpc://localhost:50051',
      uid: 'test-request-uid',
      headers: {}
    };

    const baseParams = {
      collectionUid: 'test-collection-uid',
      sendEvent: jest.fn()
    };

    describe('case-insensitive header extraction', () => {
      test('should extract User-Agent header (capitalized)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract user-agent header (lowercase)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'user-agent': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract USER-AGENT header (uppercase)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'USER-AGENT': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract uSeR-aGeNt header (mixed case)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'uSeR-aGeNt': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });
    });

    describe('channel options merging', () => {
      test('should preserve existing channelOptions when user-agent is set', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams,
          channelOptions: {
            'grpc.max_receive_message_length': 1024 * 1024,
            'grpc.keepalive_time_ms': 30000
          }
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
        expect(capturedChannelOptions['grpc.max_receive_message_length']).toBe(1024 * 1024);
        expect(capturedChannelOptions['grpc.keepalive_time_ms']).toBe(30000);
      });

      test('should include grpc.primary_user_agent in merged options alongside other options', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams,
          channelOptions: {
            'grpc.other_option': 'value'
          }
        });

        // Use array notation for keys containing dots to avoid Jest interpreting as nested path
        expect(capturedChannelOptions).toHaveProperty(['grpc.primary_user_agent'], 'Bruno/1.0');
        expect(capturedChannelOptions).toHaveProperty(['grpc.other_option'], 'value');
      });

      test('should allow channelOptions to override grpc.primary_user_agent', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams,
          channelOptions: {
            'grpc.primary_user_agent': 'ExistingUA'
          }
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('ExistingUA');
      });
    });

    describe('missing user-agent handling', () => {
      test('should pass channelOptions unchanged when no user-agent header', async () => {
        const request = {
          ...baseRequest,
          headers: { 'Content-Type': 'application/grpc' }
        };

        const channelOptions = {
          'grpc.max_receive_message_length': 1024 * 1024
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams,
          channelOptions
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
        expect(capturedChannelOptions['grpc.max_receive_message_length']).toBe(1024 * 1024);
      });

      test('should pass empty object when no user-agent and no channelOptions', async () => {
        const request = {
          ...baseRequest,
          headers: {}
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
      });

      test('should not add grpc.primary_user_agent when user-agent header is missing', async () => {
        const request = {
          ...baseRequest,
          headers: { Authorization: 'Bearer token' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams,
          channelOptions: {}
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
        expect(Object.keys(capturedChannelOptions)).not.toContain('grpc.primary_user_agent');
      });
    });

    describe('edge cases', () => {
      test('should handle empty user-agent value', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': '' }
        };

        await grpcClient.loadMethodsFromReflection({
          request,
          ...baseParams
        });

        // Empty string is falsy, so grpc.primary_user_agent should not be set
        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
      });
    });
  });

  describe('User-Agent behavior in startConnection', () => {
    const baseRequest = {
      url: 'grpc://localhost:50051',
      uid: 'test-request-uid',
      method: '/test.Service/TestMethod',
      headers: {},
      body: {
        grpc: [{ content: '{}' }]
      }
    };

    const baseCollection = {
      uid: 'test-collection-uid',
      pathname: '/test/path'
    };

    beforeEach(() => {
      // Pre-register a method so startConnection can find it
      grpcClient.methods.set('/test.Service/TestMethod', {
        path: '/test.Service/TestMethod',
        requestStream: false,
        responseStream: false,
        requestSerialize: (val) => Buffer.from(JSON.stringify(val)),
        responseDeserialize: (val) => JSON.parse(val.toString())
      });
    });

    describe('case-insensitive header extraction', () => {
      test('should extract User-Agent header (capitalized)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract user-agent header (lowercase)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'user-agent': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract USER-AGENT header (uppercase)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'USER-AGENT': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });

      test('should extract uSeR-aGeNt header (mixed case)', async () => {
        const request = {
          ...baseRequest,
          headers: { 'uSeR-aGeNt': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      });
    });

    describe('channel options merging', () => {
      test('should preserve existing channelOptions when user-agent is set', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection,
          channelOptions: {
            'grpc.max_receive_message_length': 1024 * 1024,
            'grpc.keepalive_time_ms': 30000
          }
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
        expect(capturedChannelOptions['grpc.max_receive_message_length']).toBe(1024 * 1024);
        expect(capturedChannelOptions['grpc.keepalive_time_ms']).toBe(30000);
      });

      test('should include grpc.primary_user_agent in merged options alongside other options', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection,
          channelOptions: {
            'grpc.other_option': 'value'
          }
        });

        // Use array notation for keys containing dots to avoid Jest interpreting as nested path
        expect(capturedChannelOptions).toHaveProperty(['grpc.primary_user_agent'], 'Bruno/1.0');
        expect(capturedChannelOptions).toHaveProperty(['grpc.other_option'], 'value');
      });

      test('should allow channelOptions to override grpc.primary_user_agent', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': 'Bruno/1.0' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection,
          channelOptions: {
            'grpc.primary_user_agent': 'ExistingUA'
          }
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('ExistingUA');
      });
    });

    describe('missing user-agent handling', () => {
      test('should pass channelOptions unchanged when no user-agent header', async () => {
        const request = {
          ...baseRequest,
          headers: { 'Content-Type': 'application/grpc' }
        };

        const channelOptions = {
          'grpc.max_receive_message_length': 1024 * 1024
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection,
          channelOptions
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
        expect(capturedChannelOptions['grpc.max_receive_message_length']).toBe(1024 * 1024);
      });

      test('should not add grpc.primary_user_agent when user-agent header is missing', async () => {
        const request = {
          ...baseRequest,
          headers: { Authorization: 'Bearer token' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection,
          channelOptions: {}
        });

        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
        expect(Object.keys(capturedChannelOptions)).not.toContain('grpc.primary_user_agent');
      });
    });

    describe('edge cases', () => {
      test('should handle empty user-agent value', async () => {
        const request = {
          ...baseRequest,
          headers: { 'User-Agent': '' }
        };

        await grpcClient.startConnection({
          request,
          collection: baseCollection
        });

        // Empty string is falsy, so grpc.primary_user_agent should not be set
        expect(capturedChannelOptions['grpc.primary_user_agent']).toBeUndefined();
      });
    });
  });

  describe('Proxy support in startConnection', () => {
    const baseRequest = {
      url: 'grpc://myserver:50051',
      uid: 'test-request-uid',
      method: '/test.Service/TestMethod',
      headers: {},
      body: {
        grpc: [{ content: '{}' }]
      }
    };

    const baseCollection = {
      uid: 'test-collection-uid',
      pathname: '/test/path'
    };

    beforeEach(() => {
      grpcClient.methods.set('/test.Service/TestMethod', {
        path: '/test.Service/TestMethod',
        requestStream: false,
        responseStream: false,
        requestSerialize: (val) => Buffer.from(JSON.stringify(val)),
        responseDeserialize: (val) => JSON.parse(val.toString())
      });
    });

    test('should set proxy channel options when proxyConfig is provided', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: 'http://proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBe('dns:myserver:50051');
      expect(capturedChannelOptions['grpc.default_authority']).toBe('myserver:50051');
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBe(0);
      expect(capturedChannelOptions['grpc.use_local_subchannel_pool']).toBe(1);
      expect(capturedHost).toBe('proxy.example.com:8080');
    });

    test('should set proxy auth credentials when proxy has username/password', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: 'http://user:p%40ss@proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.http_connect_creds']).toBe('user:p@ss');
      expect(capturedChannelOptions['grpc.http_connect_target']).toBe('dns:myserver:50051');
      expect(capturedHost).toBe('proxy.example.com:8080');
    });

    test('should not set proxy credentials when proxy has no auth', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: 'http://proxy.example.com:3128' }
      });

      expect(capturedChannelOptions['grpc.http_connect_creds']).toBeUndefined();
      expect(capturedHost).toBe('proxy.example.com:3128');
    });

    test('should disable env var proxy and use local pool when proxyUrl is null (Bruno proxy off)', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: null }
      });

      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBe(0);
      expect(capturedChannelOptions['grpc.use_local_subchannel_pool']).toBe(1);
      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
      expect(capturedHost).toBe('myserver:50051');
    });

    test('should not set proxy options when proxyConfig is null (unmanaged)', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: null
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBeUndefined();
      expect(capturedHost).toBe('myserver:50051');
    });

    test('should not set proxy options when proxyConfig is undefined (unmanaged)', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBeUndefined();
      expect(capturedHost).toBe('myserver:50051');
    });

    test('should default proxy port to 80 when not specified', async () => {
      await grpcClient.startConnection({
        request: baseRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: 'http://proxy.example.com' }
      });

      expect(capturedHost).toBe('proxy.example.com:80');
    });

    test('should not proxy unix socket targets', async () => {
      const unixRequest = {
        ...baseRequest,
        url: 'unix:/var/run/grpc.sock'
      };

      await grpcClient.startConnection({
        request: unixRequest,
        collection: baseCollection,
        proxyConfig: { proxyUrl: 'http://proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
    });

    test('should merge proxy options with user-agent and channelOptions', async () => {
      const request = {
        ...baseRequest,
        headers: { 'User-Agent': 'Bruno/1.0' }
      };

      await grpcClient.startConnection({
        request,
        collection: baseCollection,
        channelOptions: { 'grpc.max_receive_message_length': 1024 * 1024 },
        proxyConfig: { proxyUrl: 'http://proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.primary_user_agent']).toBe('Bruno/1.0');
      expect(capturedChannelOptions['grpc.max_receive_message_length']).toBe(1024 * 1024);
      expect(capturedChannelOptions['grpc.http_connect_target']).toBe('dns:myserver:50051');
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBe(0);
      expect(capturedHost).toBe('proxy.example.com:8080');
    });
  });

  describe('Proxy support in loadMethodsFromReflection', () => {
    const baseRequest = {
      url: 'grpc://myserver:50051',
      uid: 'test-request-uid',
      headers: {}
    };

    const baseParams = {
      collectionUid: 'test-collection-uid',
      sendEvent: jest.fn()
    };

    test('should set proxy channel options for reflection client', async () => {
      await grpcClient.loadMethodsFromReflection({
        request: baseRequest,
        ...baseParams,
        proxyConfig: { proxyUrl: 'http://proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBe('dns:myserver:50051');
      expect(capturedChannelOptions['grpc.default_authority']).toBe('myserver:50051');
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBe(0);
      expect(capturedHost).toBe('proxy.example.com:8080');
    });

    test('should set proxy auth credentials for reflection client', async () => {
      await grpcClient.loadMethodsFromReflection({
        request: baseRequest,
        ...baseParams,
        proxyConfig: { proxyUrl: 'http://admin:secret@proxy.example.com:8080' }
      });

      expect(capturedChannelOptions['grpc.http_connect_creds']).toBe('admin:secret');
      expect(capturedHost).toBe('proxy.example.com:8080');
    });

    test('should disable env var proxy for reflection when proxyUrl is null', async () => {
      await grpcClient.loadMethodsFromReflection({
        request: baseRequest,
        ...baseParams,
        proxyConfig: { proxyUrl: null }
      });

      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBe(0);
      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
      expect(capturedHost).toBe('myserver:50051');
    });

    test('should not set proxy options for reflection when proxyConfig is null', async () => {
      await grpcClient.loadMethodsFromReflection({
        request: baseRequest,
        ...baseParams,
        proxyConfig: null
      });

      expect(capturedChannelOptions['grpc.http_connect_target']).toBeUndefined();
      expect(capturedChannelOptions['grpc.enable_http_proxy']).toBeUndefined();
      expect(capturedHost).toBe('myserver:50051');
    });
  });
});
