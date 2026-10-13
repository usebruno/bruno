import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { makeAxiosInstance } from '../network';
import { getSentHeaders } from '../network/sent-headers';
import { getHttpHttpsAgents, GetHttpHttpsAgentsParams } from '../utils/http-https-agents';
import { applyHttp2Transport, canUseHttp2, HttpVersionPreference } from '../http2';

type T_SendRequestCallback = (error: any, response: any) => void;

/**
 * Configuration for creating a sendRequest function with proxy/certs support.
 * This is the same config used by getHttpHttpsAgents, minus requestUrl which is
 * extracted from the actual request.
 */
type SendRequestConfig = Omit<GetHttpHttpsAgentsParams, 'requestUrl'> & {
  httpVersion?: HttpVersionPreference;
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
    timeline: any[] | null;
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
  timeline?: any[];
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
        : (completedAt - startedAt),
      /** bru.runRequest already has one, bru.sendRequest builds its own below. Null when the
       *  request never reached a response. */
      timeline: response.timeline ?? null
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

/**
 * Creates a sendRequest function configured with proxy and certificate settings.
 * This allows bru.sendRequest to use the same proxy/certs config as the main request.
 *
 * @param config - Configuration for proxy, certs, and TLS options (same as getHttpHttpsAgents)
 * @param options - Optional onComplete sink invoked after each call; used by the Timeline.
 * @returns A sendRequest function that applies the config to each request
 */
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];

const readLocationHeader = (headers: any): string | undefined => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const v = headers.get('location');
    if (v) return String(v);
  }
  return headers.location ?? headers.Location;
};

const isSameOrigin = (a?: string, b?: string): boolean => {
  try {
    const ua = new URL(a as string);
    const ub = new URL(b as string);
    return ua.protocol === ub.protocol && ua.host === ub.host;
  } catch {
    return false;
  }
};

const executeScriptedRequest = async (
  axiosInstance: any,
  initialConfig: AxiosRequestConfig,
  config?: SendRequestConfig
): Promise<AxiosResponse> => {
  // No HTTP/2 transport installed → let axios follow redirects natively (unchanged behaviour).
  if (!(initialConfig as any).transport) {
    return axiosInstance(initialConfig);
  }

  const maxRedirects = typeof initialConfig.maxRedirects === 'number' ? initialConfig.maxRedirects : 5;
  let current: AxiosRequestConfig = initialConfig;
  let redirects = 0;

  // axios rejects a 3xx (default validateStatus is 2xx), so each hop arrives here as error.response.
  while (true) {
    try {
      return await axiosInstance(current);
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const location = readLocationHeader(error?.response?.headers);
      if (!status || !REDIRECT_STATUS_CODES.includes(status) || !location || redirects >= maxRedirects) {
        throw error;
      }

      const fromUrl = current.url as string;
      const nextUrl = new URL(location, fromUrl).toString();
      const method = (current.method || 'get').toString().toLowerCase();

      const next: AxiosRequestConfig = { ...current, url: nextUrl };
      next.headers = current.headers ? { ...(current.headers as any) } : current.headers;
      // A fresh hop: drop the previous hop's agents and HTTP/2 transport before re-deriving them.
      delete (next as any).httpAgent;
      delete (next as any).httpsAgent;
      delete (next as any).transport;

      // 301/302/303 become GET and drop the body (except HEAD); 307/308 preserve method and body.
      if ([301, 302, 303].includes(status) && method !== 'head') {
        next.method = 'get';
        next.data = undefined;
        if (next.headers) {
          delete (next.headers as any)['content-length'];
          delete (next.headers as any)['Content-Length'];
          delete (next.headers as any)['content-type'];
          delete (next.headers as any)['Content-Type'];
        }
      }

      // Never forward credentials across origins.
      if (!isSameOrigin(fromUrl, nextUrl) && next.headers) {
        for (const key of Object.keys(next.headers as any)) {
          const lower = key.toLowerCase();
          if (lower === 'authorization' || lower === 'proxy-authorization') {
            delete (next.headers as any)[key];
          }
        }
      }

      // Re-establish agents and re-negotiate HTTP/2 for the redirected URL.
      if (config) {
        const { httpAgent, httpsAgent, tlsOptions, proxyInfo } = await getHttpHttpsAgents({ ...config, requestUrl: nextUrl });
        if (httpAgent) next.httpAgent = httpAgent;
        if (httpsAgent) next.httpsAgent = httpsAgent;
        if (canUseHttp2(config.httpVersion) && next.url) {
          await applyHttp2Transport({
            config: next as { url: string } & Record<string, unknown>,
            httpVersionPreference: config.httpVersion as HttpVersionPreference,
            tlsOptions,
            proxyInfo
          });
        }
      }

      current = next;
      redirects++;
    }
  }
};

const createSendRequest = (config?: SendRequestConfig, options?: SendRequestOptions) => {
  const onComplete = options?.onComplete;

  /** bru.runRequest gets its timeline from the pipeline it runs through. bru.sendRequest has no
   *  pipeline, so build the same entries here or its Timeline has no Network tab and no headers. */
  const buildTimeline = (config: AxiosRequestConfig, response: AxiosResponse | null) => {
    const timeline: Array<{ timestamp: Date; type: string; message: string }> = [];
    const add = (type: string, message: string) => timeline.push({ timestamp: new Date(), type, message });

    add('request', `${(config.method || 'get').toString().toUpperCase()} ${config.url}`);
    for (const [name, value] of Object.entries(getSentHeaders((response as any)?.request))) {
      add('requestHeader', `${name}: ${value}`);
    }

    if (response) {
      // The HTTP/2 transport reports its version on `request.httpVersion`, not `request.res`
      // (which only the HTTP/1.1 adapter populates); fall back so h2 responses label correctly.
      const httpReq = (response as any)?.request;
      const httpVersion = httpReq?.res?.httpVersion || httpReq?.httpVersion || '1.1';
      add('response', `HTTP/${httpVersion} ${response.status} ${response.statusText}`);
      for (const [name, value] of Object.entries(toPlainHeaders(response.headers))) {
        add('responseHeader', `${name}: ${value}`);
      }
    }

    return timeline;
  };

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
        response: resp ? { ...resp, timeline: buildTimeline(normalizedConfig, resp) } : resp,
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

    const startedAt = Date.now();

    if (config) {
      try {
        const requestUrl = normalizedConfig.url;

        const { httpAgent, httpsAgent, tlsOptions, proxyInfo } = await getHttpHttpsAgents({
          ...config,
          requestUrl
        });

        if (httpAgent && !normalizedConfig.httpAgent) {
          normalizedConfig.httpAgent = httpAgent;
        }
        if (httpsAgent && !normalizedConfig.httpsAgent) {
          normalizedConfig.httpsAgent = httpsAgent;
        }

        if (canUseHttp2(config.httpVersion) && normalizedConfig.url) {
          await applyHttp2Transport({
            config: normalizedConfig as { url: string } & Record<string, unknown>,
            httpVersionPreference: config.httpVersion,
            tlsOptions,
            proxyInfo
          });
        }
      } catch (error) {
        recordEntry(normalizedConfig, null, error, startedAt);
        throw error;
      }
    }

    const axiosInstance = makeAxiosInstance();

    if (!callback) {
      try {
        const response = await executeScriptedRequest(axiosInstance, normalizedConfig, config);
        recordEntry(normalizedConfig, response, null, startedAt);
        return response;
      } catch (error: any) {
        recordEntry(normalizedConfig, null, error, startedAt);
        throw error;
      }
    }

    try {
      const response = await executeScriptedRequest(axiosInstance, normalizedConfig, config);
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
