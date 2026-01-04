import { default as axios, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig, AxiosInstance } from 'axios';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { resolve as urlResolve, parse as urlParse } from 'url';
import FormData from 'form-data';

const REDIRECT_RESPONSE_CODES = [301, 302, 303, 307, 308];
const METHOD_CHANGING_REDIRECTS = [301, 302, 303];
const LOCAL_IPV6 = '::1';
const LOCAL_IPV4 = '127.0.0.1';
const LOCALHOST = 'localhost';

export interface TimelineEntry {
  timestamp: Date;
  type: 'separator' | 'info' | 'request' | 'requestHeader' | 'requestData' | 'response' | 'responseHeader' | 'tls' | 'error';
  message?: string;
}

type ModifiedInternalAxiosRequestConfig = InternalAxiosRequestConfig & {
  startTime: number;
  _originalMultipartData?: any;
  collectionPath?: string;
  metadata?: {
    startTime?: number;
    timeline?: TimelineEntry[];
  };
  lookup?: (hostname: string, options: any, callback: (err: any, address: string, family: number) => void) => void;
};

export type ModifiedAxiosResponse = AxiosResponse & {
  responseTime: number;
  timeline?: TimelineEntry[];
};

export interface CookieHandlers {
  getCookieStringForUrl?: (url: string) => string;
  saveCookies?: (url: string, headers: Record<string, any>) => void;
  shouldStoreCookies?: () => boolean;
  shouldSendCookies?: () => boolean;
}

export interface CreateFormDataFn {
  (data: any[], collectionPath: string): FormData;
}

export interface ProxySetupFn {
  (config: any, timeline?: TimelineEntry[]): void;
}

export interface SafeStringifyFn {
  (obj: any): string;
}

export interface MakeAxiosInstanceOptions extends Partial<AxiosRequestConfig> {
  maxRedirects?: number;
  disableCookies?: boolean;
  cookieHandlers?: CookieHandlers;
  createFormData?: CreateFormDataFn;
  userAgent?: string;
  enableTimeline?: boolean;
  setupProxyAgents?: ProxySetupFn;
  safeStringify?: SafeStringifyFn;
  resolveLocalhost?: boolean;
}

const connectionCache = new Map<string, boolean>();

const getTld = (hostname: string | null): string => {
  if (!hostname) {
    return '';
  }
  return hostname.substring(hostname.lastIndexOf('.') + 1);
};

const checkConnection = (host: string, port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const key = `${host}:${port}`;
    const cachedResult = connectionCache.get(key);

    if (cachedResult !== undefined) {
      resolve(cachedResult);
    } else {
      const socket = new net.Socket();

      socket.once('connect', () => {
        socket.end();
        connectionCache.set(key, true);
        resolve(true);
      });

      socket.once('error', () => {
        connectionCache.set(key, false);
        resolve(false);
      });

      socket.connect(port, host);
    }
  });

const baseRequestConfig: Partial<AxiosRequestConfig> = {
  proxy: false,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  transformRequest: function transformRequest(data: any, headers: AxiosRequestHeaders) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.includes('json');
    if (typeof data === 'string' && hasJSONContentType) {
      return data;
    }

    if (Array.isArray(axios.defaults.transformRequest)) {
      axios.defaults.transformRequest.forEach((tr) => {
        data = tr.call(this, data, headers);
      });
    }

    return data;
  }
};

const saveCookiesFromResponse = (
  url: string,
  headers: Record<string, any>,
  cookieHandlers?: CookieHandlers
): void => {
  if (!cookieHandlers?.saveCookies) return;
  if (cookieHandlers.shouldStoreCookies && !cookieHandlers.shouldStoreCookies()) return;

  const setCookieHeaders = headers['set-cookie'];
  if (setCookieHeaders) {
    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const cookie of cookies) {
      if (typeof cookie === 'string' && cookie.length) {
        cookieHandlers.saveCookies(url, { 'set-cookie': cookie });
      }
    }
  }
};

const createRedirectConfig = (
  error: any,
  redirectUrl: string,
  createFormData?: CreateFormDataFn,
  timeline?: TimelineEntry[]
): AxiosRequestConfig => {
  const requestConfig: any = {
    ...error.config,
    url: redirectUrl,
    headers: { ...error.config.headers }
  };

  const statusCode = error.response.status;
  const originalMethod = (error.config.method || 'get').toLowerCase();

  if (METHOD_CHANGING_REDIRECTS.includes(statusCode) && originalMethod !== 'head') {
    requestConfig.method = 'get';
    requestConfig.data = undefined;

    delete requestConfig.headers['content-length'];
    delete requestConfig.headers['Content-Length'];
    delete requestConfig.headers['content-type'];
    delete requestConfig.headers['Content-Type'];

    timeline?.push({
      timestamp: new Date(),
      type: 'info',
      message: `Changed method from ${originalMethod.toUpperCase()} to GET for ${statusCode} redirect and removed request body`
    });
  } else {
    if (requestConfig.data && typeof requestConfig.data === 'object'
      && requestConfig.data.constructor && requestConfig.data.constructor.name === 'FormData') {
      const formData = requestConfig.data;
      if (formData._released || (formData._streams && formData._streams.length === 0)) {
        if (error.config._originalMultipartData && error.config.collectionPath && createFormData) {
          timeline?.push({
            timestamp: new Date(),
            type: 'info',
            message: `Recreating consumed FormData for ${statusCode} redirect`
          });

          const recreatedForm = createFormData(error.config._originalMultipartData, error.config.collectionPath);
          requestConfig.data = recreatedForm;
          const formHeaders = recreatedForm.getHeaders();
          Object.assign(requestConfig.headers, formHeaders);
          requestConfig._originalMultipartData = error.config._originalMultipartData;
          requestConfig.collectionPath = error.config.collectionPath;
        } else {
          timeline?.push({
            timestamp: new Date(),
            type: 'info',
            message: `FormData consumed but no original data available for ${statusCode} redirect`
          });
        }
      } else {
        requestConfig._originalMultipartData = error.config._originalMultipartData;
        requestConfig.collectionPath = error.config.collectionPath;
      }
    }
  }

  return requestConfig;
};

const makeAxiosInstance = (options: MakeAxiosInstanceOptions = {}): AxiosInstance => {
  const {
    maxRedirects: requestMaxRedirects = 5,
    disableCookies = false,
    cookieHandlers,
    createFormData,
    userAgent,
    enableTimeline = false,
    setupProxyAgents,
    safeStringify = JSON.stringify,
    resolveLocalhost = false,
    ...customRequestConfig
  } = options;

  let redirectCount = 0;

  const headers: Record<string, string> = {};
  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }

  const axiosInstance = axios.create({
    ...baseRequestConfig,
    ...customRequestConfig,
    maxRedirects: 0,
    headers: {
      ...headers,
      ...(customRequestConfig.headers || {})
    }
  });

  axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const modifiedConfig = config as ModifiedInternalAxiosRequestConfig;
    modifiedConfig.startTime = Date.now();

    if (enableTimeline) {
      modifiedConfig.metadata = modifiedConfig.metadata || {};
      modifiedConfig.metadata.startTime = Date.now();
      const timeline: TimelineEntry[] = modifiedConfig.metadata.timeline || [];

      timeline.push({
        timestamp: new Date(),
        type: 'separator'
      });
      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Preparing request to ${config.url}`
      });
      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Current time is ${new Date().toISOString()}`
      });
      timeline.push({
        timestamp: new Date(),
        type: 'request',
        message: `${(config.method || 'GET').toUpperCase()} ${config.url}`
      });

      Object.entries(config.headers).forEach(([key, value]) => {
        if (key.toLowerCase() === 'content-type' && value === false) {
          return;
        }
        timeline.push({
          timestamp: new Date(),
          type: 'requestHeader',
          message: `${key}: ${value}`
        });
      });

      if (config.data) {
        const requestData = typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2);
        timeline.push({
          timestamp: new Date(),
          type: 'requestData',
          message: requestData
        });
      }

      modifiedConfig.metadata.timeline = timeline;
    }

    if (resolveLocalhost && config.url) {
      const url = urlParse(config.url);
      if (getTld(url.hostname) === LOCALHOST || url.hostname === LOCAL_IPV4 || url.hostname === LOCAL_IPV6) {
        modifiedConfig.lookup = (hostname, lookupOptions, callback) => {
          const portNumber = Number(url.port) || (url.protocol?.includes('https') ? 443 : 80);
          checkConnection(LOCAL_IPV6, portNumber).then((useIpv6) => {
            const ip = useIpv6 ? LOCAL_IPV6 : LOCAL_IPV4;
            callback(null, ip, useIpv6 ? 6 : 4);
          });
        };
      }
    }

    (config.headers as any)['request-start-time'] = Date.now();

    if (setupProxyAgents) {
      try {
        const timeline = enableTimeline ? modifiedConfig.metadata?.timeline : undefined;
        setupProxyAgents(modifiedConfig, timeline);
      } catch (err: any) {
        if (enableTimeline && modifiedConfig.metadata?.timeline) {
          modifiedConfig.metadata.timeline.push({
            timestamp: new Date(),
            type: 'error',
            message: `Error setting up proxy agents: ${err?.message}`
          });
        }
      }
    }

    if (!disableCookies && cookieHandlers?.getCookieStringForUrl && config.url) {
      const shouldSend = cookieHandlers.shouldSendCookies ? cookieHandlers.shouldSendCookies() : true;
      if (shouldSend) {
        const cookieString = cookieHandlers.getCookieStringForUrl(config.url);
        if (cookieString && typeof cookieString === 'string' && cookieString.length) {
          config.headers['cookie'] = cookieString;
        }
      }
    }

    return modifiedConfig;
  });

  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as ModifiedInternalAxiosRequestConfig;
      const startTime = config.startTime;
      const endTime = Date.now();

      const modifiedResponse: ModifiedAxiosResponse = {
        ...response,
        responseTime: endTime - startTime
      };

      redirectCount = 0;

      if (enableTimeline && config.metadata?.timeline) {
        const timeline = config.metadata.timeline;
        const duration = endTime - (config.metadata.startTime || startTime);

        const httpVersion = (response?.request?.res as any)?.httpVersion || (response as any)?.httpVersion;
        if (httpVersion?.startsWith('2')) {
          timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: `Using HTTP/2, server supports multiplexing`
          });
        }

        timeline.push({
          timestamp: new Date(),
          type: 'response',
          message: `HTTP/${httpVersion || '1.1'} ${response.status} ${response.statusText}`
        });

        Object.entries(response.headers).forEach(([key, value]) => {
          timeline.push({
            timestamp: new Date(),
            type: 'responseHeader',
            message: `${key}: ${value}`
          });
        });

        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Request completed in ${duration} ms`
        });

        modifiedResponse.timeline = timeline;
      }

      return modifiedResponse;
    },
    async (error: any) => {
      const config = error.config as ModifiedInternalAxiosRequestConfig;
      const timeline = enableTimeline ? (config?.metadata?.timeline || []) : undefined;

      timeline?.push({
        timestamp: new Date(),
        type: 'error',
        message: 'there was an error executing the request!'
      });

      if (error.response) {
        const end = Date.now();
        const start = config?.startTime || end;
        error.response.headers['request-duration'] = end - start;
        const duration = end - (config?.metadata?.startTime || start);

        if (REDIRECT_RESPONSE_CODES.includes(error.response.status)) {
          timeline?.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`
          });

          Object.entries(error.response.headers).forEach(([key, value]) => {
            timeline?.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`
            });
          });

          timeline?.push({
            timestamp: new Date(),
            type: 'info',
            message: `Request completed in ${duration} ms`
          });

          if (timeline) {
            error.response.timeline = timeline;
          }

          if (redirectCount >= requestMaxRedirects) {
            const errorResponseData = error.response.data;
            timeline?.push({
              timestamp: new Date(),
              type: 'error',
              message: safeStringify(errorResponseData?.toString?.())
            });
            return Promise.reject(error);
          }

          const locationHeader = error.response.headers.location;
          if (!locationHeader) {
            return Promise.reject(error);
          }

          redirectCount++;
          let redirectUrl = locationHeader;

          if (!locationHeader.match(/^https?:\/\//i)) {
            redirectUrl = urlResolve(error.config.url, locationHeader);
            timeline?.push({
              timestamp: new Date(),
              type: 'info',
              message: `Resolving relative redirect URL: ${locationHeader} → ${redirectUrl}`
            });
          }

          if (!disableCookies && cookieHandlers) {
            saveCookiesFromResponse(error.config.url, error.response.headers, cookieHandlers);
          }

          const requestConfig = createRedirectConfig(error, redirectUrl, createFormData, timeline);

          if (!disableCookies && cookieHandlers?.getCookieStringForUrl) {
            const shouldSend = cookieHandlers.shouldSendCookies ? cookieHandlers.shouldSendCookies() : true;
            if (shouldSend) {
              const cookieString = cookieHandlers.getCookieStringForUrl(redirectUrl);
              if (cookieString && typeof cookieString === 'string' && cookieString.length) {
                (requestConfig.headers as Record<string, string>)['cookie'] = cookieString;
              }
            }
          }

          if (setupProxyAgents) {
            try {
              setupProxyAgents(requestConfig, timeline);
            } catch (err: any) {
              timeline?.push({
                timestamp: new Date(),
                type: 'error',
                message: `Error setting up proxy agents: ${err?.message}`
              });
            }
          }

          if (timeline && (requestConfig as any).metadata) {
            (requestConfig as any).metadata.timeline = timeline;
          }

          return axiosInstance(requestConfig);
        } else {
          const errorResponseData = error.response.data;
          timeline?.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`
          });

          Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
            timeline?.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`
            });
          });

          timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringify(errorResponseData?.toString?.())
          });

          if (error?.cause) {
            timeline?.push({
              timestamp: new Date(),
              type: 'error',
              message: safeStringify(error?.cause)
            });
          }

          if (error?.errors) {
            timeline?.push({
              timestamp: new Date(),
              type: 'error',
              message: safeStringify(error?.errors)
            });
          }

          if (timeline) {
            error.response.timeline = timeline;
          }

          return Promise.reject(error);
        }
      } else if (error?.code) {
        Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
          timeline?.push({
            timestamp: new Date(),
            type: 'responseHeader',
            message: `${key}: ${value}`
          });
        });

        if (error?.cause) {
          timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringify(error?.cause)
          });
        }

        if (error?.errors) {
          timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringify(error?.errors)
          });
        }

        if (timeline) {
          error.timeline = timeline;
        }
        error.statusText = error.code;
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

export {
  makeAxiosInstance,
  TimelineEntry,
  checkConnection,
  getTld,
  connectionCache
};
