const { describe, it, expect, beforeAll, beforeEach } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addAxiosShimToContext = require('./axios');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('axios shim tests', () => {
  let vm, module;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(async () => {
    vm = module.newContext();
    await addAxiosShimToContext(vm);
    jest.clearAllMocks();
  });

  describe('successful requests', () => {
    it('should resolve axios.get with response data', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = vm.evalCode(`
        (async () => {
          const response = await axios.get('https://api.example.com/data');
          return response;
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const responseData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(responseData).toEqual({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' }
      });
    });

    it('should resolve axios.post with response data', async () => {
      const mockResponse = {
        status: 201,
        headers: { 'content-type': 'application/json' },
        data: { id: 123, created: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = vm.evalCode(`
        (async () => {
          const response = await axios.post('https://api.example.com/users', { name: 'test' });
          return response;
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const responseData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(responseData.status).toBe(201);
      expect(responseData.data).toEqual({ id: 123, created: true });
    });

    it('should resolve all HTTP methods', async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        data: { success: true }
      };

      const methods = ['get', 'post', 'put', 'patch', 'delete'];

      for (const method of methods) {
        axios[method].mockResolvedValue(mockResponse);

        const result = vm.evalCode(`
          (async () => {
            const response = await axios.${method}('https://api.example.com/endpoint');
            return response.status;
          })()
        `);
        const promiseHandle = vm.unwrapResult(result);
        const resolvedResult = await vm.resolvePromise(promiseHandle);
        const resolvedHandle = vm.unwrapResult(resolvedResult);
        const status = vm.dump(resolvedHandle);

        resolvedHandle.dispose();
        promiseHandle.dispose();

        expect(status).toBe(200);
      }
    });
  });

  describe('error handling - 4xx/5xx responses', () => {
    it('should reject on 404 error with full error information', async () => {
      const mockError = {
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'application/json' },
          data: { error: 'Resource not found' }
        },
        config: {
          url: 'https://api.example.com/users/999',
          method: 'get',
          headers: { Accept: 'application/json' },
          data: undefined
        }
      };
      axios.get.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios.get('https://api.example.com/users/999');
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              message: error.message,
              status: error.response?.status,
              statusText: error.response?.statusText,
              responseData: error.response?.data,
              configUrl: error.config?.url,
              configMethod: error.config?.method
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.message).toBe('Request failed with status code 404');
      expect(errorData.status).toBe(404);
      expect(errorData.statusText).toBe('Not Found');
      expect(errorData.responseData).toEqual({ error: 'Resource not found' });
      expect(errorData.configUrl).toBe('https://api.example.com/users/999');
      expect(errorData.configMethod).toBe('get');
    });

    it('should reject on 500 error', async () => {
      const mockError = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          data: { error: 'Server error' }
        },
        config: {
          url: 'https://api.example.com/endpoint',
          method: 'post',
          headers: {},
          data: { test: 'data' }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios.post('https://api.example.com/endpoint', { test: 'data' });
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              status: error.response?.status,
              message: error.message
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.status).toBe(500);
      expect(errorData.message).toBe('Request failed with status code 500');
    });

    it('should reject on 401 unauthorized error', async () => {
      const mockError = {
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'www-authenticate': 'Bearer' },
          data: { error: 'Invalid token' }
        },
        config: {
          url: 'https://api.example.com/protected',
          method: 'get',
          headers: { Authorization: 'Bearer invalid' },
          data: undefined
        }
      };
      axios.get.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios.get('https://api.example.com/protected');
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              status: error.response?.status,
              responseData: error.response?.data
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.status).toBe(401);
      expect(errorData.responseData).toEqual({ error: 'Invalid token' });
    });
  });

  describe('error handling - network errors', () => {
    it('should reject on network error without response', async () => {
      const mockError = {
        message: 'Network Error',
        config: {
          url: 'https://api.example.com/endpoint',
          method: 'get',
          headers: {},
          data: undefined
        }
      };
      axios.get.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios.get('https://api.example.com/endpoint');
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              message: error.message,
              hasResponse: !!error.response,
              configUrl: error.config?.url
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.message).toBe('Network Error');
      expect(errorData.hasResponse).toBe(false);
      expect(errorData.configUrl).toBe('https://api.example.com/endpoint');
    });

    it('should reject on timeout error', async () => {
      const mockError = {
        message: 'timeout of 1000ms exceeded',
        config: {
          url: 'https://api.example.com/slow',
          method: 'get',
          headers: {},
          data: undefined
        }
      };
      axios.get.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios.get('https://api.example.com/slow');
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              message: error.message
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.message).toBe('timeout of 1000ms exceeded');
    });
  });

  describe('base axios function', () => {
    it('should work with axios() base function', async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        data: { success: true }
      };
      axios.mockResolvedValue(mockResponse);

      const result = vm.evalCode(`
        (async () => {
          const response = await axios({
            method: 'GET',
            url: 'https://api.example.com/data'
          });
          return response;
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const responseData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(responseData.status).toBe(200);
      expect(responseData.data).toEqual({ success: true });
    });

    it('should reject on error with axios() base function', async () => {
      const mockError = {
        message: 'Request failed with status code 403',
        response: {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          data: { error: 'Access denied' }
        },
        config: {
          url: 'https://api.example.com/forbidden',
          method: 'get',
          headers: {},
          data: undefined
        }
      };
      axios.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          try {
            await axios({
              method: 'GET',
              url: 'https://api.example.com/forbidden'
            });
            return { caught: false };
          } catch (error) {
            return {
              caught: true,
              status: error.response?.status,
              message: error.message
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const errorData = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(errorData.caught).toBe(true);
      expect(errorData.status).toBe(403);
      expect(errorData.message).toBe('Request failed with status code 403');
    });
  });

  describe('real-world use case from issue #6342', () => {
    it('should properly handle token refresh error with full error info', async () => {
      const mockError = {
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'application/json' },
          data: { error: 'Realm not found' }
        },
        config: {
          url: 'https://keycloak.example.com/auth/realms/test/protocol/openid-connect/token',
          method: 'post',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: 'grant_type=password&client_id=test&username=user&password=pass&scope=openid'
        }
      };
      axios.post.mockRejectedValue(mockError);

      const result = vm.evalCode(`
        (async () => {
          const url = 'https://keycloak.example.com/auth/realms/test/protocol/openid-connect/token';
          const data = 'grant_type=password&client_id=test&username=user&password=pass&scope=openid';

          try {
            const response = await axios.post(url, data, {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            return { success: true, token: response.data?.access_token };
          } catch (error) {
            return {
              success: false,
              errorMessage: error.message,
              hasConfig: !!error.config,
              configUrl: error.config?.url,
              configMethod: error.config?.method,
              configData: error.config?.data,
              responseStatus: error.response?.status,
              responseData: error.response?.data
            };
          }
        })()
      `);
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const result_data = vm.dump(resolvedHandle);

      resolvedHandle.dispose();
      promiseHandle.dispose();

      expect(result_data.success).toBe(false);
      expect(result_data.errorMessage).toBe('Request failed with status code 404');
      expect(result_data.hasConfig).toBe(true);
      expect(result_data.configUrl).toBe('https://keycloak.example.com/auth/realms/test/protocol/openid-connect/token');
      expect(result_data.configMethod).toBe('post');
      expect(result_data.responseStatus).toBe(404);
      expect(result_data.responseData).toEqual({ error: 'Realm not found' });
    });
  });
});
