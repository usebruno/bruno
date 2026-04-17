const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock all heavy dependencies before requiring the module
jest.mock('../../src/runner/prepare-request', () => jest.fn());
jest.mock('../../src/runner/interpolate-vars', () => jest.fn());
jest.mock('../../src/runner/interpolate-string', () => ({
  interpolateString: jest.fn((s) => s),
  interpolateObject: jest.fn((o) => o)
}));
jest.mock('@usebruno/js', () => ({
  ScriptRuntime: jest.fn(),
  TestRuntime: jest.fn(),
  VarsRuntime: jest.fn(),
  AssertRuntime: jest.fn(),
  formatErrorWithContext: jest.fn(),
  SCRIPT_TYPES: { PRE_REQUEST: 'pre-request', POST_RESPONSE: 'post-response', TEST: 'test' }
}));
jest.mock('../../src/utils/filesystem', () => ({
  stripExtension: (p) => p.replace(/\.\w+$/, ''),
  getOptions: jest.fn(() => ({}))
}));
jest.mock('../../src/utils/bru', () => ({
  getOptions: jest.fn(() => ({}))
}));
jest.mock('../../src/utils/axios-instance', () => ({
  makeAxiosInstance: jest.fn()
}));
jest.mock('../../src/runner/awsv4auth-helper', () => ({
  addAwsV4Interceptor: jest.fn(),
  resolveAwsV4Credentials: jest.fn()
}));
jest.mock('../../src/utils/proxy-util', () => ({
  shouldUseProxy: jest.fn(() => false),
  setupProxyAgents: jest.fn(),
  PatchedHttpsProxyAgent: jest.fn()
}));
jest.mock('../../src/utils/common', () => ({
  parseDataFromResponse: jest.fn((res) => ({
    data: res.data,
    dataBuffer: Buffer.from(JSON.stringify(res.data || ''))
  }))
}));
jest.mock('../../src/utils/cookies', () => ({
  getCookieStringForUrl: jest.fn(() => ''),
  saveCookies: jest.fn()
}));
jest.mock('../../src/utils/form-data', () => ({
  createFormData: jest.fn()
}));
jest.mock('@usebruno/requests', () => ({
  addDigestInterceptor: jest.fn(),
  getHttpHttpsAgents: jest.fn(() => ({})),
  makeAxiosInstance: jest.fn(),
  getCACertificates: jest.fn(() => ({ caCertificates: [] })),
  transformProxyConfig: jest.fn(() => ({})),
  getOrCreateHttpsAgent: jest.fn(() => ({})),
  getOrCreateHttpAgent: jest.fn(() => ({}))
}));
jest.mock('../../src/utils/oauth2', () => ({
  getOAuth2Token: jest.fn(),
  getFormattedOauth2Credentials: jest.fn()
}));
jest.mock('../../src/store/tokenStore', () => ({
  getAll: jest.fn(() => ({})),
  put: jest.fn(),
  clearAll: jest.fn()
}));

// Default: no prompt variables detected
const mockExtractPromptVariables = jest.fn(() => []);
jest.mock('@usebruno/common', () => ({
  utils: {
    encodeUrl: jest.fn((u) => u),
    buildFormUrlEncodedPayload: jest.fn(),
    extractPromptVariables: mockExtractPromptVariables,
    isFormData: jest.fn(() => false)
  }
}));

const prepareRequest = require('../../src/runner/prepare-request');
const { makeAxiosInstance } = require('../../src/utils/axios-instance');
const { runSingleRequest } = require('../../src/runner/run-single-request');

const baseItem = {
  pathname: '/test-collection/request.bru',
  request: {
    method: 'GET',
    url: 'http://example.com/api',
    headers: [],
    body: { mode: 'none' },
    auth: { mode: 'none' },
    vars: {},
    script: {},
    tests: ''
  }
};

const baseArgs = [
  baseItem, // item
  '/test-collection', // collectionPath
  {}, // runtimeVariables
  {}, // envVariables
  {}, // processEnvVars
  {}, // brunoConfig
  {}, // collectionRoot
  'vm2', // runtime
  { items: [], pathname: '/test-collection' }, // collection
  jest.fn(), // runSingleRequestByPathname
  {} // globalEnvVars
];

describe('runSingleRequest: duration and size fields (issue #7352)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return duration=0 and size=0 when request is skipped due to prompt variables', async () => {
    prepareRequest.mockResolvedValue({
      method: 'GET',
      url: 'http://example.com/api/test',
      headers: {},
      data: null
    });
    // Simulate prompt variable detection
    mockExtractPromptVariables.mockReturnValueOnce(['prompt_var']);

    const result = await runSingleRequest(...baseArgs);

    expect(result.status).toBe('skipped');
    expect(result.response.duration).toBe(0);
    expect(result.response.size).toBe(0);
    expect(result.response.responseTime).toBe(0);
    expect(typeof result.response.duration).toBe('number');
    expect(typeof result.response.size).toBe('number');
  });

  it('should return numeric duration and size on successful request', async () => {
    const responseBody = JSON.stringify({ message: 'ok' });
    const mockHeaders = new Map([['request-duration', '253']]);
    mockHeaders.delete = function (key) { this.delete(key); };
    // Use a plain object with get/delete to simulate axios headers
    const headers = {
      get: (key) => key === 'request-duration' ? '253' : null,
      delete: jest.fn()
    };

    prepareRequest.mockResolvedValue({
      method: 'GET',
      url: 'http://example.com/api',
      headers: {},
      data: null,
      settings: {}
    });

    const mockAxios = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers,
      data: responseBody,
      request: { protocol: 'http:', host: 'example.com', path: '/api' }
    });
    makeAxiosInstance.mockReturnValue(mockAxios);

    const result = await runSingleRequest(...baseArgs);

    expect(result.status).toBe('pass');
    expect(result.response.responseTime).toBe(253);
    expect(result.response.duration).toBe(253);
    expect(typeof result.response.duration).toBe('number');
    expect(typeof result.response.size).toBe('number');
    expect(result.response.size).toBeGreaterThan(0);
  });

  it('should return duration=0 and size=0 on network error', async () => {
    prepareRequest.mockResolvedValue({
      method: 'GET',
      url: 'http://example.com/api',
      headers: {},
      data: null,
      settings: {}
    });

    const mockAxios = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    makeAxiosInstance.mockReturnValue(mockAxios);

    const result = await runSingleRequest(...baseArgs);

    expect(result.status).toBe('error');
    expect(result.response.duration).toBe(0);
    expect(result.response.size).toBe(0);
    expect(result.response.responseTime).toBe(0);
  });
});
