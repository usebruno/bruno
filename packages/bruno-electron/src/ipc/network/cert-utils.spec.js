jest.mock('../../store/preferences', () => ({ preferencesUtil: {
  shouldVerifyTls: jest.fn(() => false),
  shouldUseCustomCaCertificate: jest.fn(() => false),
  getCustomCaCertificateFilePath: jest.fn(() => null),
  shouldKeepDefaultCaCertificates: jest.fn(() => true),
  isSslSessionCachingEnabled: jest.fn(() => false),
  getGlobalClientCertificates: jest.fn(() => []),
  getGlobalProxyConfig: jest.fn()
} }));
jest.mock('../../store/bruno-config', () => ({ getBrunoConfig: jest.fn() }));
jest.mock('../../store/system-proxy', () => ({ getCachedSystemProxy: jest.fn() }));
jest.mock('./interpolate-string', () => ({ interpolateString: (value) => value, interpolateObject: (value) => value }));
jest.mock('@usebruno/requests', () => ({ getCACertificates: jest.fn() }));

const { preferencesUtil } = require('../../store/preferences');
const { getBrunoConfig } = require('../../store/bruno-config');
const { getCachedSystemProxy } = require('../../store/system-proxy');
const { getCertsAndProxyConfig, buildCertsAndProxyConfig } = require('./cert-utils');

const appProxy = { source: 'manual', disabled: false, config: { protocol: 'http', hostname: 'app-proxy', port: 8080 } };
const params = (useProxy) => ({
  collectionUid: 'collection', collection: {}, collectionPath: '/collection',
  request: { url: 'https://example.com', settings: { useProxy } },
  envVars: {}, runtimeVariables: {}, processEnvVars: {}
});

beforeEach(() => {
  jest.clearAllMocks();
  getBrunoConfig.mockReturnValue({ proxy: { inherit: false, disabled: false, config: { hostname: 'collection-proxy', port: 8888 } } });
  preferencesUtil.getGlobalProxyConfig.mockReturnValue(appProxy);
  getCachedSystemProxy.mockResolvedValue({ http_proxy: 'http://system-proxy:3128' });
});

it('uses the app proxy when enabled even with a collection proxy override', async () => {
  const result = await getCertsAndProxyConfig(params(true));
  expect(result.proxyMode).toBe('on');
  expect(result.proxyConfig).toEqual(appProxy.config);
});

it('uses the app proxy when enabled even when the collection proxy is disabled', async () => {
  getBrunoConfig.mockReturnValue({ proxy: { disabled: true } });
  expect((await getCertsAndProxyConfig(params(true))).proxyMode).toBe('on');
});

it.each(['manual', 'pac', 'inherit'])('connects directly when disabled with app proxy source %s', async (source) => {
  preferencesUtil.getGlobalProxyConfig.mockReturnValue({ ...appProxy, source, pac: { source: 'https://example.com/proxy.pac' } });
  const result = await getCertsAndProxyConfig(params(false));
  expect(result.proxyMode).toBe('off');
  expect(result.proxyConfig).toEqual({});
  expect(getCachedSystemProxy).not.toHaveBeenCalled();
});

it.each([
  ['pac', 'pac'], ['inherit', 'system']
])('follows app %s configuration when enabled', async (source, expectedMode) => {
  preferencesUtil.getGlobalProxyConfig.mockReturnValue({ ...appProxy, source, pac: { source: 'https://example.com/proxy.pac' } });
  expect((await getCertsAndProxyConfig(params(true))).proxyMode).toBe(expectedMode);
});

it('connects directly when the app proxy itself is disabled', async () => {
  preferencesUtil.getGlobalProxyConfig.mockReturnValue({ ...appProxy, disabled: true });
  expect((await getCertsAndProxyConfig(params(true))).proxyMode).toBe('off');
});

it('retains collection resolution for callers without the HTTP proxy setting', async () => {
  expect((await getCertsAndProxyConfig(params(undefined))).proxyConfig.hostname).toBe('collection-proxy');
});

it('carries direct connection into bru.sendRequest configuration', async () => {
  const result = await buildCertsAndProxyConfig(params(false));
  expect(result.options.noproxy).toBe(true);
  expect(result.systemProxyConfig).toBeNull();
  expect(getCachedSystemProxy).not.toHaveBeenCalled();
});

it('carries app inheritance into bru.sendRequest configuration', async () => {
  const result = await buildCertsAndProxyConfig(params(true));
  expect(result.options.noproxy).toBe(false);
  expect(result.collectionLevelProxy).toEqual({ inherit: true });
  expect(result.appLevelProxyConfig).toEqual(appProxy);
});
