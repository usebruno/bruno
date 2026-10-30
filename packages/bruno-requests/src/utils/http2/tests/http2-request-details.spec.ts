import { getHttp2RequestDetails } from '../http2-request-details';

const makeStream = (socket: any, sentHeaders: Record<string, unknown> = {}, id = 3) => ({
  id,
  session: { socket },
  sentHeaders
});

const makeSocket = (over: any = {}) => ({
  alpnProtocol: 'h2',
  getProtocol: () => 'TLSv1.3',
  getCipher: () => ({ name: 'TLS_AES_256_GCM_SHA384' }),
  remoteAddress: '93.184.216.34',
  remotePort: 443,
  authorized: true,
  authorizationError: undefined,
  getPeerCertificate: () => ({}),
  ...over
});

describe('getHttp2RequestDetails', () => {
  it('returns null when there is no underlying socket', () => {
    expect(getHttp2RequestDetails({ session: {} })).toBeNull();
    expect(getHttp2RequestDetails(undefined)).toBeNull();
  });

  it('collects the pseudo-headers and builds the request line (regular headers come from getSentHeaders)', () => {
    const stream = makeStream(makeSocket(), {
      ':method': 'POST',
      ':path': '/x',
      ':scheme': 'https',
      ':authority': 'api.test',
      'User-Agent': 'bruno',
      'Content-Type': 'application/json'
    });

    const details = getHttp2RequestDetails(stream)!;
    expect(details.pseudoHeaders).toEqual({
      ':method': 'POST',
      ':path': '/x',
      ':scheme': 'https',
      ':authority': 'api.test'
    });
    expect(details.requestLine).toBe(':method POST · :path /x · :authority api.test · :scheme https');
  });

  it('reports the HTTP/2 stream id', () => {
    const stream = makeStream({ alpnProtocol: 'h2' }, { ':method': 'GET' }, 7);
    expect(getHttp2RequestDetails(stream)!.streamId).toBe(7);
  });

  it('returns null streamId when the stream has no id', () => {
    const stream: any = { session: { socket: { alpnProtocol: 'h2' } }, sentHeaders: {} };
    expect(getHttp2RequestDetails(stream)!.streamId).toBeNull();
  });

  it('reads alpn/protocol/cipher/remote from the socket', () => {
    const details = getHttp2RequestDetails(makeStream(makeSocket()))!;
    expect(details.alpn).toBe('h2');
    expect(details.protocol).toBe('TLSv1.3');
    expect(details.cipher).toBe('TLS_AES_256_GCM_SHA384');
    expect(details.remote).toBe('93.184.216.34:443');
  });

  it('isolates a throwing accessor so the others still resolve (#8)', () => {
    const socket = makeSocket({
      getProtocol: () => {
        throw new Error('session torn down');
      }
    });
    const details = getHttp2RequestDetails(makeStream(socket))!;
    expect(details.protocol).toBeNull(); // the thrower
    expect(details.cipher).toBe('TLS_AES_256_GCM_SHA384'); // NOT nulled out by the sibling throw
    expect(details.alpn).toBe('h2');
  });

  it('renders certificate lines ending in "verify ok" when authorized', () => {
    const socket = makeSocket({
      getPeerCertificate: () => ({
        subject: { CN: 'api.test' },
        issuer: { O: 'Test CA' },
        valid_from: 'Jan 1 2026',
        valid_to: 'Jan 1 2027',
        subjectaltname: 'DNS:api.test'
      })
    });
    const details = getHttp2RequestDetails(makeStream(socket))!;
    expect(details.certificateLines[0]).toBe('Server certificate:');
    expect(details.certificateLines).toContain(' subject: CN=api.test');
    expect(details.certificateLines).toContain(' subjectAltName: DNS:api.test');
    expect(details.certificateLines[details.certificateLines.length - 1]).toBe('SSL certificate verify ok.');
  });

  it('reports verification skipped/failed when not authorized', () => {
    const socket = makeSocket({
      authorized: false,
      authorizationError: 'SELF_SIGNED_CERT_IN_CHAIN',
      getPeerCertificate: () => ({ subject: { CN: 'api.test' }, issuer: {}, valid_from: 'x', valid_to: 'y' })
    });
    const details = getHttp2RequestDetails(makeStream(socket))!;
    expect(details.certificateLines[details.certificateLines.length - 1]).toContain('SELF_SIGNED_CERT_IN_CHAIN');
  });
});
