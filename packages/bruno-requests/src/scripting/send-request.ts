import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { makeAxiosInstance } from '../network';
import cookies from '../cookies';
import { getHttpHttpsAgents } from '../utils/http-https-agents';
import type { GetHttpHttpsAgentsParams } from '../utils/http-https-agents';

const { getCookieStringForUrl, saveCookies } = cookies;

type T_SendRequestCallback = (error: any, response: any) => void;

/**
 * Configuration for creating a sendRequest function with proxy/certs support.
 * This is the same config used by getHttpHttpsAgents, minus requestUrl which is
 * extracted from the actual request.
 *
 * shouldSendCookies/shouldStoreCookies mirror the app's sendCookies/storeCookies
 * preferences so bru.sendRequest shares the same session cookie jar as the main
 * request. See issue #7727.
 */
type SendRequestConfig = Omit<GetHttpHttpsAgentsParams, 'requestUrl'> & {
  shouldSendCookies?: boolean;
  shouldStoreCookies?: boolean;
};

type SendRequestEntry = {
  request: { method: string; url: string | undefined; headers: Record<string, any>; data: any };
  response: {
    statusCode: number;
    statusText: string;
    headers: Record<string, any>;
    data: any;
    dataBuffer: string;
    size: number;
    duration: number;
  } | null;
  error: any | null;
  startedAt: number;
  completedAt: number;
};

type ScriptedEntryRequestInput = {
  method?: string;
  url?: string;
  headers?: any;
  data?: any;
};

type ScriptedEntryResponseInput = {
  status?: number;
  statusText?: string;
  headers?: any;
  data?: any;
  dataBuffer?: string;
  size?: number;
  duration?: number;
} | null | undefined;

type BuildScriptedEntryArgs = {
  request: ScriptedEntryRequestInput;
  response: ScriptedEntryResponseInput;
  error: any | null;
  startedAt: number;
  completedAt: number;
};

// AxiosHeaders is a class instance; its methods don't survive Electron's IPC
// structured clone, leaving the renderer with `{}`. Flatten to a plain object.
const toPlainHeaders = (headers: any): Record<string, any> => {
  if (!headers) return {};
  if (typeof headers.toJSON === 'function') {
    try { return { ...headers.toJSON() }; } catch (_) { /* fall through */ }
  }
  const out: Record<string, any> = {};
  for (const key of Object.keys(headers)) out[key] = (headers as any)[key];
  return out;
};

// Build dataBuffer eagerly so the Timeline's CodeMirror can size itself on mount.
const toResponseDataBuffer = (data: any): string => {
  try {
    if (data === null || data === undefined) return '';
    if (typeof data === 'string') return Buffer.from(data).toString('base64');
    if (Buffer.isBuffer(data)) return data.toString('base64');
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString('base64');
    return Buffer.from(JSON.stringify(data)).toString('base64');
  } catch (_) {
    return '';
  }
};

// Shared with bruno-electron's runRequest so both produce identical entries.
const buildScriptedEntry = ({
  request,
  response,
  error,
  startedAt,
  completedAt
}: BuildScriptedEntryArgs): SendRequestEntry => {
  let respPayload: SendRequestEntry['response'] = null;
  if (response) {
    const dataBuffer = response.dataBuffer ?? toResponseDataBuffer(response.data);
    respPayload = {
      statusCode: typeof response.status === 'number' ? response.status : 0,
      statusText: response.statusText ?? '',
      headers: toPlainHeaders(response.headers),
      data: response.data,
      dataBuffer,
      size: typeof response.size === 'number'
        ? response.size
        : (dataBuffer ? Buffer.from(dataBuffer, 'base64').length : 0),
      duration: typeof response.duration === 'number'
        ? response.duration
        : (completedAt - startedAt)
    };
  }
  return {
    request: {
      method: (request.method || 'get').toString().toUpperCase(),
      url: request.url,
      headers: toPlainHeaders(request.headers),
      data: request.data
    },
    response: respPayload,
    error: error ? { message: error.message, code: error.code } : null,
    startedAt,
    completedAt
  };
};

type SendRequestOptions = {
  onComplete?: (entry: SendRequestEntry) => void;
};

// Attach cookies from the shared jar to the outgoing request, mirroring the main
// request flow. Jar cookies take precedence over a Cookie header the script set.
const applyRequestCookies = (cfg: AxiosRequestConfig): void => {
  const url = cfg.url;
  if (!url) return;

  const cookieString = getCookieStringForUrl(url);
  if (typeof cookieString !== 'string' || !cookieString.length) return;

  const headers: Record<string, any> = cfg.headers || (cfg.headers = {} as any);
  const existingCookieHeaderName = Object.keys(headers).find(
    (name) => name.toLowerCase() === 'cookie'
  );
  const existingCookieString = existingCookieHeaderName ? headers[existingCookieHeaderName] : '';

  // Helper function to parse cookies into an object
  const parseCookies = (str: string): Record<string, string> =>
    str.split(';').reduce((acc: Record<string, string>, cookie) => {
      const [name, ...rest] = cookie.split('=');
      if (name && name.trim()) {
        acc[name.trim()] = rest.join('=').trim();
      }
      return acc;
    }, {} as Record<string, string>);

  const mergedCookies = {
    ...parseCookies(existingCookieString),
    ...parseCookies(cookieString)
  };

  const combinedCookieString = Object.entries(mergedCookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  headers[existingCookieHeaderName || 'Cookie'] = combinedCookieString;
};

// Persist Set-Cookie headers from the response into the shared jar so a follow-up
// request (or the next main request) sends the session cookies.
const persistResponseCookies = (url: string | undefined, response: AxiosResponse | null | undefined): void => {
  if (!url || !response || !response.headers) return;
  try {
    saveCookies(url, response.headers);
  } catch (_) {}
};

/**
 * Creates a sendRequest function configured with proxy and certificate settings.
 * This allows bru.sendRequest to use the same proxy/certs config as the main request.
 *
 * @param config - Configuration for proxy, certs, and TLS options (same as getHttpHttpsAgents)
 * @param options - Optional onComplete sink invoked after each call; used by the Timeline.
 * @returns A sendRequest function that applies the config to each request
 */
const createSendRequest = (config?: SendRequestConfig, options?: SendRequestOptions) => {
  const onComplete = options?.onComplete;
  // Default to enabled so cookie sharing works even without a config (matches the
  // sendCookies/storeCookies preferences, which default to true).
  const shouldSendCookies = config?.shouldSendCookies !== false;
  const shouldStoreCookies = config?.shouldStoreCookies !== false;

  const recordEntry = (
    normalizedConfig: AxiosRequestConfig,
    response: AxiosResponse | null,
    error: any | null,
    startedAt: number
  ) => {
    if (!onComplete) return;
    const completedAt = Date.now();
    // A 4xx/5xx surfaces as a thrown error with the response attached. Record it too.
    const resp = response || error?.response || null;
    try {
      onComplete(buildScriptedEntry({
        request: {
          method: normalizedConfig.method,
          url: normalizedConfig.url,
          headers: normalizedConfig.headers,
          data: normalizedConfig.data
        },
        response: resp,
        error,
        startedAt,
        completedAt
      }));
    } catch (_) {}
  };

  return async (requestConfig: AxiosRequestConfig | string, callback?: T_SendRequestCallback) => {
    // Handle case where requestConfig is a URL string
    const normalizedConfig: AxiosRequestConfig = typeof requestConfig === 'string'
      ? { url: requestConfig }
      : { ...requestConfig };

    // If config is provided, create agents with the request URL for proper proxy bypass
    if (config) {
      const requestUrl = normalizedConfig.url;

      const { httpAgent, httpsAgent } = await getHttpHttpsAgents({
        ...config,
        requestUrl
      });

      // Apply agents if not explicitly set in normalizedConfig
      if (httpAgent && !normalizedConfig.httpAgent) {
        normalizedConfig.httpAgent = httpAgent;
      }
      if (httpsAgent && !normalizedConfig.httpsAgent) {
        normalizedConfig.httpsAgent = httpsAgent;
      }
    }

    if (shouldSendCookies) {
      applyRequestCookies(normalizedConfig);
    }

    const axiosInstance = makeAxiosInstance();
    const startedAt = Date.now();

    if (!callback) {
      try {
        const response = await axiosInstance(normalizedConfig);
        if (shouldStoreCookies) persistResponseCookies(normalizedConfig.url, response);
        recordEntry(normalizedConfig, response, null, startedAt);
        return response;
      } catch (error: any) {
        if (shouldStoreCookies) persistResponseCookies(normalizedConfig.url, error?.response);
        recordEntry(normalizedConfig, null, error, startedAt);
        throw error;
      }
    }

    try {
      const response = await axiosInstance(normalizedConfig);
      if (shouldStoreCookies) persistResponseCookies(normalizedConfig.url, response);
      recordEntry(normalizedConfig, response, null, startedAt);
      try {
        await callback(null, response);
        return response;
      } catch (error) {
        return Promise.reject(error);
      }
    } catch (error: any) {
      // Normalize axios error for callback: tests expect error.status (e.g. 404), but axios
      // puts the status on error.response.status. Setting status here ensures the same
      // behaviour in nodevm (--sandbox developer, used in CI) and in QuickJS (safe sandbox).
      const errForCallback
        = error && typeof error.response?.status === 'number'
          ? { ...error, status: error.response.status }
          : error;
      if (shouldStoreCookies) persistResponseCookies(normalizedConfig.url, error?.response);
      recordEntry(normalizedConfig, null, error, startedAt);
      try {
        await callback(errForCallback, null);
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
};

// Default sendRequest without config (for backward compatibility)
const sendRequest = createSendRequest();

export default sendRequest;
export { createSendRequest, buildScriptedEntry };
export type { SendRequestConfig, SendRequestEntry, SendRequestOptions, BuildScriptedEntryArgs };
