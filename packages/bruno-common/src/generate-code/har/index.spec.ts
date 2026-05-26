import { buildHar } from './index';

const baseRequest = (overrides: any = {}) => ({
  method: 'GET',
  url: 'https://example.com/api',
  params: [],
  headers: [],
  body: { mode: 'none' },
  auth: { mode: 'none' },
  ...overrides
});

describe('buildHar — basic HAR shape', () => {
  it('returns a HAR-shaped object for a minimal GET', () => {
    const { har } = buildHar({ request: baseRequest(), shouldInterpolate: false });
    expect(har).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: 'https://example.com/api',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        queryString: [],
        headersSize: 0,
        bodySize: 0,
        binary: true
      })
    );
    expect(Array.isArray(har.headers)).toBe(true);
  });

  it('throws "invalid request url" for inputs that are not URLs', () => {
    expect(() => buildHar({ request: baseRequest({ url: '' }), shouldInterpolate: false })).toThrow('invalid request url');
    expect(() => buildHar({ request: baseRequest({ url: 'not a url' }), shouldInterpolate: false })).toThrow('invalid request url');
    expect(() => buildHar({ request: baseRequest({ url: 'http://' }), shouldInterpolate: false })).toThrow('invalid request url');
  });

  it('accepts URLs with %XX sequences, brackets, OData parens (encoding handled internally)', () => {
    expect(() => buildHar({ request: baseRequest({ url: 'https://example.com/list%5B1%5D' }), shouldInterpolate: false })).not.toThrow();
    expect(() => buildHar({ request: baseRequest({ url: 'https://example.com/odata/Products(123)/Categories(456)' }), shouldInterpolate: false })).not.toThrow();
    expect(() => buildHar({ request: baseRequest({ url: 'https://example.com/path%20with%20spaces' }), shouldInterpolate: false })).not.toThrow();
  });
});

describe('buildHar — encodeUrl toggle (PR #5507 content-blind contract)', () => {
  it('OFF: rawUrl matches user-typed URL (path-param substitution happens upstream for Generate Code)', () => {
    const { rawUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?name=John Doe',
        params: [{ name: 'name', value: 'John Doe', type: 'query', enabled: true }],
        settings: { encodeUrl: false }
      }),
      shouldInterpolate: false
    });
    expect(rawUrl).toBe('https://example.com/api?name=John Doe');
  });

  it('ON: encodedUrl applies encodeUrl() (path encoded, query encoded)', () => {
    const { encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?name=John Doe',
        params: [{ name: 'name', value: 'John Doe', type: 'query', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(encodedUrl).toBe('https://example.com/api?name=John%20Doe');
  });

  it('ON: pre-encoded inputs INTENTIONALLY double-encode (PR #5507)', () => {
    const { encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?name=John%20Doe',
        params: [{ name: 'name', value: 'John%20Doe', type: 'query', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    // %20 → %2520 — content-blind encoding, exactly what redirect-URL flows require.
    expect(encodedUrl).toContain('John%2520Doe');
  });

  it('ON: # in URL is encoded as %23 (Option C — # is data, not a fragment delimiter)', () => {
    // encodeUrl treats `#` as a regular byte and encodes it via
    // encodeURIComponent in the query-value pipeline. To keep `#section` as a
    // literal fragment, toggle OFF (OFF preserves the URL byte-for-byte).
    const { encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?tag=test#section',
        params: [{ name: 'tag', value: 'test#section', type: 'query', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(encodedUrl).toBe('https://example.com/api?tag=test%23section');
  });
});

describe('buildHar — auth → headers translation', () => {
  it('basic auth → Authorization: Basic <base64>', () => {
    const { har } = buildHar({
      request: baseRequest({ auth: { mode: 'basic', basic: { username: 'alice', password: 'pw' } } }),
      shouldInterpolate: false
    });
    const auth = har.headers.find((h) => h.name === 'Authorization');
    expect(auth).toBeDefined();
    expect(auth?.value).toBe(`Basic ${Buffer.from('alice:pw').toString('base64')}`);
  });

  it('bearer auth → Authorization: Bearer <token>', () => {
    const { har } = buildHar({
      request: baseRequest({ auth: { mode: 'bearer', bearer: { token: 'tk-123' } } }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer tk-123' });
  });

  it('apikey in header → custom header name + value', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'apikey', apikey: { key: 'X-API-Key', value: 'secret', placement: 'header' } }
      }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'X-API-Key', value: 'secret' });
  });

  it('apikey with placement=queryparams → goes into queryString, NOT headers', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'apikey', apikey: { key: 'api_key', value: 'secret', placement: 'queryparams' } }
      }),
      shouldInterpolate: false
    });
    expect(har.queryString).toContainEqual({ name: 'api_key', value: 'secret' });
    expect(har.headers.find((h) => h.name === 'api_key')).toBeUndefined();
  });

  it('oauth2 header placement with no stored credentials falls back to <access_token>', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'oauth2', oauth2: { tokenPlacement: 'header', accessTokenUrl: 'https://x/token', credentialsId: 'creds' } }
      }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer <access_token>' });
  });

  it('oauth2 header placement looks up actual access token from oauth2Credentials', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'header', accessTokenUrl: 'https://x/token', credentialsId: 'creds' }
        }
      }),
      oauth2Credentials: [
        { url: 'https://x/token', collectionUid: 'col-1', credentialsId: 'creds', credentials: { access_token: 'tk-real' } }
      ],
      collectionUid: 'col-1',
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer tk-real' });
  });

  it.each(['oauth1', 'digest', 'ntlm', 'awsv4', 'wsse', 'none', 'inherit'])(
    'auth mode "%s" → no Authorization header (runtime-only or curl-flag-only)',
    (mode) => {
      const { har } = buildHar({ request: baseRequest({ auth: { mode } }), shouldInterpolate: false });
      expect(har.headers.find((h) => h.name === 'Authorization')).toBeUndefined();
    }
  );

  // ---- Phase B: oauth2 detail + apikey edge cases + inherit contract -----

  it('oauth2 with custom tokenHeaderPrefix=OAuth → "OAuth <token>"', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'header', tokenHeaderPrefix: 'OAuth', accessTokenUrl: 'https://x/token', credentialsId: 'creds' }
        }
      }),
      oauth2Credentials: [
        { url: 'https://x/token', collectionUid: 'col-1', credentialsId: 'creds', credentials: { access_token: 'tk-real' } }
      ],
      collectionUid: 'col-1',
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'OAuth tk-real' });
  });

  it('oauth2 with empty tokenHeaderPrefix="" → bare token, no leading space', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'header', tokenHeaderPrefix: '', accessTokenUrl: 'https://x/token', credentialsId: 'creds' }
        }
      }),
      oauth2Credentials: [
        { url: 'https://x/token', collectionUid: 'col-1', credentialsId: 'creds', credentials: { access_token: 'bare-tk' } }
      ],
      collectionUid: 'col-1',
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'bare-tk' });
  });

  it('oauth2 with tokenPlacement=url → no Authorization header (URL placement is the runtime/snippet caller\'s responsibility)', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'url', tokenQueryKey: 'access_token', accessTokenUrl: 'https://x/token' }
        }
      }),
      shouldInterpolate: false
    });
    expect(har.headers.find((h) => h.name === 'Authorization')).toBeUndefined();
  });

  it('oauth2 implicit grant uses authorizationUrl (not accessTokenUrl) for credential lookup', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: {
            tokenPlacement: 'header',
            grantType: 'implicit',
            authorizationUrl: 'https://x/authorize',
            credentialsId: 'creds'
          }
        }
      }),
      oauth2Credentials: [
        { url: 'https://x/authorize', collectionUid: 'col-1', credentialsId: 'creds', credentials: { access_token: 'implicit-tk' } }
      ],
      collectionUid: 'col-1',
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer implicit-tk' });
  });

  it('oauth2 credentialsId defaults to "credentials" when not specified', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'header', accessTokenUrl: 'https://x/token' }
        }
      }),
      oauth2Credentials: [
        { url: 'https://x/token', collectionUid: 'col-1', credentialsId: 'credentials', credentials: { access_token: 'default-id-tk' } }
      ],
      collectionUid: 'col-1',
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer default-id-tk' });
  });

  it('oauth2 missing oauth2Credentials array → falls back to <access_token> placeholder', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: {
          mode: 'oauth2',
          oauth2: { tokenPlacement: 'header', accessTokenUrl: 'https://x/token' }
        }
      }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer <access_token>' });
  });

  it('apikey with placement=queryparams AND empty key → not added to queryString', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'apikey', apikey: { key: '', value: 'secret', placement: 'queryparams' } }
      }),
      shouldInterpolate: false
    });
    expect(har.queryString).toEqual([]);
  });

  it('apikey with placement=queryparams AND empty value → not added to queryString', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'apikey', apikey: { key: 'api_key', value: '', placement: 'queryparams' } }
      }),
      shouldInterpolate: false
    });
    expect(har.queryString).toEqual([]);
  });

  it('apikey with placement=header AND empty key → no header added', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'apikey', apikey: { key: '', value: 'secret', placement: 'header' } }
      }),
      shouldInterpolate: false
    });
    expect(har.headers).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: '' })]));
  });

  it('basic auth with empty username/password → still emits Authorization with base64 of ":"', () => {
    const { har } = buildHar({
      request: baseRequest({ auth: { mode: 'basic', basic: { username: '', password: '' } } }),
      shouldInterpolate: false
    });
    const auth = har.headers.find((h) => h.name === 'Authorization');
    expect(auth?.value).toBe(`Basic ${Buffer.from(':').toString('base64')}`);
  });

  it('bearer with missing token → "Bearer " with empty string', () => {
    const { har } = buildHar({
      request: baseRequest({ auth: { mode: 'bearer' } }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Authorization', value: 'Bearer ' });
  });
});

describe('buildHar — header ordering when request + auth produce same name', () => {
  // buildHar appends auth-generated headers AFTER the caller-passed request.headers.
  // Documents the contract — caller decides whether to dedupe pre-buildHar (e.g.,
  // bruno-app's mergeHeaders walks collection/folder/request tree). buildHar itself
  // is intentionally not opinionated about dedup since the layering ambiguity
  // (which copy wins?) is collection-tree-specific.

  it('request.headers Authorization survives alongside auth-generated Authorization', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [{ name: 'Authorization', value: 'Custom token', enabled: true }],
        auth: { mode: 'bearer', bearer: { token: 'tk-from-auth' } }
      }),
      shouldInterpolate: false
    });
    const auths = har.headers.filter((h) => h.name === 'Authorization');
    expect(auths).toHaveLength(2);
    expect(auths[0].value).toBe('Custom token');
    expect(auths[1].value).toBe('Bearer tk-from-auth');
  });
});

describe('buildHar — headers finalization (default content-type, lowercase, enabled-only)', () => {
  it('lowercases header names and filters disabled', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [
          { name: 'X-Custom', value: 'v1', enabled: true },
          { name: 'X-Disabled', value: 'v2', enabled: false }
        ]
      }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'X-Custom', value: 'v1' });
    expect(har.headers.find((h) => h.name === 'x-disabled')).toBeUndefined();
  });

  it('appends default content-type for body mode if none is set', () => {
    const cases: Array<[string, string]> = [
      ['json', 'application/json'],
      ['xml', 'application/xml'],
      ['text', 'text/plain'],
      ['multipartForm', 'multipart/form-data'],
      ['formUrlEncoded', 'application/x-www-form-urlencoded']
    ];
    for (const [mode, contentType] of cases) {
      const { har } = buildHar({ request: baseRequest({ body: { mode } }), shouldInterpolate: false });
      expect(har.headers).toContainEqual({ name: 'Content-Type', value: contentType });
    }
  });

  it('does NOT override an explicit content-type header', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: { mode: 'json' },
        headers: [{ name: 'Content-Type', value: 'application/vnd.api+json', enabled: true }]
      }),
      shouldInterpolate: false
    });
    const cts = har.headers.filter((h) => h.name === 'Content-Type');
    expect(cts).toHaveLength(1);
    expect(cts[0].value).toBe('application/vnd.api+json');
  });
});

describe('buildHar — query string assembly', () => {
  it('includes only enabled query-type params', () => {
    const { har } = buildHar({
      request: baseRequest({
        params: [
          { name: 'a', value: '1', type: 'query', enabled: true },
          { name: 'b', value: '2', type: 'query', enabled: false },
          { name: 'c', value: '3', type: 'query', enabled: true },
          { name: 'd', value: '4', type: 'path', enabled: true } // path param, not query
        ]
      }),
      shouldInterpolate: false
    });
    expect(har.queryString).toEqual([
      { name: 'a', value: '1' },
      { name: 'c', value: '3' }
    ]);
  });

  it('preserves insertion order (no alphabetical sort)', () => {
    const { har } = buildHar({
      request: baseRequest({
        params: [
          { name: 'z', value: 'last', type: 'query', enabled: true },
          { name: 'a', value: 'first', type: 'query', enabled: true },
          { name: 'm', value: 'middle', type: 'query', enabled: true }
        ]
      }),
      shouldInterpolate: false
    });
    expect(har.queryString.map((p) => p.name)).toEqual(['z', 'a', 'm']);
  });
});

describe('buildHar — body / postData', () => {
  it('formUrlEncoded → mimeType + text (URL-encoded form) + params array', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'formUrlEncoded',
          formUrlEncoded: [
            { name: 'name', value: 'alice', enabled: true },
            { name: 'role', value: 'admin', enabled: true }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/x-www-form-urlencoded');
    expect(har.postData.text).toBe('name=alice&role=admin');
    expect(har.postData.params).toEqual([
      { name: 'name', value: 'alice' },
      { name: 'role', value: 'admin' }
    ]);
  });

  it('json → mimeType + text (JSON string)', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'json', json: '{"hello":"world"}' } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/json');
    expect(har.postData.text).toBe('{"hello":"world"}');
  });

  it('multipartForm → params with optional fileName for type=file', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'multipartForm',
          multipartForm: [
            { name: 'caption', value: 'hi', type: 'text', enabled: true },
            { name: 'upload', value: '/tmp/a.txt', type: 'file', enabled: true }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('multipart/form-data');
    expect(har.postData.params).toContainEqual({ name: 'caption', value: 'hi' });
    expect(har.postData.params).toContainEqual({ name: 'upload', value: '/tmp/a.txt', fileName: '/tmp/a.txt' });
  });

  // ---- Phase A: body-mode parity with bruno-app's buildHarRequest --------
  // Mirrors createPostData in packages/bruno-app/src/utils/codegenerator/har.js.
  // Each mode is tested for (a) correct mimeType, (b) correct postData shape,
  // (c) reasonable behavior on empty / missing / disabled inputs.

  it('text → mimeType=text/plain, raw body in postData.text', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'text', text: 'hello world' } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('text/plain');
    expect(har.postData.text).toBe('hello world');
  });

  it('xml → mimeType=application/xml, raw body in postData.text', () => {
    const xmlBody = '<note><body>hi</body></note>';
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'xml', xml: xmlBody } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/xml');
    expect(har.postData.text).toBe(xmlBody);
  });

  it('sparql → mimeType=application/sparql-query, raw body in postData.text', () => {
    const sparqlBody = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10';
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'sparql', sparql: sparqlBody } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/sparql-query');
    expect(har.postData.text).toBe(sparqlBody);
  });

  it('graphql → mimeType=application/json, postData.text is JSON.stringify of body.graphql', () => {
    const graphql = { query: 'query Q { me { id } }', variables: { foo: 'bar' } };
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'graphql', graphql } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/json');
    expect(har.postData.text).toBe(JSON.stringify(graphql));
  });

  it('file → mimeType from selected file, text=filePath, params has fileName + contentType', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'file',
          file: [
            { name: 'upload', filePath: '/tmp/a.png', contentType: 'image/png', selected: true },
            { name: 'other', filePath: '/tmp/b.txt', contentType: 'text/plain', selected: false }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('image/png');
    expect(har.postData.text).toBe('/tmp/a.png');
    expect(har.postData.params).toEqual([
      { name: 'upload', value: '/tmp/a.png', fileName: '/tmp/a.png', contentType: 'image/png' }
    ]);
  });

  it('file with no `selected` flag → falls back to first entry', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'file',
          file: [
            { name: 'a', filePath: '/tmp/first.txt', contentType: 'text/plain' },
            { name: 'b', filePath: '/tmp/second.txt', contentType: 'text/plain' }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.text).toBe('/tmp/first.txt');
  });

  it('file with empty file[] → octet-stream fallback, empty text, empty params', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'file', file: [] } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/octet-stream');
    expect(har.postData.text).toBe('');
    expect(har.postData.params).toEqual([]);
  });

  it('formUrlEncoded with empty [] → empty text + empty params, no error', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'formUrlEncoded', formUrlEncoded: [] } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('application/x-www-form-urlencoded');
    expect(har.postData.text).toBe('');
    expect(har.postData.params).toEqual([]);
  });

  it('formUrlEncoded with missing array → treated as empty', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'formUrlEncoded' } }),
      shouldInterpolate: false
    });
    expect(har.postData.params).toEqual([]);
  });

  it('formUrlEncoded with disabled entries → filtered from text + params', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'formUrlEncoded',
          formUrlEncoded: [
            { name: 'kept', value: 'on', enabled: true },
            { name: 'dropped', value: 'off', enabled: false },
            { name: 'kept2', value: 'on2', enabled: true }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.text).toBe('kept=on&kept2=on2');
    expect(har.postData.params).toEqual([
      { name: 'kept', value: 'on' },
      { name: 'kept2', value: 'on2' }
    ]);
  });

  it('multipartForm with empty [] → empty params, no error', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'multipartForm', multipartForm: [] } }),
      shouldInterpolate: false
    });
    expect(har.postData.mimeType).toBe('multipart/form-data');
    expect(har.postData.params).toEqual([]);
  });

  it('multipartForm with missing array → treated as empty', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'multipartForm' } }),
      shouldInterpolate: false
    });
    expect(har.postData.params).toEqual([]);
  });

  it('multipartForm with disabled entries → filtered out', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'multipartForm',
          multipartForm: [
            { name: 'kept', value: 'a', type: 'text', enabled: true },
            { name: 'dropped', value: 'b', type: 'text', enabled: false }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.params).toEqual([{ name: 'kept', value: 'a' }]);
  });

  it('multipartForm type=file → fileName populated only on file entries', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'multipartForm',
          multipartForm: [
            { name: 'caption', value: 'hello', type: 'text', enabled: true },
            { name: 'upload', value: '/tmp/x', type: 'file', enabled: true }
          ]
        }
      }),
      shouldInterpolate: false
    });
    expect(har.postData.params[0]).toEqual({ name: 'caption', value: 'hello' });
    expect(har.postData.params[0]).not.toHaveProperty('fileName');
    expect(har.postData.params[1]).toEqual({ name: 'upload', value: '/tmp/x', fileName: '/tmp/x' });
  });
});

describe('buildHar — interpolation', () => {
  it('URL {{var}} tokens are hashed (not substituted) — caller owns URL interpolation', () => {
    // URL interpolation is intentionally NOT done inside buildHar. The caller
    // (e.g. GenerateCodeItem in bruno-app, or the runtime adapter) is the only
    // place that knows whether the user wants templates resolved in the URL.
    // buildHar's job is to keep the URL parseable through encoding via
    // patternHasher hashing — the returned `unhash` lets the caller restore
    // the original `{{var}}` text at the end of their pipeline.
    const { har, unhash } = buildHar({
      request: baseRequest({ url: 'https://{{host}}/api/{{path}}' }),
      variables: { host: 'example.com', path: 'users' },
      shouldInterpolate: true
    });
    // No `{{` leaks into the HAR (so HTTPSnippet's URL parsing doesn't choke).
    expect(har.url).not.toContain('{{');
    expect(har.url).not.toContain('}}');
    // unhash restores the templates exactly as the user typed them.
    expect(unhash(har.url)).toContain('{{host}}');
    expect(unhash(har.url)).toContain('{{path}}');
  });

  it('shouldInterpolate=true substitutes {{var}} in headers and body (json)', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [{ name: 'X-Token', value: '{{token}}', enabled: true }],
        body: { mode: 'json', json: '{"user":"{{user}}"}' }
      }),
      variables: { token: 'secret', user: 'alice' },
      shouldInterpolate: true
    });
    expect(har.headers).toContainEqual({ name: 'X-Token', value: 'secret' });
    expect(har.postData.text).toContain('"user": "alice"');
  });

  it('shouldInterpolate=false hashes {{var}} so the URL survives parsing, exposes unhash()', () => {
    const { har, unhash } = buildHar({
      request: baseRequest({ url: 'https://{{host}}/api?key={{secret}}', params: [{ name: 'key', value: '{{secret}}', type: 'query', enabled: true }] }),
      shouldInterpolate: false
    });
    // Hashed in the HAR url (no { or } leaks)
    expect(har.url).not.toContain('{{');
    expect(har.url).not.toContain('}}');
    // unhash restores the templates verbatim
    const restored = unhash(har.url);
    expect(restored).toContain('{{host}}');
  });
});

describe('buildHar — regression: known issues map to single fixes', () => {
  it('path with %20 (issue #6268) — no throw, URL passes the soft gate', () => {
    expect(() => buildHar({
      request: baseRequest({ url: 'https://example.com/api/v1/roles/test%20-%20test' }),
      shouldInterpolate: false
    })).not.toThrow();
  });

  it('square brackets in path (issue #7653) — no throw, URL passes the soft gate', () => {
    expect(() => buildHar({
      request: baseRequest({ url: 'https://example.com/list[1]' }),
      shouldInterpolate: false
    })).not.toThrow();
  });

  it('JSON-shaped array values (issue #7913) — no throw, URL passes the soft gate', () => {
    expect(() => buildHar({
      request: baseRequest({
        url: 'https://example.com/api?testArray=[[1, 2, 3], ["a", "b"]]',
        params: [{ name: 'testArray', value: '[[1, 2, 3], ["a", "b"]]', type: 'query', enabled: true }]
      }),
      shouldInterpolate: false
    })).not.toThrow();
  });

  it('path-param substitution (toggle ON) — built-in capability for runtime (issue #7356)', () => {
    // For Generate Code today, GenerateCodeItem pre-substitutes path params; buildHar
    // sees no `:id` to act on. But the capability is here for the future runtime
    // adoption (see Architectural pivot — Phase C in fixings/url-encoding-fix.md).
    const { rawUrl, encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/users/:id/profile',
        pathParams: [{ name: 'id', value: 'aaa/bbb', type: 'path', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(rawUrl).toBe('https://example.com/users/aaa/bbb/profile');
    // Toggle ON — path-param value is SINGLE-encoded (`/` → `%2F`). The
    // placeholder-hash flow prevents `encodeUrl()` from double-encoding the
    // segment: path-param positions are replaced with URL-safe placeholders
    // before `encodeUrl()` runs, then restored with `encodeURIComponent(value)`
    // afterwards. So `aaa/bbb` → `aaa%2Fbbb` (single-encoded), not
    // `aaa%252Fbbb` (which would be the content-blind double-encoded form).
    expect(encodedUrl).toContain('aaa%2Fbbb');
    expect(encodedUrl).not.toContain('aaa%252Fbbb');
  });

  it('path-param substitution (toggle OFF) — value passed raw', () => {
    const { rawUrl, encodedUrl, har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/users/:id/profile',
        pathParams: [{ name: 'id', value: 'aaa/bbb', type: 'path', enabled: true }],
        settings: { encodeUrl: false }
      }),
      shouldInterpolate: false
    });
    expect(rawUrl).toBe('https://example.com/users/aaa/bbb/profile');
    expect(encodedUrl).toBe('https://example.com/users/aaa/bbb/profile');
    expect(har.url).toBe('https://example.com/users/aaa/bbb/profile');
  });

  it('OData-style path param (Foo(:productId)) substitutes correctly', () => {
    const { rawUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/odata/Products(:productId)',
        pathParams: [{ name: 'productId', value: 'ABC123', type: 'path', enabled: true }],
        settings: { encodeUrl: false }
      }),
      shouldInterpolate: false
    });
    expect(rawUrl).toBe('https://example.com/odata/Products(ABC123)');
  });
});

describe('buildHar — does not mutate caller inputs', () => {
  it('caller\'s request object is not mutated by buildHar', () => {
    const request = baseRequest({
      url: 'https://example.com/api?q=1',
      params: [{ name: 'q', value: '1', type: 'query', enabled: true }],
      headers: [{ name: 'X-A', value: 'a', enabled: true }]
    });
    const before = JSON.stringify(request);
    buildHar({ request, shouldInterpolate: true, variables: { foo: 'bar' } });
    expect(JSON.stringify(request)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Path-param encoding validation matrix (issue #7356)
// ---------------------------------------------------------------------------
//
// For URL `https://example.com/users/:id` with `pathParams.id = <input>` and
// `settings.encodeUrl = true`, validate that the substituted segment is
// percent-encoded per `encodeURIComponent` semantics. The "Expected segment"
// column is the value that should appear in place of `:id` in the final URL.
//
// These tests exercise buildHar's internal `substitutePathParams` (with
// `encodeUrl: true`). Tests inspect `rawUrl` because it's the
// substitutePathParams output before the second `encodeUrl()` pass — the
// single-pass form the user would expect to see for "encode my path param".
describe('buildHar — path-param encoding matrix (toggle ON, issue #7356)', () => {
  const cases: Array<{ name: string; input: string; expectedSegment: string }> = [
    { name: 'forward slash', input: 'aaa/bbb', expectedSegment: 'aaa%2Fbbb' },
    { name: 'hash', input: 'aaa#bbb', expectedSegment: 'aaa%23bbb' },
    { name: 'literal space', input: 'John Doe', expectedSegment: 'John%20Doe' },
    { name: 'ampersand', input: 'a&b', expectedSegment: 'a%26b' },
    { name: 'equals', input: 'a=b', expectedSegment: 'a%3Db' },
    { name: 'plus', input: 'a+b', expectedSegment: 'a%2Bb' },
    { name: 'question mark', input: 'a?b', expectedSegment: 'a%3Fb' },
    { name: 'at sign', input: 'user@host', expectedSegment: 'user%40host' },
    { name: 'colon (single)', input: 'key:value', expectedSegment: 'key%3Avalue' },
    { name: 'ISO 8601 timestamp (multi-colon)', input: '2026-01-15T10:30:00', expectedSegment: '2026-01-15T10%3A30%3A00' },
    { name: 'comma (CSV-like)', input: 'a,b,c', expectedSegment: 'a%2Cb%2Cc' },
    { name: 'semicolon', input: 'a;b', expectedSegment: 'a%3Bb' },
    { name: 'Latin-1 unicode (é in José)', input: 'José', expectedSegment: 'Jos%C3%A9' },
    { name: 'square brackets', input: 'list[1]', expectedSegment: 'list%5B1%5D' },
    { name: 'curly braces', input: '{x}', expectedSegment: '%7Bx%7D' },
    { name: 'caret', input: 'a^b', expectedSegment: 'a%5Eb' },
    { name: 'pipe', input: 'a|b', expectedSegment: 'a%7Cb' },
    { name: 'bare percent', input: '100%', expectedSegment: '100%25' },
    { name: 'unreserved chars only (no encoding)', input: 'a-b_c.d~e', expectedSegment: 'a-b_c.d~e' }
  ];

  it.each(cases)('encodes path-param value $name: "$input" → "$expectedSegment"', ({ input, expectedSegment }) => {
    // har.url is what reaches the wire. For toggle ON the user expects the
    // path-param value to be percent-encoded once (matching encodeURIComponent
    // semantics).
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/users/:id',
        pathParams: [{ name: 'id', value: input, type: 'path', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });

    expect(har.url).toBe(`https://example.com/users/${expectedSegment}`);
  });
});

// ---------------------------------------------------------------------------
// Path-param substitution matrix (toggle OFF) — companion to the ON matrix
// ---------------------------------------------------------------------------
//
// For URL `https://example.com/users/:id` with `pathParams.id = <input>` and
// `settings.encodeUrl = false` (the default), the user expects the path-param
// value to be substituted RAW — no encoding. Tests inspect `rawUrl` (the
// buildHar output that holds the user-typed form after path-param
// substitution, before any encodeUrl pass).
//
// Note: when toggle is OFF, characters with structural meaning in URL grammar
// (`/`, `#`, `?`) inside a path-param value will be interpreted by URL
// parsers as path separators / fragments / query starts respectively. That's
// the user's responsibility to handle — flipping the toggle ON is the way to
// preserve them as data.
describe('buildHar — path-param substitution matrix (toggle OFF)', () => {
  const cases: Array<{ name: string; input: string }> = [
    { name: 'forward slash', input: 'aaa/bbb' },
    { name: 'hash', input: 'aaa#bbb' },
    { name: 'literal space', input: 'John Doe' },
    { name: 'ampersand', input: 'a&b' },
    { name: 'equals', input: 'a=b' },
    { name: 'plus', input: 'a+b' },
    { name: 'question mark', input: 'a?b' },
    { name: 'at sign', input: 'user@host' },
    { name: 'colon (single)', input: 'key:value' },
    { name: 'ISO 8601 timestamp (multi-colon)', input: '2026-01-15T10:30:00' },
    { name: 'comma (CSV-like)', input: 'a,b,c' },
    { name: 'semicolon', input: 'a;b' },
    { name: 'Latin-1 unicode (é in José)', input: 'José' },
    { name: 'square brackets', input: 'list[1]' },
    { name: 'curly braces', input: '{x}' },
    { name: 'caret', input: 'a^b' },
    { name: 'pipe', input: 'a|b' },
    { name: 'bare percent', input: '100%' },
    { name: 'unreserved chars only', input: 'a-b_c.d~e' }
  ];

  it.each(cases)('passes path-param value through raw $name: "$input"', ({ input }) => {
    const { rawUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/users/:id',
        pathParams: [{ name: 'id', value: input, type: 'path', enabled: true }],
        settings: { encodeUrl: false }
      }),
      shouldInterpolate: false
    });

    expect(rawUrl).toBe(`https://example.com/users/${input}`);
  });
});

// ---- Phase C.1: query encoding matrix (mirrors e2e fixtures) ------------
// Each scenario asserts both rawUrl (OFF behavior — bytes preserved) and
// encodedUrl (ON behavior — encoded per Option C: `#` is data, content-blind
// per PR #5507). The pairs cover every distinct query-encoding scenario in
// `tests/request/generate-code/collection/requests/`.

describe('buildHar — query encoding matrix (mirror e2e fixtures)', () => {
  type QueryCase = {
    name: string;
    url: string;
    params: Array<{ name: string; value: string }>;
    encoded: string;
    raw: string;
  };

  const cases: QueryCase[] = [
    {
      name: 'spaces',
      url: 'https://example.com/api?name=John Doe&age=25',
      params: [{ name: 'name', value: 'John Doe' }, { name: 'age', value: '25' }],
      encoded: 'https://example.com/api?name=John%20Doe&age=25',
      raw: 'https://example.com/api?name=John Doe&age=25'
    },
    {
      name: 'pre-encoded (PR #5507 content-blind double-encode)',
      url: 'https://example.com/api?name=John%20Doe&email=john%40example.com',
      params: [{ name: 'name', value: 'John%20Doe' }, { name: 'email', value: 'john%40example.com' }],
      encoded: 'https://example.com/api?name=John%2520Doe&email=john%2540example.com',
      raw: 'https://example.com/api?name=John%20Doe&email=john%40example.com'
    },
    {
      name: 'redirect-style structural chars (:, /)',
      url: 'https://example.com/api?path=/users/123&redirect=https://other.com',
      params: [{ name: 'path', value: '/users/123' }, { name: 'redirect', value: 'https://other.com' }],
      encoded: 'https://example.com/api?path=%2Fusers%2F123&redirect=https%3A%2F%2Fother.com',
      raw: 'https://example.com/api?path=/users/123&redirect=https://other.com'
    },
    {
      name: 'pipe operator',
      url: 'https://example.com/api?filter=status|active&sort=name|asc',
      params: [{ name: 'filter', value: 'status|active' }, { name: 'sort', value: 'name|asc' }],
      encoded: 'https://example.com/api?filter=status%7Cactive&sort=name%7Casc',
      raw: 'https://example.com/api?filter=status|active&sort=name|asc'
    },
    {
      name: 'unicode (é, ü)',
      url: 'https://example.com/api?name=José&city=München',
      params: [{ name: 'name', value: 'José' }, { name: 'city', value: 'München' }],
      encoded: 'https://example.com/api?name=Jos%C3%A9&city=M%C3%BCnchen',
      raw: 'https://example.com/api?name=José&city=München'
    },
    {
      name: 'equals signs in value (token=abc123==)',
      url: 'https://example.com/api?token=abc123==&type=test',
      params: [{ name: 'token', value: 'abc123==' }, { name: 'type', value: 'test' }],
      encoded: 'https://example.com/api?token=abc123%3D%3D&type=test',
      raw: 'https://example.com/api?token=abc123==&type=test'
    },
    {
      name: 'email with + alias and @',
      url: 'https://example.com/invite?email=test+alias@example.com',
      params: [{ name: 'email', value: 'test+alias@example.com' }],
      encoded: 'https://example.com/invite?email=test%2Balias%40example.com',
      raw: 'https://example.com/invite?email=test+alias@example.com'
    },
    {
      name: 'commas + colon (CSV / ISO time)',
      url: 'https://example.com/filter?tags=a,b,c&time=10:30',
      params: [{ name: 'tags', value: 'a,b,c' }, { name: 'time', value: '10:30' }],
      encoded: 'https://example.com/filter?tags=a%2Cb%2Cc&time=10%3A30',
      raw: 'https://example.com/filter?tags=a,b,c&time=10:30'
    },
    {
      name: 'canonical PR #5507 redirect with pre-encoded chars',
      url: 'https://auth.example.com/login?redirect=https%3A%2F%2Fother.com%2Fcb&token=abc%2520xyz',
      params: [
        { name: 'redirect', value: 'https%3A%2F%2Fother.com%2Fcb' },
        { name: 'token', value: 'abc%2520xyz' }
      ],
      encoded: 'https://auth.example.com/login?redirect=https%253A%252F%252Fother.com%252Fcb&token=abc%252520xyz',
      raw: 'https://auth.example.com/login?redirect=https%3A%2F%2Fother.com%2Fcb&token=abc%2520xyz'
    },
    {
      name: '# in query value (Option C: data, not fragment)',
      url: 'https://example.com/api?query=aaa#bbb',
      params: [{ name: 'query', value: 'aaa#bbb' }],
      encoded: 'https://example.com/api?query=aaa%23bbb',
      raw: 'https://example.com/api?query=aaa#bbb'
    },
    {
      name: 'JSON-shaped array values (issue #7913)',
      url: 'https://example.com/api?empty=[]&nums=[1, 2, 3]&strs=["string", "string"]&nested=[[1, 2, 3], ["string", "string"]]',
      params: [
        { name: 'empty', value: '[]' },
        { name: 'nums', value: '[1, 2, 3]' },
        { name: 'strs', value: '["string", "string"]' },
        { name: 'nested', value: '[[1, 2, 3], ["string", "string"]]' }
      ],
      encoded: 'https://example.com/api?empty=%5B%5D&nums=%5B1%2C%202%2C%203%5D&strs=%5B%22string%22%2C%20%22string%22%5D&nested=%5B%5B1%2C%202%2C%203%5D%2C%20%5B%22string%22%2C%20%22string%22%5D%5D',
      raw: 'https://example.com/api?empty=[]&nums=[1, 2, 3]&strs=["string", "string"]&nested=[[1, 2, 3], ["string", "string"]]'
    }
  ];

  describe.each(cases)('$name', ({ url, params, encoded, raw }) => {
    const requestWithEnabled = (encodeUrl: boolean) => ({
      ...baseRequest({ url, settings: { encodeUrl } }),
      params: params.map((p) => ({ ...p, type: 'query', enabled: true }))
    });

    it('ON: encodedUrl runs encodeUrl() (encoded form)', () => {
      const { encodedUrl } = buildHar({ request: requestWithEnabled(true), shouldInterpolate: false });
      expect(encodedUrl).toBe(encoded);
    });

    it('OFF: rawUrl preserves user-typed URL byte-for-byte', () => {
      const { rawUrl } = buildHar({ request: requestWithEnabled(false), shouldInterpolate: false });
      expect(rawUrl).toBe(raw);
    });
  });
});

// ---- Phase C.2: path encoding matrix (mirrors e2e fixtures) ------------
// Each scenario asserts both rawUrl (OFF) and encodedUrl (ON). Path-side
// encoding is idempotent: pre-encoded inputs survive as single-encoded (no
// %20 → %2520) thanks to encodePathSegments using safeDecodeURIComponent.

describe('buildHar — path encoding matrix (mirror e2e fixtures)', () => {
  type PathCase = {
    name: string;
    url: string;
    encoded: string;
    raw: string;
  };

  const cases: PathCase[] = [
    {
      name: 'spaces in path',
      url: 'https://example.com/api/path with spaces/users',
      encoded: 'https://example.com/api/path%20with%20spaces/users',
      raw: 'https://example.com/api/path with spaces/users'
    },
    {
      name: 'square brackets',
      url: 'https://example.com/list[123]',
      encoded: 'https://example.com/list%5B123%5D',
      raw: 'https://example.com/list[123]'
    },
    {
      name: 'unicode',
      url: 'https://example.com/users/José/profile',
      encoded: 'https://example.com/users/Jos%C3%A9/profile',
      raw: 'https://example.com/users/José/profile'
    },
    {
      name: 'pre-encoded path is idempotent (single-encoded form preserved)',
      url: 'https://example.com/api/path%20with%20spaces/users',
      // ON: decode-then-encode collapses to single-encoded form (NOT %2520)
      encoded: 'https://example.com/api/path%20with%20spaces/users',
      // OFF: byte-for-byte preserved
      raw: 'https://example.com/api/path%20with%20spaces/users'
    },
    {
      name: 'OData path with $ filters + space (Products(123)/Categories(456))',
      url: 'https://example.com/odata/Products(123)/Categories(456)?$expand=Items&$filter=Price gt 10',
      // ON: parens stay unreserved; $ → %24 in query keys; space → %20
      encoded: 'https://example.com/odata/Products(123)/Categories(456)?%24expand=Items&%24filter=Price%20gt%2010',
      raw: 'https://example.com/odata/Products(123)/Categories(456)?$expand=Items&$filter=Price gt 10'
    }
  ];

  describe.each(cases)('$name', ({ url, encoded, raw }) => {
    it('ON: encodedUrl applies encodeUrl()', () => {
      const { encodedUrl } = buildHar({
        request: baseRequest({ url, settings: { encodeUrl: true } }),
        shouldInterpolate: false
      });
      expect(encodedUrl).toBe(encoded);
    });

    it('OFF: rawUrl preserves user-typed URL byte-for-byte', () => {
      const { rawUrl } = buildHar({
        request: baseRequest({ url, settings: { encodeUrl: false } }),
        shouldInterpolate: false
      });
      expect(rawUrl).toBe(raw);
    });
  });
});

// ---- Phase C.3: bracket-key phantom-duplicate regression ----------------
// `stripQueryStringFromUrl` removes the URL's query before storing in HAR
// so HTTPSnippet's `url.parse(..., true, true)` can't strip `[]` from
// bracketed keys and emit a phantom second copy. Sole source of truth for
// the rendered query string is `har.queryString`.

describe('buildHar — bracket-key query regression (post_ids[], key[a][b])', () => {
  it('post_ids[]=8647 — har.queryString length 1, har.url has no `?`', () => {
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://meta.discourse.org/t/173975/posts.json?post_ids%5B%5D=8647',
        params: [{ name: 'post_ids[]', value: '8647', type: 'query', enabled: true }]
      }),
      shouldInterpolate: false
    });
    expect(har.url).toBe('https://meta.discourse.org/t/173975/posts.json');
    expect(har.url).not.toContain('?');
    expect(har.queryString).toHaveLength(1);
    expect(har.queryString[0]).toEqual({ name: 'post_ids[]', value: '8647' });
  });

  it('key[a][b]=nested — Rails-style nested brackets, no phantom duplicate', () => {
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?key[a][b]=nested',
        params: [{ name: 'key[a][b]', value: 'nested', type: 'query', enabled: true }]
      }),
      shouldInterpolate: false
    });
    expect(har.url).toBe('https://example.com/api');
    expect(har.queryString).toHaveLength(1);
    expect(har.queryString[0]).toEqual({ name: 'key[a][b]', value: 'nested' });
  });

  it('repeated array keys ids[]=1&ids[]=2&ids[]=3 → 3 distinct entries preserved in order', () => {
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?ids[]=1&ids[]=2&ids[]=3',
        params: [
          { name: 'ids[]', value: '1', type: 'query', enabled: true },
          { name: 'ids[]', value: '2', type: 'query', enabled: true },
          { name: 'ids[]', value: '3', type: 'query', enabled: true }
        ]
      }),
      shouldInterpolate: false
    });
    expect(har.queryString).toHaveLength(3);
    expect(har.queryString).toEqual([
      { name: 'ids[]', value: '1' },
      { name: 'ids[]', value: '2' },
      { name: 'ids[]', value: '3' }
    ]);
  });

  it('# in URL with a query: encodeUrl folds # into the query value as %23, then strip removes the whole query', () => {
    // Option C contract: encodeUrl no longer splits on `#`. The `#section`
    // chunk is parsed as part of the query value, encoded to `%23section`,
    // and then stripped along with the rest of `?q=1%23section` by
    // stripQueryStringFromUrl. Net result: har.url is just origin + path.
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?q=1#section',
        params: [{ name: 'q', value: '1#section', type: 'query', enabled: true }]
      }),
      shouldInterpolate: false
    });
    expect(har.url).toBe('https://example.com/api');
  });

  it('# in URL with NO query: encodeUrl encodes # to %23 in the path; strip is a no-op (no `?` to strip)', () => {
    // Option C: `#` lands inside the path encoding pipeline because encodeUrl
    // no longer splits on `#`. encodePathSegments encodes it to `%23` via
    // encodeURIComponent. stripQueryStringFromUrl does nothing (no `?`).
    const { har } = buildHar({
      request: baseRequest({ url: 'https://example.com/api#section' }),
      shouldInterpolate: false
    });
    expect(har.url).toBe('https://example.com/api%23section');
  });

  it('strips queries the same way regardless of bracket presence (multi-param sanity check)', () => {
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?a=1&b=2&c=3',
        params: [
          { name: 'a', value: '1', type: 'query', enabled: true },
          { name: 'b', value: '2', type: 'query', enabled: true },
          { name: 'c', value: '3', type: 'query', enabled: true }
        ]
      }),
      shouldInterpolate: false
    });
    expect(har.url).toBe('https://example.com/api');
    expect(har.queryString).toHaveLength(3);
  });
});

// ---- Phase C.4: rawUrl / encodedUrl invariants -------------------------
// The two URL fields returned by buildHar are the contract snippet-generator
// uses for its display-swap (OFF mode shows rawUrl, ON mode shows encodedUrl).
// These tests pin the invariants so a future refactor can't silently swap
// which URL each field carries.

describe('buildHar — rawUrl vs encodedUrl invariants', () => {
  it('OFF: rawUrl equals user-typed URL byte-for-byte', () => {
    const url = 'https://example.com/api?name=John Doe&path=/x/y';
    const { rawUrl } = buildHar({
      request: baseRequest({
        url,
        params: [
          { name: 'name', value: 'John Doe', type: 'query', enabled: true },
          { name: 'path', value: '/x/y', type: 'query', enabled: true }
        ],
        settings: { encodeUrl: false }
      }),
      shouldInterpolate: false
    });
    expect(rawUrl).toBe(url);
  });

  it('ON: encodedUrl differs from rawUrl when input has non-unreserved chars', () => {
    const url = 'https://example.com/api?name=John Doe';
    const { rawUrl, encodedUrl } = buildHar({
      request: baseRequest({
        url,
        params: [{ name: 'name', value: 'John Doe', type: 'query', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(encodedUrl).not.toBe(rawUrl);
    expect(encodedUrl).toContain('John%20Doe');
  });

  it('ON: encodedUrl equals rawUrl when input is already unreserved-only (encoding is a no-op)', () => {
    const url = 'https://example.com/api/foo/bar?a=1&b=2';
    const { rawUrl, encodedUrl } = buildHar({
      request: baseRequest({
        url,
        params: [
          { name: 'a', value: '1', type: 'query', enabled: true },
          { name: 'b', value: '2', type: 'query', enabled: true }
        ],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(encodedUrl).toBe(rawUrl);
  });

  it('encodedUrl applies Option C — # becomes %23', () => {
    const { encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?q=aaa#bbb',
        params: [{ name: 'q', value: 'aaa#bbb', type: 'query', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    expect(encodedUrl).toContain('q=aaa%23bbb');
    expect(encodedUrl).not.toContain('#bbb');
  });

  it('rawUrl includes literal {{var}} when shouldInterpolate=false (hashed internally, restored by unhash)', () => {
    // While processing, `{{baseUrl}}` is replaced by a URL-safe hash so
    // parsing/encoding work. buildHar exposes `unhash` which, when applied
    // to the final string output, restores the literal `{{baseUrl}}` form.
    const { rawUrl, unhash } = buildHar({
      request: baseRequest({
        url: 'https://{{baseUrl}}/api?q=1',
        params: [{ name: 'q', value: '1', type: 'query', enabled: true }]
      }),
      shouldInterpolate: false
    });
    // rawUrl carries the internal hashed form; unhash restores the template
    const restored = unhash(rawUrl);
    expect(restored).toContain('{{baseUrl}}');
  });

  it('rawUrl and encodedUrl both reflect path-param substitution from pathParams[]', () => {
    const { rawUrl, encodedUrl } = buildHar({
      request: baseRequest({
        url: 'https://example.com/users/:id',
        pathParams: [{ name: 'id', value: 'aaa bbb', type: 'path', enabled: true }],
        settings: { encodeUrl: true }
      }),
      shouldInterpolate: false
    });
    // ON: encoded form
    expect(encodedUrl).toBe('https://example.com/users/aaa%20bbb');
    // raw form always preserves user input
    expect(rawUrl).toBe('https://example.com/users/aaa bbb');
  });
});

// ---- Phase D: interpolation edge cases + defensive inputs --------------

describe('buildHar — interpolation edge cases', () => {
  it('{{?prompt}} variables in URL survive verbatim through unhash (not substituted at HAR-build time)', () => {
    const { unhash, rawUrl } = buildHar({
      request: baseRequest({ url: 'https://example.com/api?q={{?Prompt Var}}' }),
      shouldInterpolate: false
    });
    // The `?` makes it a prompt placeholder. Bruno's runtime/snippet caller is
    // responsible for asking the user — buildHar must leave the token intact.
    expect(unhash(rawUrl)).toContain('{{?Prompt Var}}');
  });

  it('missing variable {{undefined_var}} passes through as literal placeholder when shouldInterpolate=true', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [{ name: 'X-Foo', value: '{{undefined_var}}', enabled: true }]
      }),
      variables: { other: 'value' },
      shouldInterpolate: true
    });
    const header = har.headers.find((h) => h.name === 'X-Foo');
    expect(header?.value).toContain('{{undefined_var}}');
  });

  it('shouldInterpolate=true resolves headers with {{var}}', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [{ name: 'X-Token', value: '{{token}}', enabled: true }]
      }),
      variables: { token: 'tk-resolved' },
      shouldInterpolate: true
    });
    expect(har.headers).toContainEqual({ name: 'X-Token', value: 'tk-resolved' });
  });

  it('shouldInterpolate=true resolves body text with {{var}} (text mode)', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'text', text: 'hello {{name}}' } }),
      variables: { name: 'world' },
      shouldInterpolate: true
    });
    expect(har.postData.text).toBe('hello world');
  });

  it('shouldInterpolate=true resolves body xml with {{var}}', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'xml', xml: '<u>{{name}}</u>' } }),
      variables: { name: 'alice' },
      shouldInterpolate: true
    });
    expect(har.postData.text).toBe('<u>alice</u>');
  });

  it('shouldInterpolate=true resolves body sparql with {{var}}', () => {
    const { har } = buildHar({
      request: baseRequest({ body: { mode: 'sparql', sparql: 'SELECT ?{{var}} WHERE { ?s ?p ?o }' } }),
      variables: { var: 'x' },
      shouldInterpolate: true
    });
    expect(har.postData.text).toBe('SELECT ?x WHERE { ?s ?p ?o }');
  });

  it('shouldInterpolate=true resolves formUrlEncoded values with {{var}}', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'formUrlEncoded',
          formUrlEncoded: [{ name: 'role', value: '{{role}}', enabled: true }]
        }
      }),
      variables: { role: 'admin' },
      shouldInterpolate: true
    });
    expect(har.postData.text).toBe('role=admin');
  });

  it('shouldInterpolate=true resolves multipartForm values with {{var}}', () => {
    const { har } = buildHar({
      request: baseRequest({
        body: {
          mode: 'multipartForm',
          multipartForm: [{ name: 'caption', value: '{{label}}', type: 'text', enabled: true }]
        }
      }),
      variables: { label: 'hello' },
      shouldInterpolate: true
    });
    expect(har.postData.params).toContainEqual({ name: 'caption', value: 'hello' });
  });

  it('shouldInterpolate=true resolves auth fields (basic password)', () => {
    const { har } = buildHar({
      request: baseRequest({
        auth: { mode: 'basic', basic: { username: 'u', password: '{{pw}}' } }
      }),
      variables: { pw: 'sekret' },
      shouldInterpolate: true
    });
    const auth = har.headers.find((h) => h.name === 'Authorization');
    expect(auth?.value).toBe(`Basic ${Buffer.from('u:sekret').toString('base64')}`);
  });
});

describe('buildHar — defensive / robustness', () => {
  it('empty headers array → still adds default content-type for body mode', () => {
    const { har } = buildHar({
      request: baseRequest({ headers: [], body: { mode: 'json', json: '{}' } }),
      shouldInterpolate: false
    });
    expect(har.headers).toContainEqual({ name: 'Content-Type', value: 'application/json' });
  });

  it('malformed auth (missing .basic.username) → empty string substituted, no throw', () => {
    const { har } = buildHar({
      request: baseRequest({ auth: { mode: 'basic', basic: {} } }),
      shouldInterpolate: false
    });
    expect(har.headers.find((h) => h.name === 'Authorization')).toBeDefined();
  });

  it('encoded-only-once for unreserved-chars-only path (no-op encoding)', () => {
    const url = 'https://example.com/api/users/abc-123_.~/profile';
    const { encodedUrl } = buildHar({
      request: baseRequest({ url, settings: { encodeUrl: true } }),
      shouldInterpolate: false
    });
    expect(encodedUrl).toBe(url);
  });

  it('missing body → har.postData is undefined / empty (no throw)', () => {
    const { har } = buildHar({
      request: { method: 'GET', url: 'https://example.com/api', params: [], headers: [], auth: { mode: 'none' } } as any,
      shouldInterpolate: false
    });
    // Body-less request still produces a HAR
    expect(har.method).toBe('GET');
  });

  it('disabled query params filtered before stripping/encoding (do not leak into queryString)', () => {
    const { har } = buildHar({
      request: baseRequest({
        url: 'https://example.com/api?keep=yes&drop=no',
        params: [
          { name: 'keep', value: 'yes', type: 'query', enabled: true },
          { name: 'drop', value: 'no', type: 'query', enabled: false }
        ]
      }),
      shouldInterpolate: false
    });
    const names = har.queryString.map((p) => p.name);
    expect(names).toContain('keep');
    expect(names).not.toContain('drop');
  });

  it('headers with disabled flag false → not present in har.headers', () => {
    const { har } = buildHar({
      request: baseRequest({
        headers: [
          { name: 'X-Keep', value: 'on', enabled: true },
          { name: 'X-Drop', value: 'off', enabled: false }
        ]
      }),
      shouldInterpolate: false
    });
    const names = har.headers.map((h) => h.name);
    expect(names).toContain('X-Keep');
    expect(names).not.toContain('X-Drop');
  });
});
