import sendRequest, { createSendRequest } from './send-request';
import { makeAxiosInstance } from '../network';
import { getHttpHttpsAgents } from '../utils/http-https-agents';
import cookiesModule from '../cookies';

jest.mock('../network', () => ({
  makeAxiosInstance: jest.fn()
}));

jest.mock('../utils/http-https-agents', () => ({
  getHttpHttpsAgents: jest.fn()
}));

jest.mock('../cookies', () => ({
  __esModule: true,
  default: {
    getCookieStringForUrl: jest.fn(),
    saveCookies: jest.fn()
  }
}));

const mockMakeAxiosInstance = makeAxiosInstance as jest.Mock;
const mockGetHttpHttpsAgents = getHttpHttpsAgents as jest.Mock;
const mockGetCookieStringForUrl = cookiesModule.getCookieStringForUrl as jest.Mock;
const mockSaveCookies = cookiesModule.saveCookies as jest.Mock;

// Builds a mock axios instance that captures interceptor handlers so tests
// can invoke them directly to verify cookie jar behaviour.
function makeMockAxios() {
  let requestHandler: ((cfg: any) => any) | undefined;
  let responseHandler: ((res: any) => any) | undefined;
  let responseErrorHandler: ((err: any) => Promise<any>) | undefined;

  const mockAxios = jest.fn() as jest.Mock & {
    interceptors: { request: { use: jest.Mock }; response: { use: jest.Mock } };
    _invokeRequestInterceptor: (cfg: any) => Promise<any>;
    _invokeResponseInterceptor: (res: any) => any;
    _invokeResponseErrorInterceptor: (err: any) => Promise<any>;
  };

  mockAxios.interceptors = {
    request: { use: jest.fn((h: any) => { requestHandler = h; }) },
    response: { use: jest.fn((ok: any, err: any) => { responseHandler = ok; responseErrorHandler = err; }) }
  };
  mockAxios._invokeRequestInterceptor  = (cfg: any) => requestHandler ? Promise.resolve(requestHandler(cfg)) : Promise.resolve(cfg);
  mockAxios._invokeResponseInterceptor = (res: any) => responseHandler ? responseHandler(res) : res;
  mockAxios._invokeResponseErrorInterceptor = (err: any) => responseErrorHandler ? responseErrorHandler(err) : Promise.reject(err);
  return mockAxios;
}

describe('sendRequest', () => {
  let mockAxios: ReturnType<typeof makeMockAxios>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCookieStringForUrl.mockReturnValue('');
    mockSaveCookies.mockReset();
    mockAxios = makeMockAxios();
    mockMakeAxiosInstance.mockReturnValue(mockAxios);
    mockGetHttpHttpsAgents.mockResolvedValue({ httpAgent: null, httpsAgent: null });
  });

  describe('without callback', () => {
    test('should return response directly', async () => {
      const mockResponse = { data: 'test', status: 200 };
      mockAxios.mockResolvedValue(mockResponse);

      const result = await sendRequest({ url: 'http://example.com' });

      expect(result).toBe(mockResponse);
    });

    test('should reject on request error', async () => {
      const error = new Error('Network error');
      mockAxios.mockRejectedValue(error);

      await expect(sendRequest({ url: 'http://example.com' })).rejects.toThrow('Network error');
    });

    test('should handle URL string instead of config object', async () => {
      const mockResponse = { data: 'pong', status: 200 };
      mockAxios.mockResolvedValue(mockResponse);

      const result = await sendRequest('http://example.com/ping');

      expect(result).toBe(mockResponse);
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://example.com/ping'
        })
      );
    });
  });

  describe('with callback', () => {
    test('should call callback with response and return response', async () => {
      const mockResponse = { data: 'test', status: 200 };
      mockAxios.mockResolvedValue(mockResponse);
      const callback = jest.fn();

      const result = await sendRequest({ url: 'http://example.com' }, callback);

      expect(callback).toHaveBeenCalledWith(null, mockResponse);
      expect(result).toBe(mockResponse);
    });

    test('should call callback with error on request failure', async () => {
      const error = new Error('Network error');
      mockAxios.mockRejectedValue(error);
      const callback = jest.fn();

      await sendRequest({ url: 'http://example.com' }, callback);

      expect(callback).toHaveBeenCalledWith(error, null);
    });

    test('should reject if callback throws on success', async () => {
      const mockResponse = { data: 'test', status: 200 };
      mockAxios.mockResolvedValue(mockResponse);
      const callbackError = new Error('Callback error');
      const callback = jest.fn().mockRejectedValue(callbackError);

      await expect(sendRequest({ url: 'http://example.com' }, callback)).rejects.toThrow(
        'Callback error'
      );
    });

    test('should reject if callback throws on error', async () => {
      const requestError = new Error('Network error');
      mockAxios.mockRejectedValue(requestError);
      const callbackError = new Error('Callback error');
      const callback = jest.fn().mockRejectedValue(callbackError);

      await expect(sendRequest({ url: 'http://example.com' }, callback)).rejects.toThrow(
        'Callback error'
      );
    });
  });

  describe('cookie jar integration', () => {
    function fakeHeaders(initial: Record<string, string> = {}) {
      const store: Record<string, string | null> = { ...initial };
      return {
        get: (n: string) => store[n.toLowerCase()] ?? null,
        set: (n: string, v: string | null) => { store[n.toLowerCase()] = v; },
        _store: store
      };
    }

    test('request interceptor injects stored cookies into Cookie header', async () => {
      mockGetCookieStringForUrl.mockReturnValue('session=abc123; user=alice');
      mockAxios.mockResolvedValue({ data: 'ok', status: 200 });

      await sendRequest({ url: 'https://api.example.com/data' });

      expect(mockAxios.interceptors.request.use).toHaveBeenCalled();

      const hdrs = fakeHeaders();
      const result = await mockAxios._invokeRequestInterceptor({
        url: 'https://api.example.com/data',
        headers: hdrs
      });

      expect(mockGetCookieStringForUrl).toHaveBeenCalledWith('https://api.example.com/data');
      expect(result.headers.get('cookie')).toBe('session=abc123; user=alice');
    });

    test('request interceptor merges with cookies already on the request', async () => {
      mockGetCookieStringForUrl.mockReturnValue('csrf=token99');
      mockAxios.mockResolvedValue({ data: 'ok' });

      await sendRequest({ url: 'https://api.example.com/submit' });

      const hdrs = fakeHeaders({ cookie: 'existing=value' });
      const result = await mockAxios._invokeRequestInterceptor({
        url: 'https://api.example.com/submit',
        headers: hdrs
      });

      expect(result.headers.get('cookie')).toBe('existing=value; csrf=token99');
    });

    test('request interceptor does nothing when jar has no cookies for URL', async () => {
      mockGetCookieStringForUrl.mockReturnValue('');
      mockAxios.mockResolvedValue({ data: 'ok' });

      await sendRequest({ url: 'https://api.example.com/public' });

      const hdrs = fakeHeaders();
      const result = await mockAxios._invokeRequestInterceptor({
        url: 'https://api.example.com/public',
        headers: hdrs
      });

      expect(result.headers.get('cookie')).toBeNull();
    });

    test('response interceptor saves Set-Cookie headers on success', async () => {
      mockAxios.mockResolvedValue({ data: 'ok' });
      await sendRequest({ url: 'https://api.example.com/login' });

      const fakeResponse = {
        config: { url: 'https://api.example.com/login' },
        headers: { 'set-cookie': ['CSRF-TOKEN=xyz; Path=/'] },
        data: 'ok', status: 200
      };

      mockAxios._invokeResponseInterceptor(fakeResponse);

      expect(mockSaveCookies).toHaveBeenCalledWith(
        'https://api.example.com/login',
        fakeResponse.headers
      );
    });

    test('response interceptor saves Set-Cookie headers on HTTP error responses', async () => {
      const axiosError = {
        config: { url: 'https://api.example.com/csrf' },
        response: { status: 403, headers: { 'set-cookie': ['CSRF-TOKEN=fresh; Path=/'] } }
      };
      mockAxios.mockRejectedValue(axiosError);
      await sendRequest({ url: 'https://api.example.com/csrf' }).catch(() => {});

      await mockAxios._invokeResponseErrorInterceptor(axiosError).catch(() => {});

      expect(mockSaveCookies).toHaveBeenCalledWith(
        'https://api.example.com/csrf',
        axiosError.response.headers
      );
    });

    test('full CSRF flow: sendRequest saves cookie, main request reads it', async () => {
      mockAxios.mockResolvedValue({ data: '', status: 200 });
      await sendRequest('https://app.example.com/driver_api');

      mockAxios._invokeResponseInterceptor({
        config: { url: 'https://app.example.com/driver_api' },
        headers: { 'set-cookie': ['CSRF-TOKEN=secret42; Path=/'] },
        data: '', status: 200
      });

      expect(mockSaveCookies).toHaveBeenCalled();

      mockGetCookieStringForUrl.mockReturnValue('CSRF-TOKEN=secret42');
      const hdrs = fakeHeaders();
      const result = await mockAxios._invokeRequestInterceptor({
        url: 'https://app.example.com/driver_api',
        headers: hdrs
      });

      expect(result.headers.get('cookie')).toBe('CSRF-TOKEN=secret42');
    });

    test('interceptor error is swallowed and request still proceeds', async () => {
      mockGetCookieStringForUrl.mockImplementation(() => { throw new Error('jar exploded'); });
      mockAxios.mockResolvedValue({ data: 'ok', status: 200 });

      await expect(sendRequest({ url: 'https://api.example.com' })).resolves.toBeDefined();
    });
  });
});

describe('createSendRequest', () => {
  let mockAxios: ReturnType<typeof makeMockAxios>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCookieStringForUrl.mockReturnValue('');
    mockSaveCookies.mockReset();
    mockAxios = makeMockAxios();
    mockMakeAxiosInstance.mockReturnValue(mockAxios);
  });

  test('should apply agents from config', async () => {
    const mockHttpAgent = { name: 'httpAgent' };
    const mockHttpsAgent = { name: 'httpsAgent' };
    mockGetHttpHttpsAgents.mockResolvedValue({
      httpAgent: mockHttpAgent,
      httpsAgent: mockHttpsAgent
    });
    const mockResponse = { data: 'test' };
    mockAxios.mockResolvedValue(mockResponse);

    const customSendRequest = createSendRequest({ proxyConfig: {} });
    await customSendRequest({ url: 'https://example.com' });

    expect(mockGetHttpHttpsAgents).toHaveBeenCalledWith({
      proxyConfig: {},
      requestUrl: 'https://example.com'
    });
    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        httpAgent: mockHttpAgent,
        httpsAgent: mockHttpsAgent
      })
    );
  });

  test('should not override agents if already set in requestConfig', async () => {
    const configHttpAgent = { name: 'configAgent' };
    const configHttpsAgent = { name: 'configHttpsAgent' };
    mockGetHttpHttpsAgents.mockResolvedValue({
      httpAgent: { name: 'ignored' },
      httpsAgent: { name: 'ignored' }
    });
    mockAxios.mockResolvedValue({ data: 'test' });

    const customSendRequest = createSendRequest({ proxyConfig: {} });
    await customSendRequest({
      url: 'https://example.com',
      httpAgent: configHttpAgent,
      httpsAgent: configHttpsAgent
    });

    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        httpAgent: configHttpAgent,
        httpsAgent: configHttpsAgent
      })
    );
  });

  test('should not call getHttpHttpsAgents when no config provided', async () => {
    mockAxios.mockResolvedValue({ data: 'test' });

    const customSendRequest = createSendRequest();
    await customSendRequest({ url: 'https://example.com' });

    expect(mockGetHttpHttpsAgents).not.toHaveBeenCalled();
  });

  test('should handle URL string and apply agents from config', async () => {
    const mockHttpAgent = { name: 'httpAgent' };
    const mockHttpsAgent = { name: 'httpsAgent' };
    mockGetHttpHttpsAgents.mockResolvedValue({
      httpAgent: mockHttpAgent,
      httpsAgent: mockHttpsAgent
    });
    const mockResponse = { data: 'pong' };
    mockAxios.mockResolvedValue(mockResponse);

    const customSendRequest = createSendRequest({ collectionPath: '/test' });
    const result = await customSendRequest('https://example.com/ping');

    expect(result).toBe(mockResponse);
    expect(mockGetHttpHttpsAgents).toHaveBeenCalledWith({
      collectionPath: '/test',
      requestUrl: 'https://example.com/ping'
    });
    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/ping',
        httpAgent: mockHttpAgent,
        httpsAgent: mockHttpsAgent
      })
    );
  });

  test('cookie interceptors are attached when createSendRequest is used', async () => {
    mockGetHttpHttpsAgents.mockResolvedValue({ httpAgent: null, httpsAgent: null });
    mockAxios.mockResolvedValue({ data: 'ok' });

    const customSendRequest = createSendRequest({ collectionPath: '/test' });
    await customSendRequest({ url: 'https://example.com' });

    expect(mockAxios.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxios.interceptors.response.use).toHaveBeenCalled();
  });
});
