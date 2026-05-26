const mockRequest = jest.fn();

jest.mock('../src/ipc/network/cert-utils', () => ({
  getCertsAndProxyConfig: jest.fn(async () => ({
    proxyMode: 'off',
    proxyConfig: {},
    httpsAgentRequestFields: {},
    interpolationOptions: {}
  }))
}));

jest.mock('../src/ipc/network/axios-instance', () => ({
  makeAxiosInstance: jest.fn(() => ({
    request: mockRequest
  }))
}));

const { proxySwaggerFetch } = require('../src/ipc/swagger-fetch');

describe('proxySwaggerFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns base64-encoded body for 2xx response', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('{"ok":true}')
    });

    const result = await proxySwaggerFetch({
      url: 'https://example.com/x',
      method: 'GET',
      headers: { Accept: 'application/json' },
      body: undefined
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.headers['content-type']).toBe('application/json');
    expect(Buffer.from(result.bodyBase64, 'base64').toString()).toBe('{"ok":true}');
  });

  test('surfaces non-2xx status without throwing', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      data: Buffer.from('not here')
    });

    const result = await proxySwaggerFetch({
      url: 'https://example.com/x',
      method: 'GET',
      headers: {},
      body: undefined
    });

    expect(result.status).toBe(404);
    expect(result.error).toBeUndefined();
  });

  test('returns error shape with code on network failure', async () => {
    const err = new Error('getaddrinfo ENOTFOUND nope.invalid');
    err.code = 'ENOTFOUND';
    mockRequest.mockRejectedValueOnce(err);

    const result = await proxySwaggerFetch({
      url: 'https://nope.invalid/',
      method: 'GET',
      headers: {},
      body: undefined
    });

    expect(result.error).toBe(true);
    expect(result.code).toBe('ENOTFOUND');
    expect(result.message).toMatch(/ENOTFOUND/);
  });

  test('returns error shape on TLS failure', async () => {
    const err = new Error('certificate has expired');
    err.code = 'CERT_HAS_EXPIRED';
    mockRequest.mockRejectedValueOnce(err);

    const result = await proxySwaggerFetch({
      url: 'https://expired.example.com/',
      method: 'GET',
      headers: {},
      body: undefined
    });

    expect(result.error).toBe(true);
    expect(result.code).toBe('CERT_HAS_EXPIRED');
  });

  test('forwards method, headers, and body to axios', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 201,
      statusText: 'Created',
      headers: {},
      data: Buffer.from('')
    });

    await proxySwaggerFetch({
      url: 'https://example.com/pet',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"doggie"}'
    });

    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/pet',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{"name":"doggie"}',
      responseType: 'arraybuffer',
      validateStatus: expect.any(Function)
    }));
    const call = mockRequest.mock.calls[0][0];
    expect(call.validateStatus(599)).toBe(true);
  });
});
