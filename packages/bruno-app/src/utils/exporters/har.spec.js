import { buildHarLog } from './har';

describe('buildHarLog', () => {
  const requestSent = {
    url: 'https://api.example.com/users?page=2&limit=10',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
      'Cookie': 'session=abc123; theme=dark'
    },
    data: '{"name":"John"}',
    timestamp: 1720000000000
  };

  const response = {
    status: 201,
    statusText: 'Created',
    headers: {
      'content-type': 'application/json',
      'set-cookie': ['session=def456; Path=/', 'theme=light; Path=/']
    },
    dataBuffer: Buffer.from('{"id":42}').toString('base64'),
    size: 9,
    duration: 137
  };

  it('should build a valid HAR 1.2 log with a single entry', () => {
    const har = buildHarLog({ requestSent, response });

    expect(har.log.version).toBe('1.2');
    expect(har.log.creator.name).toBe('Bruno');
    expect(har.log.creator.version).toBeTruthy();
    expect(har.log.entries).toHaveLength(1);

    const entry = har.log.entries[0];
    expect(entry.startedDateTime).toBe(new Date(1720000000000).toISOString());
    expect(entry.time).toBe(137);
    expect(entry.cache).toEqual({});
    expect(entry.timings).toEqual({
      blocked: -1,
      dns: -1,
      connect: -1,
      ssl: -1,
      send: 0,
      wait: 137,
      receive: 0
    });
  });

  it('should build the request with url, headers, query string and post data', () => {
    const { request } = buildHarLog({ requestSent, response }).log.entries[0];

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/users?page=2&limit=10');
    expect(request.httpVersion).toBe('HTTP/1.1');
    expect(request.headers).toContainEqual({ name: 'Authorization', value: 'Bearer token123' });
    expect(request.queryString).toEqual([
      { name: 'page', value: '2' },
      { name: 'limit', value: '10' }
    ]);
    expect(request.cookies).toEqual([
      { name: 'session', value: 'abc123' },
      { name: 'theme', value: 'dark' }
    ]);
    expect(request.postData).toEqual({
      mimeType: 'application/json',
      text: '{"name":"John"}'
    });
    expect(request.bodySize).toBe(Buffer.byteLength('{"name":"John"}'));
    expect(request.headersSize).toBe(-1);
  });

  it('should omit postData and report zero body size when there is no request body', () => {
    const { request } = buildHarLog({
      requestSent: { ...requestSent, method: 'GET', data: undefined },
      response
    }).log.entries[0];

    expect(request.postData).toBeUndefined();
    expect(request.bodySize).toBe(0);
  });

  it('should build the response with decoded text content for textual mime types', () => {
    const { response: harResponse } = buildHarLog({ requestSent, response }).log.entries[0];

    expect(harResponse.status).toBe(201);
    expect(harResponse.statusText).toBe('Created');
    expect(harResponse.content).toEqual({
      size: 9,
      mimeType: 'application/json',
      text: '{"id":42}'
    });
    expect(harResponse.bodySize).toBe(9);
    expect(harResponse.headersSize).toBe(-1);
    expect(harResponse.redirectURL).toBe('');
  });

  it('should flatten multi-value headers and parse set-cookie values', () => {
    const { response: harResponse } = buildHarLog({ requestSent, response }).log.entries[0];

    const setCookieHeaders = harResponse.headers.filter((header) => header.name === 'set-cookie');
    expect(setCookieHeaders).toEqual([
      { name: 'set-cookie', value: 'session=def456; Path=/' },
      { name: 'set-cookie', value: 'theme=light; Path=/' }
    ]);
    expect(harResponse.cookies).toEqual([
      { name: 'session', value: 'def456' },
      { name: 'theme', value: 'light' }
    ]);
  });

  it('should base64-encode binary response bodies', () => {
    const binaryBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const binaryResponse = {
      ...response,
      headers: { 'content-type': 'image/png' },
      dataBuffer: binaryBuffer.toString('base64')
    };

    const { response: harResponse } = buildHarLog({ requestSent, response: binaryResponse }).log.entries[0];

    expect(harResponse.content).toEqual({
      size: 4,
      mimeType: 'image/png',
      text: binaryBuffer.toString('base64'),
      encoding: 'base64'
    });
  });

  it('should include the location header as redirectURL', () => {
    const redirectResponse = {
      ...response,
      status: 302,
      statusText: 'Found',
      headers: { location: 'https://api.example.com/users/42' },
      dataBuffer: ''
    };

    const { response: harResponse } = buildHarLog({ requestSent, response: redirectResponse }).log.entries[0];

    expect(harResponse.redirectURL).toBe('https://api.example.com/users/42');
    expect(harResponse.content.size).toBe(0);
  });

  it('should not throw on empty request and response', () => {
    const har = buildHarLog({ requestSent: {}, response: {} });
    const entry = har.log.entries[0];

    expect(entry.request.method).toBe('GET');
    expect(entry.request.queryString).toEqual([]);
    expect(entry.response.status).toBe(0);
    expect(entry.time).toBe(0);
  });
});
