import { each, forOwn, cloneDeep } from 'lodash';
import interpolate from '../interpolate';
import { isFormData } from '../utils/form-data';

type VariableMap = Record<string, any>;

interface PathParam {
  name: string;
  value: any;
  type?: string;
  [key: string]: any;
}

interface ProxyAuth {
  username?: string;
  password?: string;
}

interface ProxyConfig {
  protocol?: string;
  hostname?: string;
  port?: string | number;
  auth?: ProxyAuth;
  [key: string]: any;
}

interface BasicAuth {
  username?: string;
  password?: string;
}

interface OAuth2AdditionalParam {
  name?: string;
  value?: string;
  enabled?: boolean;
  [key: string]: any;
}

interface OAuth2AdditionalParameters {
  authorization?: OAuth2AdditionalParam[];
  token?: OAuth2AdditionalParam[];
  refresh?: OAuth2AdditionalParam[];
}

interface OAuth2Config {
  grantType?: string;
  accessTokenUrl?: string;
  refreshTokenUrl?: string;
  authorizationUrl?: string;
  callbackUrl?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  state?: string;
  pkce?: any;
  credentialsPlacement?: string;
  credentialsId?: string;
  tokenPlacement?: string;
  tokenHeaderPrefix?: string;
  tokenQueryKey?: string;
  autoFetchToken?: any;
  autoRefreshToken?: any;
  additionalParameters?: OAuth2AdditionalParameters;
  [key: string]: any;
}

interface AwsV4Config {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  service?: string;
  region?: string;
  profileName?: string;
}

interface CredentialsConfig {
  username?: string;
  password?: string;
}

interface NtlmConfig extends CredentialsConfig {
  domain?: string;
}

interface OAuth1Config {
  consumerKey?: string;
  consumerSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  callbackUrl?: string;
  verifier?: string;
  signatureMethod?: string;
  privateKey?: string;
  timestamp?: string;
  nonce?: string;
  version?: string;
  realm?: string;
  [key: string]: any;
}

interface WsMessage {
  content?: string;
  [key: string]: any;
}

interface RequestBody {
  ws?: WsMessage[];
  [key: string]: any;
}

interface RequestSettings {
  encodeUrl?: boolean;
  [key: string]: any;
}

export interface InterpolatableRequest {
  url?: string;
  mode?: string;
  method?: string;
  headers?: Record<string, any>;
  data?: any;
  body?: RequestBody;
  pathParams?: PathParam[];
  apiKeyHeaderName?: string;
  settings?: RequestSettings;
  globalEnvironmentVariables?: VariableMap;
  oauth2CredentialVariables?: VariableMap;
  collectionVariables?: VariableMap;
  folderVariables?: VariableMap;
  requestVariables?: VariableMap;
  proxy?: ProxyConfig;
  basicAuth?: BasicAuth;
  oauth2?: OAuth2Config;
  awsv4config?: AwsV4Config;
  digestConfig?: CredentialsConfig;
  wsse?: CredentialsConfig;
  ntlmConfig?: NtlmConfig;
  oauth1config?: OAuth1Config;
  auth?: any;
  [key: string]: any;
}

interface InterpolateOptions {
  escapeJSONStrings?: boolean;
}

const getContentType = (headers: Record<string, any> = {}): string => {
  let contentType: any = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return typeof contentType === 'string' ? contentType : '';
};

const getRawQueryString = (url: string): string => {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.slice(queryIndex) : '';
};

const interpolateVars = (
  request: InterpolatableRequest,
  envVariables: VariableMap = {},
  runtimeVariables: VariableMap = {},
  processEnvVars: VariableMap = {},
  promptVariables: VariableMap = {}
): InterpolatableRequest => {
  const globalEnvironmentVariables: VariableMap = request?.globalEnvironmentVariables || {};
  const oauth2CredentialVariables: VariableMap = request?.oauth2CredentialVariables || {};
  const collectionVariables: VariableMap = request?.collectionVariables || {};
  const folderVariables: VariableMap = request?.folderVariables || {};
  const requestVariables: VariableMap = request?.requestVariables || {};
  envVariables = cloneDeep(envVariables);

  // envVars can in turn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVariables, (value, key) => {
    envVariables[key] = interpolate(value, {
      process: {
        env: {
          ...processEnvVars
        }
      }
    });
  });

  const _interpolate = (str: any, { escapeJSONStrings }: InterpolateOptions = {}): any => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    // runtimeVariables take precedence over envVars
    const combinedVars = {
      ...globalEnvironmentVariables,
      ...collectionVariables,
      ...envVariables,
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

    return interpolate(str, combinedVars, { escapeJSONStrings });
  };

  request.url = _interpolate(request.url);
  const isGrpcRequest = request.mode === 'grpc';
  const isWsRequest = request.mode === 'ws';
  const isGraphqlRequest = request.mode === 'graphql';

  forOwn(request.headers, (value, key) => {
    delete request.headers![key];
    request.headers![_interpolate(key)] = _interpolate(value);
  });
  if (request.apiKeyHeaderName) {
    request.apiKeyHeaderName = _interpolate(request.apiKeyHeaderName);
  }

  const contentType = getContentType(request.headers);

  // gRPC: interpolate entire body (JSON message template and any other keys).
  if (isGrpcRequest && request.body) {
    const jsonDoc = JSON.stringify(request.body);
    const parsed = _interpolate(jsonDoc, { escapeJSONStrings: true });
    request.body = JSON.parse(parsed);
  }

  // Interpolate WebSocket message body
  if (isWsRequest && request.body && request.body.ws && Array.isArray(request.body.ws)) {
    request.body.ws.forEach((message) => {
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

  // GraphQL: interpolate query and variables in place. We do not stringify the whole body and interpolate that, because variables is a JSON string. Full-body stringify would nest it and double-escape any {{var}} inside.
  if (isGraphqlRequest && request.data && typeof request.data === 'object') {
    request.data.query = _interpolate(request.data.query, { escapeJSONStrings: true });
    request.data.variables = _interpolate(request.data.variables, { escapeJSONStrings: true });
  }

  if (!isGraphqlRequest) {
    if (contentType.includes('json') && !Buffer.isBuffer(request.data)) {
      if (typeof request.data === 'string') {
        if (request?.data?.length) {
          request.data = _interpolate(request.data, { escapeJSONStrings: true });
        }
      } else if (typeof request.data === 'object') {
        try {
          let parsed = JSON.stringify(request.data);
          parsed = _interpolate(parsed, { escapeJSONStrings: true });
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
    } else if (contentType.startsWith('multipart/')) {
      if (Array.isArray(request?.data) && !isFormData(request.data)) {
        try {
          request.data = request?.data?.map((d: any) => ({
            ...d,
            value: Array.isArray(d?.value) ? d.value.map((v: any) => _interpolate(v)) : _interpolate(d?.value)
          }));
        } catch (err) {}
      }
    } else {
      request.data = _interpolate(request.data);
    }
  }

  each(request?.pathParams, (param: PathParam) => {
    param.value = _interpolate(param.value);
  });

  if (request?.pathParams?.length) {
    let url: any = request.url;
    const urlSearchRaw = getRawQueryString(request.url || '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      url = new URL(url);
    } catch (e: any) {
      throw { message: 'Invalid URL format', originalError: e.message };
    }

    // Encode path-param values when the URL Encoding toggle is on, so values like
    // "aaa/bbb" survive as "aaa%2Fbbb" rather than turning into extra path segments.
    // Per PR #5507's contract, pre-encoded values intentionally double-encode.
    const encodePathParam: (value: any) => string = request.settings?.encodeUrl === true
      ? (value) => encodeURIComponent(String(value))
      : (value) => value;

    const interpolatedUrlPath = (url.pathname as string)
      .split('/')
      .filter((path) => path !== '')
      .map((path) => {
        // traditional path parameters
        if (path.startsWith(':')) {
          const paramName = path.slice(1);
          const existingPathParam = request.pathParams!.find((param) => param.name === paramName);
          if (!existingPathParam) {
            return '/' + path;
          }
          return '/' + encodePathParam(existingPathParam.value);
        }

        // for OData-style parameters (parameters inside parentheses)
        // Check if path matches valid OData syntax:
        // 1. EntitySet('key') or EntitySet(key)
        // 2. EntitySet(Key1=value1,Key2=value2)
        // 3. Function(param=value)
        if (/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(path)) {
          const paramRegex = /[:]([a-zA-Z_]\w*)/g;
          let match: RegExpExecArray | null;
          let result = path;
          while ((match = paramRegex.exec(path))) {
            if (match[1]) {
              let name = match[1].replace(/[')"`]+$/, '');
              name = name.replace(/^[('"`]+/, '');
              if (name) {
                const existingPathParam = request.pathParams!.find((param) => param.name === name);
                if (existingPathParam) {
                  result = result.replace(':' + match[1], encodePathParam(existingPathParam.value));
                }
              }
            }
          }
          return '/' + result;
        }
        return '/' + path;
      })
      .join('');

    const trailingSlash = (url.pathname as string).endsWith('/') ? '/' : '';
    request.url = url.origin + interpolatedUrlPath + trailingSlash + urlSearchRaw;
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

  // todo: we have things happening in two places w.r.t basic auth
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.basicAuth) {
    const username = _interpolate(request.basicAuth.username) || '';
    const password = _interpolate(request.basicAuth.password) || '';

    request.headers!['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
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

    // Interpolate additional parameters for all OAuth2 grant types
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

  // interpolate vars for aws sigv4 auth
  if (request.awsv4config) {
    request.awsv4config.accessKeyId = _interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = _interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = _interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = _interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = _interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = _interpolate(request.awsv4config.profileName) || '';
  }

  // interpolate vars for digest auth
  if (request.digestConfig) {
    request.digestConfig.username = _interpolate(request.digestConfig.username) || '';
    request.digestConfig.password = _interpolate(request.digestConfig.password) || '';
  }

  // interpolate vars for wsse auth
  if (request.wsse) {
    request.wsse.username = _interpolate(request.wsse.username) || '';
    request.wsse.password = _interpolate(request.wsse.password) || '';
  }

  // interpolate vars for ntlmConfig auth
  if (request.ntlmConfig) {
    request.ntlmConfig.username = _interpolate(request.ntlmConfig.username) || '';
    request.ntlmConfig.password = _interpolate(request.ntlmConfig.password) || '';
    request.ntlmConfig.domain = _interpolate(request.ntlmConfig.domain) || '';
  }

  // interpolate vars for oauth1config auth
  if (request.oauth1config) {
    request.oauth1config.consumerKey = _interpolate(request.oauth1config.consumerKey) || '';
    request.oauth1config.consumerSecret = _interpolate(request.oauth1config.consumerSecret) || '';
    request.oauth1config.accessToken = _interpolate(request.oauth1config.accessToken) || '';
    request.oauth1config.accessTokenSecret = _interpolate(request.oauth1config.accessTokenSecret) || '';
    request.oauth1config.callbackUrl = _interpolate(request.oauth1config.callbackUrl) || '';
    request.oauth1config.verifier = _interpolate(request.oauth1config.verifier) || '';
    request.oauth1config.signatureMethod
      = _interpolate(request.oauth1config.signatureMethod) || request.oauth1config.signatureMethod || 'HMAC-SHA1';
    request.oauth1config.privateKey = _interpolate(request.oauth1config.privateKey) || '';
    request.oauth1config.timestamp = _interpolate(request.oauth1config.timestamp) || '';
    request.oauth1config.nonce = _interpolate(request.oauth1config.nonce) || '';
    request.oauth1config.version = _interpolate(request.oauth1config.version) || '';
    request.oauth1config.realm = _interpolate(request.oauth1config.realm) || '';
  }

  if (request?.auth) delete request.auth;

  return request;
};

export default interpolateVars;
