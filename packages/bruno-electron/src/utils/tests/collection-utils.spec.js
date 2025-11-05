const { transformRequestToSaveToFilesystem } = require('../collection');

describe('transformRequestToSaveToFilesystem', () => {
  it('should preserve all relevant fields when transforming request', () => {

    const testItem = {
      uid: 'test-uid-123',
      type: 'http-request',
      name: 'Test Request',
      seq: 1,
      settings: {
        enableEncodeUrl: true
      },
      tags: ['smoke', 'regression', 'api'],
      request: {
        method: 'POST',
        url: 'https://api.example.com/test',
        params: [
          {
            uid: 'param-uid-1',
            name: 'param1',
            value: 'value1',
            description: 'Test parameter',
            type: 'text',
            enabled: true
          }
        ],
        headers: [
          {
            uid: 'header-uid-1',
            name: 'Content-Type',
            value: 'application/json',
            description: 'Request content type',
            enabled: true
          }
        ],
        auth: {
          type: 'bearer',
          token: 'test-token'
        },
        body: {
          mode: 'json',
          json: '{"test": "data"}'
        },
        script: {
          req: 'console.log("request script");',
          res: 'console.log("response script");'
        },
        vars: {
          preRequest: 'const testVar = "value";',
          postResponse: 'console.log(testVar);'
        },
        assertions: [
          {
            uid: 'assert-uid-1',
            name: 'Status Code',
            operator: 'equals',
            expected: '200'
          }
        ],
        tests: [
          {
            uid: 'test-uid-1',
            name: 'Test Response',
            code: 'expect(response.status).toBe(200);'
          }
        ],
        docs: 'This is a test request documentation'
      }
    };

    // Transform the request
    const result = transformRequestToSaveToFilesystem(testItem);

    // Verify all top-level fields are preserved
    expect(result.uid).toBe(testItem.uid);
    expect(result.type).toBe(testItem.type);
    expect(result.name).toBe(testItem.name);
    expect(result.seq).toBe(testItem.seq);
    expect(result.settings).toEqual(testItem.settings);
    
    // Verify tags are preserved (this is the main focus)
    expect(result.tags).toEqual(['smoke', 'regression', 'api']);
    expect(result.tags).toHaveLength(3);

    // Verify request object structure
    expect(result.request).toBeDefined();
    expect(result.request.method).toBe(testItem.request.method);
    expect(result.request.url).toBe(testItem.request.url);
    expect(result.request.auth).toEqual(testItem.request.auth);
    expect(result.request.body).toEqual(testItem.request.body);
    expect(result.request.script).toEqual(testItem.request.script);
    expect(result.request.vars).toEqual(testItem.request.vars);
    expect(result.request.assertions).toEqual(testItem.request.assertions);
    expect(result.request.tests).toEqual(testItem.request.tests);
    expect(result.request.docs).toBe(testItem.request.docs);

    // Verify params are processed correctly
    expect(result.request.params).toHaveLength(1);
    expect(result.request.params[0]).toEqual({
      uid: 'param-uid-1',
      name: 'param1',
      value: 'value1',
      description: 'Test parameter',
      type: 'text',
      enabled: true
    });

    // Verify headers are processed correctly
    expect(result.request.headers).toHaveLength(1);
    expect(result.request.headers[0]).toEqual({
      uid: 'header-uid-1',
      name: 'Content-Type',
      value: 'application/json',
      description: 'Request content type',
      enabled: true
    });
  });

  it('should handle draft items correctly', () => {
    const testItem = {
      uid: 'test-uid-456',
      type: 'http-request',
      name: 'Draft Request',
      seq: 2,
      settings: {},
      tags: ['draft', 'wip'],
      request: {
        method: 'GET',
        url: 'https://api.example.com/draft',
        params: [],
        headers: [],
        auth: {},
        body: { mode: 'none' },
        script: { req: '', res: '' },
        vars: { preRequest: '', postResponse: '' },
        assertions: [],
        tests: [],
        docs: ''
      },
      draft: {
        uid: 'draft-uid-789',
        type: 'http-request',
        name: 'Draft Request Modified',
        seq: 2,
        settings: { enableEncodeUrl: true },
        tags: ['draft', 'wip', 'modified'],
        request: {
          method: 'PUT',
          url: 'https://api.example.com/draft-modified',
          params: [],
          headers: [],
          auth: {},
          body: { mode: 'none' },
          script: { req: '', res: '' },
          vars: { preRequest: '', postResponse: '' },
          assertions: [],
          tests: [],
          docs: ''
        }
      }
    };

    const result = transformRequestToSaveToFilesystem(testItem);

    // Should use draft data when available
    expect(result.uid).toBe('draft-uid-789');
    expect(result.name).toBe('Draft Request Modified');
    expect(result.settings).toEqual({ enableEncodeUrl: true });
    
    // Verify draft tags are preserved
    expect(result.tags).toEqual(['draft', 'wip', 'modified']);
    expect(result.tags).toContain('modified');
    expect(result.tags).toHaveLength(3);
  });

  it('should handle gRPC requests', () => {
    const testItem = {
      uid: 'grpc-uid-123',
      type: 'grpc-request',
      name: 'gRPC Test Request',
      seq: 3,
      settings: {},
      tags: ['grpc', 'microservice'],
      request: {
        method: 'unary',
        methodType: 'unary',
        protoPath: '/path/to/proto',
        url: 'grpc://localhost:50051',
        params: [], // gRPC requests don't use params
        headers: [],
        auth: {},
        body: { mode: 'grpc', grpc: [{ name: 'message1', content: 'test content' }] },
        script: { req: '', res: '' },
        vars: { preRequest: '', postResponse: '' },
        assertions: [],
        tests: [],
        docs: 'gRPC test documentation'
      }
    };

    const result = transformRequestToSaveToFilesystem(testItem);

    // Verify gRPC-specific fields
    expect(result.type).toBe('grpc-request');
    expect(result.request.methodType).toBe('unary');
    expect(result.request.protoPath).toBe('/path/to/proto');
    expect(result.request.params).toBeUndefined(); // Should be deleted for gRPC

    // Verify tags are preserved for gRPC requests
    expect(result.tags).toEqual(['grpc', 'microservice']);
  });
});
