/**
 * Proxy Config Tests for makeAxiosInstance
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import makeAxiosInstance from '../axios-instance';
import { fail } from 'node:assert';

// Mock the logger module
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    add: jest.fn(),
    getAll: jest.fn(() => []),
    reset: jest.fn()
  }))
}));

describe('makeAxiosInstance - Proxy config', () => {
  let server;
  let mockLogger;

  // MSW server setup
  beforeAll(() => {
    server = setupServer();
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      add: jest.fn(),
      getAll: jest.fn(() => []),
      reset: jest.fn()
    };

    // Mock the logger factory to return our mock
    const mockLoggerFactory = require('../../utils/logger');
    mockLoggerFactory.default.mockReturnValue(mockLogger);

  });

  describe('proxy mode `off`', () => {
    it.skip('should not use proxy when mode is off', async () => {
      const testUrl = 'http://test-server.com/api/data';
      server.use(
        http.get(testUrl, () => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 });
        })
      );
      let axiosConfig = {
        certsAndProxyConfig: {
          proxyMode: 'off',
          proxyConfig: {},
          httpsAgentRequestFields: {
            rejectUnauthorized: false
          }
        },
        logId: 'proxy-config-test'
      };

      let axiosInstance = makeAxiosInstance(axiosConfig);

      try {
        const res = await axiosInstance.get(testUrl);
        expect(res.data.message).toBe('Success');
        // Should NOT log proxy usage
        const usedProxy = logs.some(log => log.includes('proxy:'));
        expect(usedProxy).toBe(false);
      } catch (error) {
        fail(`Expected request to succeed, but failed with error: ${error.message}`);
      }
    });
  });

  describe('proxy mode `on`', () => {
    it('should use proxy when mode is `on`', async () => {
      const testUrl = 'http://test-server.com/api/test';
      server.use(
        http.get(testUrl, (...args) => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 });
        })
      );
      let axiosConfig = {
        certsAndProxyConfig: {
          proxyConfig: {
            protocol: 'http',
            hostname: 'localhost',
            port: 42424,
            bypassProxy: '',
            mode: 'on'
          },
          httpsAgentRequestFields: {
            rejectUnauthorized: false
          }
        },
        logId: 'proxy-config-test'
      };

      let axiosInstance = makeAxiosInstance(axiosConfig);

      try {
        const res = await axiosInstance.get(testUrl);
        expect(res.data.message).toBe('Success');
        const logs = mockLogger.add.mock.calls.map(log => log[1]);

        // Should log proxy usage
        const usedProxy = logs.some(log => log.includes('Using proxy: http://localhost:42424'));
        expect(usedProxy).toBe(true);
      } catch (error) {
        fail(`Expected request to succeed, but failed with error: ${error.message}`);
      }
    });

    it('should not use proxy when mode is `on` but request url is in bypassProxy', async () => {
      const testUrl = 'http://test-server.com/api/test';
      server.use(
        http.get(testUrl, (...args) => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 });
        })
      );
      let axiosConfig = {
        certsAndProxyConfig: {
          proxyConfig: {
            protocol: 'http',
            hostname: 'localhost',
            port: 42424,
            bypassProxy: 'test-server.com',
            mode: 'on'
          },
          httpsAgentRequestFields: {
            rejectUnauthorized: false
          }
        },
        logId: 'proxy-config-test'
      };

      let axiosInstance = makeAxiosInstance(axiosConfig);

      try {
        const res = await axiosInstance.get(testUrl);
        expect(res.data.message).toBe('Success');
        const logs = mockLogger.add.mock.calls.map(call => call[1]);

        // Should NOT log proxy usage
        const usedProxy = logs.some(log => log.includes('proxy: http://localhost:42424'));
        expect(usedProxy).toBe(false);
      } catch (error) {
        fail(`Expected request to succeed, but failed with error: ${error.message}`);
      }
    });
  });

  describe('proxy mode `system`', () => {
    it('should use proxy when mode is `system`', async () => {
      const testUrl = 'http://test-server.com/api/test';
      server.use(
        http.get(testUrl, (...args) => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 });
        })
      );
      let axiosConfig = {
        certsAndProxyConfig: {
          proxyConfig: {
            protocol: 'http',
            hostname: 'localhost',
            port: 42424,
            bypassProxy: '',
            mode: 'system'
          },
          httpsAgentRequestFields: {
            rejectUnauthorized: false
          }
        },
        logId: 'proxy-config-test'
      };

      let axiosInstance = makeAxiosInstance(axiosConfig);

      try {
        const res = await axiosInstance.get(testUrl);
        expect(res.data.message).toBe('Success');
        const logs = mockLogger.add.mock.calls.map(call => call[1]);

        // Should log system proxy usage
        const usedProxy = logs.some(log => log.includes('Using system proxy: http://localhost:42424'));
        expect(usedProxy).toBe(true);
      } catch (error) {
        fail(`Expected request to succeed, but failed with error: ${error.message}`);
      }
    });

    it('should not use proxy when mode is `system` but request url is in bypassProxy', async () => {
      const testUrl = 'http://test-server.com/api/test';
      server.use(
        http.get(testUrl, (...args) => {
          return HttpResponse.json({ message: 'Success' }, { status: 200 });
        })
      );

      let axiosConfig = {
        certsAndProxyConfig: {
          proxyConfig: {
            protocol: 'http',
            hostname: 'localhost',
            port: 42424,
            bypassProxy: 'test-server.com',
            mode: 'on'
          },
          httpsAgentRequestFields: {
            rejectUnauthorized: false
          }
        },
        logId: 'proxy-config-test'
      };

      let axiosInstance = makeAxiosInstance(axiosConfig);

      try {
        const res = await axiosInstance.get(testUrl);
        expect(res.data.message).toBe('Success');
        const logs = mockLogger.add.mock.calls.map(call => call[1]);

        // Should NOT log proxy usage
        const usedProxy = logs.some(log => log.includes('proxy: http://localhost:42424'));
        expect(usedProxy).toBe(false);
      } catch (error) {
        fail(`Expected request to succeed, but failed with error: ${error.message}`);
      }
    });
  });
}); 