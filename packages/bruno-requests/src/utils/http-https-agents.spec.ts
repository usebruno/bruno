import { getHttpHttpsAgents } from './http-https-agents';

const BASE_OPTIONS = {
  noproxy: false,
  shouldVerifyTls: true,
  shouldUseCustomCaCertificate: false,
  shouldKeepDefaultCaCertificates: true,
  cacheSslSession: false
};

describe('getHttpHttpsAgents targetProtocols filtering', () => {
  const baseCollectionProxy = {
    disabled: false,
    inherit: false,
    config: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 8080,
      auth: { disabled: true, username: '', password: '' },
      bypassProxy: ''
    }
  };

  test('proxies both HTTP and HTTPS requests when targetProtocols is omitted', async () => {
    const httpRes = await getHttpHttpsAgents({
      requestUrl: 'http://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: baseCollectionProxy as any
    });
    const httpsRes = await getHttpHttpsAgents({
      requestUrl: 'https://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: baseCollectionProxy as any
    });

    expect((httpRes.httpAgent as any)?.proxy?.href).toBe('http://127.0.0.1:8080/');
    expect((httpsRes.httpsAgent as any)?.proxy?.href).toBe('http://127.0.0.1:8080/');
  });

  test('proxies only HTTPS requests when targetProtocols is { http: false, https: true }', async () => {
    const proxy = {
      ...baseCollectionProxy,
      config: {
        ...baseCollectionProxy.config,
        targetProtocols: { http: false, https: true }
      }
    };

    const httpTimeline: any[] = [];
    const httpRes = await getHttpHttpsAgents({
      requestUrl: 'http://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: proxy as any,
      timeline: httpTimeline
    });
    const httpsRes = await getHttpHttpsAgents({
      requestUrl: 'https://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: proxy as any
    });

    expect((httpRes.httpAgent as any)?.proxy).toBeUndefined();
    expect((httpsRes.httpsAgent as any)?.proxy?.href).toBe('http://127.0.0.1:8080/');
    expect(httpTimeline.some((entry) => entry.type === 'info' && /Proxy skipped: HTTP traffic/.test(entry.message))).toBe(true);
  });

  test('proxies only HTTP requests when targetProtocols is { http: true, https: false }', async () => {
    const proxy = {
      ...baseCollectionProxy,
      config: {
        ...baseCollectionProxy.config,
        targetProtocols: { http: true, https: false }
      }
    };

    const httpRes = await getHttpHttpsAgents({
      requestUrl: 'http://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: proxy as any
    });
    const httpsRes = await getHttpHttpsAgents({
      requestUrl: 'https://example.com/test',
      collectionPath: '',
      options: BASE_OPTIONS,
      collectionLevelProxy: proxy as any
    });

    expect((httpRes.httpAgent as any)?.proxy?.href).toBe('http://127.0.0.1:8080/');
    expect((httpsRes.httpsAgent as any)?.proxy).toBeUndefined();
  });
});
