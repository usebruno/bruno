const { parseBruFileMeta, mergeAuth } = require('../../src/utils/collection');

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
      description: 'no auth inerited from collection',
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
