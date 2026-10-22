const mockAcquire = jest.fn();
jest.mock('../session-pool', () => ({ acquireSession: (...a: unknown[]) => mockAcquire(...a) }));

import { EventEmitter } from 'node:events';
import { createHttp2Transport } from '../create-http2-transport';

const makeStream = () => Object.assign(new EventEmitter(), { rstCode: 0 });
let stream: any;

beforeEach(() => {
  stream = makeStream();
  mockAcquire.mockReset().mockReturnValue({ pooled: { request: jest.fn(() => stream) }, reused: false });
});

const OPTS = { protocol: 'https:', hostname: 'api.test', port: 8443, method: 'POST', path: '/v1?q=1', headers: { 'x-test': '1' } };

describe('createHttp2Transport', () => {
  it('acquires a session for the origin and opens a stream with endStream:false', () => {
    const t = createHttp2Transport({ tlsOptions: { ca: 'CA' }, proxyUri: 'http://p:3128' });
    const returned = t.request(OPTS, () => {});
    expect(mockAcquire).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'https://api.test:8443', tlsOptions: { ca: 'CA' }, proxyUri: 'http://p:3128' })
    );
    const pooled = mockAcquire.mock.results[0].value.pooled;
    expect(pooled.request).toHaveBeenCalledWith(expect.any(Object), { endStream: false });
    expect(returned).toBe(stream);
  });

  it('translates headers to h2 pseudo-headers', () => {
    const t = createHttp2Transport({});
    t.request(OPTS, () => {});
    const h2 = mockAcquire.mock.results[0].value.pooled.request.mock.calls[0][0];
    expect(h2[':method']).toBe('POST');
    expect(h2[':scheme']).toBe('https');
    expect(h2[':authority']).toBe('api.test:8443');
    expect(h2[':path']).toBe('/v1?q=1');
    expect(h2['x-test']).toBe('1');
  });

  it('shapes the stream like an IncomingMessage on the response event', () => {
    const t = createHttp2Transport({});
    let res: any;
    t.request(OPTS, (r) => { res = r; });
    stream.emit('response', { ':status': 204, 'content-type': 'text/plain' });
    expect(res).toBe(stream);
    expect(res.statusCode).toBe(204);
    expect(res.statusMessage).toBe('No Content');
    expect(res.httpVersion).toBe('2.0');
    expect(res.httpVersionMajor).toBe(2);
    expect(res.httpVersionMinor).toBe(0);
    expect(res.headers).toEqual({ 'content-type': 'text/plain' }); // :status stripped
    expect(res.protocol).toBe('https:');
    expect(res.host).toBe('api.test');
    expect(res.path).toBe('/v1?q=1');
  });

  it('emits an error if the stream closes before a response (RST before headers)', () => {
    const t = createHttp2Transport({});
    t.request(OPTS, () => {});
    stream.rstCode = 8; // CANCEL
    const onError = jest.fn();
    stream.on('error', onError);
    stream.emit('close');
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0][0];
    expect(err.code).toBe('ERR_HTTP2_STREAM_CLOSED_EARLY');
    expect(err.message).toContain('CANCEL');
    expect(err.rstCode).toBe(8);
  });

  it('does not error on close after a response that ended cleanly (END_STREAM received)', () => {
    const t = createHttp2Transport({});
    t.request(OPTS, () => {});
    stream.emit('response', { ':status': 200 });
    const onError = jest.fn();
    stream.on('error', onError);
    stream.emit('end'); // clean end of body
    stream.emit('close');
    expect(onError).not.toHaveBeenCalled();
  });

  it('errors a truncated response (close after headers, before END_STREAM)', () => {
    // The server destroyed the session mid-body: headers arrived but the body never ended.
    const t = createHttp2Transport({});
    t.request(OPTS, () => {});
    stream.emit('response', { ':status': 200 });
    const onError = jest.fn();
    stream.on('error', onError);
    stream.emit('close'); // no 'end' first
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0][0];
    expect(err.code).toBe('ERR_HTTP2_RESPONSE_TRUNCATED');
    expect(err.message).toContain('truncated');
  });

  it('does not double-emit when a real error fires before close', () => {
    const t = createHttp2Transport({});
    t.request(OPTS, () => {});
    stream.emit('error', new Error('boom')); // transport's once-listener marks settled
    const onError = jest.fn();
    stream.on('error', onError);
    stream.emit('close');
    expect(onError).not.toHaveBeenCalled();
  });

  it('destroys a handed-off socket when the pool reuses an existing session', () => {
    const sock = { destroy: jest.fn() };
    mockAcquire.mockReturnValue({ pooled: { request: jest.fn(() => stream) }, reused: true });
    createHttp2Transport({ socket: sock as any }).request(OPTS, () => {});
    expect(sock.destroy).toHaveBeenCalled();
  });

  it('keeps the handed-off socket on a fresh session (miss)', () => {
    const sock = { destroy: jest.fn() };
    mockAcquire.mockReturnValue({ pooled: { request: jest.fn(() => stream) }, reused: false });
    createHttp2Transport({ socket: sock as any }).request(OPTS, () => {});
    expect(sock.destroy).not.toHaveBeenCalled();
  });

  it('defaults method to GET and path to /', () => {
    const t = createHttp2Transport({});
    t.request({ protocol: 'https:', hostname: 'h' } as any, () => {});
    const h2 = mockAcquire.mock.results[0].value.pooled.request.mock.calls[0][0];
    expect(h2[':method']).toBe('GET');
    expect(h2[':path']).toBe('/');
  });
});
