import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import * as https from 'node:https';

/**
 * Configuration options for creating a Vault client
 */
export interface VaultConfig {
  apiVersion?: string;
  endpoint?: string;
  token?: string;
  namespace?: string;
  requestOptions?: VaultRequestOptions;
  debug?: (...args: any[]) => void;
}

/**
 * Request options for Vault HTTP requests
 * Compatible with node-vault's requestOptions
 */
export interface VaultRequestOptions {
  strictSSL?: boolean;
  ca?: string | Buffer | Array<string | Buffer>;
  proxy?: string;
  [key: string]: any;
}

/**
 * AppRole login arguments
 */
export interface ApproleLoginArgs {
  role?: string;
  role_id: string;
  secret_id?: string;
  mount_point?: string;
}

/**
 * Token renew arguments
 */
export interface TokenRenewArgs {
  increment?: number | string;
}

/**
 * Vault API response error structure
 * Includes both statusCode (node-vault style) and status (axios style) for compatibility
 */
export class VaultError extends Error {
  response?: {
    statusCode: number;
    status: number; // Alias for axios-style error handling
    body: any;
  };

  code?: string; // For network errors

  constructor(message: string, response?: { statusCode: number; body: any }) {
    super(message);
    this.name = 'VaultError';
    if (response) {
      this.response = {
        statusCode: response.statusCode,
        status: response.statusCode, // Alias for compatibility
        body: response.body
      };
    }
  }
}

/**
 * Vault client interface - matches node-vault API surface
 */
export interface VaultClient {
  endpoint: string;
  namespace?: string;
  token?: string;
  apiVersion: string;

  read(path: string, requestOptions?: VaultRequestOptions): Promise<any>;
  write(path: string, data: any, requestOptions?: VaultRequestOptions): Promise<any>;
  approleLogin(args: ApproleLoginArgs): Promise<any>;
  tokenLookupSelf(args?: any): Promise<any>;
  tokenRenewSelf(args?: TokenRenewArgs): Promise<any>;
}

/**
 * Creates an HTTPS agent based on request options
 */
function createHttpsAgent(options: VaultRequestOptions): https.Agent | undefined {
  const agentOptions: https.AgentOptions = {};
  let needsAgent = false;

  if (options.strictSSL === false) {
    agentOptions.rejectUnauthorized = false;
    needsAgent = true;
  }

  if (options.ca) {
    agentOptions.ca = options.ca;
    needsAgent = true;
  }

  return needsAgent ? new https.Agent(agentOptions) : undefined;
}

/**
 * Handles Vault API response, extracting body or throwing error
 */
function handleVaultResponse(statusCode: number, body: any, path: string): any {
  // Success responses
  if (statusCode === 200 || statusCode === 204) {
    return body;
  }

  // Health endpoint special handling (matches node-vault behavior)
  if (path.match(/sys\/health/) !== null) {
    return body;
  }

  // Error responses
  let message: string;
  if (body && body.errors && body.errors.length > 0) {
    message = body.errors[0];
  } else {
    message = `Status ${statusCode}`;
  }

  throw new VaultError(message, { statusCode, body });
}

/**
 * Creates a Vault client instance
 *
 * This is a drop-in replacement for node-vault, implementing only the methods
 * used by bruno-electron and bruno-cli.
 *
 * @param config - Configuration options
 * @returns VaultClient instance with mutable properties
 *
 * @example
 * ```javascript
 * const vault = createVaultClient({ apiVersion: 'v1' });
 * vault.endpoint = 'https://vault.example.com';
 * vault.token = 'my-token';
 * const secret = await vault.read('secret/data/myapp');
 * ```
 */
function createVaultClient(config: VaultConfig = {}): VaultClient {
  const debug = config.debug || (() => {});
  const defaultRequestOptions = config.requestOptions || {};

  /**
   * Makes an HTTP request to the Vault API
   */
  async function request(
    method: string,
    path: string,
    data?: any,
    requestOptions?: VaultRequestOptions
  ): Promise<any> {
    // Merge request options: defaults from config + per-request options
    const mergedOptions: VaultRequestOptions = {
      ...defaultRequestOptions,
      ...requestOptions
    };

    const endpointOrigin = client.endpoint?.endsWith('/') ? client.endpoint : `${client.endpoint}/`;

    // Build URL
    const uri = `${endpointOrigin}${client.apiVersion}${path}`;
    debug(method, uri);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (typeof client.token === 'string' && client.token.length) {
      headers['X-Vault-Token'] = client.token;
    }

    if (typeof client.namespace === 'string' && client.namespace.length) {
      headers['X-Vault-Namespace'] = client.namespace;
    }

    // Build axios config
    const axiosConfig: AxiosRequestConfig = {
      method: method as any,
      url: uri,
      headers,
      validateStatus: () => true // Don't throw on non-2xx status
    };

    // Add request body for POST/PUT
    if (data && (method === 'POST' || method === 'PUT')) {
      axiosConfig.data = data;
      debug('data:', data);
    }

    // Configure HTTPS agent
    if (uri.startsWith('https')) {
      const agent = createHttpsAgent(mergedOptions);
      if (agent) {
        axiosConfig.httpsAgent = agent;
      }
    }

    // Configure proxy
    if (mergedOptions.proxy) {
      // Parse proxy URL into axios proxy config
      try {
        const proxyUrl = new URL(mergedOptions.proxy);
        axiosConfig.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10) || (proxyUrl.protocol === 'https:' ? 443 : 80),
          protocol: proxyUrl.protocol.replace(':', '')
        };
        if (proxyUrl.username && proxyUrl.password) {
          axiosConfig.proxy.auth = {
            username: decodeURIComponent(proxyUrl.username),
            password: decodeURIComponent(proxyUrl.password)
          };
        }
      } catch (e) {
        // If proxy URL parsing fails, pass it as-is for backward compatibility
        debug('Failed to parse proxy URL:', mergedOptions.proxy);
      }
    }

    try {
      const response = await axios(axiosConfig);
      return handleVaultResponse(response.status, response.data, path);
    } catch (error) {
      // Network errors or other axios errors
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // Server responded with error status
          return handleVaultResponse(
            axiosError.response.status,
            axiosError.response.data,
            path
          );
        }
        // Network error - preserve original error structure
        const vaultError = new VaultError(axiosError.message);
        (vaultError as any).code = axiosError.code;
        throw vaultError;
      }
      throw error;
    }
  }

  // Create client object with mutable properties
  const client: VaultClient = {
    // Mutable properties (support direct assignment like node-vault)
    apiVersion: config.apiVersion || 'v1',
    endpoint: config.endpoint || process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    token: config.token || process.env.VAULT_TOKEN,
    namespace: config.namespace || process.env.VAULT_NAMESPACE,

    /**
     * Read data from a Vault path
     * @param path - The path to read from (e.g., 'secret/data/myapp')
     * @param requestOptions - Optional request options
     */
    async read(path: string, requestOptions?: VaultRequestOptions): Promise<any> {
      path = path.startsWith('/') ? path : `/${path}`;
      debug('read', path);
      return request('GET', path, undefined, requestOptions);
    },

    /**
     * Write data to a Vault path
     * @param path - The path to write to
     * @param data - The data to write
     * @param requestOptions - Optional request options
     */
    async write(path: string, data: any, requestOptions?: VaultRequestOptions): Promise<any> {
      path = path.startsWith('/') ? path : `/${path}`;
      debug('write', path, data);
      return request('POST', path, data, requestOptions);
    },

    /**
     * Authenticate using AppRole
     * @param args - AppRole login arguments
     */
    async approleLogin(args: ApproleLoginArgs): Promise<any> {
      debug('approleLogin', args.role_id);
      const mountPoint = args.mount_point || 'approle';
      const body: Record<string, any> = {
        role_id: args.role_id
      };
      if (args.secret_id) {
        body.secret_id = args.secret_id;
      }
      return request('POST', `/auth/${mountPoint}/login`, body);
    },

    /**
     * Look up the current token's properties
     */
    async tokenLookupSelf(args?: any): Promise<any> {
      debug('tokenLookupSelf');
      return request('GET', '/auth/token/lookup-self');
    },

    /**
     * Renew the current token
     * @param args - Optional arguments including increment
     */
    async tokenRenewSelf(args?: TokenRenewArgs): Promise<any> {
      debug('tokenRenewSelf');
      const body: Record<string, any> = {};
      if (args?.increment !== undefined) {
        body.increment = args.increment;
      }
      return request('POST', '/auth/token/renew-self', Object.keys(body).length > 0 ? body : undefined);
    }
  };

  return client;
}

export default createVaultClient;
