// Network behavior of sendRequest lives in send-request.spec.ts.
import { createSendRequest, buildScriptedEntry } from './send-request';

jest.mock('../network', () => ({
  makeAxiosInstance: jest.fn()
}));

jest.mock('../utils/http-https-agents', () => ({
  getHttpHttpsAgents: jest.fn()
}));

import { makeAxiosInstance } from '../network';
import { getHttpHttpsAgents } from '../utils/http-https-agents';

const mockMakeAxiosInstance = makeAxiosInstance as jest.Mock;
const mockGetHttpHttpsAgents = getHttpHttpsAgents as jest.Mock;

describe('buildScriptedEntry', () => {
  test('normalizes method to upper case and preserves request fields', () => {
    const entry = buildScriptedEntry({
      request: { method: 'get', url: 'https://example.com', headers: { 'x-a': '1' }, data: undefined },
      response: null,
      error: null,
      startedAt: 1000,
      completedAt: 1042
    });

    expect(entry.request.method).toBe('GET');
    expect(entry.request.url).toBe('https://example.com');
    expect(entry.request.headers).toEqual({ 'x-a': '1' });
    expect(entry.response).toBeNull();
    expect(entry.error).toBeNull();
    expect(entry.startedAt).toBe(1000);
    expect(entry.completedAt).toBe(1042);
  });

  test('defaults method to GET when not provided', () => {
    const entry = buildScriptedEntry({
      request: { url: 'https://example.com' },
      response: null,
      error: null,
      startedAt: 0,
      completedAt: 0
    });
    expect(entry.request.method).toBe('GET');
  });

  test('flattens AxiosHeaders-like objects via toJSON for both request and response', () => {
    const headersLike = {
      toJSON: () => ({ 'content-type': 'application/json', 'x-trace': 'abc' })
    };

    const entry = buildScriptedEntry({
      request: { method: 'post', url: 'https://example.com', headers: headersLike, data: { hi: 1 } },
      response: { status: 200, statusText: 'OK', headers: headersLike, data: { ok: true } },
      error: null,
      startedAt: 0,
      completedAt: 10
    });

    expect(entry.request.headers).toEqual({ 'content-type': 'application/json', 'x-trace': 'abc' });
    expect(entry.response?.headers).toEqual({ 'content-type': 'application/json', 'x-trace': 'abc' });
  });

  test('encodes string body to base64 dataBuffer and derives size/duration when not supplied', () => {
    const entry = buildScriptedEntry({
      request: { method: 'GET', url: 'https://example.com' },
      response: { status: 200, statusText: 'OK', headers: {}, data: 'hello' },
      error: null,
      startedAt: 5,
      completedAt: 15
    });

    expect(entry.response?.dataBuffer).toBe(Buffer.from('hello').toString('base64'));
    expect(entry.response?.size).toBe(Buffer.from('hello').length);
    expect(entry.response?.duration).toBe(10);
  });

  test('JSON-stringifies object body for dataBuffer when not provided', () => {
    const body = { foo: 'bar' };
    const entry = buildScriptedEntry({
      request: { method: 'GET', url: 'https://example.com' },
      response: { status: 201, statusText: 'Created', headers: {}, data: body },
      error: null,
      startedAt: 0,
      completedAt: 0
    });

    expect(entry.response?.dataBuffer).toBe(Buffer.from(JSON.stringify(body)).toString('base64'));
  });

  test('honors explicit dataBuffer / size / duration on response', () => {
    const explicitBuffer = Buffer.from('payload').toString('base64');
    const entry = buildScriptedEntry({
      request: { method: 'GET', url: 'https://example.com' },
      response: {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'ignored-for-size',
        dataBuffer: explicitBuffer,
        size: 999,
        duration: 123
      },
      error: null,
      startedAt: 0,
      completedAt: 50
    });

    expect(entry.response?.dataBuffer).toBe(explicitBuffer);
    expect(entry.response?.size).toBe(999);
    expect(entry.response?.duration).toBe(123);
  });

  test('maps error to { message, code } and leaves response null when absent', () => {
    const err = Object.assign(new Error('boom'), { code: 'ECONNREFUSED' });

    const entry = buildScriptedEntry({
      request: { method: 'GET', url: 'https://example.com' },
      response: null,
      error: err,
      startedAt: 0,
      completedAt: 0
    });

    expect(entry.response).toBeNull();
    expect(entry.error).toEqual({ message: 'boom', code: 'ECONNREFUSED' });
  });
});

describe('createSendRequest onComplete', () => {
  let mockAxios: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = jest.fn();
    mockMakeAxiosInstance.mockReturnValue(mockAxios);
    mockGetHttpHttpsAgents.mockResolvedValue({ httpAgent: null, httpsAgent: null });
  });

  test('fires once with the entry on a successful no-callback call', async () => {
    mockAxios.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/plain' },
      data: 'pong'
    });
    const onComplete = jest.fn();
    const send = createSendRequest(undefined, { onComplete });

    await send({ method: 'get', url: 'https://example.com/ping' });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const entry = onComplete.mock.calls[0][0];
    expect(entry.request).toEqual(
      expect.objectContaining({ method: 'GET', url: 'https://example.com/ping' })
    );
    expect(entry.response).toEqual(
      expect.objectContaining({
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' }
      })
    );
    expect(entry.error).toBeNull();
  });

  test('records the response carried by a 4xx/5xx axios error', async () => {
    const axiosError: any = new Error('Request failed with status code 404');
    axiosError.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      data: 'missing'
    };
    mockAxios.mockRejectedValue(axiosError);
    const onComplete = jest.fn();
    const send = createSendRequest(undefined, { onComplete });

    await expect(send({ url: 'https://example.com/missing' })).rejects.toBe(axiosError);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const entry = onComplete.mock.calls[0][0];
    expect(entry.response).toEqual(
      expect.objectContaining({ statusCode: 404, statusText: 'Not Found' })
    );
    expect(entry.error?.message).toContain('404');
  });

  test('records error with null response on a pure network failure', async () => {
    const netErr = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    mockAxios.mockRejectedValue(netErr);
    const onComplete = jest.fn();
    const send = createSendRequest(undefined, { onComplete });

    await expect(send({ url: 'https://nope.invalid' })).rejects.toBe(netErr);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const entry = onComplete.mock.calls[0][0];
    expect(entry.response).toBeNull();
    expect(entry.error).toEqual({ message: 'ECONNREFUSED', code: 'ECONNREFUSED' });
  });

  test('fires exactly once even when a callback is provided', async () => {
    mockAxios.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: 'ok' });
    const onComplete = jest.fn();
    const callback = jest.fn();
    const send = createSendRequest(undefined, { onComplete });

    await send({ url: 'https://example.com' }, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('a throwing onComplete does not break the request result', async () => {
    const mockResponse = { status: 200, statusText: 'OK', headers: {}, data: 'ok' };
    mockAxios.mockResolvedValue(mockResponse);
    const onComplete = jest.fn(() => { throw new Error('sink blew up'); });
    const send = createSendRequest(undefined, { onComplete });

    await expect(send({ url: 'https://example.com' })).resolves.toBe(mockResponse);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('does nothing when no onComplete is provided', async () => {
    mockAxios.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: 'ok' });
    const send = createSendRequest();

    await expect(send({ url: 'https://example.com' })).resolves.toBeDefined();
  });
});
