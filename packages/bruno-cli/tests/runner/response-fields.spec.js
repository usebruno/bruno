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
  applySentHeadersToRequest: jest.fn(),
  getHttpHttpsAgents: jest.fn(() => ({})),
  makeAxiosInstance: jest.fn(),
  getCACertificates: jest.fn(() => ({ caCertificates: [] })),
  transformProxyConfig: jest.fn(() => ({})),
  getOrCreateHttpsAgent: jest.fn(() => ({})),
  getOrCreateHttpAgent: jest.fn(() => ({})),
  measureResponseTime: jest.requireActual('@usebruno/requests').measureResponseTime
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
jest.mock('@usebruno/common', () => {
  const ogCommon = jest.requireActual('@usebruno/common');
  const ogUtils = ogCommon.utils;
  return {
    shouldOmitConnection: ogCommon.shouldOmitConnection,
    refreshExplicitHeaderNames: ogCommon.refreshExplicitHeaderNames,
    utils: {
      encodeUrl: jest.fn((u) => u),
      buildFormUrlEncodedPayload: jest.fn(),
      extractPromptVariables: mockExtractPromptVariables,
      isFormData: jest.fn(() => false),
      hasExplicitScheme: ogUtils.hasExplicitScheme
    }
  };
});

const { ScriptRuntime } = require('@usebruno/js');
const { makeAxiosInstance } = require('../../src/utils/axios-instance');
const prepareRequest = require('../../src/runner/prepare-request');
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
    expect(result.response.status).toBe('skipped');
    expect(result.response.duration).toBe(0);
    expect(result.response.size).toBe(0);
    expect(result.response.responseTime).toBe(0);
    expect(typeof result.response.duration).toBe('number');
    expect(typeof result.response.size).toBe('number');
  });

  it('should return "skipped" as the response status when a pre-request script skips the request', async () => {
    prepareRequest.mockResolvedValue({
      method: 'GET',
      url: 'http://example.com/api/test',
      headers: {},
      data: null,
      script: { req: 'bru.runner.skipRequest();' }
    });
    ScriptRuntime.mockImplementation(() => ({
      runRequestScript: jest.fn().mockResolvedValue({ skipRequest: true, results: [] })
    }));

    const result = await runSingleRequest(...baseArgs);

    expect(result.status).toBe('skipped');
    expect(result.skipped).toBe(true);
    expect(result.response.status).toBe('skipped');
    expect(result.response.statusText).toBe('request skipped via pre-request script');
  });

  describe('with a response received', () => {
    const ELAPSED_MS = 253;

    beforeEach(() => {
      prepareRequest.mockResolvedValue({
        method: 'GET',
        url: 'http://example.com/api',
        headers: {},
        data: null,
        settings: {}
      });
    });

    const buildResponse = (status, statusText) => ({
      status,
      statusText,
      headers: { get: () => null },
      data: JSON.stringify({ message: statusText }),
      config: { metadata: { completedHopsTime: ELAPSED_MS } },
      request: { protocol: 'http:', host: 'example.com', path: '/api' }
    });

    it('should return numeric duration and size on successful request', async () => {
      makeAxiosInstance.mockReturnValue(jest.fn().mockResolvedValue(buildResponse(200, 'OK')));

      const result = await runSingleRequest(...baseArgs);

      expect(result.status).toBe('pass');
      expect(result.response.responseTime).toBe(ELAPSED_MS);
      expect(result.response.duration).toBe(ELAPSED_MS);
      expect(typeof result.response.size).toBe('number');
      expect(result.response.size).toBeGreaterThan(0);
    });

    it('should return numeric duration and size on a 4xx/5xx error response', async () => {
      const error = Object.assign(new Error('Request failed with status code 500'), {
        response: buildResponse(500, 'Internal Server Error')
      });
      makeAxiosInstance.mockReturnValue(jest.fn().mockRejectedValue(error));

      const result = await runSingleRequest(...baseArgs);

      expect(result.response.status).toBe(500);
      expect(result.response.responseTime).toBe(ELAPSED_MS);
      expect(result.response.duration).toBe(ELAPSED_MS);
      expect(typeof result.response.size).toBe('number');
      expect(result.response.size).toBeGreaterThan(0);
    });
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
