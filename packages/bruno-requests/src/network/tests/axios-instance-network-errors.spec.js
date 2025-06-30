/**
 * Network Error Tests for makeAxiosInstance
 * Tests for ECONNRESET and ETIMEDOUT error scenarios using MSW
 */

import { setupServer } from 'msw/node';
import { http } from 'msw';
import makeAxiosInstance from '../axios-instance';

// Mock the certs-and-proxy module
jest.mock('../certs-and-proxy', () => ({
  setupProxyAgents: jest.fn()
}));

// Mock the logger module
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    add: jest.fn(),
    getAll: jest.fn(() => []),
    reset: jest.fn()
  }))
}));

describe('makeAxiosInstance - Network Error Scenarios', () => {
  let server;
  let axiosInstance;
  let axiosConfig;

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
    
    // Setup axios config
    axiosConfig = {
      certsAndProxyConfig: {
        proxyMode: 'off',
        proxyConfig: {},
        httpsAgentRequestFields: {
          rejectUnauthorized: false
        }
      },
      logId: 'network-error-test'
    };

    // Create axios instance for testing
    axiosInstance = makeAxiosInstance(axiosConfig);
  });

  describe('ECONNRESET Error Handling', () => {
    it('should handle ECONNRESET error when connection is reset', async () => {
      const testUrl = 'http://test-server.com/api/data';
      
      // Mock MSW handler that simulates ECONNRESET
      server.use(
        http.get(testUrl, () => {
          // Simulate connection reset error
          const error = new Error('Connection reset by peer');
          error.code = 'ECONNRESET';
          error.errno = -54;
          error.syscall = 'read';
          throw error;
        })
      );

      // Attempt to make request
      try {
        await axiosInstance.get(testUrl);
        fail('Expected request to throw ECONNRESET error');
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
        expect(error.message).toContain('Connection reset by peer');
        expect(error.syscall).toBe('read');
      }
    });

    it('should handle ECONNRESET with proper error structure', async () => {
      const testUrl = 'http://test-server.com/api/endpoint';
      
      server.use(
        http.post(testUrl, () => {
          const error = new Error('socket hang up');
          error.code = 'ECONNRESET';
          error.errno = -54;
          error.syscall = 'read';
          error.address = '127.0.0.1';
          error.port = 80;
          throw error;
        })
      );

      try {
        await axiosInstance.post(testUrl, { data: 'test' });
        fail('Expected request to throw ECONNRESET error');
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
        expect(error.message).toContain('socket hang up');
        expect(error.address).toBe('127.0.0.1');
        expect(error.port).toBe(80);
      }
    });
  });

  describe('ETIMEDOUT Error Handling', () => {
    it('should handle ETIMEDOUT error when request times out', async () => {
      const testUrl = 'http://test-server.com/api/slow-endpoint';
      
      // Mock MSW handler that simulates ETIMEDOUT
      server.use(
        http.get(testUrl, () => {
          const error = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          error.errno = -60;
          error.syscall = 'connect';
          error.address = '127.0.0.1';
          error.port = 80;
          throw error;
        })
      );

      // Attempt to make request
      try {
        await axiosInstance.get(testUrl);
        fail('Expected request to throw ETIMEDOUT error');
      } catch (error) {
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.message).toContain('Connection timeout');
        expect(error.syscall).toBe('connect');
        expect(error.address).toBe('127.0.0.1');
        expect(error.port).toBe(80);
      }
    });

    it('should handle ETIMEDOUT with different syscall scenarios', async () => {
      const testUrl = 'http://test-server.com/api/timeout-read';
      
      server.use(
        http.put(testUrl, () => {
          const error = new Error('read ETIMEDOUT');
          error.code = 'ETIMEDOUT';
          error.errno = -60;
          error.syscall = 'read';
          throw error;
        })
      );

      try {
        await axiosInstance.put(testUrl, { update: 'data' });
        fail('Expected request to throw ETIMEDOUT error');
      } catch (error) {
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.message).toContain('read ETIMEDOUT');
        expect(error.syscall).toBe('read');
      }
    });
  });

  describe('Error Handling with Request Context', () => {
    it('should preserve request config when ECONNRESET occurs', async () => {
      const testUrl = 'http://test-server.com/api/with-headers';
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        timeout: 1000
      };

      server.use(
        http.get(testUrl, () => {
          const error = new Error('Connection reset by peer');
          error.code = 'ECONNRESET';
          error.errno = -61;
          error.syscall = 'read';
          throw error;
        })
      );

      try {
        const res = await axiosInstance.get(testUrl, requestConfig);
        console.log(res);
        fail('Expected request to throw ECONNRESET error');
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
        expect(error.config).toBeDefined();
        expect(error.config.headers['Content-Type']).toBe('application/json');
        expect(error.config.headers['Authorization']).toBe('Bearer test-token');
        expect(error.config.timeout).toBe(1000);
      }
    });

    it('should preserve request config when ETIMEDOUT occurs', async () => {
      const testUrl = 'http://test-server.com/api/timeout-with-data';
      const requestData = { id: 123, name: 'test' };

      server.use(
        http.post(testUrl, () => {
          const error = new Error('connect ETIMEDOUT');
          error.code = 'ETIMEDOUT';
          error.errno = -60;
          error.syscall = 'connect';
          throw error;
        })
      );

      try {
        await axiosInstance.post(testUrl, requestData);
        fail('Expected request to throw ETIMEDOUT error');
      } catch (error) {
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.config).toBeDefined();
        expect(error.config.data).toBe(JSON.stringify(requestData));
      }
    });
  });

  describe('Error Timeline Logging', () => {
    it('should log ECONNRESET error in timeline', async () => {
      const testUrl = 'http://test-server.com/api/log-test';
      
      server.use(
        http.get(testUrl, () => {
          const error = new Error('Connection reset by peer');
          error.code = 'ECONNRESET';
          error.errno = -54;
          error.syscall = 'read';
          throw error;
        })
      );

      try {
        await axiosInstance.get(testUrl);
        fail('Expected request to throw ECONNRESET error');
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
        // Verify that the error is properly structured for timeline logging
        expect(error.config.timeline).toBeDefined();
        expect(Array.isArray(error.config.timeline)).toBe(true);
      }
    });

    it('should log ETIMEDOUT error in timeline', async () => {
      const testUrl = 'http://test-server.com/api/timeout-log-test';
      
      server.use(
        http.get(testUrl, () => {
          const error = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          error.errno = -60;
          error.syscall = 'connect';
          throw error;
        })
      );

      try {
        await axiosInstance.get(testUrl);
        fail('Expected request to throw ETIMEDOUT error');
      } catch (error) {
        expect(error.code).toBe('ETIMEDOUT');
        // Verify that the error is properly structured for timeline logging
        expect(error.config.timeline).toBeDefined();
        expect(Array.isArray(error.config.timeline)).toBe(true);
      }
    });
  });
}); 