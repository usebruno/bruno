import { EventEmitter } from 'node:events';
import {
  isProxyAgent,
  proxyKeyFor,
  redactProxyUri,
  buildProxyTlsOptions,
  connectThroughProxy
} from '../proxy-tunnel';

describe('isProxyAgent / proxyKeyFor', () => {
  it('recognises a proxy agent only when it has connect() and a proxy descriptor', () => {
    expect(isProxyAgent(null)).toBe(false);
    expect(isProxyAgent({ connect: () => {} })).toBe(false);
    expect(isProxyAgent({ proxy: {} })).toBe(false);
    expect(isProxyAgent({ connect: () => {}, proxy: { href: 'http://p:8080' } })).toBe(true);
  });

  it('keys an HTTP proxy by href and a SOCKS proxy by type/host/port', () => {
    expect(proxyKeyFor({ connect: () => {}, proxy: { href: 'http://p:8080' } })).toBe('http://p:8080');
    expect(proxyKeyFor({ connect: () => {}, proxy: { type: 5, host: 's', port: 1080 } })).toBe('socks5://s:1080');
    expect(proxyKeyFor(null)).toBeNull();
    expect(proxyKeyFor({ connect: () => {} })).toBeNull();
  });
});

describe('redactProxyUri', () => {
  it('masks any user:password@ in the URI and leaves credential-free URIs untouched', () => {
    expect(redactProxyUri('http://user:secret@proxy:8080')).toBe('http://***@proxy:8080');
    expect(redactProxyUri('http://proxy:8080')).toBe('http://proxy:8080');
    expect(redactProxyUri(null)).toBeNull();
  });
});

describe('buildProxyTlsOptions', () => {
  it('sets host/servername/ALPN and strips agent-only fields', () => {
    const options = buildProxyTlsOptions({
      hostname: 'api.test',
      port: 443,
      tlsOptions: { keepAlive: true, proxy: {}, lookup: () => {}, ca: 'CA', rejectUnauthorized: true } as any,
      alpnProtocols: ['h2']
    });
    expect(options.host).toBe('api.test');
    expect(options.servername).toBe('api.test');
    expect(options.ALPNProtocols).toEqual(['h2']);
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.keepAlive).toBeUndefined();
    expect(options.proxy).toBeUndefined();
    expect(options.lookup).toBeUndefined();
  });

  it('honours rejectUnauthorized:false', () => {
    const options = buildProxyTlsOptions({ hostname: 'h', port: 443, tlsOptions: { rejectUnauthorized: false } as any });
    expect(options.rejectUnauthorized).toBe(false);
  });
});

describe('connectThroughProxy', () => {
  const makeSocket = (over: any = {}) =>
    Object.assign(new EventEmitter(), {
      encrypted: true,
      alpnProtocol: 'h2',
      getProtocol: () => 'TLSv1.3',
      destroy: jest.fn(),
      ...over
    });

  it('resolves with the negotiated ALPN once the socket is ready', async () => {
    const socket = makeSocket();
    const agent = { connect: jest.fn(async () => socket) };
    const result = await connectThroughProxy({ agent: agent as any, hostname: 'api.test', port: 443, alpnProtocols: ['h2'] });
    expect(result.alpn).toBe('h2');
    expect(result.protocol).toBe('TLSv1.3');
    expect(result.socket).toBe(socket);
  });

  it('rejects when the proxy returns a non-encrypted (refused) socket', async () => {
    const socket = makeSocket({ encrypted: false });
    const agent = { connect: jest.fn(async () => socket) };
    await expect(
      connectThroughProxy({ agent: agent as any, hostname: 'api.test', port: 443 })
    ).rejects.toMatchObject({ code: 'EPROXYREFUSED' });
  });

  it('waits for secureConnect when ALPN is not yet available', async () => {
    const socket = makeSocket({ alpnProtocol: '', authorized: false, authorizationError: undefined });
    const agent = { connect: jest.fn(async () => socket) };
    const p = connectThroughProxy({ agent: agent as any, hostname: 'api.test', port: 443, alpnProtocols: ['h2'] });
    // Not settled yet; simulate the handshake completing.
    socket.alpnProtocol = 'h2';
    socket.emit('secureConnect');
    const result = await p;
    expect(result.alpn).toBe('h2');
  });

  it('times out a stalled tunnel', async () => {
    const socket = makeSocket({ alpnProtocol: '', authorized: false, authorizationError: undefined });
    const agent = { connect: jest.fn(async () => socket) };
    await expect(
      connectThroughProxy({ agent: agent as any, hostname: 'api.test', port: 443, timeoutMs: 20 })
    ).rejects.toMatchObject({ code: 'ETIMEDOUT' });
  });
});
