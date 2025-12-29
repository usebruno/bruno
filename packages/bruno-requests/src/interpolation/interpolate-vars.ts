import { interpolate } from '@usebruno/common';
import { each, forOwn, cloneDeep } from 'lodash';
import FormData from 'form-data';

const getContentType = (headers: Record<string, string> = {}): string => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });
  return contentType;
};

const getRawQueryString = (url: string): string => {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.slice(queryIndex) : '';
};

export interface InterpolateVarsRequest {
  url: string;
  headers: Record<string, string>;
  data?: any;
  body?: any;
  mode?: string;
  pathParams?: Array<{ name: string; value: string }>;
  proxy?: {
    protocol?: string;
    hostname?: string;
    port?: string;
    auth?: {
      username?: string;
      password?: string;
    };
  };
  basicAuth?: {
    username?: string;
    password?: string;
  };
  oauth2?: {
    grantType?: string;
    accessTokenUrl?: string;
    refreshTokenUrl?: string;
    authorizationUrl?: string;
    callbackUrl?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    scope?: string;
    state?: string;
    pkce?: boolean;
    credentialsPlacement?: string;
    credentialsId?: string;
    tokenPlacement?: string;
    tokenHeaderPrefix?: string;
    tokenQueryKey?: string;
    autoFetchToken?: boolean;
    autoRefreshToken?: boolean;
    additionalParameters?: {
      authorization?: Array<{ name: string; value: string; enabled?: boolean }>;
      token?: Array<{ name: string; value: string; enabled?: boolean }>;
      refresh?: Array<{ name: string; value: string; enabled?: boolean }>;
    };
  };
  awsv4config?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    profileName?: string;
  };
  digestConfig?: {
    username?: string;
    password?: string;
  };
  wsse?: {
    username?: string;
    password?: string;
  };
  ntlmConfig?: {
    username?: string;
    password?: string;
    domain?: string;
  };
  auth?: any;
  globalEnvironmentVariables?: Record<string, any>;
  oauth2CredentialVariables?: Record<string, any>;
  collectionVariables?: Record<string, any>;
  folderVariables?: Record<string, any>;
  requestVariables?: Record<string, any>;
}

export const interpolateVars = (
  request: InterpolateVarsRequest,
  envVariables: Record<string, any> = {},
  runtimeVariables: Record<string, any> = {},
  processEnvVars: Record<string, string> = {},
  promptVariables: Record<string, any> = {}
): InterpolateVarsRequest => {
  const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
  const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
  const collectionVariables = request?.collectionVariables || {};
  const folderVariables = request?.folderVariables || {};
  const requestVariables = request?.requestVariables || {};

  let envVars = cloneDeep(envVariables);

  forOwn(envVars, (value, key) => {
    envVars[key] = interpolate(value, {
      process: {
        env: {}
      }
    });
  });

  const _interpolate = (str: any, options?: { escapeJSONStrings?: boolean }): any => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
      ...globalEnvironmentVariables,
      ...collectionVariables,
      ...envVars,
      ...folderVariables,
      ...requestVariables,
      ...oauth2CredentialVariables,
      ...runtimeVariables,
      ...promptVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    return interpolate(str, combinedVars, options);
  };

  request.url = _interpolate(request.url);
  const isGrpcRequest = request.mode === 'grpc';

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

  const contentType = getContentType(request.headers);

  if (isGrpcRequest && request.body) {
    const jsonDoc = JSON.stringify(request.body);
    const parsed = _interpolate(jsonDoc, { escapeJSONStrings: true });
    request.body = JSON.parse(parsed);
  }

  const isWsRequest = request.mode === 'ws';
  if (isWsRequest && request.body && request.body.ws && Array.isArray(request.body.ws)) {
    request.body.ws.forEach((message: any) => {
      if (message && message.content) {
        let isJson = false;
        try {
          JSON.parse(message.content);
          isJson = true;
        } catch (e) {}

        message.content = _interpolate(message.content, { escapeJSONStrings: isJson });
      }
    });
  }

  if (typeof contentType === 'string') {
    if (contentType.includes('json') && !Buffer.isBuffer(request.data)) {
      if (typeof request.data === 'string') {
        if (request.data.length) {
          request.data = _interpolate(request.data, { escapeJSONStrings: true });
        }
      } else if (typeof request.data === 'object') {
        try {
          const jsonDoc = JSON.stringify(request.data);
          const parsed = _interpolate(jsonDoc, { escapeJSONStrings: true });
          request.data = JSON.parse(parsed);
        } catch (err) {}
      }
    } else if (contentType === 'application/x-www-form-urlencoded') {
      if (request.data && Array.isArray(request.data)) {
        request.data = request.data.map((d: any) => ({
          ...d,
          value: _interpolate(d?.value)
        }));
      }
    } else if (contentType === 'multipart/form-data') {
      if (Array.isArray(request?.data) && !(request.data instanceof FormData)) {
        try {
          request.data = request?.data?.map((d: any) => ({
            ...d,
            value: _interpolate(d?.value)
          }));
        } catch (err) {}
      }
    } else {
      request.data = _interpolate(request.data);
    }
  }

  each(request.pathParams, (param) => {
    param.value = _interpolate(param.value);
  });

  if (request?.pathParams?.length) {
    let url: any = request.url;
    const urlSearchRaw = getRawQueryString(request.url);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      url = new URL(url);
    } catch (e: any) {
      throw { message: 'Invalid URL format', originalError: e.message };
    }

    const urlPathnameInterpolatedWithPathParams = url.pathname
      .split('/')
      .filter((path: string) => path !== '')
      .map((path: string) => {
        if (path.startsWith(':')) {
          const paramName = path.slice(1);
          const existingPathParam = request.pathParams!.find((param) => param.name === paramName);
          if (!existingPathParam) {
            return '/' + path;
          }
          return '/' + existingPathParam.value;
        }

        if (/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(path)) {
          const paramRegex = /[:](\w+)/g;
          let match;
          let result = path;
          while ((match = paramRegex.exec(path))) {
            if (match[1]) {
              let name = match[1].replace(/[')"`]+$/, '');
              name = name.replace(/^[('"`]+/, '');
              if (name) {
                const existingPathParam = request.pathParams!.find((param) => param.name === name);
                if (existingPathParam) {
                  result = result.replace(':' + match[1], existingPathParam.value);
                }
              }
            }
          }
          return '/' + result;
        }
        return '/' + path;
      })
      .join('');

    const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
    request.url = url.origin + urlPathnameInterpolatedWithPathParams + trailingSlash + urlSearchRaw;
  }

  if (request.proxy) {
    request.proxy.protocol = _interpolate(request.proxy.protocol);
    request.proxy.hostname = _interpolate(request.proxy.hostname);
    request.proxy.port = _interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = _interpolate(request.proxy.auth.username);
      request.proxy.auth.password = _interpolate(request.proxy.auth.password);
    }
  }

  if (request.basicAuth) {
    const username = _interpolate(request.basicAuth.username) || '';
    const password = _interpolate(request.basicAuth.password) || '';
    request.headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.basicAuth;
  }

  if (request?.oauth2?.grantType) {
    switch (request.oauth2.grantType) {
      case 'password':
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.username = _interpolate(request.oauth2.username) || '';
        request.oauth2.password = _interpolate(request.oauth2.password) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      case 'implicit':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.state = _interpolate(request.oauth2.state) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        break;
      case 'authorization_code':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.state = _interpolate(request.oauth2.state) || '';
        request.oauth2.pkce = _interpolate(request.oauth2.pkce) || false;
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      case 'client_credentials':
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      default:
        break;
    }

    if (request.oauth2.additionalParameters) {
      if (Array.isArray(request.oauth2.additionalParameters.authorization)) {
        request.oauth2.additionalParameters.authorization.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      if (Array.isArray(request.oauth2.additionalParameters.token)) {
        request.oauth2.additionalParameters.token.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      if (Array.isArray(request.oauth2.additionalParameters.refresh)) {
        request.oauth2.additionalParameters.refresh.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }
    }
  }

  if (request.awsv4config) {
    request.awsv4config.accessKeyId = _interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = _interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = _interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = _interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = _interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = _interpolate(request.awsv4config.profileName) || '';
  }

  if (request.digestConfig) {
    request.digestConfig.username = _interpolate(request.digestConfig.username) || '';
    request.digestConfig.password = _interpolate(request.digestConfig.password) || '';
  }

  if (request.wsse) {
    request.wsse.username = _interpolate(request.wsse.username) || '';
    request.wsse.password = _interpolate(request.wsse.password) || '';
  }

  if (request.ntlmConfig) {
    request.ntlmConfig.username = _interpolate(request.ntlmConfig.username) || '';
    request.ntlmConfig.password = _interpolate(request.ntlmConfig.password) || '';
    request.ntlmConfig.domain = _interpolate(request.ntlmConfig.domain) || '';
  }

  if (request?.auth) delete request.auth;

  return request;
};
