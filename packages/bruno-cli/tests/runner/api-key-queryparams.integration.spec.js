const { describe, it, expect, beforeEach } = require('@jest/globals');
const path = require('path');

jest.mock('../../src/utils/axios-instance', () => ({
  makeAxiosInstance: jest.fn()
}));

const { makeAxiosInstance } = require('../../src/utils/axios-instance');
const { runSingleRequest } = require('../../src/runner/run-single-request');

const collectionPath = path.join(path.sep, 'test-collection');
const requestPath = path.join(collectionPath, 'request.bru');

describe('runSingleRequest: inherited API key query parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('interpolates a variable URL and inherited API key before sending the request', async () => {
    const item = {
      type: 'http-request',
      name: 'Request',
      pathname: requestPath,
      request: {
        method: 'GET',
        url: '{{baseUrl}}/echo',
        headers: [],
        params: [],
        body: { mode: 'none' },
        auth: { mode: 'inherit' },
        script: {},
        vars: {}
      }
    };
    const collection = {
      pathname: collectionPath,
      root: {
        request: {
          auth: {
            mode: 'apikey',
            apikey: {
              key: 'x-api-key',
              value: '{{apiKey}}',
              placement: 'queryparams'
            }
          }
        }
      },
      items: [item]
    };
    const axiosRequest = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { get: () => null, delete: jest.fn() },
      data: '{}',
      request: {
        protocol: 'https:',
        host: 'example.com',
        path: '/echo?x-api-key=secret'
      }
    });
    makeAxiosInstance.mockReturnValue(axiosRequest);

    const result = await runSingleRequest(
      item,
      collectionPath,
      {},
      { baseUrl: 'https://example.com', apiKey: 'secret' },
      {},
      {},
      {},
      'vm2',
      collection,
      jest.fn(),
      {}
    );

    expect(result.status).toBe('pass');
    expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/echo?x-api-key=secret'
    }));
  });

  it('interpolates a request-level API key before sending the request', async () => {
    const item = {
      type: 'http-request',
      name: 'Request',
      pathname: requestPath,
      request: {
        method: 'GET',
        url: '{{baseUrl}}/echo',
        headers: [],
        params: [],
        body: { mode: 'none' },
        auth: {
          mode: 'apikey',
          apikey: {
            key: 'x-api-key',
            value: '{{apiKey}}',
            placement: 'queryparams'
          }
        },
        script: {},
        vars: {}
      }
    };
    const collection = {
      pathname: collectionPath,
      root: { request: { auth: { mode: 'none' } } },
      items: [item]
    };
    const axiosRequest = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { get: () => null, delete: jest.fn() },
      data: '{}',
      request: {
        protocol: 'https:',
        host: 'example.com',
        path: '/echo?x-api-key=secret'
      }
    });
    makeAxiosInstance.mockReturnValue(axiosRequest);

    const result = await runSingleRequest(
      item,
      collectionPath,
      {},
      { baseUrl: 'https://example.com', apiKey: 'secret' },
      {},
      {},
      'vm2',
      collection,
      jest.fn(),
      {}
    );

    expect(result.status).toBe('pass');
    expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/echo?x-api-key=secret'
    }));
  });
});
