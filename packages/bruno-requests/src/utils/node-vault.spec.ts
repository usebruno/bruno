import axios from 'axios';
import createVaultClient, { VaultError, VaultClient } from './node-vault';

// Mock axios
jest.mock('axios', () => {
  const mockAxios = jest.fn();
  (mockAxios as any).isAxiosError = jest.fn((error: any) => error.isAxiosError === true);
  return mockAxios;
});

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('node-vault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
    delete process.env.VAULT_NAMESPACE;
  });

  describe('module', () => {
    it('should export a function that returns a new client', () => {
      const vault = createVaultClient();
      expect(typeof createVaultClient).toBe('function');
      expect(typeof vault).toBe('object');
    });

    it('should set default values for endpoint and apiVersion', () => {
      const vault = createVaultClient();
      expect(vault.endpoint).toBe('http://127.0.0.1:8200');
      expect(vault.apiVersion).toBe('v1');
    });

    it('should use environment variables for defaults', () => {
      process.env.VAULT_ADDR = 'https://vault.example.com';
      process.env.VAULT_TOKEN = 'env-token';
      process.env.VAULT_NAMESPACE = 'env-namespace';

      const vault = createVaultClient();
      expect(vault.endpoint).toBe('https://vault.example.com');
      expect(vault.token).toBe('env-token');
      expect(vault.namespace).toBe('env-namespace');
    });

    it('should allow config to override environment variables', () => {
      process.env.VAULT_ADDR = 'https://vault.example.com';
      process.env.VAULT_TOKEN = 'env-token';

      const vault = createVaultClient({
        endpoint: 'https://custom.vault.com',
        token: 'config-token'
      });
      expect(vault.endpoint).toBe('https://custom.vault.com');
      expect(vault.token).toBe('config-token');
    });
  });

  describe('client properties', () => {
    it('should allow direct assignment of endpoint', () => {
      const vault = createVaultClient();
      vault.endpoint = 'https://new-vault.example.com';
      expect(vault.endpoint).toBe('https://new-vault.example.com');
    });

    it('should allow direct assignment of token', () => {
      const vault = createVaultClient();
      vault.token = 'new-token';
      expect(vault.token).toBe('new-token');
    });

    it('should allow direct assignment of namespace', () => {
      const vault = createVaultClient();
      vault.namespace = 'my-namespace';
      expect(vault.namespace).toBe('my-namespace');
    });

    it('should allow direct assignment of apiVersion', () => {
      const vault = createVaultClient();
      vault.apiVersion = 'v2';
      expect(vault.apiVersion).toBe('v2');
    });
  });

  describe('read(path, requestOptions)', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token'
      });
    });

    it('should read data from path', async () => {
      const responseData = { data: { value: 'secret-value' } };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledTimes(1);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:8200/v1/secret/data/hello',
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token'
          })
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should include namespace header when set', async () => {
      vault.namespace = 'my-namespace';
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { data: {} }
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token',
            'X-Vault-Namespace': 'my-namespace'
          })
        })
      );
    });

    it('should use updated endpoint after assignment', async () => {
      vault.endpoint = 'https://new-vault.com';
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { data: {} }
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://new-vault.com/v1/secret/data/hello'
        })
      );
    });

    it('should handle 404 errors', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 404,
        data: { errors: ['no secrets found'] }
      });

      await expect(vault.read('secret/data/nonexistent')).rejects.toThrow('no secrets found');
    });

    it('should handle 204 no content response', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 204,
        data: null
      });

      const result = await vault.read('secret/data/empty');
      expect(result).toBeNull();
    });

    it('should handle paths with leading slash without creating double slashes', async () => {
      const responseData = { data: { value: 'secret-value' } };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.read('/secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledTimes(1);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:8200/v1/secret/data/hello',
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token'
          })
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should handle endpoint with trailing slash', async () => {
      vault.endpoint = 'http://localhost:8200/';
      const responseData = { data: { value: 'secret-value' } };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledTimes(1);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:8200/v1/secret/data/hello'
        })
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('write(path, data, requestOptions)', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token'
      });
    });

    it('should write data to path', async () => {
      const writeData = { value: 'world' };
      const responseData = { data: { created_time: '2024-01-01T00:00:00Z' } };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.write('secret/data/hello', writeData);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8200/v1/secret/data/hello',
          data: writeData,
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should handle LDAP login write', async () => {
      const loginData = { password: 'my-password' };
      const responseData = {
        auth: {
          client_token: 'ldap-token',
          renewable: true,
          lease_duration: 3600
        }
      };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.write('auth/ldap/login/myuser', loginData);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8200/v1/auth/ldap/login/myuser',
          data: loginData
        })
      );
      expect(result.auth.client_token).toBe('ldap-token');
    });
  });

  describe('approleLogin(args)', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200'
      });
    });

    it('should login with role_id and secret_id', async () => {
      const responseData = {
        auth: {
          client_token: 'approle-token',
          renewable: true,
          lease_duration: 3600,
          policies: ['default', 'my-policy']
        }
      };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.approleLogin({
        role_id: 'my-role-id',
        secret_id: 'my-secret-id'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8200/v1/auth/approle/login',
          data: {
            role_id: 'my-role-id',
            secret_id: 'my-secret-id'
          }
        })
      );
      expect(result.auth.client_token).toBe('approle-token');
    });

    it('should login with only role_id when secret_id is not required', async () => {
      const responseData = {
        auth: { client_token: 'approle-token' }
      };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      await vault.approleLogin({
        role_id: 'my-role-id'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role_id: 'my-role-id'
          }
        })
      );
    });

    it('should use custom mount_point', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { auth: { client_token: 'token' } }
      });

      await vault.approleLogin({
        role_id: 'my-role-id',
        secret_id: 'my-secret-id',
        mount_point: 'custom-approle'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:8200/v1/auth/custom-approle/login'
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 400,
        data: { errors: ['invalid role or secret ID'] }
      });

      await expect(vault.approleLogin({
        role_id: 'bad-role-id',
        secret_id: 'bad-secret-id'
      })).rejects.toThrow('invalid role or secret ID');
    });
  });

  describe('tokenLookupSelf()', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'my-token'
      });
    });

    it('should lookup current token', async () => {
      const responseData = {
        data: {
          id: 'my-token',
          ttl: 3600,
          renewable: true,
          policies: ['default']
        }
      };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.tokenLookupSelf();

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:8200/v1/auth/token/lookup-self',
          headers: expect.objectContaining({
            'X-Vault-Token': 'my-token'
          })
        })
      );
      expect(result.data.ttl).toBe(3600);
    });

    it('should handle expired token error', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 403,
        data: { errors: ['permission denied'] }
      });

      await expect(vault.tokenLookupSelf()).rejects.toThrow('permission denied');
    });
  });

  describe('tokenRenewSelf(args)', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'my-token'
      });
    });

    it('should renew current token', async () => {
      const responseData = {
        auth: {
          client_token: 'my-token',
          renewable: true,
          lease_duration: 7200
        }
      };
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: responseData
      });

      const result = await vault.tokenRenewSelf();

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8200/v1/auth/token/renew-self',
          headers: expect.objectContaining({
            'X-Vault-Token': 'my-token'
          })
        })
      );
      expect(result.auth.lease_duration).toBe(7200);
    });

    it('should pass increment when provided', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { auth: { lease_duration: 3600 } }
      });

      await vault.tokenRenewSelf({ increment: 3600 });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { increment: 3600 }
        })
      );
    });

    it('should handle non-renewable token error', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 400,
        data: { errors: ['lease is not renewable'] }
      });

      await expect(vault.tokenRenewSelf()).rejects.toThrow('lease is not renewable');
    });
  });

  describe('error handling', () => {
    let vault: VaultClient;

    beforeEach(() => {
      vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token'
      });
    });

    it('should throw VaultError with response structure', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 500,
        data: { errors: ['internal server error'] }
      });

      try {
        await vault.read('secret/data/hello');
      } catch (error) {
        expect(error).toBeInstanceOf(VaultError);
        expect((error as VaultError).message).toBe('internal server error');
        expect((error as VaultError).response).toEqual({
          statusCode: 500,
          status: 500,
          body: { errors: ['internal server error'] }
        });
      }
    });

    it('should handle error without errors array', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 503,
        data: {}
      });

      await expect(vault.read('secret/data/hello')).rejects.toThrow('Status 503');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).isAxiosError = true;
      (networkError as any).code = 'ECONNREFUSED';
      mockedAxios.mockRejectedValueOnce(networkError);

      try {
        await vault.read('secret/data/hello');
      } catch (error) {
        expect((error as any).message).toBe('Network Error');
        expect((error as any).code).toBe('ECONNREFUSED');
      }
    });

    it('should handle axios error with response', async () => {
      const axiosError = new Error('Request failed');
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = {
        status: 401,
        data: { errors: ['permission denied'] }
      };
      mockedAxios.mockRejectedValueOnce(axiosError);

      await expect(vault.read('secret/data/hello')).rejects.toThrow('permission denied');
    });

    it('should pass through non-axios errors', async () => {
      const genericError = new Error('Unknown error');
      mockedAxios.mockRejectedValueOnce(genericError);

      await expect(vault.read('secret/data/hello')).rejects.toThrow('Unknown error');
    });
  });

  describe('requestOptions', () => {
    it('should pass strictSSL to https agent', async () => {
      const vault = createVaultClient({
        endpoint: 'https://vault.example.com',
        token: 'test-token',
        requestOptions: {
          strictSSL: false
        }
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          httpsAgent: expect.any(Object)
        })
      );
    });

    it('should not set httpsAgent for http endpoints', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        requestOptions: {
          strictSSL: false
        }
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      const callArgs = mockedAxios.mock.calls[0][0] as any;
      expect(callArgs.httpsAgent).toBeUndefined();
    });

    it('should configure proxy when provided', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        requestOptions: {
          proxy: 'http://proxy.example.com:8080'
        }
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          proxy: expect.objectContaining({
            host: 'proxy.example.com',
            port: 8080
          })
        })
      );
    });

    it('should configure proxy with authentication', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        requestOptions: {
          proxy: 'http://user:pass@proxy.example.com:8080'
        }
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          proxy: expect.objectContaining({
            host: 'proxy.example.com',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass'
            }
          })
        })
      );
    });
  });

  describe('URL construction', () => {
    it('should construct URL with apiVersion', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200',
        apiVersion: 'v2'
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:8200/v2/secret/data/hello'
        })
      );
    });

    it('should handle endpoint without trailing slash', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200'
      });

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      await vault.read('secret/data/hello');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:8200/v1/secret/data/hello'
        })
      );
    });
  });

  describe('health endpoint handling', () => {
    it('should not throw error for sys/health even with non-200 status', async () => {
      const vault = createVaultClient({
        endpoint: 'http://localhost:8200'
      });

      const healthResponse = {
        initialized: true,
        sealed: true,
        standby: true
      };

      mockedAxios.mockResolvedValueOnce({
        status: 503,
        data: healthResponse
      });

      const result = await vault.read('sys/health');
      expect(result).toEqual(healthResponse);
    });
  });
});
