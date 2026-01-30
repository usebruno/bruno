import sendRequest, { createSendRequest } from './send-request';

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

describe('sendRequest', () => {
  let mockAxios: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = jest.fn();
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
});

describe('createSendRequest', () => {
  let mockAxios: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = jest.fn();
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
});
