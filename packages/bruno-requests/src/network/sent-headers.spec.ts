import http from 'node:http';
import { AddressInfo } from 'node:net';
import { applySentHeadersToRequest, getSentHeaders } from './sent-headers';

const asClientRequest = (headerBlock: unknown) => ({ _header: headerBlock }) as any;

describe('getSentHeaders', () => {
  it('reads a live request verbatim, keeping the casing getHeaders() would flatten', async () => {
    const server = http.createServer((_req, res) => res.end('ok'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const clientRequest = await new Promise<http.ClientRequest>((resolve) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          // Colons in the request line must not be mistaken for a header
          path: '/some:path?a=b:c',
          agent: new http.Agent({ keepAlive: true }),
          headers: {
            'X-Mixed-Case': 'MiXeD-VaLuE',
            'X-Has-Colon': 'Bearer: abc:def'
          }
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(req));
        }
      );
      req.end();
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(getSentHeaders(clientRequest)).toMatchObject({
      'X-Mixed-Case': 'MiXeD-VaLuE',
      'X-Has-Colon': 'Bearer: abc:def',
      'Host': `127.0.0.1:${port}`,
      // Node writes this one straight into the block, so getHeaders() never sees it
      'Connection': 'keep-alive'
    });
  });

  it('masks the proxy credential, so the header still shows but its value never does', () => {
    const credential = 'Basic dXNlcjpwYXNzd29yZA==';
    const headers = getSentHeaders(asClientRequest(`GET / HTTP/1.1\r\nProxy-Authorization: ${credential}\r\n\r\n`));

    expect(headers['Proxy-Authorization']).toBe('*'.repeat(credential.length));
    expect(headers['Proxy-Authorization']).not.toContain('dXNlcj');
  });

  it('skips blank lines and nameless values, neither of which is a header', () => {
    expect(getSentHeaders(asClientRequest('GET / HTTP/1.1\r\n: orphan\r\nA: 1\r\n\r\n'))).toEqual({ A: '1' });
  });

  it('accepts bare LF separators, not only the CRLF Node writes', () => {
    expect(getSentHeaders(asClientRequest('GET / HTTP/1.1\nHost: x\nConnection: keep-alive\n\n'))).toEqual({
      Host: 'x',
      Connection: 'keep-alive'
    });
  });

  it('returns an empty set when there is no block to read, rather than throwing', () => {
    expect(getSentHeaders(undefined)).toEqual({});
    expect(getSentHeaders(asClientRequest(undefined))).toEqual({});
    expect(getSentHeaders(asClientRequest(''))).toEqual({});
    expect(getSentHeaders(asClientRequest(42))).toEqual({});
  });
});

describe('applySentHeadersToRequest', () => {
  it('puts the sent headers ahead of the declared ones, the order the timeline shows', () => {
    const request = { headers: { 'x-mine': 'kept' } };
    applySentHeadersToRequest(request, { sentHeaders: { Host: 'example.com', Connection: 'keep-alive' } });

    expect(Object.keys(request.headers)).toEqual(['Host', 'Connection', 'x-mine']);
  });

  it('never overwrites a header the user declared, whatever its casing', () => {
    const request = { headers: { 'content-type': false as unknown as string, 'Accept': 'mine' } };
    applySentHeadersToRequest(request, { sentHeaders: { 'Content-Type': 'application/json', 'accept': 'theirs' } });

    expect(request.headers['content-type']).toBe(false);
    expect(request.headers['Accept']).toBe('mine');
  });

  it('leaves the request untouched when either side is missing, so a failed send changes nothing', () => {
    const request = { headers: { a: '1' } };

    applySentHeadersToRequest(request, null);
    applySentHeadersToRequest(request, {});
    applySentHeadersToRequest(null, { sentHeaders: { Host: 'x' } });

    expect(request.headers).toEqual({ a: '1' });
  });
});
