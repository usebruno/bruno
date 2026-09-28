const { signEdgeGridRequest } = require('./edgegrid-helper');

/**
 * These vectors are Akamai's OFFICIAL EdgeGrid test fixtures, taken from the reference
 * implementation (github.com/akamai/AkamaiOPEN-edgegrid-node — test/test.js & test/test_data.json).
 * Matching them byte-for-byte proves Bruno's signature is interoperable with the real
 * Akamai gateway. Credentials/nonce/timestamp are the published dummy values.
 */
const CREDS = {
  clientToken: 'akab-client-token-xxx-xxxxxxxxxxxxxxxx',
  accessToken: 'akab-access-token-xxx-xxxxxxxxxxxxxxxx',
  clientSecret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=',
  nonce: 'nonce-xx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  timestamp: '20140321T19:34:21+0000'
};
const HOST = 'https://akaa-baseurl-xxxxxxxxxxx-xxxxxxxxxxxxx.luna.akamaiapis.net';
const HEADERS_TO_SIGN = 'X-Test1,X-Test2,X-Test3';

const sig = (header) => header.split('signature=')[1];

describe('signEdgeGridRequest — Akamai official vectors (core)', () => {
  const cases = [
    {
      name: 'simple GET',
      config: CREDS,
      request: { method: 'GET', url: `${HOST}/` },
      expected: 'tL+y4hxyHxgWVD30X3pWnGKHcPzmrIF+LThiAOhMxYU='
    },
    {
      name: 'GET with query string',
      config: CREDS,
      request: { method: 'GET', url: `${HOST}/testapi/v1/t1?p1=1&p2=2` },
      expected: 'hKDH1UlnQySSHjvIcZpDMbQHihTQ0XyVAKZaApabdeA='
    },
    {
      name: 'POST within body limit (body hashed)',
      config: CREDS,
      request: { method: 'POST', url: `${HOST}/testapi/v1/t3`, data: 'datadatadatadatadatadatadatadata' },
      expected: 'hXm4iCxtpN22m4cbZb4lVLW5rhX8Ca82vCFqXzSTPe4='
    },
    {
      name: 'POST with empty body (no content hash)',
      config: CREDS,
      request: { method: 'POST', url: `${HOST}/testapi/v1/t6`, data: '' },
      expected: '1gEDxeQGD5GovIkJJGcBaKnZ+VaPtrc4qBUHixjsPCQ='
    }
  ];

  test.each(cases)('$name', async ({ config, request, expected }) => {
    expect(sig(await signEdgeGridRequest(config, request))).toBe(expected);
  });
});

describe('signEdgeGridRequest — Akamai official vectors (headers_to_sign)', () => {
  const config = { ...CREDS, headersToSign: HEADERS_TO_SIGN, maxBodySize: 2048 };
  const cases = [
    {
      name: 'single signed header',
      request: { method: 'GET', url: `${HOST}/testapi/v1/t4`, headers: { 'X-Test1': 'test-simple-header' } },
      expected: '8F9AybcRw+PLxnvT+H0JRkjROrrUgsxJTnRXMzqvcwY='
    },
    {
      name: 'header value with surrounding/quoted spaces (trimmed + collapsed)',
      request: { method: 'GET', url: `${HOST}/testapi/v1/t4`, headers: { 'X-Test1': '"     test-header-with-spaces     "' } },
      expected: 'ucq2AbjCNtobHfCTuS38fdkl5UDdWHZhQX46fYR8CqI='
    },
    {
      name: 'header with leading + interior spaces (collapsed)',
      request: { method: 'GET', url: `${HOST}/testapi/v1/t4`, headers: { 'X-Test1': '     first-thing      second-thing' } },
      expected: 'WtnneL539UadAAOJwnsXvPqT4Kt6z7HMgBEwAFpt3+c='
    },
    {
      name: 'headers signed in config order regardless of request order',
      request: { method: 'GET', url: `${HOST}/testapi/v1/t4`, headers: { 'X-Test2': 't2', 'X-Test1': 't1', 'X-Test3': 't3' } },
      expected: 'Wus73Nx8jOYM+kkBFF2q8D1EATRIMr0WLWwpLBgkBqY='
    },
    {
      name: 'headers not in the sign list are excluded',
      request: {
        method: 'GET',
        url: `${HOST}/testapi/v1/t5`,
        headers: { 'X-Test2': 't2', 'X-Test1': 't1', 'X-Test3': 't3', 'X-Extra': 'this won\'t be included' }
      },
      expected: 'Knd/jc0A5Ghhizjayr0AUUvl2MZjBpS3FDSzvtq4Ixc='
    }
  ];

  test.each(cases)('$name', async ({ request, expected }) => {
    expect(sig(await signEdgeGridRequest(config, request))).toBe(expected);
  });
});

describe('signEdgeGridRequest — body hashing rules', () => {
  test('non-POST methods are NOT body-hashed (PUT with data)', async () => {
    const header = await signEdgeGridRequest(CREDS, {
      method: 'PUT',
      url: `${HOST}/testapi/v1/t6`,
      data: 'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP'
    });
    // Matches the Akamai fixture for a PUT (no content hash since only POST is hashed).
    expect(sig(header)).toBe('GNBWEYSEWOLtu+7dD52da2C39aX/Jchpon3K/AmBqBU=');
  });

  test('POST body is hashed as-sent (no JSON re-compaction)', async () => {
    const pretty = '{\n  "name": "bruno"\n}';
    const compact = '{"name":"bruno"}';
    const req = (data) => ({ method: 'POST', url: `${HOST}/x`, data });
    // Different bytes on the wire ⇒ different signature (proves we hash what we send).
    expect(sig(await signEdgeGridRequest(CREDS, req(pretty)))).not.toBe(sig(await signEdgeGridRequest(CREDS, req(compact))));
  });

  test('POST body is truncated to maxBodySize before hashing', async () => {
    const config = { ...CREDS, maxBodySize: 16 };
    const a = { method: 'POST', url: `${HOST}/x`, data: 'd'.repeat(16) + 'AAAAAAAA' };
    const b = { method: 'POST', url: `${HOST}/x`, data: 'd'.repeat(16) + 'BBBBBBBB' };
    // Bytes beyond maxBodySize are ignored ⇒ identical signature.
    expect(sig(await signEdgeGridRequest(config, a))).toBe(sig(await signEdgeGridRequest(config, b)));
  });
});

describe('signEdgeGridRequest — config behaviour', () => {
  test('throws when accessToken is missing', async () => {
    await expect(signEdgeGridRequest({ ...CREDS, accessToken: '' }, { method: 'GET', url: `${HOST}/` })).rejects.toThrow(
      /accessToken is required/
    );
  });

  test('throws when clientToken is missing', async () => {
    await expect(signEdgeGridRequest({ ...CREDS, clientToken: '' }, { method: 'GET', url: `${HOST}/` })).rejects.toThrow(
      /clientToken is required/
    );
  });

  test('throws when clientSecret is missing', async () => {
    await expect(signEdgeGridRequest({ ...CREDS, clientSecret: '' }, { method: 'GET', url: `${HOST}/` })).rejects.toThrow(
      /clientSecret is required/
    );
  });

  test('auto-generates nonce and timestamp when not provided', async () => {
    const header = await signEdgeGridRequest(
      { clientToken: CREDS.clientToken, accessToken: CREDS.accessToken, clientSecret: CREDS.clientSecret },
      { method: 'GET', url: `${HOST}/` }
    );
    // a UUID v4 nonce and an EdgeGrid timestamp (YYYYMMDDTHH:MM:SS+0000) are present
    expect(header).toMatch(/nonce=[0-9a-f-]{36};/);
    expect(header).toMatch(/timestamp=\d{8}T\d{2}:\d{2}:\d{2}\+0000;/);
    expect(header).toMatch(/signature=.+$/);
  });

  test('baseURL overrides the host the request is signed against', async () => {
    // Signing the request URL directly vs. signing via a different baseURL host ⇒ different signature
    const direct = await signEdgeGridRequest(CREDS, { method: 'GET', url: `${HOST}/path` });
    const viaBase = await signEdgeGridRequest(
      { ...CREDS, baseURL: 'https://other-host.luna.akamaiapis.net' },
      { method: 'GET', url: `${HOST}/path` }
    );
    expect(sig(direct)).not.toBe(sig(viaBase));
  });
});

/**
 * Equivalents of httpie-edgegrid's test_localhost / test_http_to_https_conversion: the EFFECTIVE
 * signed URL is the baseURL host + the request's path/query, so the literal request host (e.g.
 * "localhost") is replaced. We prove this by asserting the signature equals signing the fully resolved absolute URL directly.
 * Reference : https://github.com/akamai/httpie-edgegrid/blob/master/test/test_httpie_edgegrid.py
 */
describe('signEdgeGridRequest — baseURL host/scheme override (httpie test_localhost equivalents)', () => {
  const REAL_HOST = 'https://realhost-xxxxxxxx.luna.akamaiapis.net';

  test('localhost is replaced by the baseURL host (test_localhost)', async () => {
    const viaBase = await signEdgeGridRequest(
      { ...CREDS, baseURL: REAL_HOST },
      { method: 'GET', url: 'https://localhost/identity-management/v3/user-profile?q=1' }
    );
    const direct = await signEdgeGridRequest(CREDS, {
      method: 'GET',
      url: `${REAL_HOST}/identity-management/v3/user-profile?q=1`
    });
    expect(sig(viaBase)).toBe(sig(direct));
  });

  test('an http request is signed against the https baseURL (test_http_to_https_conversion)', async () => {
    const viaBase = await signEdgeGridRequest({ ...CREDS, baseURL: REAL_HOST }, { method: 'GET', url: 'http://localhost/path' });
    const direct = await signEdgeGridRequest(CREDS, { method: 'GET', url: `${REAL_HOST}/path` });
    expect(sig(viaBase)).toBe(sig(direct));
  });

  test('scheme-less baseURL ("host:port") borrows the request scheme', async () => {
    const viaBase = await signEdgeGridRequest(
      { ...CREDS, baseURL: 'localhost:6000' },
      { method: 'GET', url: 'http://localhost:9999/path' }
    );
    const direct = await signEdgeGridRequest(CREDS, { method: 'GET', url: 'http://localhost:6000/path' });
    expect(sig(viaBase)).toBe(sig(direct));
  });
});
