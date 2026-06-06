const path = require('path');
const { parseBruFileMeta, wrapAndJoinScripts, mergeScripts, mergeAuth } = require('../../src/utils/collection');

describe('parseBruFileMeta', () => {
  test('parses valid meta block correctly', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('returns null for missing meta block', () => {
    const data = `someOtherBlock {
      key: value
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles empty meta block gracefully', () => {
    const data = `meta {}`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('ignores invalid lines in meta block', () => {
    const data = `meta {
      name: 0.2_mb
      invalidLine
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unexpected input gracefully', () => {
    const data = null;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles missing colon gracefully', () => {
    const data = `meta {
      name 0.2_mb
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('parses numeric values correctly', () => {
    const data = `meta {
      numValue: 1234
      floatValue: 12.34
      strValue: some_text
      seq: 5
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 5,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles syntax error in meta block 1', () => {
    const data = `meta 
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles syntax error in meta block 2', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    `;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles graphql type correctly', () => {
    const data = `meta {
      name: graphql_query
      type: graphql
      seq: 2
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'graphql-request',
      name: 'graphql_query',
      seq: 2,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unknown type correctly', () => {
    const data = `meta {
      name: unknown_request
      type: unknown
      seq: 3
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'unknown_request',
      seq: 3,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles missing seq gracefully', () => {
    const data = `meta {
      name: no_seq_request
      type: http
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'no_seq_request',
      seq: 1, // Default fallback
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });
});

describe('wrapAndJoinScripts', () => {
  test('returns empty code and null metadata for all empty scripts', () => {
    const result = wrapAndJoinScripts(['', '', ''], 2);
    expect(result.code).toBe('');
    expect(result.metadata).toBeNull();
  });

  test('tracks request line range for single request script', () => {
    const result = wrapAndJoinScripts(['', '', 'console.log("hello");'], 2);
    expect(result.code).toContain('console.log("hello")');
    expect(result.metadata).toEqual({
      requestStartLine: 1,
      requestEndLine: 3
    });
  });

  test('tracks correct request line range with collection script before it', () => {
    const result = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2);
    // Collection script: 3 lines (await (async () => {\nlet x = 1;\n})();)
    // Empty gap: 1 line (blank line separator)
    // Request script starts at line 5
    expect(result.metadata.requestStartLine).toBe(5);
    expect(result.metadata.requestEndLine).toBe(7);
  });

  test('produces zero range metadata when request script is empty but others exist', () => {
    const result = wrapAndJoinScripts(['let x = 1;', '', ''], 2);
    expect(result.code).toContain('let x = 1');
    expect(result.metadata).toEqual({
      requestStartLine: 0,
      requestEndLine: 0
    });
  });

  test('builds segments array from segmentSources', () => {
    const sources = [
      { filePath: '/col/collection.bru', displayPath: 'collection.bru' },
      null,
      null
    ];
    const result = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2, sources);
    expect(result.metadata.segments).toHaveLength(1);
    expect(result.metadata.segments[0]).toMatchObject({
      startLine: 1,
      endLine: 3,
      filePath: '/col/collection.bru',
      displayPath: 'collection.bru'
    });
  });

  test('builds segments for collection + folder + request', () => {
    const sources = [
      { filePath: '/col/collection.bru', displayPath: 'collection.bru' },
      { filePath: '/col/sub/folder.bru', displayPath: 'sub/folder.bru' },
      null
    ];
    const result = wrapAndJoinScripts(
      ['let a = 1;', 'let b = 2;', 'let c = 3;'],
      2,
      sources
    );
    expect(result.metadata.segments).toHaveLength(2);
    expect(result.metadata.segments[0].displayPath).toBe('collection.bru');
    expect(result.metadata.segments[1].displayPath).toBe('sub/folder.bru');
    expect(result.metadata.requestStartLine).toBeGreaterThan(result.metadata.segments[1].endLine);
  });
});

describe('mergeScripts metadata', () => {
  const makeCollection = (scripts = {}) => ({
    pathname: '/test/collection',
    format: 'bru',
    root: {
      request: {
        script: {
          req: scripts.preReq || '',
          res: scripts.postRes || ''
        },
        tests: scripts.tests || ''
      }
    }
  });

  const makeRequest = (scripts = {}) => ({
    script: {
      req: scripts.preReq || '',
      res: scripts.postRes || ''
    },
    tests: scripts.tests || ''
  });

  const makeFolder = (name, scripts = {}) => ({
    type: 'folder',
    pathname: `/test/collection/${name}`,
    root: {
      request: {
        script: {
          req: scripts.preReq || '',
          res: scripts.postRes || ''
        },
        tests: scripts.tests || ''
      }
    }
  });

  test('produces null metadata when all scripts are empty', () => {
    const collection = makeCollection();
    const request = makeRequest();
    mergeScripts(collection, request, [request], 'sequential');
    expect(request.script.reqMetadata).toBeNull();
    expect(request.script.resMetadata).toBeNull();
    expect(request.testsMetadata).toBeNull();
  });

  test('produces metadata for request-only script', () => {
    const collection = makeCollection();
    const request = makeRequest({ preReq: 'console.log("req");' });
    mergeScripts(collection, request, [request], 'sequential');
    expect(request.script.reqMetadata).toEqual({
      requestStartLine: 1,
      requestEndLine: 3,
      requestScriptContent: 'console.log("req");'
    });
  });

  test('produces segments for collection + request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(1);
    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
    expect(request.script.reqMetadata.segments[0].filePath).toBe(
      path.join('/test/collection', 'collection.bru')
    );
    expect(request.script.reqMetadata.requestStartLine).toBeGreaterThan(
      request.script.reqMetadata.segments[0].endLine
    );
  });

  test('produces segments for collection + folder + request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const folder = makeFolder('subfolder', { preReq: 'let fold = 2;' });
    const request = makeRequest({ preReq: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(2);
    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
    expect(request.script.reqMetadata.segments[1].displayPath).toBe(
      path.join('subfolder', 'folder.bru')
    );
  });

  test('non-sequential flow reverses post-res segment order', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const folder = makeFolder('subfolder', { postRes: 'let fold = 2;' });
    const request = makeRequest({ postRes: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'non-sequential');

    // In non-sequential, request comes first, then folder (reversed), then collection
    expect(request.script.resMetadata.requestStartLine).toBe(1);
    const segments = request.script.resMetadata.segments;
    expect(segments).toHaveLength(2);
    // Folder should come before collection in reversed order
    expect(segments[0].displayPath).toBe(path.join('subfolder', 'folder.bru'));
    expect(segments[1].displayPath).toBe('collection.bru');
  });

  test('handles tests metadata correctly', () => {
    const collection = makeCollection({ tests: 'test("col", () => {});' });
    const request = makeRequest({ tests: 'test("req", () => {});' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.testsMetadata).toBeDefined();
    expect(request.testsMetadata.segments).toHaveLength(1);
    expect(request.testsMetadata.segments[0].displayPath).toBe('collection.bru');
    expect(request.testsMetadata.requestStartLine).toBeGreaterThan(0);
  });

  test('defaults to bru format when collection.format is not set', () => {
    const collection = makeCollection({ preReq: 'let x = 1;' });
    delete collection.format;
    const request = makeRequest({ preReq: 'let y = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
  });

  test('includes requestScriptContent in metadata for pre-request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.requestScriptContent).toBe('let req = 2;');
  });

  test('includes requestScriptContent in metadata for post-response scripts', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const request = makeRequest({ postRes: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.resMetadata.requestScriptContent).toBe('let req = 2;');
  });

  test('includes requestScriptContent in metadata for tests', () => {
    const collection = makeCollection({ tests: 'test("col", () => {});' });
    const request = makeRequest({ tests: 'test("req", () => {});' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.testsMetadata.requestScriptContent).toBe('test("req", () => {});');
  });

  test('includes requestScriptContent as empty string when request script is empty', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest();
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.requestScriptContent).toBe('');
  });

  test('includes scriptContent in collection segment sources', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let col = 1;');
  });

  test('includes scriptContent in folder segment sources', () => {
    const collection = makeCollection();
    const folder = makeFolder('subfolder', { preReq: 'let fold = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let fold = 1;');
  });

  test('includes scriptContent for both collection and folder segments', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const folder = makeFolder('subfolder', { preReq: 'let fold = 2;' });
    const request = makeRequest({ preReq: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(2);
    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let col = 1;');
    expect(request.script.reqMetadata.segments[1].scriptContent).toBe('let fold = 2;');
  });

  test('includes requestScriptContent in non-sequential post-response metadata', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const request = makeRequest({ postRes: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'non-sequential');

    expect(request.script.resMetadata.requestScriptContent).toBe('let req = 2;');
  });
});

describe('mergeAuth', () => {
  const basicAuth = () => ({
    mode: 'basic',
    basic: { username: 'USER', password: 'PASS' }
  });
  const oauth2 = () => ({
    mode: 'oauth2',
    oauth2: {
      grantType: 'client_credentials',
      clientId: 'CLIENT_ID',
      clientSecret: 'CLIENT_SECRET'
    }
  });

  it.each([
    {
      description: 'no auth inherited from collection',
      collectionAuth: { mode: 'none' },
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: { mode: 'none' },
      expectedOauth2Credentials: undefined
    },
    {
      description: 'basic auth inherited from collection',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: basicAuth(),
      expectedOauth2Credentials: undefined
    },
    {
      description: 'no auth directly on request',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: { mode: 'none' },
      expectedRequestAuth: { mode: 'none' },
      expectedOauth2Credentials: undefined
    },
    {
      description: 'no auth inherited from subfolder',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'none' },
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: { mode: 'none' },
      expectedOauth2Credentials: undefined
    },
    {
      description: 'no auth inherited from root folder',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'none' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: { mode: 'none' },
      expectedOauth2Credentials: undefined
    },
    {
      description: 'oauth2 inherited from collection',
      collectionAuth: oauth2(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: oauth2(),
      expectedOauth2Credentials: { folderUid: null, itemUid: null, mode: 'oauth2' }
    },
    {
      description: 'oauth2 inherited from subfolder',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: oauth2(),
      requestAuth: { mode: 'inherit' },
      expectedRequestAuth: oauth2(),
      expectedOauth2Credentials: { folderUid: 'subfolder', itemUid: null, mode: 'oauth2' }
    },
    {
      description: 'oauth2 directly on request',
      collectionAuth: basicAuth(),
      rootFolderAuth: { mode: 'inherit' },
      subfolderAuth: { mode: 'inherit' },
      requestAuth: oauth2(),
      expectedRequestAuth: oauth2(),
      expectedOauth2Credentials: undefined
    }
  ])(
    'auth inheritance through folders : $description',
    ({
      collectionAuth,
      rootFolderAuth,
      subfolderAuth,
      requestAuth,
      expectedRequestAuth,
      expectedOauth2Credentials
    }) => {
      const httpRequest = {
        uid: 'request-one',
        type: 'http-request',
        request: { auth: requestAuth }
      };
      const subfolder = {
        uid: 'subfolder',
        type: 'folder',
        root: { request: { auth: subfolderAuth } },
        items: [httpRequest]
      };
      const rootFolder = {
        uid: 'root-folder',
        type: 'folder',
        root: { request: { auth: rootFolderAuth } },
        items: [subfolder]
      };
      const collection = {
        uid: 'my-collection',
        items: [rootFolder],
        root: { request: { auth: collectionAuth } }
      };
      const request = httpRequest.request;
      const requestTreePath = [rootFolder, subfolder, httpRequest];

      mergeAuth(collection, request, requestTreePath);

      expect(request.auth).toEqual(expectedRequestAuth);
      expect(request.oauth2Credentials).toEqual(expectedOauth2Credentials);
    }
  );
});
